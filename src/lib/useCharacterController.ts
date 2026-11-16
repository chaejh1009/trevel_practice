import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldId } from "./navigation";
import { FIELD_GEOMETRY, type FieldGeometry } from "./fieldGeometry";
import {
  advanceAlongPath,
  clampAxes,
  distance,
  facingFor,
  findPath,
  isWalkable,
  normalizeDirection,
  stepMovement,
} from "./movement";
import type { Facing, Point } from "./movement";

export interface InteractionTarget {
  id: string;
  point: Point;
  approachPoint: Point;
  /** Physical SVG pixels. */
  radius: number;
}

interface ControllerOptions {
  fieldId: FieldId | null;
  position: Point;
  onMove: (point: Point) => void;
  blocked: boolean;
  onInteract: (id?: string) => void;
  geometry?: FieldGeometry;
  /** undefined uses the field NPC; null disables the default target. */
  interaction?: InteractionTarget | null;
}

interface PendingInteraction {
  target: InteractionTarget;
  callbackId: string | undefined;
}
function geometryFor(options: ControllerOptions): FieldGeometry | null {
  return options.fieldId
    ? (options.geometry ?? FIELD_GEOMETRY[options.fieldId])
    : null;
}
function interactionFor(options: ControllerOptions): PendingInteraction | null {
  const geometry = geometryFor(options);
  if (!geometry) return null;
  if (options.interaction !== undefined) {
    return options.interaction
      ? { target: options.interaction, callbackId: options.interaction.id }
      : null;
  }
  // Preserve legacy NPC callbacks that do not receive an object identifier.
  return {
    target: {
      id: "field-npc",
      point: geometry.npcPoint,
      approachPoint: geometry.interactionPoint,
      radius: geometry.interactionRadius,
    },
    callbackId: undefined,
  };
}
function snapshotInteraction(
  interaction: PendingInteraction,
): PendingInteraction {
  return {
    callbackId: interaction.callbackId,
    target: {
      ...interaction.target,
      point: { ...interaction.target.point },
      approachPoint: { ...interaction.target.approachPoint },
    },
  };
}
const KEY_VECTOR: Record<string, Point> = {
  w: { x: 0, y: -1 },
  arrowup: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
  arrowdown: { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  arrowleft: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  arrowright: { x: 1, y: 0 },
};
function editable(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "input,textarea,select,[contenteditable]:not([contenteditable='false']),[role='textbox']",
      ),
    )
  );
}
function keyboardControl(target: EventTarget | null): boolean {
  return (
    editable(target) ||
    (target instanceof Element &&
      Boolean(
        target.closest(
          "button,a,[role='button'],[role='slider'],[role='menuitem']",
        ),
      ))
  );
}

