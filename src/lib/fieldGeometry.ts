import type { FieldId } from "./navigation";
import type { CollisionGeometry, Point } from "./movement";

export interface FieldGeometry extends CollisionGeometry {
  spawn: Point;
  npcPoint: Point;
  interactionPoint: Point;
  /** Physical SVG pixels, rather than percentages. */
  interactionRadius: number;
}
const polygon = (...points: [number, number][]): Point[] =>
  points.map(([x, y]) => ({ x: x / 10, y: y / 6.2 }));
const footprint = (x: number, y: number, width: number, depth: number) =>
  polygon(
    [x, y],
    [x + width, y + width / 2],
    [x + width - depth, y + (width + depth) / 2],
    [x - depth, y + depth / 2],
  );
function box(x: number, y: number, width: number, height: number) {
  return polygon(
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  );
}
function belt(x1: number, y1: number, x2: number, y2: number) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const x = ((y2 - y1) / length) * 2.5,
    y = ((x2 - x1) / length) * 2.5;
  return polygon(
    [x1 + x, y1 - y],
    [x2 + x, y2 - y],
    [x2 - x, y2 + y],
    [x1 - x, y1 + y],
  );
}
const indoorFloor = polygon([125, 298], [495, 106], [884, 303], [513, 539]);
function geometry(
  interactionPoint: Point,
  obstacles: Point[][],
  outdoor = false,
): FieldGeometry {
  const npcPoint = { x: interactionPoint.x, y: interactionPoint.y - 4 };
  return {
    floor: outdoor
      ? polygon([100, 315], [477, 90], [900, 301], [523, 538])
      : indoorFloor,
    footRadius: 7,
    obstacles: [
      ...obstacles,
      box(npcPoint.x * 10 - 7, npcPoint.y * 6.2 - 5, 14, 10),
    ],
    spawn: outdoor ? { x: 50, y: 82 } : { x: 50, y: 78 },
    npcPoint,
    interactionPoint,
    interactionRadius: 95,
  };
}
/** Footprints align with the furniture bases in FieldWorld's 1000 × 620 SVG. */
export const FIELD_GEOMETRY: Record<FieldId, FieldGeometry> = {
  prepare: geometry({ x: 66, y: 51 }, [
    footprint(458, 148, 45, 42),
    footprint(667, 217, 114, 48),
    footprint(309, 307, 117, 52),
    footprint(451, 378, 66, 40),
    box(641, 328, 32, 16),
    box(679, 347, 23, 14),
    box(746, 286, 26, 15),
    box(187, 306, 24, 14),
  ]),
  immigration: geometry({ x: 65, y: 58 }, [
    footprint(553, 222, 64, 51),
    footprint(657, 274, 64, 51),
    footprint(761, 326, 64, 51),
    footprint(244, 379, 74, 27),
    belt(327, 334, 450, 398),
    belt(377, 303, 501, 367),
    belt(359, 408, 483, 472),
    belt(410, 378, 532, 440),
    belt(450, 398, 501, 367),
    belt(359, 408, 410, 378),
    belt(483, 472, 532, 440),
  ]),
  hotel: geometry({ x: 66, y: 54 }, [
    footprint(611, 253, 157, 49),
    footprint(308, 341, 70, 42),
    footprint(255, 415, 60, 35),
    box(613, 402, 27, 16),
    box(178, 311, 26, 16),
    box(798, 330, 28, 17),
    box(432, 168, 24, 14),
  ]),
  didi: geometry(
    { x: 71, y: 61 },
    [
      footprint(477, 126, 259, 92),
      footprint(744, 327, 51, 20),
      footprint(623, 330, 74, 27),
      box(651, 367, 25, 15),
      box(678, 378, 20, 14),
      box(819, 304, 26, 16),
    ],
    true,
  ),
};
