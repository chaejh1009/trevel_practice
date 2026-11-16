/** Training-domain guards and initial UI checks; these never contact real travel services. */
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
});
try {
  const flow = await server.ssrLoadModule("/src/lib/practiceFlow.ts");
  const {
    calendarDay,
    localDateAfter,
    tripDateErrors,
    canIssueBoardingPass,
    canFinishPreparation,
    ARRIVAL_REFERENCE,
    arrivalDraftErrors,
    interviewMatchesArrival,
    canFinishArrival,
  } = flow;
  const today = "2026-11-16";
  assert.equal(
    calendarDay("2026-02-30"),
    null,
    "Impossible calendar dates cannot pass the itinerary guard",
  );
  assert.equal(
    calendarDay("2026-13-01"),
    null,
    "Invalid months cannot pass the itinerary guard",
  );
  assert.equal(
    calendarDay("2026-2-01"),
    null,
    "Ambiguous date formats are rejected",
  );
  assert.notEqual(calendarDay("2028-02-29"), null, "Leap days remain usable");
  assert.equal(
    calendarDay("2027-02-29"),
    null,
    "Non-leap-year February 29 is invalid",
  );
  assert.equal(
    localDateAfter(1, new Date(2026, 11, 31, 23, 45)),
    "2027-01-01",
    "Date defaults use the local calendar across a year boundary",
  );
  assert.ok(
    tripDateErrors("2026-11-15", "2026-11-18", today).length,
    "Past departures are blocked",
  );
  assert.ok(
    tripDateErrors("2026-11-16", "2026-11-16", today).length,
    "A return cannot precede the next calendar day",
  );
  assert.ok(
    tripDateErrors("", "2026-11-18", today).length,
    "Missing itinerary dates are blocked",
  );
  assert.deepEqual(
    tripDateErrors("2026-11-16", "2026-11-17", today),
    [],
    "A valid departure today is allowed",
  );
  const itinerary = {
    departure: "2026-11-17",
    returnDate: "2026-11-20",
    flightId: "MU5052",
  };
  const wallet = { documents: true, connection: true, payment: true };
  assert.equal(
    canIssueBoardingPass(itinerary, wallet, today),
    true,
    "A complete itinerary and wallet can issue a training pass",
  );
  for (const category of Object.keys(wallet)) {
    assert.equal(
      canIssueBoardingPass(itinerary, { ...wallet, [category]: false }, today),
      false,
      `Missing ${category} blocks pass issuance`,
    );
  }
  assert.equal(
    canIssueBoardingPass({ ...itinerary, flightId: "UNKNOWN" }, wallet, today),
    false,
    "An unknown flight cannot be issued",
  );
  assert.equal(
    canIssueBoardingPass(
      { ...itinerary, returnDate: itinerary.departure },
      wallet,
      today,
    ),
    false,
    "A stale/invalid itinerary cannot issue a pass even with a complete wallet",
  );
  assert.equal(
    canFinishPreparation(itinerary, wallet, false, today),
    false,
    "Pass issuance alone cannot finish without the final review",
  );
  assert.equal(
    canFinishPreparation(itinerary, wallet, true, today),
    true,
    "A reviewed pass unlocks the next exercise",
  );
  const draft = { ...ARRIVAL_REFERENCE },
    answers = { purpose: "tourism", hotelId: "bund" };
  assert.deepEqual(
    arrivalDraftErrors(draft),
    [],
    "The fictional arrival form matches its source itinerary",
  );
  for (const [key, value] of [
    ["nationality", "JAPAN"],
    ["flightId", "MU5034"],
    ["purpose", "business"],
    ["hotelId", "pudong"],
  ]) {
    assert.ok(
      arrivalDraftErrors({ ...draft, [key]: value }).length,
      `A mismatched ${key} must be corrected before review`,
    );
  }
  assert.equal(
    interviewMatchesArrival(draft, answers),
    true,
    "Interview answers agree with the reviewed arrival card",
  );
  assert.equal(
    interviewMatchesArrival(draft, { ...answers, purpose: "business" }),
    false,
    "A purpose contradiction cannot finish the interview",
  );
  assert.equal(
    interviewMatchesArrival(draft, { ...answers, hotelId: "pudong" }),
    false,
    "A hotel contradiction cannot finish the interview",
  );
  const complete = {
    scanned: true,
    reviewed: true,
    stamped: true,
    draft,
    answers,
  };
  for (const requirement of ["scanned", "reviewed", "stamped"]) {
    assert.equal(
      canFinishArrival({ ...complete, [requirement]: false }),
      false,
      `Completion cannot skip ${requirement}`,
    );
  }
  assert.equal(
    canFinishArrival(complete),
    true,
    "Only a fully completed and consistent procedure unlocks the next exercise",
  );
  assert.equal(
    canFinishArrival({
      ...complete,
      answers: { ...answers, purpose: "business" },
    }),
    false,
    "A stamped flag cannot bypass contradictory interview answers",
  );

  const hotel = {
    arrival: "2026-11-17",
    departure: "2026-11-20",
    guests: 2,
    room: "double",
    policy: "flexible",
    baseRate: 520,
    familyExtra: 160,
  };
  assert.deepEqual(
    [
      flow.hotelPracticeQuote(hotel, today).nights,
      flow.hotelPracticeQuote(hotel, today).total,
    ],
    [3, 1560],
    "Hotel review charges actual nights at the selected flexible rate",
  );
  assert.equal(
    flow.hotelPracticeQuote({ ...hotel, policy: "nonrefundable" }, today).total,
    1440,
    "Nonrefundable discount applies to every night",
  );
  assert.equal(
    flow.hotelPracticeQuote({ ...hotel, room: "family", guests: 4 }, today)
      .total,
    2040,
    "Family-room supplement applies before multiplying by nights",
  );
  assert.equal(
    flow.hotelPracticeQuote({ ...hotel, guests: 3 }, today).valid,
    false,
    "Double room cannot accept excess guests",
  );
  assert.equal(
    flow.hotelPracticeQuote({ ...hotel, guests: 0 }, today).valid,
    false,
    "A booking requires a positive guest count",
  );
  assert.equal(
    flow.hotelPracticeQuote({ ...hotel, departure: hotel.arrival }, today)
      .total,
    0,
    "Invalid hotel periods never display a payable amount",
  );
  assert.equal(
    flow.hotelPracticeQuote({ ...hotel, departure: "2026-02-30" }, today).valid,
    false,
    "Hotel dates use real calendar validation too",
  );

  const { default: PreparePractice } = await server.ssrLoadModule(
    "/src/components/practice/PreparePractice.tsx",
  );
  const { default: ImmigrationPractice } = await server.ssrLoadModule(
    "/src/components/practice/ImmigrationPractice.tsx",
  );
  let finishCalls = 0;
  const props = {
    onFinish() {
      finishCalls++;
    },
    track() {},
    onGuide() {},
  };
  const prepare = renderToStaticMarkup(
    React.createElement(PreparePractice, props),
  );
  const immigration = renderToStaticMarkup(
    React.createElement(ImmigrationPractice, props),
  );
  assert.equal(
    finishCalls,
    0,
    "Mounting a practice never advances to the quiz",
  );
  assert.ok(
    prepare.includes("TRIP WALLET") &&
      prepare.includes("ICN") &&
      prepare.includes("PVG"),
    "Preparation starts inside a travel-wallet/check-in interface",
  );
  assert.equal(
    (prepare.match(/type="date"/g) || []).length,
    2,
    "Both itinerary dates are editable",
  );
  assert.ok(
    /disabled=""[^>]*>여행 지갑 열기/.test(prepare),
    "Preparation cannot skip selecting a flight",
  );
  assert.ok(
    immigration.includes("SAMPLE PASSPORT") &&
      immigration.includes("KIM") &&
      immigration.includes("GILDONG"),
    "Arrival practice uses a fictional passport",
  );
  assert.ok(
    immigration.includes("공식 신고서") && immigration.includes("교육용"),
    "Arrival practice clearly identifies the educational form",
  );
  assert.ok(
    !/type="file"|name="passport|name="birth/i.test(immigration),
    "No passport upload or personal-identity collection fields exist",
  );
  assert.ok(
    /disabled=""[^>]*>입국 카드 작성/.test(immigration),
    "Arrival practice starts with the sample passport step locked",
  );
  assert.ok(
    !immigration.includes("PRACTICE<br/>COMPLETE"),
    "Completion stamp is absent before the procedure is completed",
  );
  console.log(
    "Practice checks passed: real calendar dates, itinerary/wallet completion gates, arrival-card consistency, interview contradictions, unskippable stages, and fictional-data UI.",
  );
} finally {
  await server.close();
}
