import test from "node:test";
import assert from "node:assert/strict";

import { car6 } from "../src/domain/car-6.ts";
import { resolve, route, routeLength } from "../src/domain/route-engine.ts";
import { STEPS_NOTE } from "../src/domain/render.ts";
import { MAX_SEGMENTS } from "../src/domain/types.ts";
import type { Layout, RenderOptions, Route, SpatialRef } from "../src/domain/types.ts";

const ok = (from: SpatialRef, to: SpatialRef, opts: RenderOptions = {}): Route => {
  const r = route(car6, from, to, opts);
  assert.ok(!("code" in r), `expected a route for ${from} -> ${to}, got ${JSON.stringify(r)}`);
  return r;
};

const err = (from: SpatialRef, to: SpatialRef, opts: RenderOptions = {}) => {
  const r = route(car6, from, to, opts);
  assert.ok("code" in r, `expected an error for ${from} -> ${to}, got ${JSON.stringify(r)}`);
  return r;
};

// ------------------------------------------- Architecture section 7 acceptance

test("case 1 — entrance to a window seat: longitudinal, then aisle-to-seat lateral", () => {
  const r = ok("entrance_front", "6-12A");
  assert.equal(r.segments.length, 2, "already on the aisle, so no step-out segment");
  assert.equal(r.segments[0]!.length_m, 14.3);
  assert.equal(r.segments[1]!.length_m, 1.15);
  assert.equal(r.totalLength_m, 15.45);

  // The contract asks for a `{ feature: "row", count: N }` on the longitudinal leg.
  // N is a property of the authored fixture, not of the engine: rows 1..11 lie
  // between the front door at x=0.8 and row 12 at x=15.1.
  assert.deepEqual(r.segments[0]!.countedFeatures, { feature: "row", count: 11 });
});

test("case 2 — seat to restroom: the step out of the seat is counted, landmarks collected", () => {
  const r = ok("6-12A", "restroom");
  assert.equal(r.segments.length, 3);
  assert.equal(r.segments[0]!.length_m, 1.15, "getting out of seat 6-12A costs distance");
  assert.equal(r.totalLength_m, 7.45);
  assert.ok(r.segments[1]!.landmarksPassed.includes("entrance_rear"));
  assert.ok(r.landmarks.some((l) => l.key === "restroom"));
});

test("case 3 — seat to seat, different row and side: lateral, longitudinal, lateral", () => {
  const r = ok("6-12A", "6-14D");
  assert.equal(r.segments.length, 3);
  assert.equal(r.segments[1]!.countedFeatures?.count, 1, "row 13");
  assert.equal(r.totalLength_m, 4.5);
});

test("case 4 — same row across the aisle: never zero, and never through the seats between", () => {
  const r = ok("6-12A", "6-12D");
  assert.ok(r.totalLength_m > 0, "projecting both ends onto the aisle would give 0 here");
  assert.equal(r.totalLength_m, 2.3);
  assert.equal(r.segments.length, 2, "out to the aisle, then across it");
  assert.equal(r.segments[0]!.to, "row_12_aisle", "the aisle is a place you stand, not a detour");
  assert.equal(r.segments[1]!.from, "row_12_aisle");
});

test("case 5 — same row, same side: direct only because the fixture marks the pair traversable", () => {
  const r = ok("6-12A", "6-12B");
  assert.equal(r.segments.length, 1);
  assert.equal(r.totalLength_m, 0.6);
  assert.equal(r.segments[0]!.min_width_m, undefined, "no aisle traversal");

  const unmarked: Layout = { ...car6, directPathLetters: [] };
  const viaAisle = route(unmarked, "6-12A", "6-12B") as Route;
  assert.equal(viaAisle.segments.length, 2, "with no fixture marking, it goes via the aisle");
});

