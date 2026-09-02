import test from "node:test";
import assert from "node:assert/strict";
import { car6 } from "../src/domain/car-6.ts";
import { query, MAX_RESULTS, type QueryOutcome } from "../src/domain/query-engine.ts";
import { compare } from "../src/domain/compare-engine.ts";
import type { Comparison, DomainError } from "../src/domain/types.ts";

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
  assert.deepEqual(chairs.items.map((i) => i.ref), ["1D"]);

  const roomy = ok(car6, { needs: { minFootSpace_in2: 1000 }, availableOnly: false });
  assert.ok(roomy.items.every((i) => i.ref.startsWith("1")), "only the bulkhead row is that roomy");
});

test("results near a landmark are sorted by walking distance", () => {
  const r = ok(car6, { near: "entrance_front" });
  const rows = r.items.map((i) => Number(i.ref.match(/^\d+/)![0]));
  assert.deepEqual(rows, [...rows].sort((a, b) => a - b), "nearest first");
  assert.match(r.items[0]!.line, /from front door/);
});

test("a distance limit actually limits", () => {
  const all = ok(car6, { near: "restroom" });
  const close = ok(car6, { near: "restroom", maxDistance_m: 6 });
  assert.ok(close.totalMatched < all.totalMatched);
  assert.ok(close.totalMatched > 0);
});

test("Q1 — a distance with no origin is rejected, not guessed", () => {
  const e = fails(car6, { maxDistance_m: 5 });
  assert.equal(e.code, "INVALID_CRITERIA");
  assert.match(e.message, /starting point/);
});

test("Q2 — the other domain's filter is refused, never silently dropped", () => {
  const e = fails(car6, { hotel: { floorMin: 8 } });
  assert.equal(e.code, "UNSUPPORTED_CRITERIA");
  // The point of failing loudly: results would otherwise imply the filter applied.
  assert.match(e.message, /hotel rooms/);
});

test("an unknown landmark names the ones that exist", () => {
  const e = fails(car6, { near: "swimming_pool" });
  assert.equal(e.code, "INVALID_REF");
  assert.match(e.message, /entrance_front/);
});

test("no match is an error with a message, not an empty list", () => {
  const e = fails(car6, { priceMax_usd: 1 });
  assert.equal(e.code, "NO_MATCH");
});

test("what was actually applied comes back with the results", () => {
  const criteria = { near: "entrance_front", rail: { side: "window" as const } };
  const r = ok(car6, criteria);
  assert.deepEqual(r.appliedCriteria, criteria);
});

test("units affect the description but not the matching", () => {
  const feet = ok(car6, { near: "entrance_front" }, { units: "feet" });
  const meters = ok(car6, { near: "entrance_front" }, { units: "meters" });
  assert.equal(feet.totalMatched, meters.totalMatched);
  assert.deepEqual(feet.items.map((i) => i.ref), meters.items.map((i) => i.ref));
  assert.notEqual(feet.items[0]!.line, meters.items[0]!.line);
});

// ------------------------------------------------------------------ compare

const cmp = (refs: string[]): Comparison => {
  const r = compare(car6, refs);
  assert.ok(!("code" in r), `expected a comparison, got ${JSON.stringify(r)}`);
  return r as Comparison;
};

test("compare puts every candidate on the same axes in the same order", () => {
  const c = cmp(["12A", "14D"]);
  assert.equal(c.rows.length, 2);
  assert.ok(c.axes.length > 0);
  for (const row of c.rows) {
    assert.equal(row.values.length, c.axes.length, "no ragged rows to re-align by ear");
  }
});

test("axes every candidate agrees on are dropped", () => {
  const c = cmp(["12A", "12B"]);
  assert.ok(!c.axes.includes("Facing"), "both face the same way, so saying it decides nothing");
});

test("compare refuses counts it cannot lay out usefully", () => {
  for (const refs of [["12A"], ["1A", "2A", "3A", "4A", "5A"]]) {
    const r = compare(car6, refs);
    assert.ok("code" in r && r.code === "INVALID_SELECTION");
  }
  const bad = compare(car6, ["12A", "99Z"]);
  assert.ok("code" in bad && bad.code === "INVALID_REF");
});
