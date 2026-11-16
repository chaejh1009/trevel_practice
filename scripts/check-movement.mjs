import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
try {
  const {
    distance,
    clampAxes,
    stepMovement,
    advanceAlongPath,
    findPath,
    isWalkable,
    segmentWalkable,
    WALK_SPEED,
    MAX_FRAME_SECONDS,
  } = await server.ssrLoadModule("/src/lib/movement.ts");
  const { FIELD_GEOMETRY } = await server.ssrLoadModule(
    "/src/lib/fieldGeometry.ts",
  );
  const open = {
    floor: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    obstacles: [],
    footRadius: 0,
  };
  const start = { x: 50, y: 50 };
  assert.deepEqual(
    clampAxes({ x: 1, y: -2 }),
    { x: 1, y: -1 },
    "Duplicate WASD/arrow aliases do not bias diagonal input",
  );
  const cardinal = stepMovement(start, { x: 1, y: 0 }, 1 / 60, open);
  const diagonal = stepMovement(start, { x: 1, y: 1 }, 1 / 60, open);
  assert.ok(
    Math.abs(distance(start, cardinal.position) - WALK_SPEED / 60) < 1e-8,
    "Cardinal speed is measured in physical SVG pixels",
  );
  assert.ok(
    Math.abs(
      distance(start, cardinal.position) - distance(start, diagonal.position),
    ) < 1e-8,
    "Diagonal movement is normalized",
  );
  const longFrame = stepMovement(start, { x: 0, y: 1 }, 20, open);
  assert.ok(
    distance(start, longFrame.position) <=
      WALK_SPEED * MAX_FRAME_SECONDS + 1e-8,
    "Tab resume cannot jump across the room",
  );
  assert.deepEqual(
    stepMovement(start, { x: 1, y: 0 }, 0, open).position,
    start,
    "First frame does not move",
  );
  assert.deepEqual(
    stepMovement(start, { x: 0, y: 0 }, 1 / 60, open).position,
    start,
    "Released input remains stationary",
  );
  const tinyWaypoint = advanceAlongPath(
    start,
    [
      { x: 50.005, y: 50 },
      { x: 60, y: 50 },
    ],
    1 / 60,
    open,
  );
  assert.ok(
    distance(start, tinyWaypoint.position) <= WALK_SPEED / 60 + 1e-8,
    "A short first waypoint still consumes the frame's walking distance",
  );
  const wall = {
    ...open,
    obstacles: [
      [
        { x: 52, y: 0 },
        { x: 53, y: 0 },
        { x: 53, y: 90 },
        { x: 52, y: 90 },
      ],
    ],
  };
  let position = { x: 50, y: 50 };
  for (let index = 0; index < 120; index++)
    position = stepMovement(position, { x: 1, y: 1 }, 1 / 60, wall).position;
  assert.ok(
    position.x < 52 && position.y > 70,
    "Keyboard slides along furniture without crossing it",
  );
  assert.ok(isWalkable(position, wall), "Sliding finishes on walkable floor");
  const aroundWall = findPath({ x: 48, y: 50 }, { x: 58, y: 50 }, wall);
  assert.ok(
    aroundWall.length > 1,
    "A* routes around an obstacle rather than teleporting through it",
  );
  let anchor = { x: 48, y: 50 };
  for (const waypoint of aroundWall) {
    assert.ok(
      segmentWalkable(anchor, waypoint, wall),
      "Every A* segment respects obstacle edges",
    );
    anchor = waypoint;
  }
  assert.ok(
    distance(anchor, { x: 58, y: 50 }) < 0.1,
    "Detour reaches the requested destination",
  );

  for (const [field, geometry] of Object.entries(FIELD_GEOMETRY)) {
    assert.ok(
      isWalkable(geometry.spawn, geometry),
      `${field}: spawn is walkable`,
    );
    assert.ok(
      isWalkable(geometry.interactionPoint, geometry),
      `${field}: NPC approach point is walkable`,
    );
    assert.ok(
      distance(geometry.interactionPoint, geometry.npcPoint) <=
        geometry.interactionRadius,
      `${field}: arrival is inside dialogue range`,
    );
    const path = findPath(geometry.spawn, geometry.interactionPoint, geometry);
    assert.ok(path.length > 0, `${field}: a route to the NPC exists`);
    anchor = geometry.spawn;
    for (const waypoint of path) {
      assert.ok(
        segmentWalkable(anchor, waypoint, geometry),
        `${field}: route avoids furniture and queue belts`,
      );
      anchor = waypoint;
    }
    assert.ok(
      distance(anchor, geometry.interactionPoint) < 0.1,
      `${field}: route reaches the exact approach point`,
    );
    let position = geometry.spawn,
      remaining = path;
    for (let frame = 0; frame < 2000 && remaining.length; frame++) {
      const next = advanceAlongPath(position, remaining, 1 / 60, geometry);
      assert.ok(
        distance(position, next.position) <= WALK_SPEED / 60 + 1e-6,
        `${field}: click walking remains continuous`,
      );
      assert.ok(
        isWalkable(next.position, geometry),
        `${field}: every animated step is collision-safe`,
      );
      position = next.position;
      remaining = next.path;
    }
    assert.equal(
      remaining.length,
      0,
      `${field}: continuous navigation completes`,
    );
    assert.ok(
      distance(position, geometry.interactionPoint) < 0.1,
      `${field}: continuous navigation arrives`,
    );
    const outside = findPath(geometry.spawn, { x: -30, y: -20 }, geometry);
    assert.ok(
      outside.length > 0,
      `${field}: an outside click chooses reachable floor`,
    );
    assert.ok(
      isWalkable(outside.at(-1), geometry),
      `${field}: an outside click cannot leave the scene`,
    );
    position = geometry.spawn;
    for (let frame = 0; frame < 1200; frame++)
      position = stepMovement(
        position,
        { x: 1, y: 0 },
        1 / 60,
        geometry,
      ).position;
    assert.ok(
      isWalkable(position, geometry),
      `${field}: held movement stops at the scene boundary`,
    );
  }
  console.log(
    "Movement checks passed: normalized speed, dt cap, collision sliding, continuous A* detours, four NPC routes, and floor boundaries.",
  );
} finally {
  await server.close();
}
