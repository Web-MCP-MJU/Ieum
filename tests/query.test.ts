import test from "node:test";
import assert from "node:assert/strict";
import { car6 } from "../src/domain/car-6.ts";
import { query, MAX_RESULTS, type QueryOutcome } from "../src/domain/query-engine.ts";
import { compare } from "../src/domain/compare-engine.ts";
import type { Comparison, DomainError, RenderOptions } from "../src/domain/types.ts";
import { STEPS_NOTE } from "../src/domain/render.ts";

const ok = (...args: Parameters<typeof query>): QueryOutcome => {
  const r = query(...args);
  assert.ok(!("code" in r), `expected results, got ${JSON.stringify(r)}`);
  return r as QueryOutcome;
};
const fails = (...args: Parameters<typeof query>): DomainError => {
  const r = query(...args);
  assert.ok("code" in r, `expected an error, got ${JSON.stringify(r)}`);
  return r as DomainError;
};

test("bare query returns available seats, flat and long", () => {
  const r = ok(car6, {});
  assert.equal(r.totalMatched, 45, "45 of 60 seats are free in the fixture");
  assert.equal(r.items.length, MAX_RESULTS, "capped, but at 12 rather than 3");
  assert.ok(r.items.every((i) => typeof i.line === "string" && i.line.length > 0));
});

test("held seats are excluded unless asked for", () => {
  assert.equal(ok(car6, {}).totalMatched, 45);
  assert.equal(ok(car6, { availableOnly: false }).totalMatched, 60);
});

test("rail filters narrow the set", () => {
  const window = ok(car6, { rail: { side: "window" } });
  assert.ok(window.totalMatched > 0);
  assert.ok(window.totalMatched < 45);

  const forwardWindow = ok(car6, { rail: { side: "window", facing: "forward" } });
  assert.ok(forwardWindow.totalMatched < window.totalMatched, "two filters cut more than one");
});

test("accessibility needs are first-class filters, not free text", () => {
  const chairs = ok(car6, { needs: { wheelchairSpace: true }, availableOnly: false });
  assert.deepEqual(chairs.items.map((i) => i.ref), ["6-1D"]);

  const roomy = ok(car6, { needs: { minFootSpace_in2: 1000 }, availableOnly: false });
  assert.ok(roomy.items.every((i) => i.ref.startsWith("6-1")), "only the bulkhead row is that roomy");
});

// -------------------------------------------------------------- cardinality/hints

test("0 matches is success with a relaxation hint, not an error", () => {
  const r = ok(car6, { priceMax_usd: 1 });
  assert.equal(r.totalMatched, 0);
  assert.deepEqual(r.items, []);
  assert.equal(r.appliedCriteria.availableOnly, true);
  assert.ok(typeof r.hint === "string" && r.hint.length > 0, "zero matches must still offer a next move");
});

test("1-12 matches carry no hint", () => {
  const r = ok(car6, { needs: { minFootSpace_in2: 1000 }, availableOnly: false });
  assert.ok(r.totalMatched >= 1 && r.totalMatched <= 12);
  assert.equal(r.hint, undefined);
});

test("13+ matches carry exactly one narrowing hint", () => {
  const r = ok(car6, {});
  assert.ok(r.totalMatched >= 13);
  assert.equal(typeof r.hint, "string");
});

// ------------------------------------------------------------- candidate shape

test("candidates carry structured facts, not a flat {ref,line} pair", () => {
  const r = ok(car6, { needs: { wheelchairSpace: true }, availableOnly: false });
  const item = r.items[0]!;
  assert.equal(item.domain, "rail");
  if (item.domain === "rail") {
    assert.equal(typeof item.rail.row, "number");
    assert.equal(typeof item.accessibility.wheelchairSpace, "boolean");
  }
  assert.equal(item.distance, undefined, "no `near` was given, so no distance");
  // 49 CFR 38.125(d)(2): no seat is installed in a wheelchair space.
  assert.doesNotMatch(item.label, /^Seat /);
  assert.doesNotMatch(item.line, /^Seat /);
});

test("distance appears only when `near` was given", () => {
  const withNear = ok(car6, { near: "entrance_front" });
  assert.ok(withNear.items.every((i) => i.distance !== undefined));
  assert.ok(withNear.items.every((i) => i.distance!.from === "entrance_front"));

  const withoutNear = ok(car6, {});
  assert.ok(withoutNear.items.every((i) => i.distance === undefined));
});

test("appliedCriteria.availableOnly is present even when the caller omitted it", () => {
  const r = ok(car6, { rail: { side: "window" } });
  assert.equal(r.appliedCriteria.availableOnly, true);
});

// -------------------------------------------------------------- deterministic order

test("the same query returns candidates in the same order every time", () => {
  const a = ok(car6, { availableOnly: false });
  const b = ok(car6, { availableOnly: false });
  assert.deepEqual(a.items.map((i) => i.ref), b.items.map((i) => i.ref));
});

test("sort key order: price before row when they disagree", () => {
  // Row 1 (bulkhead, $109) is cheaper-priced rows 12+ ($79) must sort ahead of it.
  const r = ok(car6, {});
  assert.deepEqual(
    r.items.map((i) => i.ref),
    ["6-12A", "6-12B", "6-12C", "6-12D", "6-13B", "6-13C", "6-13D", "6-14A", "6-14B", "6-14C", "6-14D", "6-15A"],
  );
});

