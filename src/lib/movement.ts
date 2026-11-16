/** Pure movement and navigation in the scene's physical 1000 × 620 SVG space. */
export type Point = { x: number; y: number };
export type Facing = "up" | "down" | "left" | "right";
export interface CollisionGeometry {
  floor: readonly Point[];
  obstacles: readonly (readonly Point[])[];
  footRadius?: number;
}
export const SCENE_WIDTH = 1000;
export const SCENE_HEIGHT = 620;
export const WALK_SPEED = 175;
export const MAX_FRAME_SECONDS = 0.05;
const GRID_PIXELS = 10;
const EPSILON = 0.000001;
const pixel = (point: Point) => ({ x: point.x * 10, y: point.y * 6.2 });
const normalized = (point: Point) => ({ x: point.x / 10, y: point.y / 6.2 });
export const distance = (a: Point, b: Point) =>
  Math.hypot((a.x - b.x) * 10, (a.y - b.y) * 6.2);
export const clampFrame = (seconds: number) =>
  Number.isFinite(seconds)
    ? Math.max(0, Math.min(MAX_FRAME_SECONDS, seconds))
    : 0;
export function clampAxes(input: Point): Point {
  return {
    x: Math.max(-1, Math.min(1, input.x)),
    y: Math.max(-1, Math.min(1, input.y)),
  };
}
export function normalizeDirection(input: Point): Point {
  const length = Math.hypot(input.x, input.y);
  return length > 0 && Number.isFinite(length)
    ? { x: input.x / length, y: input.y / length }
    : { x: 0, y: 0 };
}
export function facingFor(vector: Point, fallback: Facing = "down"): Facing {
  if (!vector.x && !vector.y) return fallback;
  return Math.abs(vector.x) >= Math.abs(vector.y)
    ? vector.x < 0
      ? "left"
      : "right"
    : vector.y < 0
      ? "up"
      : "down";
}
function pointInPolygon(point: Point, polygon: readonly Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
function edgeDistance(point: Point, a: Point, b: Point) {
  const p = pixel(point),
    start = pixel(a),
    end = pixel(b);
  const dx = end.x - start.x,
    dy = end.y - start.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - start.x) * dx + (p.y - start.y) * dy) / (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(p.x - start.x - t * dx, p.y - start.y - t * dy);
}
function nearEdge(point: Point, polygon: readonly Point[], radius: number) {
  return polygon.some(
    (a, index) =>
      edgeDistance(point, a, polygon[(index + 1) % polygon.length]) < radius,
  );
}
export function isWalkable(point: Point, geometry: CollisionGeometry): boolean {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const radius = geometry.footRadius ?? 7;
  return (
    pointInPolygon(point, geometry.floor) &&
    !nearEdge(point, geometry.floor, radius) &&
    !geometry.obstacles.some(
      (polygon) =>
        pointInPolygon(point, polygon) || nearEdge(point, polygon, radius),
    )
  );
}
export function segmentWalkable(
  start: Point,
  end: Point,
  geometry: CollisionGeometry,
): boolean {
  const samples = Math.max(1, Math.ceil(distance(start, end) / 3));
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    if (
      !isWalkable(
        {
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t,
        },
        geometry,
      )
    )
      return false;
  }
  return true;
}
function movePixels(
  position: Point,
  delta: Point,
  geometry: CollisionGeometry,
  slide: boolean,
): Point {
  let current = { ...position };
  // Short swept steps prevent crossing a thin queue belt at low frame rates.
  const steps = Math.max(1, Math.ceil(Math.hypot(delta.x, delta.y) / 3));
  const dx = delta.x / steps / 10,
    dy = delta.y / steps / 6.2;
  for (let i = 0; i < steps; i++) {
    const next = { x: current.x + dx, y: current.y + dy };
    if (isWalkable(next, geometry)) current = next;
    else if (slide) {
      const horizontal = { x: current.x + dx, y: current.y };
      if (isWalkable(horizontal, geometry)) current = horizontal;
      const vertical = { x: current.x, y: current.y + dy };
      if (isWalkable(vertical, geometry)) current = vertical;
    } else break;
  }
  return current;
}
export function stepMovement(
  position: Point,
  input: Point,
  seconds: number,
  geometry: CollisionGeometry,
  speed = WALK_SPEED,
) {
  const direction = normalizeDirection(input);
  const travel = speed * clampFrame(seconds);
  const next = movePixels(
    position,
    { x: direction.x * travel, y: direction.y * travel },
    geometry,
    true,
  );
  const actual = {
    x: (next.x - position.x) * 10,
    y: (next.y - position.y) * 6.2,
  };
  return {
    position: next,
    moved: distance(position, next) > EPSILON,
    facing: facingFor(actual),
  };
}

