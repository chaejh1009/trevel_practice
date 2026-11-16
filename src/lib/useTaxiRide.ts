import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldId } from "./navigation";
import type { Point } from "./movement";
import { distance } from "./movement";
import type { InteractionTarget } from "./useCharacterController";
import {
  canBoardTaxi,
  getTaxiGeometry,
  getTaxiVehicle,
  nearestTaxi,
  TAXI_ARRIVAL_MS,
  TAXI_BOARDING_MS,
  TAXI_DEPARTURE_MS,
  TAXI_INTERACTION_RADIUS,
  type TaxiBoardingResult,
  type TaxiRideRequest,
  type TaxiRideSession,
} from "./taxiRide";

interface TaxiRideOptions {
  fieldId: FieldId | null;
  position: Point;
  track: (type: string, properties: Record<string, unknown>) => void;
}
interface ActiveRide {
  request: TaxiRideRequest;
  resolve: (result: TaxiBoardingResult) => void;
  timers: Set<ReturnType<typeof setTimeout>>;
  settled: boolean;
}

/** One pending boarding promise owns all of its phase timers and cancellation. */
export function useTaxiRide(options: TaxiRideOptions) {
  const latest = useRef(options);
  latest.current = options;
  const mounted = useRef(true);
  const active = useRef<ActiveRide | null>(null);
  const current = useRef<TaxiRideSession | null>(null);
  const [ride, setRide] = useState<TaxiRideSession | null>(null);

  const publish = useCallback((session: TaxiRideSession | null) => {
    current.current = session;
    if (mounted.current) setRide(session);
  }, []);

  const emit = useCallback(
    (
      type: string,
      request: TaxiRideRequest,
      properties: Record<string, unknown> = {},
    ) => {
      try {
        latest.current.track(type, {
          scenarioId: "didi",
          requestId: request.id,
          ...properties,
        });
      } catch {
        // Telemetry failure must not strand the caller's boarding promise.
      }
    },
    [],
  );

  const isCurrent = useCallback(
    (lease: ActiveRide) =>
      mounted.current &&
      active.current === lease &&
      !lease.settled &&
      latest.current.fieldId === "didi",
    [],
  );

  const settle = useCallback(
    (lease: ActiveRide, result: TaxiBoardingResult, reason?: string) => {
      if (active.current !== lease || lease.settled) return;
      lease.settled = true;
      for (const timer of lease.timers) clearTimeout(timer);
      lease.timers.clear();
      active.current = null;
      publish(null);
      if (reason) emit("taxi_ride_cancelled", lease.request, { reason });
      lease.resolve(result);
    },
    [emit, publish],
  );

  const schedule = useCallback(
    (lease: ActiveRide, delay: number, callback: () => void) => {
      const timer = setTimeout(() => {
        lease.timers.delete(timer);
        if (isCurrent(lease)) callback();
      }, delay);
      lease.timers.add(timer);
    },
    [isCurrent],
  );

  const start = useCallback(
    (request: TaxiRideRequest): Promise<TaxiBoardingResult> => {
      if (
        !mounted.current ||
        latest.current.fieldId !== "didi" ||
        active.current ||
        !request ||
        typeof request.id !== "string" ||
        !request.id.trim() ||
        !getTaxiVehicle(request.assignedVehicleId)
      )
        return Promise.resolve(null);
      const snapshot = { ...request };
      return new Promise<TaxiBoardingResult>((resolve) => {
        const lease: ActiveRide = {
          request: snapshot,
          resolve,
          timers: new Set(),
          settled: false,
        };
        active.current = lease;
        publish({
          request: snapshot,
          phase: "arriving",
          selectedVehicleId: null,
          error: null,
        });
        emit("taxi_ride_requested", snapshot, {
          vehicleId: snapshot.assignedVehicleId,
        });
        schedule(lease, TAXI_ARRIVAL_MS, () => {
          if (current.current?.phase !== "arriving") return;
          publish({ ...current.current, phase: "waiting" });
          emit("taxi_vehicles_arrived", snapshot);
        });
      });
    },
    [emit, publish, schedule],
  );

  const cancel = useCallback(() => {
    const lease = active.current;
    if (lease) settle(lease, null, "user_cancelled");
  }, [settle]);

  const selectVehicle = useCallback(
    (id: string) => {
      const lease = active.current;
      const session = current.current;
      if (
        !lease ||
        !isCurrent(lease) ||
        !session ||
        session.phase !== "waiting"
      )
        return;
      const vehicle = getTaxiVehicle(id);
      if (
        !vehicle ||
        distance(latest.current.position, vehicle.position) >
          TAXI_INTERACTION_RADIUS ||
        !Number.isFinite(distance(latest.current.position, vehicle.position))
      )
        return;
      publish({ ...session, selectedVehicleId: id, error: null });
      emit("taxi_vehicle_selected", lease.request, { vehicleId: id });
    },
    [emit, isCurrent, publish],
  );

  const board = useCallback(() => {
    const lease = active.current;
    const session = current.current;
    if (
      !lease ||
      !isCurrent(lease) ||
      !session ||
      session.phase !== "waiting" ||
      !session.selectedVehicleId
    )
      return;
    const selected = getTaxiVehicle(session.selectedVehicleId);
    if (!selected) return;
    const separation = distance(latest.current.position, selected.position);
    if (!Number.isFinite(separation) || separation > TAXI_INTERACTION_RADIUS) {
      publish({
        ...session,
        error: "선택한 차량 가까이 이동한 뒤 탑승해 주세요.",
      });
      return;
    }
    if (session.selectedVehicleId !== lease.request.assignedVehicleId) {
      publish({
        ...session,
        error:
          "앱에 배정된 번호판과 다른 차량이에요. 번호판을 다시 확인해 주세요.",
      });
      emit("taxi_wrong_vehicle", lease.request, {
        vehicleId: session.selectedVehicleId,
      });
      return;
    }
    if (!canBoardTaxi(session, selected.id, latest.current.position)) return;
    publish({ ...session, phase: "boarding", error: null });
    emit("taxi_boarding_started", lease.request, { vehicleId: selected.id });
    schedule(lease, TAXI_BOARDING_MS, () => {
      if (current.current?.phase !== "boarding") return;
      publish({ ...current.current, phase: "departing" });
      emit("taxi_departure_started", lease.request, { vehicleId: selected.id });
      schedule(lease, TAXI_DEPARTURE_MS, () => {
        if (current.current?.phase !== "departing") return;
        emit("taxi_ride_completed", lease.request, { vehicleId: selected.id });
        settle(lease, { requestId: lease.request.id, vehicleId: selected.id });
      });
    });
  }, [emit, isCurrent, publish, schedule, settle]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const lease = active.current;
      if (lease) settle(lease, null, "unmounted");
    };
  }, [settle]);

  useEffect(() => {
    if (options.fieldId === "didi") return;
    const lease = active.current;
    if (lease) settle(lease, null, "field_changed");
  }, [options.fieldId, settle]);

  const visibleRide = options.fieldId === "didi" ? ride : null;
  const nearest =
    visibleRide?.phase === "waiting" ? nearestTaxi(options.position) : null;
  const nearVehicleId =
    nearest &&
    distance(options.position, nearest.position) <= TAXI_INTERACTION_RADIUS
      ? nearest.id
      : null;
  const interaction: InteractionTarget | null = nearest
    ? {
        id: nearest.id,
        point: nearest.position,
        approachPoint: nearest.approachPoint,
        radius: TAXI_INTERACTION_RADIUS,
      }
    : null;

  return {
    ride: visibleRide,
    start,
    cancel,
    selectVehicle,
    board,
    nearVehicleId,
    interaction,
    geometry: visibleRide ? getTaxiGeometry() : undefined,
    movementBlocked:
      visibleRide?.phase === "boarding" || visibleRide?.phase === "departing",
  };
}
