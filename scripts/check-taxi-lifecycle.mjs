/** Exercise the actual hook with deterministic timers and a minimal React hook dispatcher. */
import assert from "node:assert/strict";
import { createServer } from "vite";

const sameDeps = (a, b) =>
  a?.length === b?.length &&
  a.every((value, index) => Object.is(value, b[index]));
class HookHarness {
  slots = [];
  cursor = 0;
  effects = [];
  dirty = false;
  mounted = true;
  stateWritesAfterUnmount = 0;
  constructor(hook, options) {
    this.hook = hook;
    this.options = options;
    this.render();
  }
  useRef(value) {
    return (this.slots[this.cursor++] ??= { current: value });
  }
  useState(initial) {
    const index = this.cursor++;
    if (!this.slots[index]) {
      const slot = {
        value: typeof initial === "function" ? initial() : initial,
      };
      slot.set = (next) => {
        if (!this.mounted) this.stateWritesAfterUnmount++;
        const value = typeof next === "function" ? next(slot.value) : next;
        if (!Object.is(value, slot.value)) {
          slot.value = value;
          this.dirty = true;
        }
      };
      this.slots[index] = slot;
    }
    return [this.slots[index].value, this.slots[index].set];
  }
  useCallback(fn, deps) {
    const index = this.cursor++;
    if (!this.slots[index] || !sameDeps(this.slots[index].deps, deps))
      this.slots[index] = { fn, deps };
    return this.slots[index].fn;
  }
  useId() {
    return this.useRef(`taxi-test-${this.cursor}`).current;
  }
  useMemo(fn, deps) {
    const index = this.cursor++;
    if (!this.slots[index] || !sameDeps(this.slots[index].deps, deps))
      this.slots[index] = { value: fn(), deps };
    return this.slots[index].value;
  }
  useEffect(fn, deps) {
    const index = this.cursor++,
      previous = this.slots[index];
    if (!previous || !sameDeps(previous.deps, deps)) {
      this.slots[index] = { deps, cleanup: previous?.cleanup };
      this.effects.push(() => {
        this.slots[index].cleanup?.();
        this.slots[index].cleanup = fn();
      });
    }
  }
  render(update = {}) {
    this.options = { ...this.options, ...update };
    for (let iteration = 0; iteration < 12; iteration++) {
      globalThis.__taxiHookHarness = this;
      this.cursor = 0;
      this.dirty = false;
      this.value = this.hook(this.options);
      while (this.effects.length) this.effects.shift()();
      if (!this.dirty) return this.value;
    }
    throw new Error("Hook effects did not settle");
  }
  unmount() {
    this.mounted = false;
    for (const slot of [...this.slots].reverse()) slot.cleanup?.();
  }
}
class FakeClock {
  now = 0;
  nextId = 1;
  timers = new Map();
  set = (callback, delay = 0) => {
    const id = this.nextId++;
    this.timers.set(id, { at: this.now + delay, callback });
    return id;
  };
  clear = (id) => {
    this.timers.delete(id);
  };
  advance(milliseconds) {
    const end = this.now + milliseconds;
    while (true) {
      const earliest = [...this.timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!earliest || earliest[1].at > end) break;
      this.now = earliest[1].at;
      this.timers.delete(earliest[0]);
      earliest[1].callback();
    }
    this.now = end;
  }
  callbacks() {
    return [...this.timers.values()].map((timer) => timer.callback);
  }
}
const server = await createServer({
  configFile: false,
  ssr: { noExternal: ["react"] },
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
  plugins: [
    {
      name: "taxi-hook-dispatcher",
      enforce: "pre",
      resolveId(id) {
        if (id === "react") return "\0taxi-hook-react";
        if (id === "react/jsx-runtime" || id === "react/jsx-dev-runtime")
          return "\0taxi-hook-jsx";
      },
      load(id) {
        if (id === "\0taxi-hook-jsx")
          return `
        export const Fragment = Symbol.for('react.fragment');
        export const jsx = (type, props, key) => ({ type, props: props || {}, key });
        export const jsxs = jsx;
        export const jsxDEV = jsx;
      `;
        if (id === "\0taxi-hook-react")
          return `
      export const useRef = (value) => globalThis.__taxiHookHarness.useRef(value);
      export const useState = (value) => globalThis.__taxiHookHarness.useState(value);
      export const useCallback = (fn, deps) => globalThis.__taxiHookHarness.useCallback(fn, deps);
      export const useEffect = (fn, deps) => globalThis.__taxiHookHarness.useEffect(fn, deps);
      export const useMemo = (fn, deps) => globalThis.__taxiHookHarness.useMemo(fn, deps);
      export const useId = () => globalThis.__taxiHookHarness.useId();
    `;
      },
    },
  ],
});
const nativeTimeout = globalThis.setTimeout,
  nativeClear = globalThis.clearTimeout;