test("case 6 — one route in all three units: identical segments, only rendering changes", () => {
  const geometry = (r: Route) => JSON.stringify(r.segments);
  const feet = ok("6-12A", "6-14D", { units: "feet" });
  const meters = ok("6-12A", "6-14D", { units: "meters" });
  const steps = ok("6-12A", "6-14D", { units: "steps" });

  assert.equal(geometry(feet), geometry(meters));
  assert.equal(geometry(feet), geometry(steps));
  assert.equal(feet.totalLength_m, steps.totalLength_m);

  assert.match(feet.rendered.summary, /ft/);
  assert.match(meters.rendered.summary, /m\b/);
  assert.match(steps.rendered.summary, /steps/);

  assert.equal(steps.rendered.unitsNote, STEPS_NOTE, "the caveat is the contract's exact wording");
  assert.equal(feet.rendered.unitsNote, undefined);
  assert.equal(meters.rendered.unitsNote, undefined);
});

test("case 7 — walkSpeedPercent 50 doubles traversal time and changes no distance", () => {
  const normal = ok("6-12A", "6-14D");
  const slower = ok("6-12A", "6-14D", { walkSpeedPercent: 50 });
  assert.equal(normal.totalLength_m, slower.totalLength_m);
  assert.ok(Math.abs(slower.totalTraversalTime_s - normal.totalTraversalTime_s * 2) < 0.2);
});

test("case 8 — a leg longer than the cap stops at a checkpoint and keeps the request", () => {
  // Three portals in a row need six segments, which no single leg may return.
  const long: Layout = {
    ...car6,
    portals: [
      ...car6.portals,
      { ref: "far_door", mode: "door", label: "Door to the next car",
        position_m: { x: 22.8, y: car6.aisleY_m } },
    ],
    landmarks: [
      ...car6.landmarks,
      { key: "observation_car", label: "Observation car",
        position_m: { x: 24.0, y: car6.aisleY_m }, landmarkType: "primary",
        sensoryChannels: ["auditory"], detectability: { caneUser: "high", dogGuide: "high" } },
    ],
    reachedThrough: {
      ...car6.reachedThrough,
      observation_car: ["rear_door", "rear_vestibule", "far_door"],
    },
  };

  const r = route(long, "6-12A", "observation_car") as Route;
  assert.ok(!("code" in r));
  assert.ok(r.segments.length <= MAX_SEGMENTS, `got ${r.segments.length} segments`);
  assert.equal(r.requestedTo, "observation_car", "the original destination survives the split");
  assert.equal(r.requiresContinuation, true);
  assert.ok(r.checkpoint, "a split leg names where it stopped");
  assert.equal(r.to, r.checkpoint!.ref);
  assert.notEqual(r.to, r.requestedTo);

  // Totals describe only what the traveller was just told.
  assert.equal(r.totalLength_m, round2(r.segments.reduce((n, s) => n + s.length_m, 0)));

  const next = route(long, r.checkpoint!.ref, "observation_car") as Route;
  assert.ok(!("code" in next), "the continuation is itself a valid route");
  assert.equal(next.requiresContinuation, false);
  assert.equal(next.to, "observation_car");

  // The continuation must go on, not back: a threshold already crossed in the
  // first leg must not reappear in the second.
  const crossed = new Set(r.segments.flatMap((s) => [s.from, s.to]));
  crossed.delete(r.checkpoint!.ref);
  for (const s of next.segments) {
    assert.ok(!crossed.has(s.to), `continuation walks back through ${s.to}`);
  }
});

// ------------------------------------------------------------ output contract

const round2 = (n: number): number => Math.round(n * 100) / 100;

test("every ref the engine publishes can be resolved back", () => {
  // A segment endpoint the caller cannot ask for a route from is not a place.
  const published = new Set<string>();
  for (const [from, to] of [["entrance_front", "6-12A"], ["6-12A", "restroom"],
                            ["6-12A", "cafe_car"], ["6-15D", "luggage_rack"]] as const) {
    const r = ok(from, to);
    for (const s of r.segments) { published.add(s.from); published.add(s.to); }
    if (r.checkpoint) published.add(r.checkpoint.ref);
  }
  for (const ref of published) {
    const r = resolve(car6, ref);
    assert.ok(!("code" in r), `the engine emitted ${ref} but cannot resolve it`);
  }
});

