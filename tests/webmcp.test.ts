import test from "node:test";
import assert from "node:assert/strict";

import { ANNOTATIONS, TOOLS, callTool, registerAllTools, toWire } from "../src/webmcp/register.ts";
import type { ToolDefinition } from "../src/webmcp/capability.ts";
import { validateToolOutput } from "./schema.ts";

const NAMES = [
  "a11y.get_layout", "a11y.query", "a11y.describe", "a11y.get_route", "a11y.compare",
  "a11y.get_selection", "a11y.select", "a11y.undo", "a11y.confirm",
];

/** No DOM in Node, so stand in for the host and record what it is handed. */
function fakeHost() {
  const registered: { tool: ToolDefinition; signal: AbortSignal }[] = [];
  const document = {
    modelContext: {
      registerTool: async (tool: ToolDefinition, o: { signal: AbortSignal }) => {
        registered.push({ tool, signal: o.signal });
      },
      executeTool: async () => {},
      getTools: () => registered.map((r) => r.tool),
    },
  };
  const g = globalThis as Record<string, unknown>;
  g["window"] = { isSecureContext: true };
  g["document"] = document;
  return {
    registered,
    restore: () => { delete g["window"]; delete g["document"]; },
  };
}

test("exactly the nine contract tools register, under the registration signal", async () => {
  const host = fakeHost();
  try {
    const controller = await registerAllTools();
    assert.deepEqual(host.registered.map((r) => r.tool.name), NAMES);
    for (const r of host.registered) {
      assert.equal(r.signal, controller.signal, "registration lifetime, not the call's");
    }
  } finally { host.restore(); }
});

test("every tool declares side effects and is actually callable", async () => {
  const host = fakeHost();
  try {
    await registerAllTools();
    for (const { tool } of host.registered) {
      // Architecture 16: readOnlyHint true would tell an agent that confirming
      // a booking changes nothing.
      assert.deepEqual(tool.annotations, ANNOTATIONS, tool.name);
      assert.equal(typeof tool.execute, "function", `${tool.name} has no execute`);
    }
  } finally { host.restore(); }
});

test("execute runs the real engine, not a stub", async () => {
  const host = fakeHost();
  try {
    await registerAllTools();
    const getRoute = host.registered.find((r) => r.tool.name === "a11y.get_route")!.tool;

    // Flat input, as the contract documents it.
    const result = await getRoute.execute(
      { from: "entrance_front", to: "6-12A", units: "meters" },
      { signal: new AbortController().signal },
    ) as { ok: boolean; data: { segments: { bearing: unknown }[]; rendered: { summary: string } } };

    assert.equal(result.ok, true);
    assert.ok(result.data.segments.length > 0);
    assert.ok(result.data.segments[0]!.bearing, "a stub would not carry a bearing");
    assert.match(result.data.rendered.summary, /\d/);
  } finally { host.restore(); }
});

test("aborting registration does not abort an in-flight call", async () => {
  const host = fakeHost();
  try {
    const controller = await registerAllTools();
    const call = new AbortController();
    controller.abort();

    const route = host.registered.find((r) => r.tool.name === "a11y.get_route")!.tool;
    const result = await route.execute(
      { from: "entrance_front", to: "6-12A" }, { signal: call.signal }) as { ok: boolean };
    assert.equal(result.ok, true, "the two signals have different owners");
    assert.equal(call.signal.aborted, false);
  } finally { host.restore(); }
});

test("an unknown tool throws instead of returning ok:false", async () => {
  // UNKNOWN_TOOL is not a ToolErrorCode. A bug dressed as an expected failure hides.
  await assert.rejects(callTool("a11y.nope"), /Unknown tool/);
});

test("toWire refuses anything JSON would quietly damage", () => {
  assert.throws(() => toWire({ ok: true, data: { n: Number.POSITIVE_INFINITY } }), /finite/);
  assert.throws(() => toWire({ ok: true, data: { n: Number.NaN } }), /finite/);
  assert.throws(() => toWire({ ok: true, data: { f: () => 1 } }), /JSON-serializable/);

  const circular: Record<string, unknown> = { ok: true };
  circular["self"] = circular;
  assert.throws(() => toWire(circular), /circular/);

  const fine = { ok: true, data: { a: [1, "x", null, { b: false }] } };
  assert.equal(toWire(fine), fine);
});

test("every tool's result survives a JSON round trip unchanged", async () => {
  const calls: [string, Record<string, unknown>][] = [
    ["a11y.get_layout", {}],
    ["a11y.query", { rail: { side: "window" } }],
    ["a11y.describe", { ref: "6-12A" }],
    ["a11y.get_route", { from: "6-12A", to: "restroom", units: "steps" }],
    ["a11y.compare", { refs: ["6-12A", "6-14D"] }],
    ["a11y.get_selection", {}],
    ["a11y.select", { ref: "6-12A" }],
    ["a11y.undo", {}],
  ];
  for (const [name, input] of calls) {
    const r = await callTool(name, input);
    assert.deepEqual(JSON.parse(JSON.stringify(r)), r, `${name} does not round-trip`);
  }
});

test("the input schemas are flat, as the contract documents them", () => {
  const route = TOOLS.find((t) => t.name === "a11y.get_route")!;
  const props = (route.inputSchema as { properties: Record<string, unknown> }).properties;
  // `{ from, to, units }`, never `{ from, to, opts: { units } }`.
  assert.ok("units" in props && !("opts" in props));

  const query = TOOLS.find((t) => t.name === "a11y.query")!;
  const qp = (query.inputSchema as { properties: Record<string, unknown> }).properties;
  assert.ok("near" in qp && "units" in qp && !("criteria" in qp) && !("opts" in qp));

  // Zero step length produced "about Infinity steps"; the schema must exclude it.
  assert.deepEqual(qp["stepLength_m"], { type: "number", exclusiveMinimum: 0 });
});

test("all nine tools conform to the published output contract", async () => {
  // The schema is additionalProperties: false, so a missing OR an extra field
  // fails here. This is the check that was missing entirely.
  const calls: [string, Record<string, unknown>][] = [
    ["a11y.get_layout", {}],
    ["a11y.query", {}],
    ["a11y.query", { rail: { side: "window" }, near: "entrance_front" }],
    ["a11y.query", { priceMax_usd: 1 }],                       // zero matches
    ["a11y.describe", { ref: "6-12A" }],
    ["a11y.describe", { ref: "restroom" }],
    ["a11y.describe", { ref: "nope" }],                        // ReadFailure
    ["a11y.get_route", { from: "entrance_front", to: "6-12A" }],
    ["a11y.get_route", { from: "6-12A", to: "cafe_car", units: "steps" }],
    ["a11y.get_route", { from: "nope", to: "6-12A" }],         // ReadFailure
    ["a11y.compare", { refs: ["6-12A", "6-14D"] }],
    ["a11y.compare", { refs: ["6-12A", "6-12A"] }],            // duplicate: rejected
    ["a11y.get_selection", {}],
    ["a11y.select", { ref: "6-1A" }],                          // taken: StateFailure
    ["a11y.select", { ref: "6-12A" }],
    ["a11y.undo", {}],
    ["a11y.undo", {}],                                         // empty: StateFailure
  ];

  for (const [name, input] of calls) {
    const result = await callTool(name, input);
    const errors = validateToolOutput(name, result);
    assert.deepEqual(errors, [],
      `${name} ${JSON.stringify(input)} violated the contract: ${JSON.stringify(errors)}`);
  }
});