try {
  const { useTaxiRide } = await server.ssrLoadModule("/src/lib/useTaxiRide.ts");
  const domain = await server.ssrLoadModule("/src/lib/taxiRide.ts");
  const {
    TAXI_ARRIVAL_MS,
    TAXI_BOARDING_MS,
    TAXI_DEPARTURE_MS,
    getTaxiVehicle,
    getTaxiGeometry,
  } = domain;
  const assigned = getTaxiVehicle("cab-b"),
    wrong = getTaxiVehicle("cab-a");
  const request = (id = "ride-1") => ({
    id,
    destinationId: "bund",
    destinationName: "가상 호텔",
    vehicle: "express",
    fare: 160,
    assignedVehicleId: assigned.id,
  });
  const clock = new FakeClock();
  globalThis.setTimeout = clock.set;
  globalThis.clearTimeout = clock.clear;
  const events = [];
  const create = (update = {}) =>
    new HookHarness(useTaxiRide, {
      fieldId: "didi",
      position: assigned.approachPoint,
      track: (type, properties) => events.push({ type, properties }),
      ...update,
    });
  const advance = async (harness, milliseconds) => {
    clock.advance(milliseconds);
    harness.render();
    await Promise.resolve();
  };

  const invalid = create({ fieldId: null });
  assert.equal(
    await invalid.value.start(request()),
    null,
    "The hub cannot create a taxi request",
  );
  invalid.render({ fieldId: "hotel" });
  assert.equal(
    await invalid.value.start(request()),
    null,
    "Another field cannot create a taxi request",
  );
  invalid.render({ fieldId: "didi" });
  assert.equal(
    await invalid.value.start({ ...request(), assignedVehicleId: "unknown" }),
    null,
    "An unknown assignment is rejected",
  );
  assert.equal(clock.timers.size, 0);
  invalid.unmount();

  const h = create(),
    original = request();
  let resolutions = 0,
    result;
  const pending = h.value.start(original).then((value) => {
    resolutions++;
    result = value;
    return value;
  });
  original.id = "mutated";
  original.assignedVehicleId = wrong.id;
  h.render();
  assert.equal(h.value.ride.phase, "arriving");
  assert.equal(
    h.value.ride.request.id,
    "ride-1",
    "The pending request is an immutable snapshot of the caller's object",
  );
  assert.equal(
    h.value.geometry,
    getTaxiGeometry(),
    "The navigation geometry retains a stable identity",
  );
  assert.equal(h.value.movementBlocked, false);
  assert.equal(h.value.interaction, null);
  h.value.selectVehicle(assigned.id);
  h.value.board();
  h.render();
  assert.equal(
    h.value.ride.selectedVehicleId,
    null,
    "Cars cannot be selected before arrival",
  );
  assert.equal(
    await h.value.start(request("duplicate")),
    null,
    "A second start cannot replace a pending request",
  );
  await advance(h, TAXI_ARRIVAL_MS - 1);
  assert.equal(h.value.ride.phase, "arriving");
  assert.equal(resolutions, 0);
  await advance(h, 1);
  assert.equal(h.value.ride.phase, "waiting");
  assert.equal(h.value.nearVehicleId, assigned.id);
  assert.equal(h.value.interaction.id, assigned.id);
  assert.equal(h.value.interaction.radius, 70);
  h.render({ position: { x: 95, y: 10 } });
  assert.equal(h.value.nearVehicleId, null, "A remote car is not marked near");
  h.value.selectVehicle(assigned.id);
  h.value.board();
  h.render();
  assert.equal(
    h.value.ride.selectedVehicleId,
    null,
    "Remote selection/boarding cannot bypass physical proximity",
  );
  h.render({ position: wrong.approachPoint });
  h.value.selectVehicle(wrong.id);
  h.render();
  assert.equal(
    h.value.ride.selectedVehicleId,
    wrong.id,
    "A nearby wrong plate can be inspected",
  );
  h.value.board();
  h.render();
  assert.equal(h.value.ride.phase, "waiting");
  assert.ok(h.value.ride.error.includes("번호판"));
  assert.ok(
    events.some(
      (event) =>
        event.type === "taxi_wrong_vehicle" &&
        event.properties.vehicleId === wrong.id,
    ),
  );
  await advance(h, 20_000);
  assert.equal(
    resolutions,
    0,
    "Waiting beside a wrong car never completes the promise",
  );
  h.render({ position: assigned.approachPoint });
  h.value.selectVehicle(assigned.id);
  h.render();
  assert.equal(
    h.value.ride.error,
    null,
    "Selecting the correct car clears the prior mismatch",
  );
  h.render({ position: { x: 95, y: 10 } });
  h.value.board();
  h.render();
  assert.equal(
    h.value.ride.phase,
    "waiting",
    "Moving away after selection still prevents boarding",
  );
  h.render({ position: assigned.approachPoint });
  h.value.board();
  h.value.board();
  h.render();
  assert.equal(h.value.ride.phase, "boarding");
  assert.equal(h.value.movementBlocked, true);
  assert.equal(
    clock.timers.size,
    1,
    "Repeated boarding cannot schedule duplicate phase timers",
  );
  await advance(h, TAXI_BOARDING_MS - 1);
  assert.equal(h.value.ride.phase, "boarding");
  assert.equal(resolutions, 0);
  await advance(h, 1);
  assert.equal(h.value.ride.phase, "departing");
  assert.equal(h.value.movementBlocked, true);
  await advance(h, TAXI_DEPARTURE_MS - 1);
  assert.equal(
    resolutions,
    0,
    "The ride is not finished before departure animation ends",
  );
  await advance(h, 1);
  assert.deepEqual(await pending, {
    requestId: "ride-1",
    vehicleId: assigned.id,
  });
  assert.equal(resolutions, 1);
  assert.deepEqual(result, { requestId: "ride-1", vehicleId: assigned.id });
  assert.equal(h.value.ride, null);
  assert.equal(h.value.geometry, undefined);
  assert.equal(h.value.movementBlocked, false);
  h.value.board();
  h.value.cancel();
  await advance(h, 10_000);
  assert.equal(resolutions, 1);
  assert.equal(
    events.filter((event) => event.type === "taxi_ride_completed").length,
    1,
  );
  h.unmount();

  for (const phase of ["arriving", "waiting", "boarding", "departing"]) {
    const h = create();
    const pending = h.value.start(request(`cancel-${phase}`));
    h.render();
    if (phase !== "arriving") await advance(h, TAXI_ARRIVAL_MS);
    if (phase === "boarding" || phase === "departing") {
      h.value.selectVehicle(assigned.id);
      h.value.board();
      h.render();
    }
    if (phase === "departing") await advance(h, TAXI_BOARDING_MS);
    assert.equal(h.value.ride.phase, phase);
    const stale = clock.callbacks();
    h.value.cancel();
    h.value.cancel();
    h.render();
    assert.equal(
      await pending,
      null,
      `${phase} cancellation resolves with null`,
    );
    assert.equal(clock.timers.size, 0);
    const next = h.value.start(request(`retry-${phase}`));
    h.render();
    for (const callback of stale) callback();
    h.render();
    assert.equal(
      h.value.ride.phase,
      "arriving",
      `${phase} stale timers cannot advance a later request`,
    );
    h.value.cancel();
    h.render();
    assert.equal(await next, null);
    h.unmount();
  }

  const route = create();
  const routePromise = route.value.start(request("leave-field"));
  route.render();
  await advance(route, TAXI_ARRIVAL_MS);
  route.value.selectVehicle(assigned.id);
  route.value.board();
  route.render();
  const staleRoute = clock.callbacks();
  route.render({ fieldId: "prepare" });
  assert.equal(
    await routePromise,
    null,
    "Leaving the field settles the caller instead of stranding it",
  );
  assert.equal(route.value.ride, null);
  assert.equal(clock.timers.size, 0);
  route.render({ fieldId: "didi" });
  for (const callback of staleRoute) callback();
  route.render();
  assert.equal(
    route.value.ride,
    null,
    "Returning to the field cannot revive a cancelled request",
  );
  route.unmount();

  const unmount = create();
  const unmountPromise = unmount.value.start(request("unmount"));
  unmount.render();
  const staleUnmount = clock.callbacks();
  unmount.unmount();
  assert.equal(await unmountPromise, null);
  assert.equal(clock.timers.size, 0);
  for (const callback of staleUnmount) callback();
  assert.equal(
    unmount.stateWritesAfterUnmount,
    0,
    "Unmount and stale timers never update unmounted state",
  );
  assert.equal(
    await unmount.value.start(request("after-unmount")),
    null,
    "A retained API cannot start after unmount",
  );

  const brokenTelemetry = create({
    track() {
      throw new Error("telemetry offline");
    },
  });
  const safePromise = brokenTelemetry.value.start(request("telemetry"));
  brokenTelemetry.render();
  await advance(brokenTelemetry, TAXI_ARRIVAL_MS);
  brokenTelemetry.value.selectVehicle(assigned.id);
  brokenTelemetry.value.board();
  brokenTelemetry.render();
  await advance(brokenTelemetry, TAXI_BOARDING_MS + TAXI_DEPARTURE_MS);
  assert.deepEqual(
    await safePromise,
    { requestId: "telemetry", vehicleId: assigned.id },
    "Telemetry failure cannot strand completion",
  );
  brokenTelemetry.unmount();
  assert.equal(clock.timers.size, 0);
  // Inspect the actual DiDi app's element tree while driving its real event handlers.
  const { default: DidiPractice } = await server.ssrLoadModule(
    "/src/components/practice/DidiPractice.tsx",
  );
  const text = (node) =>
    node == null || typeof node === "boolean"
      ? ""
      : typeof node === "string" || typeof node === "number"
        ? String(node)
        : Array.isArray(node)
          ? node.map(text).join("")
          : text(node.props?.children);
  const find = (node, predicate) => {
    if (node == null || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const result = find(child, predicate);
        if (result) return result;
      }
      return null;
    }
    return predicate(node) ? node : find(node.props?.children, predicate);
  };
  const click = (harness, phrase) => {
    const button = find(
      harness.value,
      (node) => node.type === "button" && text(node).includes(phrase),
    );
    assert.ok(button, `Visible action exists: ${phrase}`);
    assert.ok(!button.props.disabled, `Action is enabled: ${phrase}`);
    button.props.onClick();
    harness.render();
  };
  const bridges = [],
    appEvents = [];
  let finishCalls = 0;
  const app = new HookHarness(DidiPractice, {
    onFinish() {
      finishCalls++;
    },
    track(type, properties) {
      appEvents.push({ type, properties });
    },
    onRideRequested(request) {
      return new Promise((resolve) => bridges.push({ request, resolve }));
    },
  });
  const requestFromApp = (app) => {
    click(app, "와이탄 가든 호텔");
    click(app, "지정 승차장 A");
    click(app, "여기에서 탑승할게요");
    click(app, "Express 선택하기");
    click(app, "Confirm Request");
  };
  requestFromApp(app);
  assert.equal(bridges.length, 1);
  assert.ok(text(app.value).includes("차량 배정 완료"));
  assert.equal(
    find(
      app.value,
      (node) => node.type === "input" && node.props.type === "radio",
    ),
    null,
    "The assigned screen has no old plate-radio verification shortcut",
  );
  bridges[0].resolve({
    requestId: "another-request",
    vehicleId: bridges[0].request.assignedVehicleId,
  });
  await Promise.resolve();
  app.render();
  assert.ok(
    !text(app.value).includes("내 차, 제대로 찾았어요!"),
    "A result from another request cannot verify this ride",
  );
  assert.ok(text(app.value).includes("탑승 결과를 확인하지 못했어요"));
  click(app, "필드에서 차량 찾기");
  assert.equal(
    bridges[1].request.id,
    bridges[0].request.id,
    "A retry retains the original assignment and request",
  );
  bridges[1].resolve(null);
  await Promise.resolve();
  app.render();
  assert.ok(text(app.value).includes("차량 배정 완료"));
  assert.equal(
    finishCalls,
    0,
    "Cancelling returns to assigned without completing practice",
  );
  click(app, "필드에서 차량 찾기");
  const wrongId = domain.TAXI_VEHICLES.find(
    (vehicle) => vehicle.id !== bridges[2].request.assignedVehicleId,
  ).id;
  bridges[2].resolve({ requestId: bridges[2].request.id, vehicleId: wrongId });
  await Promise.resolve();
  app.render();
  assert.ok(
    !text(app.value).includes("내 차, 제대로 찾았어요!"),
    "The correct request with a different vehicle still cannot verify",
  );
  click(app, "필드에서 차량 찾기");
  bridges[3].resolve({
    requestId: bridges[3].request.id,
    vehicleId: bridges[3].request.assignedVehicleId,
  });
  await Promise.resolve();
  app.render();
  assert.ok(
    text(app.value).includes("내 차, 제대로 찾았어요!"),
    "Matching request and vehicle unlocks the receipt",
  );
  assert.equal(
    appEvents.filter((event) => event.type === "practice_action_completed")
      .length,
    1,
  );
  const finishButton = find(
    app.value,
    (node) =>
      node.type === "button" && text(node).includes("상황 문제로 이어가기"),
  );
  finishButton.props.onClick();
  finishButton.props.onClick();
  assert.equal(
    finishCalls,
    1,
    "Repeated receipt clicks finish practice only once",
  );
  app.unmount();
  const late = new HookHarness(DidiPractice, {
    onFinish() {
      throw new Error("Unmounted practice must not finish");
    },
    track() {},
    onRideRequested(request) {
      return new Promise((resolve) => bridges.push({ request, resolve }));
    },
  });
  requestFromApp(late);
  const pendingBridge = bridges.at(-1);
  late.unmount();
  pendingBridge.resolve({
    requestId: pendingBridge.request.id,
    vehicleId: pendingBridge.request.assignedVehicleId,
  });
  await Promise.resolve();
  assert.equal(
    late.stateWritesAfterUnmount,
    0,
    "A late world result cannot update an unmounted DiDi app",
  );
  console.log(
    "Taxi lifecycle checks passed: exact arrival/boarding/departure timing, wrong/remote cars, duplicate actions, all-phase cancellation, retry/stale timers, route/unmount cleanup, request snapshots, telemetry failure, and DiDi app result/cancel/re-entry guards.",
  );
} finally {
  globalThis.setTimeout = nativeTimeout;
  globalThis.clearTimeout = nativeClear;
  delete globalThis.__taxiHookHarness;
  await server.close();
}
