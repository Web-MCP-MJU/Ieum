/**
 * WebMCP adapter. Binds the use cases to the current WebMCP draft and contains
 * no business logic of its own.
 *
 * Tool inputs are FLAT (`{ from, to, units }`), matching Architecture 10.1/10.2.
 * An earlier version wrapped them as `{ from, to, opts: {...} }` with
 * `additionalProperties: false`, so an agent calling the documented contract was
 * rejected by the schema before anything ran.
 */

import type { SpatialRef } from "../domain/types.ts";
import { usecases } from "../app/usecases.ts";
import type { ToolDefinition } from "./capability.ts";
import { assertCapable, classifyRegistrationError } from "./capability.ts";

// ------------------------------------------------------------------ schemas

const REF = { type: "string", minLength: 1, maxLength: 128 } as const;

/** Architecture 6: both are finite and in (0, +inf). `minimum: 0` let zero
 *  through, and zero produced "about Infinity steps" in the spoken output. */
const renderProps = {
  units: { enum: ["meters", "feet", "steps"], description: "Distance unit" },
  stepLength_m: { type: "number", exclusiveMinimum: 0 },
  directionStyle: { enum: ["relative", "clock", "cardinal"] },
  walkSpeedPercent: { type: "number", exclusiveMinimum: 0 },
} as const;

const object = (properties: Record<string, unknown>, required?: string[]) => ({
  type: "object",
  properties,
  ...(required ? { required } : {}),
  additionalProperties: false,
});

// -------------------------------------------------------------------- tools

type Ctx = { signal?: AbortSignal };
type Tool = {
  name: string;
  description: string;
  inputSchema: unknown;
  run: (input: Record<string, unknown>, ctx: Ctx) => unknown;
};

/**
 * Architecture 16 is an explicit erratum: every call changes visible or log
 * state, so all nine are `false`. Marking `select`/`undo`/`confirm` read-only
 * would tell an agent that confirming a booking has no side effects.
 */
export const ANNOTATIONS = { readOnlyHint: false, untrustedContentHint: false } as const;

export const TOOLS: Tool[] = [
  {
    name: "a11y.get_layout",
    description:
      "Return the overall structure of the current layout: seat and accessibility " +
      "counts, reference points, and bounds in metres.",
    inputSchema: object({ ...renderProps }),
    run: (input) => usecases.getLayout(input),
  },
  {
    name: "a11y.query",
    description:
      "Search seats by accessibility need, walking distance from a reference point, " +
      "price, and direction. Returns at most 12 candidates and a truthful total.",
    inputSchema: object({
      near: REF,
      maxDistance_m: { type: "number", minimum: 0 },
      priceMax_usd: { type: "number", minimum: 0 },
      availableOnly: { type: "boolean" },
      needs: object({
        wheelchairSpace: { type: "boolean" },
        transferSeat: { type: "boolean" },
        movableArmrest: { type: "boolean" },
        minFootSpace_in2: { type: "number", minimum: 0 },
        excludeExitRow: { type: "boolean" },
      }),
      rail: object({
        facing: { enum: ["forward", "backward"] },
        side: { enum: ["window", "aisle"] },
        quietCar: { type: "boolean" },
      }),
      hotel: object({
        floorMin: { type: "number", minimum: 0 },
        floorMax: { type: "number", minimum: 0 },
        bedToBathroomMax_m: { type: "number", minimum: 0 },
      }),
      ...renderProps,
    }),
    run: (input) => usecases.query(input),
  },
  {
    name: "a11y.describe",
    description:
      "Describe one seat or reference point: its attributes, its distance to every " +
      "reference point, and follow-up questions worth asking.",
    inputSchema: object({ ref: REF, ...renderProps }, ["ref"]),
    run: (input) => usecases.describe(input as { ref: SpatialRef }),
  },
  {
    name: "a11y.get_route",
    description:
      "Return a structured route between two valid refs, including metre-source " +
      "segments with bearings, landmarks passed, and the requested rendering.",
    inputSchema: object({ from: REF, to: REF, ...renderProps }, ["from", "to"]),
    run: (input) => usecases.getRoute(input as { from: SpatialRef; to: SpatialRef }),
  },
  {
    name: "a11y.compare",
    description:
      "Compare 2 to 4 distinct refs on the same named axes, in the order given.",
    inputSchema: object({
      refs: { type: "array", items: REF, minItems: 2, maxItems: 4 },
      ...renderProps,
    }, ["refs"]),
    run: (input) => usecases.compare(input as { refs: SpatialRef[] }),
  },
  {
    name: "a11y.get_selection",
    description: "Report which refs are currently selected and the full selection state.",
    inputSchema: object({}),
    run: () => usecases.getSelection(),
  },
  {
    name: "a11y.select",
    description:
      "Add one available ref to the selection. This is a draft: nothing is booked " +
      "until a human confirms it through a11y.confirm.",
    inputSchema: object({ ref: REF }, ["ref"]),
    run: (input) => usecases.select(input as { ref: SpatialRef }),
  },
  {
    name: "a11y.undo",
    description: "Undo the last selection by one step and report which ref that removed.",
    inputSchema: object({}),
    run: () => usecases.undo(),
  },
  {
    name: "a11y.confirm",
    description:
      "Ask the person to confirm the current selection. Blocks for up to 120 seconds " +
      "and returns the terminal outcome in the same call. Calling this does not " +
      "confirm anything by itself.",
    inputSchema: object({}),
    run: (_input, ctx) => usecases.confirm({ ...(ctx.signal ? { signal: ctx.signal } : {}) }),
  },
];

