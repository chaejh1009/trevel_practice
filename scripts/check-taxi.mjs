import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
try {
  const taxi = await server.ssrLoadModule("/src/lib/taxiRide.ts");
  const movement = await server.ssrLoadModule("/src/lib/movement.ts");
  const { FIELD_GEOMETRY } = await server.ssrLoadModule(
    "/src/lib/fieldGeometry.ts",
  );
  const {
    TAXI_VEHICLES,
    TAXI_ARRIVAL_MS,
    TAXI_BOARDING_MS,
    TAXI_DEPARTURE_MS,
    TAXI_INTERACTION_RADIUS,
    getTaxiVehicle,
    nearestTaxi,
    canBoardTaxi,
    getTaxiGeometry,
  } = taxi;
  const {
    distance,
    findPath,
    isWalkable,
    segmentWalkable,
    advanceAlongPath,
    WALK_SPEED,
  } = movement;

  assert.equal(
    TAXI_VEHICLES.length,
    3,
    "Boarding presents three candidate cars",
  );
  assert.equal(
    new Set(TAXI_VEHICLES.map((car) => car.id)).size,
    3,
    "Every car has a unique identity",
  );
  assert.equal(
    new Set(TAXI_VEHICLES.map((car) => car.plate)).size,
    3,
    "Candidate plates remain distinguishable",
  );
  assert.equal(
    TAXI_VEHICLES.filter((car) => car.plate === "沪A·DEMO").length,
    1,
    "Exactly one car matches the assigned demo plate",
  );
  assert.deepEqual(
    TAXI_VEHICLES.map((car) => car.arrivalDelay),
    [0, 350, 700],
    "Arrival staggering is stable across field renders",
  );
  assert.deepEqual(
    [
      TAXI_ARRIVAL_MS,
      TAXI_BOARDING_MS,
      TAXI_DEPARTURE_MS,
      TAXI_INTERACTION_RADIUS,
    ],
    [2600, 1000, 1800, 70],
  );
  assert.equal(
    getTaxiVehicle("unknown-cab"),
    undefined,
    "Unknown cars cannot resolve to a fleet member",
  );
  for (const car of TAXI_VEHICLES) {
    assert.equal(getTaxiVehicle(car.id), car);
    assert.equal(
      nearestTaxi(car.position)?.id,
      car.id,
      "Standing at a car identifies that physical car",
    );
  }
  assert.equal(
    nearestTaxi({ x: 28, y: 75 })?.id,
    "cab-a",
    "Nearest-car distance weights the 1000×620 scene axes in physical pixels",
  );
  assert.equal(
    nearestTaxi({ x: NaN, y: 50 }),
    null,
    "Invalid movement cannot select a car",
  );
  assert.equal(
    nearestTaxi({ x: 50, y: Infinity }),
    null,
    "Infinite coordinates cannot select a car",
  );

  const assigned = getTaxiVehicle("cab-b");
  const request = {
    id: "ride-1",
    destinationId: "bund",
    destinationName: "와이탄 가든 호텔",
    vehicle: "express",
    fare: 160,
    assignedVehicleId: assigned.id,
  };
  const waiting = {
    request,
    phase: "waiting",
    selectedVehicleId: assigned.id,
    error: null,
  };
  assert.equal(
    canBoardTaxi(waiting, assigned.id, assigned.approachPoint),
    true,
    "The selected assigned car can be boarded at its reachable door",
  );
  const insideBoundary = {
    x: assigned.position.x + (TAXI_INTERACTION_RADIUS - 0.01) / 10,
    y: assigned.position.y,
  };
  const outsideBoundary = {
    x: assigned.position.x + (TAXI_INTERACTION_RADIUS + 0.01) / 10,
    y: assigned.position.y,
  };
  assert.equal(
    canBoardTaxi(waiting, assigned.id, insideBoundary),
    true,
    "Boarding is allowed inside the physical interaction radius",
  );
  assert.equal(
    canBoardTaxi(waiting, assigned.id, {
      x: assigned.position.x + TAXI_INTERACTION_RADIUS / 10,
      y: assigned.position.y,
    }),
    true,
    "The physical boarding boundary is inclusive",
  );
  assert.equal(
    canBoardTaxi(waiting, assigned.id, outsideBoundary),
    false,
    "Boarding is rejected outside the physical interaction radius",
  );
  assert.equal(
    canBoardTaxi(waiting, assigned.id, FIELD_GEOMETRY.didi.spawn),
    false,
    "A waiting assigned car cannot be boarded remotely from spawn",
  );
  for (const phase of ["arriving", "boarding", "departing"])
    assert.equal(
      canBoardTaxi({ ...waiting, phase }, assigned.id, assigned.approachPoint),
      false,
      `A ${phase} car cannot accept another boarding action`,
    );
  assert.equal(
    canBoardTaxi(
      { ...waiting, selectedVehicleId: null },
      assigned.id,
      assigned.approachPoint,
    ),
    false,
    "Proximity alone does not select a car",
  );
  assert.equal(
    canBoardTaxi(
      { ...waiting, selectedVehicleId: "cab-a" },
      assigned.id,
      assigned.approachPoint,
    ),
    false,
    "A stale selection cannot board a different car",
  );
  for (const wrong of TAXI_VEHICLES.filter((car) => car.id !== assigned.id))
    assert.equal(
      canBoardTaxi(
        { ...waiting, selectedVehicleId: wrong.id },
        wrong.id,
        wrong.approachPoint,
      ),
      false,
      "Selecting a nearby wrong plate cannot complete boarding",
    );
  assert.equal(
    canBoardTaxi(
      {
        ...waiting,
        request: { ...request, assignedVehicleId: "missing" },
        selectedVehicleId: "missing",
      },
      "missing",
      assigned.approachPoint,
    ),
    false,
    "An unknown assigned ID cannot bypass the fleet",
  );
  assert.equal(
    canBoardTaxi(waiting, assigned.id, { x: NaN, y: assigned.position.y }),
    false,
    "A corrupt position cannot satisfy proximity",
  );
  for (const car of TAXI_VEHICLES)
    assert.equal(
      canBoardTaxi(null, car.id, car.approachPoint),
      false,
      "Cancelling the session disables boarding for every car",
    );
  const snapshot = JSON.stringify(waiting);
  canBoardTaxi(waiting, "cab-a", assigned.approachPoint);
  assert.equal(
    JSON.stringify(waiting),
    snapshot,
    "Boarding guards do not mutate the active request or phase",
  );

  const base = FIELD_GEOMETRY.didi,
    before = base.obstacles.length;
  const geometry = getTaxiGeometry();
  assert.equal(
    getTaxiGeometry(),
    geometry,
    "Repeated geometry reads preserve the navigation-grid cache key",
  );
  assert.equal(
    base.obstacles.length,
    before,
    "Fleet footprints do not mutate the shared field geometry",
  );
  assert.equal(
    geometry.obstacles.length,
    before + 3,
    "Each physical car contributes one collision footprint",
  );
  assert.equal(
    geometry.floor,
    base.floor,
    "Taxi boarding retains the field floor",
  );
  assert.ok(
    isWalkable(geometry.spawn, geometry),
    "The fleet does not cover the player spawn",
  );
  assert.ok(
    isWalkable(geometry.interactionPoint, geometry),
    "The guide's approach point remains open",
  );

  for (const car of TAXI_VEHICLES) {
    assert.ok(
      isWalkable(car.approachPoint, geometry),
      `${car.id}: the door approach lies outside all collision footprints`,
    );
    assert.ok(
      distance(car.approachPoint, car.position) <= TAXI_INTERACTION_RADIUS,
      `${car.id}: walking to the door enters boarding range`,
    );
    const footprint = geometry.obstacles[before + TAXI_VEHICLES.indexOf(car)];
    const interior = footprint.reduce(
      (point, corner) => ({
        x: point.x + corner.x / 4,
        y: point.y + corner.y / 4,
      }),
      { x: 0, y: 0 },
    );
    assert.equal(
      isWalkable(interior, geometry),
      false,
      `${car.id}: players cannot walk through the car body`,
    );
    for (const [label, start] of [
      ["spawn", geometry.spawn],
      ["guide", geometry.interactionPoint],
    ]) {
      const path = findPath(start, car.approachPoint, geometry);
      assert.ok(
        path.length,
        `${car.id}: a route from ${label} to the door exists`,
      );
      let anchor = start;
      for (const waypoint of path) {
        assert.ok(
          segmentWalkable(anchor, waypoint, geometry),
          `${car.id}: every ${label} route segment avoids the fleet and furniture`,
        );
        anchor = waypoint;
      }
      assert.ok(
        distance(anchor, car.approachPoint) < 0.1,
        `${car.id}: the route reaches the exact door instead of a nearby fallback`,
      );
      let position = start,
        remaining = path;
      for (let frame = 0; frame < 2500 && remaining.length; frame++) {
        const next = advanceAlongPath(position, remaining, 1 / 60, geometry);
        assert.ok(
          isWalkable(next.position, geometry),
          `${car.id}: boarding approach remains collision-safe throughout walking`,
        );
        assert.ok(
          distance(position, next.position) <= WALK_SPEED / 60 + 0.000001,
          `${car.id}: boarding approach walks continuously instead of teleporting`,
        );
        position = next.position;
        remaining = next.path;
      }
      assert.equal(
        remaining.length,
        0,
        `${car.id}: walking from ${label} completes`,
      );
      assert.ok(
        distance(position, car.approachPoint) < 0.1,
        `${car.id}: continuous walking reaches the door from ${label}`,
      );
    }
  }
  const { default: FieldWorld } = await server.ssrLoadModule(
    "/src/components/FieldWorld.tsx",
  );
  const { default: TaxiRidePanel } = await server.ssrLoadModule(
    "/src/components/TaxiRidePanel.tsx",
  );
  const players = [
    { id: "self", nickname: "나", avatar: "mint", ...assigned.approachPoint },
    {
      id: "peer",
      nickname: "함께 연습하는 여행자",
      avatar: "mint",
      x: 65,
      y: 70,
    },
  ];
  const renderWorld = (session) =>
    renderToStaticMarkup(
      React.createElement(FieldWorld, {
        fieldId: "didi",
        players,
        selfId: "self",
        position: assigned.approachPoint,
        onMove() {},
        onInteract() {},
        completed: false,
        taxiRide: session,
        onTaxiSelect() {},
        nearTaxiId: assigned.id,
      }),
    );
  for (const kind of ["express", "taxi"]) {
    const session = { ...waiting, request: { ...request, vehicle: kind } };
    const markup = renderWorld(session);
    const colors = [...markup.matchAll(/data-body-color="([^"]+)"/g)].map(
      (match) => match[1],
    );
    assert.equal(
      colors.length,
      3,
      "The real field renders three vehicles, not just answer choices",
    );
    assert.equal(
      new Set(colors).size,
      1,
      "Every candidate has the same body color so the plate must be checked",
    );
    assert.equal(
      (markup.match(/class="taxi-fleet-roof-sign"/g) || []).length,
      kind === "taxi" ? 3 : 0,
      "The selected service determines taxi signs on all candidates",
    );
    for (const car of TAXI_VEHICLES)
      assert.ok(
        markup.includes(car.plate),
        "Every physical candidate has a visible plate",
      );
    assert.ok(
      markup.includes('class="field-player field-player-self"'),
      "The traveller stays in the field while finding their car",
    );
    assert.ok(
      !markup.includes('class="field-mobile-interact"'),
      "NPC shortcuts do not restart the practice during pickup",
    );
    const remote = renderWorld({ ...session, phase: "departing" });
    assert.ok(
      !remote.includes('class="field-player field-player-self"'),
      "The boarded traveller leaves the pavement when their vehicle departs",
    );
    assert.ok(
      remote.includes("함께 연습하는 여행자"),
      "Other travellers remain visible during a private boarding exercise",
    );
  }
  for (const car of TAXI_VEHICLES) {
    assert.ok(
      canBoardTaxi(
        {
          ...waiting,
          request: { ...request, assignedVehicleId: car.id },
          selectedVehicleId: car.id,
        },
        car.id,
        car.approachPoint,
      ),
      "Every randomized assignment is boardable",
    );
  }
  const farPanel = renderToStaticMarkup(
    React.createElement(TaxiRidePanel, {
      ride: waiting,
      nearVehicleId: null,
      onApproach() {},
      onBoard() {},
      onCancel() {},
    }),
  );
  assert.match(
    farPanel,
    /class="trp-board"[^>]*disabled=""/,
    "A selected car cannot be boarded remotely through the HUD",
  );
  const wrongPanel = renderToStaticMarkup(
    React.createElement(TaxiRidePanel, {
      ride: {
        ...waiting,
        selectedVehicleId: "cab-a",
        error: "차량 번호가 달라요",
      },
      nearVehicleId: "cab-a",
      onApproach() {},
      onBoard() {},
      onCancel() {},
    }),
  );
  assert.ok(
    wrongPanel.includes('role="alert"') && wrongPanel.includes("중톡이"),
    "A wrong boarding attempt receives NPC feedback",
  );
  console.log(
    "Taxi checks passed: fleet rendering, service appearance, physical boarding guards, departure visibility, and six continuous collision-safe door routes.",
  );
} finally {
  await server.close();
}