test("every segment carries a finite bearing in [0, 360)", () => {
  const pairs: [string, string][] = [
    ["entrance_front", "6-12A"], ["6-12A", "restroom"], ["6-12A", "6-14D"],
    ["6-12A", "6-12D"], ["6-12A", "6-12B"], ["6-12A", "cafe_car"],
    ["luggage_rack", "6-1A"], ["6-15D", "entrance_front"],
  ];
  for (const [from, to] of pairs) {
    for (const s of ok(from, to).segments) {
      assert.ok(["egocentric", "car_axis"].includes(s.bearing.frame));
      assert.ok(Number.isFinite(s.bearing.degrees), `${from}->${to} non-finite bearing`);
      assert.ok(s.bearing.degrees >= 0 && s.bearing.degrees < 360,
        `${from}->${to} bearing ${s.bearing.degrees} is out of range`);
    }
  }
});

test("a leg that starts at a landmark publishes car_axis, never an invented body heading", () => {
  // Nobody records which way a person standing at the front door is facing.
  const r = ok("entrance_front", "6-12A");
  assert.equal(r.segments[0]!.bearing.frame, "car_axis");

  // A seat does record it, so the first move out of one is egocentric.
  assert.equal(ok("6-12A", "restroom").segments[0]!.bearing.frame, "egocentric");
});

test("no rendered direction is stored on a segment", () => {
  for (const s of ok("6-12A", "6-14D").segments) {
    assert.ok(!("direction" in s), "left and right depend on facing, so they are derived");
  }
  assert.ok(!("turns" in ok("6-12A", "6-14D")), "turns are derived from bearings");
});

test("aggregate totals equal every segment sum", () => {
  for (const [from, to] of [["6-12A", "cafe_car"], ["entrance_front", "6-15D"]] as const) {
    const r = ok(from, to);
    assert.equal(r.totalLength_m, round2(r.segments.reduce((n, s) => n + s.length_m, 0)));
    assert.equal(r.totalTraversalTime_s,
      Math.round(r.segments.reduce((n, s) => n + s.traversal_time_s, 0) * 10) / 10);
  }
});

test("the spoken total is the sum of the spoken segments", () => {
  // A listener who counts along must not be contradicted by the last sentence.
  for (const units of ["feet", "meters", "steps"] as const) {
    for (const [from, to] of [["6-12A", "restroom"], ["entrance_front", "6-12A"],
                              ["6-12A", "cafe_car"]] as const) {
      const summary = ok(from, to, { units }).rendered.summary;
      const spoken = [...summary.matchAll(/([\d.]+) (?:ft|m|steps?)\b/g)].map((m) => Number(m[1]));
      const total = spoken.pop();
      const parts = spoken.reduce((a, b) => a + b, 0);
      assert.equal(total, Math.round(parts * 10) / 10,
        `${from}->${to} in ${units}: segments sum to ${parts} but the total says ${total}\n${summary}`);
    }
  }
});

test("min_width_m is published only where the fixture measured it", () => {
  const r = ok("6-12A", "restroom");
  assert.equal(r.segments[1]!.min_width_m, car6.aisleWidth_m, "the aisle walk carries the measurement");
  assert.equal(r.segments[0]!.min_width_m, undefined, "a step out of a seat is not the aisle");

  const unmeasured: Layout = { ...car6, aisleWidth_m: undefined };
  const plain = route(unmeasured, "6-12A", "restroom") as Route;
  for (const s of plain.segments) {
    assert.equal(s.min_width_m, undefined,
      "an unmeasured aisle publishes nothing, not the regulatory minimum");
  }
});

test("authored portals produce door and vestibule modes, not more walkway", () => {
  const modes = ok("6-12A", "cafe_car").segments.map((s) => s.pathway_mode);
  assert.ok(modes.includes("door"));
  assert.ok(modes.includes("vestibule"));
});

// ------------------------------------------------------------------ rendering

test("the instructions include the turn between stepping out and walking off", () => {
  // Row 1 faces the front, so reaching the restroom at the rear needs a turn.
  const summary = ok("6-1A", "restroom").rendered.summary;
  assert.match(summary, /Turn (left|right|around)/, summary);
});