// --------------------------------------------------------------------- wire

/**
 * Architecture 15.2: every fulfilled result is a JSON-serializable plain value.
 * A non-finite number survives TypeScript and then becomes `null` in
 * `JSON.stringify`, silently deleting the field. These are programming failures,
 * not expected domain errors, so they throw rather than becoming `ok: false`.
 */
export function toWire<T>(result: T): T {
  const seen = new Set<object>();

  const walk = (v: unknown, path: string): void => {
    if (v === null) return;
    switch (typeof v) {
      case "number":
        if (!Number.isFinite(v)) throw new TypeError(`${path || "result"} is not a finite number`);
        return;
      case "string":
      case "boolean":
        return;
      case "bigint":
      case "function":
      case "symbol":
      case "undefined":
        throw new TypeError(`${path || "result"} is not JSON-serializable (${typeof v})`);
    }
    const o = v as object;
    // Only an ANCESTOR repeating is a cycle. Two fields sharing one array is
    // not: JSON.stringify handles that, and get_selection returns the same
    // `selected` array as both `data.selected` and `state.selected`.
    if (seen.has(o)) throw new TypeError(`${path || "result"} is circular`);
    seen.add(o);
    if (Array.isArray(o)) {
      o.forEach((item, i) => walk(item, `${path}/${i}`));
    } else if (
      Object.getPrototypeOf(o) !== Object.prototype && Object.getPrototypeOf(o) !== null
    ) {
      throw new TypeError(`${path || "result"} is not a plain object`);
    } else {
      for (const [k, item] of Object.entries(o)) walk(item, `${path}/${k}`);
    }
    seen.delete(o);
  };

  walk(result, "");
  return result;
}

/**
 * Unknown tool names and thrown exceptions REJECT. Architecture 11 keeps them
 * out of the fulfilled path: `UNKNOWN_TOOL` and `INTERNAL_ERROR` are not
 * `ToolErrorCode` members, and dressing a bug as an expected failure hides it.
 */
export async function callTool(
  name: string, input: Record<string, unknown> = {}, ctx: Ctx = {},
): Promise<unknown> {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return toWire(await tool.run(input, ctx));
}

// ---------------------------------------------------------------- register

/**
 * The two signals have different owners and must not be conflated:
 * `registerTool(definition, { signal })` is the registration lifetime, and
 * `execute(input, { signal })` is one call's cancellation.
 */
export async function registerAllTools(
  options: { signal?: AbortSignal } = {},
): Promise<AbortController> {
  const ctx = assertCapable();
  const registration = new AbortController();
  options.signal?.addEventListener("abort", () => registration.abort(), { once: true });

  for (const tool of TOOLS) {
    const definition: ToolDefinition = {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      annotations: { ...ANNOTATIONS },
      execute: async (input, callCtx) =>
        toWire(await tool.run((input ?? {}) as Record<string, unknown>, callCtx)),
    };
    try {
      await ctx.registerTool(definition, { signal: registration.signal });
    } catch (e) {
      throw new Error(`WebMCP registration failed for ${tool.name}: ${classifyRegistrationError(e)}`);
    }
  }
  return registration;
}