interface GridNode {
  point: Point;
  column: number;
  row: number;
  key: string;
}
const grids = new WeakMap<CollisionGeometry, Map<string, GridNode>>();
function getGrid(geometry: CollisionGeometry) {
  let grid = grids.get(geometry);
  if (!grid) {
    grid = new Map();
    for (let row = 0; row <= SCENE_HEIGHT / GRID_PIXELS; row++)
      for (let column = 0; column <= SCENE_WIDTH / GRID_PIXELS; column++) {
        const point = normalized({
          x: column * GRID_PIXELS,
          y: row * GRID_PIXELS,
        });
        if (isWalkable(point, geometry)) {
          const key = `${column}:${row}`;
          grid.set(key, { point, column, row, key });
        }
      }
    grids.set(geometry, grid);
  }
  return grid;
}
function nearestNode(
  point: Point,
  grid: Map<string, GridNode>,
  geometry?: CollisionGeometry,
) {
  const candidates = [...grid.values()].sort(
    (a, b) => distance(a.point, point) - distance(b.point, point),
  );
  return geometry
    ? candidates.find((node) => segmentWalkable(point, node.point, geometry))
    : candidates[0];
}
export function nearestWalkable(
  point: Point,
  geometry: CollisionGeometry,
): Point | null {
  if (isWalkable(point, geometry)) return point;
  return nearestNode(point, getGrid(geometry))?.point ?? null;
}
class MinHeap {
  entries: { node: GridNode; priority: number }[] = [];
  push(node: GridNode, priority: number) {
    const item = { node, priority };
    let index = this.entries.length;
    this.entries.push(item);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.entries[parent].priority <= priority) break;
      this.entries[index] = this.entries[parent];
      index = parent;
    }
    this.entries[index] = item;
  }
  pop() {
    const result = this.entries[0];
    const last = this.entries.pop();
    if (this.entries.length && last) {
      let index = 0;
      while (index * 2 + 1 < this.entries.length) {
        let child = index * 2 + 1;
        if (
          child + 1 < this.entries.length &&
          this.entries[child + 1].priority < this.entries[child].priority
        )
          child++;
        if (last.priority <= this.entries[child].priority) break;
        this.entries[index] = this.entries[child];
        index = child;
      }
      this.entries[index] = last;
    }
    return result;
  }
}
/** A* avoids obstacles; an invalid click resolves to the nearest reachable floor. */
export function findPath(
  start: Point,
  destination: Point,
  geometry: CollisionGeometry,
): Point[] {
  if (
    !isWalkable(start, geometry) ||
    !Number.isFinite(destination.x) ||
    !Number.isFinite(destination.y)
  )
    return [];
  if (segmentWalkable(start, destination, geometry))
    return distance(start, destination) < EPSILON ? [] : [destination];
  const grid = getGrid(geometry);
  const first = nearestNode(start, grid, geometry);
  const target = nearestWalkable(destination, geometry);
  const goal = target && nearestNode(target, grid, geometry);
  if (!first || !target || !goal) return [];
  const open = new MinHeap();
  const cost = new Map([[first.key, 0]]);
  const parents = new Map<string, string>();
  const closed = new Set<string>();
  let best = first;
  open.push(first, distance(first.point, goal.point));
  while (open.entries.length) {
    const current = open.pop().node;
    if (closed.has(current.key)) continue;
    closed.add(current.key);
    if (
      distance(current.point, destination) < distance(best.point, destination)
    )
      best = current;
    if (current.key === goal.key) {
      best = current;
      break;
    }
    for (const dx of [-1, 0, 1])
      for (const dy of [-1, 0, 1]) {
        if (!dx && !dy) continue;
        const neighbor = grid.get(`${current.column + dx}:${current.row + dy}`);
        if (!neighbor || closed.has(neighbor.key)) continue;
        if (
          dx &&
          dy &&
          (!grid.has(`${current.column + dx}:${current.row}`) ||
            !grid.has(`${current.column}:${current.row + dy}`))
        )
          continue;
        if (!segmentWalkable(current.point, neighbor.point, geometry)) continue;
        const nextCost =
          cost.get(current.key)! + distance(current.point, neighbor.point);
        if (nextCost >= (cost.get(neighbor.key) ?? Infinity)) continue;
        cost.set(neighbor.key, nextCost);
        parents.set(neighbor.key, current.key);
        open.push(neighbor, nextCost + distance(neighbor.point, goal.point));
      }
  }
  const points: Point[] = [];
  let cursor: string | undefined = best.key;
  while (cursor) {
    points.unshift(grid.get(cursor)!.point);
    cursor = parents.get(cursor);
  }
  if (best.key === goal.key && segmentWalkable(best.point, target, geometry))
    points.push(target);
  // Keep turns only where a direct swept line would cross furniture.
  const smoothed: Point[] = [];
  let anchor = start,
    index = 0;
  while (index < points.length) {
    let furthest = index;
    while (
      furthest + 1 < points.length &&
      segmentWalkable(anchor, points[furthest + 1], geometry)
    )
      furthest++;
    if (distance(anchor, points[furthest]) > EPSILON)
      smoothed.push(points[furthest]);
    anchor = points[furthest];
    index = furthest + 1;
  }
  return smoothed;
}
export function advanceAlongPath(
  position: Point,
  path: readonly Point[],
  seconds: number,
  geometry: CollisionGeometry,
  speed = WALK_SPEED,
) {
  const remaining = [...path];
  let next = position;
  let travel = speed * clampFrame(seconds);
  while (remaining.length && travel > EPSILON) {
    const waypoint = remaining[0],
      length = distance(next, waypoint);
    if (length <= EPSILON) {
      remaining.shift();
      continue;
    }
    const amount = Math.min(length, travel);
    const delta = {
      x: (((waypoint.x - next.x) * 10) / length) * amount,
      y: (((waypoint.y - next.y) * 6.2) / length) * amount,
    };
    const moved = movePixels(next, delta, geometry, false);
    const actual = distance(next, moved);
    next = moved;
    travel -= actual;
    if (actual < amount - 0.01) break;
    if (amount >= length - EPSILON) {
      next = waypoint;
      remaining.shift();
    }
  }
  return {
    position: next,
    path: remaining,
    arrived: remaining.length === 0,
    moved: distance(position, next) > EPSILON,
    facing: facingFor({
      x: (next.x - position.x) * 10,
      y: (next.y - position.y) * 6.2,
    }),
  };
}
