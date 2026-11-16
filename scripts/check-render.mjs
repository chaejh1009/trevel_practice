// Structural rendering/navigation checks; browser interaction QA is separate.
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const { FIELD_IDS, parseRoute, routeHash } = await server.ssrLoadModule(
    "/src/lib/navigation.ts",
  );
  const { fields } = await server.ssrLoadModule("/src/lib/fields.ts");
  const render = (route) =>
    renderToStaticMarkup(React.createElement(App, { initialRoute: route }));
  const hub = render({ page: "hub" });
  assert.equal(
    (hub.match(/class="field-entrance /g) || []).length,
    4,
    "Hub has four field entrances",
  );
  assert.ok(
    !hub.includes('class="field-world'),
    "Hub does not render a playable field",
  );
  assert.ok(
    !hub.includes('class="practice-submit'),
    "Hub does not start a practice",
  );
  assert.ok(
    !hub.includes('class="chat-panel'),
    "Hub does not render field chat",
  );
  assert.ok(
    !/<h1>[\s\S]*?<(?:section|div|svg)/.test(hub.split("</h1>")[0]),
    "Page heading contains only heading content",
  );
  for (const id of FIELD_IDS) {
    const route = { page: "field", fieldId: id };
    assert.deepEqual(
      parseRoute(routeHash(route)),
      route,
      `${id} deep link round trip`,
    );
    assert.deepEqual(
      parseRoute(`${routeHash(route)}/`),
      route,
      `${id} trailing slash`,
    );
    assert.ok(
      hub.includes(`href="${routeHash(route)}"`),
      `${id} has a real entrance link`,
    );
    const output = render(route);
    assert.equal(
      (output.match(/class="field-world-svg"/g) || []).length,
      1,
      `${id} has one separate scene`,
    );
    assert.equal(
      (output.match(/class="field-interact /g) || []).length,
      1,
      `${id} has one scenario hotspot`,
    );
    assert.ok(
      output.includes(fields[id].label),
      `${id} shows its own field name`,
    );
    assert.ok(output.includes('href="#/hub"'), `${id} can return to the hub`);
    assert.ok(
      !output.includes('class="field-entrances"'),
      `${id} does not contain the hub grid`,
    );
    assert.ok(
      !output.includes('class="practice-submit'),
      `${id} requires interaction before practice`,
    );
    for (const other of FIELD_IDS.filter((item) => item !== id)) {
      assert.ok(
        !output.includes(fields[other].label),
        `${id} does not render ${other} field content`,
      );
    }
  }
  for (const page of ["guide", "journey"]) {
    assert.deepEqual(parseRoute(routeHash({ page })), { page });
    assert.ok(
      !render({ page }).includes('class="field-world'),
      `${page} does not render a field`,
    );
  }
  for (const invalid of [
    "",
    "#/hub",
    "#/fields/unknown",
    "#/fields/hotel/extra",
    "#/fields/",
    "#/unknown",
  ]) {
    assert.deepEqual(
      parseRoute(invalid),
      { page: "hub" },
      `Safe hub fallback for ${invalid}`,
    );
  }
  const { default: Practice } = await server.ssrLoadModule(
    "/src/components/ScenarioPractice.tsx",
  );
  for (const id of FIELD_IDS) {
    const output = renderToStaticMarkup(
      React.createElement(Practice, { id, onFinish() {}, track() {} }),
    );
    assert.ok(
      output.includes(`data-practice-scenario="${id}"`) &&
        output.includes(`practice-workspace-${id}`),
      `${id} renders a dedicated app or procedure workspace`,
    );
    assert.ok(!output.includes("NaN"), `${id} contains valid display values`);
    assert.ok(
      output.includes("중톡이") && output.includes("/brand/jungtoki.png"),
      `${id}: contextual guide stays beside the simulator`,
    );
    assert.ok(
      !output.includes('class="mission-dialogue"'),
      `${id}: actual practice is not squeezed into the JRPG dialogue frame`,
    );
    const initialScreens = {
      prepare: "TRIP WALLET",
      immigration: "SAMPLE PASSPORT",
      hotel: "호텔 검색",
      didi: "목적지 검색",
    };
    assert.ok(
      output.includes(initialScreens[id]),
      `${id}: familiar app/procedure entry screen`,
    );
    if (id === "hotel" || id === "didi")
      assert.ok(
        output.includes("pw-device-phone"),
        `${id}: uses a phone app viewport`,
      );
    else
      assert.ok(
        output.includes("pw-device-procedure"),
        `${id}: uses a procedure terminal viewport`,
      );
  }
  const { default: Dialogue } = await server.ssrLoadModule(
    "/src/components/MissionDialogue.tsx",
  );
  const { default: Avatar } = await server.ssrLoadModule(
    "/src/components/TravelerAvatar.tsx",
  );
  const npcNames = {
    prepare: "중톡이",
    immigration: "중톡이",
    hotel: "중톡이",
    didi: "중톡이",
  };
  for (const id of FIELD_IDS) {
    const scenario = {
      id,
      title: fields[id].name,
      description: fields[id].description,
      reward: 100,
      steps: [
        {
          id: "test-step",
          prompt: "여행 상황을 연습해 볼까요?",
          options: [
            { id: "a", text: "네" },
            { id: "b", text: "다시 볼게요" },
          ],
          explanation: "연습용 해설",
        },
      ],
    };
    const output = renderToStaticMarkup(
      React.createElement(Dialogue, {
        scenario,
        session: {
          sessionId: "render-test",
          token: "test-only",
          nickname: "여행자",
          avatar: "mint",
          progress: { completed: [], xp: 0 },
        },
        onClose() {},
        onCompleted() {},
        track() {},
      }),
    );
    assert.ok(
      output.includes('class="dialogue-layer dialogue-stage-greeting"'),
      `${id}: NPC events use the JRPG dialogue layer`,
    );
    assert.ok(
      output.includes('role="dialog"') && output.includes('aria-modal="true"'),
      `${id}: conversation has dialog semantics`,
    );
    assert.ok(output.includes(npcNames[id]), `${id}: correct NPC speaker`);
    assert.ok(
      output.includes("/brand/jungtoki.png"),
      `${id}: original branded guide portrait is used`,
    );
    assert.ok(
      !output.includes("중매토끼"),
      `${id}: previous character name is absent`,
    );
    assert.ok(
      output.includes('id="dialogue-full-line"'),
      `${id}: full line is available to screen readers`,
    );
    assert.ok(
      !output.includes('class="modal-backdrop"'),
      `${id}: field is not replaced by a centered modal`,
    );
  }
  const { getAtlasFrame, TRAVELER_ATLAS } = await server.ssrLoadModule(
    "/src/lib/avatarAtlas.ts",
  );
  for (const [row, direction] of ["down", "left", "right", "up"].entries()) {
    for (let column = 0; column < 4; column++) {
      assert.deepEqual(
        getAtlasFrame(direction, column),
        { x: 313.5 * column, y: 313.5 * row, width: 313.5, height: 313.5 },
        `${direction}/${column}: original generated atlas viewport is exact`,
      );
    }
  }
  const poses = new Set();
  for (const direction of ["up", "down", "left", "right"]) {
    const pose = renderToStaticMarkup(
      React.createElement(Avatar, { direction, moving: true }),
    );
    assert.ok(
      pose.includes(`traveler-facing-${direction}`) &&
        pose.includes("is-walking"),
      `${direction}: walking pose exposed`,
    );
    assert.ok(
      pose.includes(TRAVELER_ATLAS.src),
      `${direction}: generated artwork is rendered`,
    );
    poses.add(pose);
  }
  assert.equal(poses.size, 4, "Four facing views remain distinct");
  console.log(
    "Render/navigation checks passed: four hub entrances, four isolated fields, deep links, hub return, JRPG dialogue, four-direction avatars, and practice modules.",
  );
} finally {
  await server.close();
}
