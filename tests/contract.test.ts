import test from "node:test";
import assert from "node:assert/strict";

import { car6 } from "../src/domain/car-6.ts";
import { route } from "../src/domain/route-engine.ts";
import type { Route, RenderOptions, SpatialRef } from "../src/domain/types.ts";
import { validateToolOutput } from "./schema.ts";

const validRoute = (from: SpatialRef, to: SpatialRef, opts: RenderOptions = {}): Route => {
  const r = route(car6, from, to, opts);
  assert.ok(!("code" in r), `expected a route for ${from} -> ${to}, got ${JSON.stringify(r)}`);
  return r;
};

// --------------------------------------------------------------- self-check

const seg = (r: Record<string, unknown>): Record<string, any> =>
  (r["segments"] as Record<string, any>[])[0]!;
const landmark = (r: Record<string, unknown>): Record<string, any> =>
  (r["landmarks"] as Record<string, any>[])[0]!;

test("self-check: the validator rejects a deliberately broken Route", () => {
  const base = validRoute("6-12A", "6-14D");
  const brokenSegment = { ...base.segments[0]!, bearing: { ...base.segments[0]!.bearing, degrees: 360 } };
  const broken: Record<string, unknown> = {
    ...base,
    extraJunkField: "nope",
    segments: [brokenSegment, brokenSegment, brokenSegment, brokenSegment, brokenSegment],
  };
  delete broken.requestedTo;

  const errors = validateToolOutput("a11y.get_route", { ok: true, data: broken });
  assert.ok(errors.length > 0, "a broken route must not validate");

  // A top-level failure here is a oneOf mismatch (ReadSuccess vs ReadFailure), whose
  // message names each losing branch and why — so the detail lives in .message, not .path.
  const detail = errors.map((e) => `${e.path} ${e.message}`).join(" | ");
  assert.ok(detail.includes("extraJunkField"), `expected an extraJunkField error, got: ${detail}`);
  assert.ok(detail.includes("requestedTo"), `expected a missing-requestedTo error, got: ${detail}`);
  assert.ok(detail.includes("degrees"), `expected a bearing.degrees error, got: ${detail}`);
});

test("self-check: each kind of contract violation is caught on its own", () => {
  // One combined broken object can pass this file while hiding which check did the
  // work. Each mutation below must fail by itself, or the validator has a hole.
  const mutations: [string, (r: Record<string, unknown>) => void][] = [
    ["extra field on Route", (r) => { r["junk"] = 1; }],
    ["extra field on a segment", (r) => { seg(r).direction = "left"; }],
    ["missing requestedTo", (r) => { delete r["requestedTo"]; }],
    ["missing requiresContinuation", (r) => { delete r["requiresContinuation"]; }],
    ["bearing at 360", (r) => { seg(r).bearing.degrees = 360; }],
    ["negative bearing", (r) => { seg(r).bearing.degrees = -1; }],
    ["unknown bearing frame", (r) => { seg(r).bearing.frame = "compass"; }],
    ["missing bearing", (r) => { delete seg(r).bearing; }],
    ["more segments than the cap", (r) => {
      const s = r["segments"] as unknown[];
      while (s.length <= 4) s.push(structuredClone(s[0]));
    }],
    ["negative length", (r) => { seg(r).length_m = -1; }],
    ["unknown pathway_mode", (r) => { seg(r).pathway_mode = "teleport"; }],
    ["landmark missing detectability", (r) => { delete landmark(r).detectability; }],
    ["landmark using the old position key", (r) => {
      const m = landmark(r);
      m.position = m.position_m;
      delete m.position_m;
    }],
    ["unknown units", (r) => { (r["rendered"] as Record<string, unknown>)["units"] = "cubits"; }],
    // JSON.stringify turns these into null, so the field would vanish on the wire.
    ["non-finite length", (r) => { seg(r).length_m = Number.POSITIVE_INFINITY; }],
    ["NaN traversal time", (r) => { seg(r).traversal_time_s = Number.NaN; }],
  ];

  for (const [name, mutate] of mutations) {
    const data = structuredClone(validRoute("6-12A", "restroom")) as unknown as Record<string, unknown>;
    mutate(data);
    const errors = validateToolOutput("a11y.get_route", { ok: true, data });
    assert.ok(errors.length > 0, `the validator did not catch: ${name}`);
  }

  // And a success envelope carrying an error field is not a success envelope.
  const both = { ok: true, data: validRoute("6-12A", "restroom"), error: { code: "NO_ROUTE", message: "x" } };
  assert.ok(validateToolOutput("a11y.get_route", both).length > 0);
});

// ------------------------------------------------------------- conformance

test("a11y.get_route: real routes conform to the contract", () => {
  const pairs: [SpatialRef, SpatialRef][] = [
    ["entrance_front", "6-12A"],
    ["6-12A", "restroom"],
    ["6-12A", "6-12D"],
    ["6-12A", "6-12B"],
    ["6-12A", "cafe_car"],
  ];
  for (const [from, to] of pairs) {
    const r = validRoute(from, to);
    const errors = validateToolOutput("a11y.get_route", { ok: true, data: r });
    assert.deepEqual(errors, [], `${from}->${to}: ${JSON.stringify(errors)}`);
  }

  for (const units of ["meters", "feet", "steps"] as const) {
    const r = validRoute("6-12A", "6-14D", { units });
    const errors = validateToolOutput("a11y.get_route", { ok: true, data: r });
    assert.deepEqual(errors, [], `units=${units}: ${JSON.stringify(errors)}`);
  }
});

test("a11y.get_route: a failed route validates as the ReadFailure branch", () => {
  const bad = route(car6, "99Z", "6-12A");
  assert.ok("code" in bad, "expected a DomainError");
  const errors = validateToolOutput("a11y.get_route", { ok: false, error: bad });
  assert.deepEqual(errors, []);
});

test("a11y.get_route: JSON round-trip preserves validity and equality", () => {
  const r = validRoute("6-12A", "cafe_car");
  const wrapped = { ok: true as const, data: r };
  const roundTripped: unknown = JSON.parse(JSON.stringify(wrapped));
  assert.deepEqual(roundTripped, wrapped);
  assert.deepEqual(validateToolOutput("a11y.get_route", roundTripped), []);
});