test("results near a landmark are sorted by walking distance", () => {
  const r = ok(car6, { near: "entrance_front" });
  const distances = r.items.map((i) => i.distance!.distance_m);
  assert.deepEqual(distances, [...distances].sort((a, b) => a - b), "nearest first");
});

test("a distance limit actually limits", () => {
  const all = ok(car6, { near: "restroom" });
  const close = ok(car6, { near: "restroom", maxDistance_m: 6 });
  assert.ok(close.totalMatched < all.totalMatched);
  assert.ok(close.totalMatched > 0);
});

// ------------------------------------------------------------------- totalMatched

test("totalMatched is the pre-slice count, truthful when the list is capped", () => {
  const r = ok(car6, {});
  assert.equal(r.totalMatched, 45, "45 of 60 seats are free in the fixture");
  assert.equal(r.items.length, MAX_RESULTS, "but only 12 are returned");
});

// ------------------------------------------------------------------------ errors

test("Q1 — a distance with no origin is rejected, not guessed", () => {
  const e = fails(car6, { maxDistance_m: 5 });
  assert.equal(e.code, "INVALID_CRITERIA");
  assert.match(e.message, /starting point/);
});

test("Q2 — the other domain's filter is refused, never silently dropped", () => {
  const e = fails(car6, { hotel: { floorMin: 8 } });
  assert.equal(e.code, "UNSUPPORTED_CRITERIA");
  assert.match(e.message, /hotel rooms/);
});

test("an unknown landmark is rejected without echoing the caller's string", () => {
  const e = fails(car6, { near: "<img src=x onerror=alert(1)>" });
  assert.equal(e.code, "INVALID_REF");
  assert.doesNotMatch(e.message, /<img/);
  assert.match(e.message, /entrance_front/, "known landmarks may still be listed — they are authored");
});

test("units affect the description but not the matching", () => {
  const feet = ok(car6, { near: "entrance_front" }, { units: "feet" });
  const meters = ok(car6, { near: "entrance_front" }, { units: "meters" });
  assert.equal(feet.totalMatched, meters.totalMatched);
  assert.deepEqual(feet.items.map((i) => i.ref), meters.items.map((i) => i.ref));
  assert.notEqual(feet.items[0]!.line, meters.items[0]!.line);
});

test("unitsNote appears only for step-rendered results", () => {
  const steps = ok(car6, { near: "entrance_front" }, { units: "steps" });
  assert.equal(typeof steps.unitsNote, "string");

  const feet = ok(car6, { near: "entrance_front" }, { units: "feet" });
  assert.equal(feet.unitsNote, undefined);

  const stepsNoNear = ok(car6, {}, { units: "steps" });
  assert.equal(stepsNoNear.unitsNote, undefined, "no distance was rendered, so no note");
});

// ------------------------------------------------------------------ compare

const cmp = (refs: string[], opts: RenderOptions = {}): Comparison => {
  const r = compare(car6, refs, opts);
  assert.ok(!("code" in r), `expected a comparison, got ${JSON.stringify(r)}`);
  return r as Comparison;
};

test("compare puts every candidate on the same axes in the same order", () => {
  const c = cmp(["6-12A", "6-14D"]);
  assert.equal(c.rows.length, 2);
  assert.ok(c.axes.length > 0);
  const axisKeys = c.axes.map((a) => a.key);
  for (const row of c.rows) {
    assert.deepEqual(Object.keys(row.values).sort(), [...axisKeys].sort(), "every row has exactly the axis keys");
  }
});

test("axes every candidate agrees on are dropped, but the identifying core stays", () => {
  const c = cmp(["6-12A", "6-12B"]);
  assert.ok(!c.axes.some((a) => a.key === "facing"), "both face the same way, so saying it decides nothing");
  assert.ok(c.axes.some((a) => a.key === "available"), "availability is always an axis");
  assert.ok(c.axes.some((a) => a.key === "position"));
  assert.ok(c.axes.some((a) => a.key === "price_usd"));
});

test("compare refuses counts it cannot lay out usefully", () => {
  for (const refs of [["6-12A"], ["6-1A", "6-2A", "6-3A", "6-4A", "6-5A"]]) {
    const r = compare(car6, refs);
    assert.ok("code" in r && r.code === "INVALID_SELECTION");
  }
  const bad = compare(car6, ["6-12A", "99-99Z"]);
  assert.ok("code" in bad && bad.code === "INVALID_REF" && !bad.message.includes("99-99Z"));
});

test("compare rejects duplicate refs", () => {
  const r = compare(car6, ["6-12A", "6-12A"]);
  assert.ok("code" in r && r.code === "INVALID_SELECTION");
});

test("compare preserves input order", () => {
  const c = cmp(["6-14D", "6-1A"]);
  assert.deepEqual(c.rows.map((r) => r.ref), ["6-14D", "6-1A"]);
});

test("an unavailable ref can be compared and its availability shows", () => {
  const unavailableRef = car6.seats.find((s) => !s.available)!.ref;
  const availableRef = car6.seats.find((s) => s.available)!.ref;
  const c = cmp([unavailableRef, availableRef]);
  const row = c.rows.find((r) => r.ref === unavailableRef)!;
  assert.equal(row.values["available"], false);
});

test("the step caveat rides on the result that renders steps", () => {
  const stepped = cmp(["6-12A", "6-14D"], { units: "steps" });
  assert.equal(stepped.unitsNote, STEPS_NOTE,
    "the distance axes render steps, so the approximation must be stated");
  assert.equal(cmp(["6-12A", "6-14D"], { units: "feet" }).unitsNote, undefined);
});