export function useCharacterController(options: ControllerOptions) {
  const latest = useRef(options);
  latest.current = options;
  const positionRef = useRef(options.position);
  positionRef.current = options.position;
  const keys = useRef(new Set<string>());
  const touch = useRef<Point>({ x: 0, y: 0 });
  const path = useRef<Point[]>([]);
  const pendingInteraction = useRef<PendingInteraction | null>(null);
  const lastFrame = useRef<number | null>(null);
  const [direction, setDirection] = useState<Facing>("up");
  const [moving, setMoving] = useState(false);
  const [target, setTarget] = useState<Point | null>(null);
  const directionRef = useRef<Facing>("up");

  const stop = useCallback(() => {
    keys.current.clear();
    touch.current = { x: 0, y: 0 };
    path.current = [];
    pendingInteraction.current = null;
    lastFrame.current = null;
    setTarget(null);
    setMoving(false);
  }, []);

  const walkTo = useCallback((point: Point) => {
    const state = latest.current;
    if (!state.fieldId || state.blocked) return;
    const geometry = geometryFor(state);
    if (!geometry) return;
    const route = findPath(positionRef.current, point, geometry);
    keys.current.clear();
    touch.current = { x: 0, y: 0 };
    path.current = route;
    pendingInteraction.current = null;
    setTarget(route.length ? route[route.length - 1] : null);
    if (!route.length) setMoving(false);
  }, []);

  const approachInteraction = useCallback(
    (explicitTarget?: InteractionTarget) => {
      const state = latest.current;
      if (!state.fieldId || state.blocked) return;
      const selected = explicitTarget
        ? { target: explicitTarget, callbackId: explicitTarget.id }
        : interactionFor(state);
      if (!selected) return;
      // The selected object remains fixed even if the nearest keyboard target changes.
      const pending = snapshotInteraction(selected);
      const interaction = pending.target;
      if (
        distance(positionRef.current, interaction.point) <= interaction.radius
      ) {
        stop();
        const facing = facingFor(
          {
            x: (interaction.point.x - positionRef.current.x) * 10,
            y: (interaction.point.y - positionRef.current.y) * 6.2,
          },
          directionRef.current,
        );
        directionRef.current = facing;
        setDirection(facing);
        state.onInteract(pending.callbackId);
        return;
      }
      walkTo(interaction.approachPoint);
      pendingInteraction.current = path.current.length > 0 ? pending : null;
    },
    [stop, walkTo],
  );

  const setTouchDirection = useCallback((x: number, y: number) => {
    const state = latest.current;
    if (!state.fieldId || state.blocked) return;
    const vector = normalizeDirection({ x, y });
    touch.current = vector;
    if (vector.x || vector.y) {
      path.current = [];
      pendingInteraction.current = null;
      setTarget(null);
    }
  }, []);

  useEffect(() => {
    stop();
    if (!options.fieldId) return;
    directionRef.current = "up";
    setDirection("up");
  }, [options.fieldId, options.geometry, stop]);

  useEffect(() => {
    if (!options.fieldId) return;
    const geometry = geometryFor(options);
    if (!geometry) return;
    // Session initialization can reset the shared position after a field first mounts.
    // Correct an invalid external spawn; ordinary walking never enters this branch.
    if (!isWalkable(options.position, geometry)) {
      stop();
      positionRef.current = geometry.spawn;
      latest.current.onMove(geometry.spawn);
    }
  }, [
    options.fieldId,
    options.geometry,
    options.position.x,
    options.position.y,
    stop,
  ]);

  useEffect(() => {
    if (options.blocked) stop();
  }, [options.blocked, stop]);

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      const state = latest.current;
      if (
        !state.fieldId ||
        state.blocked ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        editable(event.target)
      )
        return;
      const key = event.key.toLowerCase();
      const element = event.target instanceof Element ? event.target : null;
      const worldInput = Boolean(element?.closest("[data-world-input]"));
      // NPCs and the focusable world canvas keep game controls after dialogue.
      // Native form/menu widgets, and Space on a button, keep their own keyboard action.
      if (
        element?.closest(
          "[role='slider'],[role='menu'],[role='menuitem'],[role='listbox']",
        )
      )
        return;
      if (keyboardControl(event.target) && (!worldInput || key === " ")) return;
      if (KEY_VECTOR[key]) {
        event.preventDefault();
        keys.current.add(key);
        path.current = [];
        pendingInteraction.current = null;
        setTarget(null);
      } else if ((key === "f" || key === "e" || key === " ") && !event.repeat) {
        event.preventDefault();
        approachInteraction();
      }
    }
    function keyUp(event: KeyboardEvent) {
      keys.current.delete(event.key.toLowerCase());
    }
    function onFocus(event: FocusEvent) {
      if (editable(event.target)) stop();
      else if (keyboardControl(event.target)) keys.current.clear();
    }
    function visibility() {
      if (document.visibilityState !== "visible") stop();
    }
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", stop);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", stop);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [approachInteraction, stop]);

  useEffect(() => {
    let frame = 0;
    let disposed = false;
    function tick(timestamp: number) {
      if (disposed) return;
      const state = latest.current;
      const seconds =
        lastFrame.current === null ? 0 : (timestamp - lastFrame.current) / 1000;
      lastFrame.current = timestamp;
      if (
        !state.fieldId ||
        state.blocked ||
        document.visibilityState !== "visible" ||
        editable(document.activeElement)
      ) {
        if (
          keys.current.size ||
          path.current.length ||
          touch.current.x ||
          touch.current.y
        )
          stop();
        setMoving(false);
      } else {
        const geometry = geometryFor(state)!;
        let input = { ...touch.current };
        for (const key of keys.current) {
          input.x += KEY_VECTOR[key]?.x ?? 0;
          input.y += KEY_VECTOR[key]?.y ?? 0;
        }
        // W + ArrowUp is one direction, rather than a stronger diagonal axis.
        input = clampAxes(input);
        const keyboard = Boolean(input.x || input.y);
        const start = positionRef.current;
        let result: ReturnType<typeof stepMovement> | null = null;
        if (keyboard) result = stepMovement(start, input, seconds, geometry);
        else if (path.current.length) {
          const navigation = advanceAlongPath(
            start,
            path.current,
            seconds,
            geometry,
          );
          path.current = navigation.path;
          result = navigation;
        }
        if (result) {
          setMoving(result.moved);
          if (result.moved) {
            positionRef.current = result.position;
            directionRef.current = result.facing;
            setDirection(result.facing);
            state.onMove(result.position);
          }
          if (!keyboard && !path.current.length) {
            setTarget(null);
            setMoving(false);
            const pending = pendingInteraction.current;
            if (pending) {
              pendingInteraction.current = null;
              // Check the originally selected object, rather than a new nearest target.
              const interaction = pending.target;
              if (
                distance(positionRef.current, interaction.point) <=
                interaction.radius
              ) {
                const facing = facingFor(
                  {
                    x: (interaction.point.x - positionRef.current.x) * 10,
                    y: (interaction.point.y - positionRef.current.y) * 6.2,
                  },
                  directionRef.current,
                );
                directionRef.current = facing;
                setDirection(facing);
                state.onInteract(pending.callbackId);
              }
            }
          }
        } else setMoving(false);
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, [stop]);

  const interaction = interactionFor(options)?.target;
  const canInteract =
    !options.blocked &&
    Boolean(interaction) &&
    distance(options.position, interaction!.point) <= interaction!.radius;
  return {
    direction,
    moving,
    canInteract,
    target,
    walkTo,
    approachInteraction,
    setTouchDirection,
    stop,
  };
}