test("landmarks reach the traveller instead of being computed and dropped", () => {
  const summary = ok("6-12A", "restroom").rendered.summary;
  assert.match(summary, /rear door/i, "a landmark on the way is named");
  assert.match(summary, /RESTROOM/, "the sign text is read out");
});

test("direction style is a rendering choice, and clock positions carry half hours", () => {
  const rel = ok("6-12A", "6-14D", { directionStyle: "relative" });
  const clock = ok("6-12A", "6-14D", { directionStyle: "clock" });
  const cardinal = ok("6-12A", "6-14D", { directionStyle: "cardinal" });

  assert.match(rel.rendered.summary, /to your right/);
  assert.match(clock.rendered.summary, /o'clock/);
  assert.match(cardinal.rendered.summary, /the rear of the car/);
  assert.deepEqual(rel.segments, clock.segments, "same data underneath");

  // The car axis words come from the layout, not from a seat letter baked into render.
  assert.ok(!cardinal.rendered.summary.includes("A-B side") || car6.axisLabels.negY.includes("A"));
});

test("a wheelchair space is never announced as a seat", () => {
  const summary = ok("entrance_front", "6-1D").rendered.summary;
  assert.match(summary, /Wheelchair space/);
  assert.ok(!/Seat 6-1D/.test(summary), summary);
});

test("a route is the same length in both directions", () => {
  assert.equal(ok("entrance_front", "6-14D").totalLength_m, ok("6-14D", "entrance_front").totalLength_m);
});

// --------------------------------------------------------------------- errors

test("unknown refs are structured errors that never echo what was sent in", () => {
  const bad = err("99Z", "6-12A");
  assert.equal(bad.code, "INVALID_REF");
  assert.ok(!bad.message.includes("99Z"), "an invalid ref is not repeated back");

  const injected = err("<img src=x onerror=alert(1)>", "6-12A");
  assert.ok(!injected.message.includes("<img"), injected.message);

  assert.equal(err("6-12A", "6-12A").code, "NO_ROUTE");
});

test("render options that would produce Infinity are refused, not rendered", () => {
  for (const opts of [{ walkSpeedPercent: 0 }, { walkSpeedPercent: -50 },
                      { stepLength_m: 0 }, { stepLength_m: Number.POSITIVE_INFINITY }]) {
    assert.equal(err("6-12A", "restroom", opts).code, "INVALID_CRITERIA", JSON.stringify(opts));
  }
});

// -------------------------------------------------------------------- fixture

test("the authored fixture is what the engine reads", () => {
  assert.equal(car6.seats.length, 60, "15 rows of 4");
  assert.equal(car6.seats.filter((s) => s.available).length, 45);
  assert.equal(car6.seats.filter((s) => s.wheelchairSpace).length, 1);

  const space = car6.seats.find((s) => s.wheelchairSpace)!;
  assert.equal(space.movableArmrest, false, "49 CFR 38.125(d)(2): no seat is installed");

  // Front and rear are the car's own axis and are authored facts. Left and right
  // are not: they depend on which way the person reading the label is facing.
  for (const m of car6.landmarks) {
    assert.ok(!/\b(left|right)\b/i.test(m.label),
      `landmark label "${m.label}" bakes in a point of view`);
  }
});

test("routeLength agrees with the full route it skips building", () => {
  // query and compare sort sixty seats by distance; they must not disagree with
  // the route the traveller is eventually given.
  for (const [from, to] of [["entrance_front", "6-12A"], ["6-12A", "restroom"],
                            ["6-12A", "6-12D"], ["6-12A", "6-12B"],
                            ["6-12A", "cafe_car"]] as const) {
    assert.equal(routeLength(car6, from, to), ok(from, to).totalLength_m, `${from} -> ${to}`);
  }
  assert.equal(routeLength(car6, "6-12A", "6-12A"), 0, "the same place costs nothing");
  assert.equal(routeLength(car6, "99Z", "6-12A"), null, "an unknown ref has no distance");
});
