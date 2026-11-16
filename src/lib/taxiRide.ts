import { FIELD_GEOMETRY, type FieldGeometry } from "./fieldGeometry";
import { distance, type Point } from "./movement";

export interface TaxiVehicle {
  id: string;
  plate: string;
  position: Point;
  approachPoint: Point;
  arrivalDelay: number;
}

export const TAXI_VEHICLES: readonly TaxiVehicle[] = [
  {
    id: "cab-a",
    plate: "沪B·DEMO",
    position: { x: 28, y: 335 / 6.2 },
    approachPoint: { x: 30.7, y: 318 / 6.2 },
    arrivalDelay: 0,
  },
  {
    id: "cab-b",
    plate: "沪A·DEMO",
    position: { x: 40.7, y: 398 / 6.2 },
    approachPoint: { x: 43.4, y: 381 / 6.2 },
    arrivalDelay: 350,
  },
  {
    id: "cab-c",
    plate: "沪A·TRAIN",
    position: { x: 53.4, y: 461 / 6.2 },
    approachPoint: { x: 56.1, y: 444 / 6.2 },
    arrivalDelay: 700,
  },
];

export interface TaxiRideRequest {
  id: string;
  destinationId: string;
  destinationName: string;
  vehicle: "express" | "taxi";
  fare: number;
  assignedVehicleId: string;
}
export type TaxiRidePhase = "arriving" | "waiting" | "boarding" | "departing";
export interface TaxiRideSession {
  request: TaxiRideRequest;
  phase: TaxiRidePhase;
  selectedVehicleId: string | null;
  error: string | null;
}
/** null means the field boarding sequence was cancelled. */
export type TaxiBoardingResult = {
  requestId: string;
  vehicleId: string;
} | null;

export const TAXI_ARRIVAL_MS = 2600;
export const TAXI_BOARDING_MS = 1000;
export const TAXI_DEPARTURE_MS = 1800;
/** Physical SVG pixels, matching movement.distance rather than normalized axes. */
export const TAXI_INTERACTION_RADIUS = 70;

export function getTaxiVehicle(id: string): TaxiVehicle | undefined {
  return TAXI_VEHICLES.find((vehicle) => vehicle.id === id);
}

export function nearestTaxi(position: Point): TaxiVehicle | null {
  if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) return null;
  let nearest: TaxiVehicle | null = null;
  let minimum = Infinity;
  for (const vehicle of TAXI_VEHICLES) {
    const separation = distance(position, vehicle.position);
    if (separation < minimum) {
      minimum = separation;
      nearest = vehicle;
    }
  }
  return nearest;
}

export function canBoardTaxi(
  session: TaxiRideSession | null,
  vehicleId: string,
  position: Point,
): boolean {
  if (
    !session ||
    session.phase !== "waiting" ||
    session.selectedVehicleId !== vehicleId ||
    session.request.assignedVehicleId !== vehicleId
  )
    return false;
  const vehicle = getTaxiVehicle(vehicleId);
  return Boolean(
    vehicle && distance(position, vehicle.position) <= TAXI_INTERACTION_RADIUS,
  );
}

function carFootprint(vehicle: TaxiVehicle): Point[] {
  const x = vehicle.position.x * 10,
    y = vehicle.position.y * 6.2;
  return [
    [x - 50, y + 14],
    [x + 17, y + 49],
    [x + 50, y + 32],
    [x - 17, y - 3],
  ].map(([px, py]) => ({ x: px / 10, y: py / 6.2 }));
}

// movement's navigation grid is cached by geometry identity. Never rebuild per render.
const taxiGeometry: FieldGeometry = {
  ...FIELD_GEOMETRY.didi,
  obstacles: [
    ...FIELD_GEOMETRY.didi.obstacles,
    ...TAXI_VEHICLES.map(carFootprint),
  ],
};

export function getTaxiGeometry(): FieldGeometry {
  return taxiGeometry;
}
