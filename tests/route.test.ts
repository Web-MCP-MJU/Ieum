import test from "node:test";
import assert from "node:assert/strict";
import { car6 } from "../src/domain/car-6.ts";
import { route } from "../src/domain/route-engine.ts";
import type { Route, RenderOptions } from "../src/domain/types.ts";

/**
 * Geometry these expectations are derived from (src/domain/car-6.ts):
 *   aisle y = 1.5 · row 1 at x = 3.0 · pitch 1.1 · A 0.35 B 0.95 C 2.05 D 2.65
 *   row 12 -> x 15.1 · row 14 -> x 17.3 · entrance_front (0.8, 1.5) · restroom (20.6, 0.7)
 */

const ok = (from: string, to: string, opts?: RenderOptions): Route => {
  const r = route(car6, from, to, opts);
  assert.ok(!("code" in r), `expected a route for ${from} -> ${to}, got ${JSON.stringify(r)}`);
  return r as Route;
};

test("entrance to a window seat: walk the aisle, then step off it", () => {
  const r = ok("entrance_front", "12A");
  assert.equal(r.segments.length, 2, "on the aisle already, so no step-out segment");
  assert.equal(r.segments[0]!.length_m, 14.3);
  assert.equal(r.segments[0]!.direction, "backward");
  assert.equal(r.segments[0]!.countedFeatures?.count, 11);
  assert.equal(r.segments[1]!.length_m, 1.15);
  assert.equal(r.segments[1]!.direction, "left");
  assert.equal(r.totalLength_m, 15.45);
});

test("seat to restroom: the step out of the seat is counted", () => {
  const r = ok("12A", "restroom");
  assert.equal(r.segments.length, 3);
  assert.equal(r.segments[0]!.length_m, 1.15, "getting out of seat 12A costs distance");
  assert.equal(r.segments[0]!.direction, "right");
  assert.equal(r.segments[1]!.countedFeatures?.count, 3, "rows 13, 14, 15");
  assert.equal(r.totalLength_m, 7.45);
  assert.ok(r.segments[1]!.landmarksPassed.includes("entrance_rear"));
});

test("seat to luggage rack, at the other end of the car", () => {
  const r = ok("12A", "luggage_rack");
  assert.equal(r.segments[1]!.direction, "forward");
  assert.ok(r.landmarks.some((l) => l.key === "luggage_rack"));
});

test("seat to seat, different row and side: three moves", () => {
  const r = ok("12A", "14D");
  assert.equal(r.segments.length, 3);
  assert.deepEqual(r.segments.map((s) => s.direction), ["right", "backward", "right"]);
  assert.equal(r.segments[1]!.countedFeatures?.count, 1, "row 13");
  assert.equal(r.totalLength_m, 4.5);
});

test("same row, across the aisle: not zero distance", () => {
  const r = ok("12A", "12D");
  assert.ok(r.totalLength_m > 0, "projecting both ends onto the aisle would give 0 here");
  assert.equal(r.totalLength_m, 2.3);
  assert.equal(r.segments.length, 1, "one continuous traverse, not two");
  assert.equal(r.segments[0]!.direction, "right");
});

test("same row, same side: never enters the aisle", () => {
  const r = ok("12A", "12B");
  assert.equal(r.totalLength_m, 0.6);
  assert.equal(r.segments.length, 1);
  assert.equal(r.segments[0]!.min_width_m, undefined, "no aisle traversal");
});

test("left and right follow the traveller's facing, not the car", () => {
  // Row 5 faces forward (-x), row 12 faces backward (+x). Same physical move,
  // opposite words, because the traveller is turned around.
  assert.equal(ok("5A", "5D").segments[0]!.direction, "left");
  assert.equal(ok("12A", "12D").segments[0]!.direction, "right");
});

test("units are a rendering choice: same geometry, different words", () => {
  const base = ok("entrance_front", "12A");
  const feet = ok("entrance_front", "12A", { units: "feet" });
  const meters = ok("entrance_front", "12A", { units: "meters" });
  const steps = ok("entrance_front", "12A", { units: "steps" });

  const geometry = (r: Route) => JSON.stringify(r.segments.map((s) => s.length_m));
  assert.equal(geometry(feet), geometry(meters));
  assert.equal(geometry(feet), geometry(steps));
  assert.equal(base.totalLength_m, steps.totalLength_m);

  assert.match(feet.rendered.summary, /ft/);
  assert.match(meters.rendered.summary, /m\b/);
  assert.match(steps.rendered.summary, /steps/);

  assert.ok(steps.rendered.unitsNote, "steps must carry the approximation caveat");
  assert.equal(feet.rendered.unitsNote, undefined);
  assert.equal(meters.rendered.unitsNote, undefined);
});

test("direction style is a rendering choice too", () => {
  const rel = ok("entrance_front", "12A", { directionStyle: "relative" });
  const clock = ok("entrance_front", "12A", { directionStyle: "clock" });
  const cardinal = ok("entrance_front", "12A", { directionStyle: "cardinal" });

  assert.match(rel.rendered.summary, /to your left/);
  assert.match(clock.rendered.summary, /9 o'clock/);
  assert.match(cardinal.rendered.summary, /A-B side/);
  assert.deepEqual(rel.segments, clock.segments, "same data underneath");
});

test("walking speed scales time, never distance", () => {
  const normal = ok("entrance_front", "12A", { walkSpeedPercent: 100 });
  const slower = ok("entrance_front", "12A", { walkSpeedPercent: 50 });

  assert.equal(normal.totalLength_m, slower.totalLength_m);
  assert.ok(Math.abs(slower.totalTraversalTime_s - normal.totalTraversalTime_s * 2) < 0.2);
});

test("a route is the same length in both directions", () => {
  assert.equal(ok("entrance_front", "14D").totalLength_m, ok("14D", "entrance_front").totalLength_m);
});

test("unknown refs and degenerate routes are structured errors, not throws", () => {
  const bad = route(car6, "99Z", "12A");
  assert.ok("code" in bad && bad.code === "INVALID_REF");
  assert.match((bad as { message: string }).message, /99Z/);

  const same = route(car6, "12A", "12A");
  assert.ok("code" in same && same.code === "NO_ROUTE");
});
