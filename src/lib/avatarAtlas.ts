import type { Facing } from "./movement";

export const TRAVELER_ATLAS = {
  src: "/avatars/traveler-atlas-v2.png",
  width: 1254,
  height: 1254,
  columns: 4,
  rows: 4,
} as const;
export const TRAVELER_ATLAS_ROWS: Record<Facing, number> = {
  down: 0,
  left: 1,
  right: 2,
  up: 3,
};
/** Keep fractional cells: the generated original is 1254px, so each cell is 313.5px. */
export function getAtlasFrame(direction: Facing = "down", frame = 0) {
  const column = Number.isFinite(frame) ? ((Math.floor(frame) % 4) + 4) % 4 : 0;
  const row = TRAVELER_ATLAS_ROWS[direction] ?? 0;
  const width = TRAVELER_ATLAS.width / TRAVELER_ATLAS.columns;
  const height = TRAVELER_ATLAS.height / TRAVELER_ATLAS.rows;
  return { x: column * width, y: row * height, width, height };
}
