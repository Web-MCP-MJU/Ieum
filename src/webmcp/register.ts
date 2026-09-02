/**
 * WebMCP tool registration.
 * 9개 use case를 a11y.* 툴로 등록합니다.
 * inputSchema는 JSON Schema draft 2020-12입니다.
 */

import type { RenderOptions } from "../domain/types.ts";
import { usecases } from "../app/usecases.ts";
import { store } from "../app/store.ts";
import { assertCapable } from "./capability.ts";

type ToolResult<T> = {
  ok: boolean;
  data?: T;
  hint?: string;
  error?: { code: string; message: string };
};

type ToWireResult = ToolResult<unknown>;

function toWire<T>(result: ToolResult<T>): ToWireResult {
  return result;
}

const renderOptionsSchema = {
  type: "object",
  properties: {
    units: { enum: ["meters", "feet", "steps"], description: "Distance unit" },
    stepLength_m: { type: "number", minimum: 0 },
    directionStyle: { enum: ["relative", "clock", "cardinal"] },
    walkSpeedPercent: { type: "number", minimum: 1, maximum: 200 },
  },
  additionalProperties: false,
};

export function registerAllTools(): void {
  const ctx = assertCapable();

  // 1. a11y.get_layout
  ctx.registerTool({
    name: "a11y.get_layout",
    description: "Get the overall structure of the car/room: seats, landmarks, accessible features",
    inputSchema: {
      type: "object",
      properties: { opts: renderOptionsSchema },
      additionalProperties: false,
    },
  });

  // 2. a11y.query
  ctx.registerTool({
    name: "a11y.query",
    description: "Search for seats matching accessibility needs, distance, price, direction",
    inputSchema: {
      type: "object",
      properties: {
        criteria: {
          type: "object",
          properties: {
            near: { type: "string", description: "Landmark key to measure distance from" },
            maxDistance_m: { type: "number", minimum: 0 },
            priceMax_usd: { type: "number", minimum: 0 },
            availableOnly: { type: "boolean", default: true },
            needs: {
              type: "object",
              properties: {
                wheelchairSpace: { type: "boolean" },
                transferSeat: { type: "boolean" },
                movableArmrest: { type: "boolean" },
                minFootSpace_in2: { type: "number", minimum: 0 },
                excludeExitRow: { type: "boolean" },
              },
              additionalProperties: false,
            },
            rail: {
              type: "object",
              properties: {
                facing: { enum: ["forward", "backward"] },
                side: { enum: ["window", "aisle"] },
                quietCar: { type: "boolean" },
              },
              additionalProperties: false,
            },
            hotel: {
              type: "object",
              properties: {
                floorMin: { type: "number", minimum: 1 },
                floorMax: { type: "number", minimum: 1 },
                bedToBathroomMax_m: { type: "number", minimum: 0 },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        opts: renderOptionsSchema,
      },
      required: ["criteria"],
      additionalProperties: false,
    },
  });

  // 3. a11y.describe
  ctx.registerTool({
    name: "a11y.describe",
    description: "Get detailed description of a specific seat or room: location, features, nearby landmarks",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Seat/room reference (e.g. '12A')" },
        opts: renderOptionsSchema,
      },
      required: ["ref"],
      additionalProperties: false,
    },
  });

  // 4. a11y.get_route
  ctx.registerTool({
    name: "a11y.get_route",
    description: "Get walking path from one location to another with distance and turn-by-turn directions",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Starting point (seat or landmark)" },
        to: { type: "string", description: "Destination" },
        opts: renderOptionsSchema,
      },
      required: ["from", "to"],
      additionalProperties: false,
    },
  });

  // 5. a11y.compare
  ctx.registerTool({
    name: "a11y.compare",
    description: "Compare 2-4 seats side-by-side: position, facing, accessibility features, distance from landmarks",
    inputSchema: {
      type: "object",
      properties: {
        refs: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 4,
          description: "Seat references to compare",
        },
        opts: renderOptionsSchema,
      },
      required: ["refs"],
      additionalProperties: false,
    },
  });

  // 6. a11y.get_selection
  ctx.registerTool({
    name: "a11y.get_selection",
    description: "Check which seat(s) are currently selected",
    inputSchema: {
      type: "object",
      additionalProperties: false,
    },
  });

  // 7. a11y.select
  ctx.registerTool({
    name: "a11y.select",
    description: "Select a seat for booking. Must call confirm() before the selection is final",
    inputSchema: {
      type: "object",
      properties: {
        ref: { type: "string", description: "Seat reference (e.g. '12A')" },
      },
      required: ["ref"],
      additionalProperties: false,
    },
  });

  // 8. a11y.undo
  ctx.registerTool({
    name: "a11y.undo",
    description: "Clear the current selection and go back to browsing",
    inputSchema: {
      type: "object",
      additionalProperties: false,
    },
  });

  // 9. a11y.confirm
  ctx.registerTool({
    name: "a11y.confirm",
    description:
      "Final confirmation for booking. Requires user approval via dialog. " +
      "Agent cannot proceed without this. Blocks for up to 120 seconds waiting for user click.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
    },
  });
}

export async function handleToolCall(
  name: string,
  input: unknown,
): Promise<ToWireResult> {
  const opts = (input as any)?.opts as RenderOptions | undefined;

  try {
    switch (name) {
      case "a11y.get_layout":
        return toWire(usecases.getLayout(opts));

      case "a11y.query": {
        const criteria = (input as any).criteria;
        return toWire(usecases.query(criteria, opts));
      }

      case "a11y.describe":
        return toWire(usecases.describe({ ref: (input as any).ref }, opts));

      case "a11y.get_route":
        return toWire(
          usecases.getRoute(
            { from: (input as any).from, to: (input as any).to },
            opts,
          ),
        );

      case "a11y.compare":
        return toWire(usecases.compare({ refs: (input as any).refs }, opts));

      case "a11y.get_selection":
        return toWire(usecases.getSelection());

      case "a11y.select":
        return toWire(usecases.select({ ref: (input as any).ref }));

      case "a11y.undo":
        return toWire(usecases.undo());

      case "a11y.confirm":
        return toWire(await usecases.confirm());

      default:
        return { ok: false, error: { code: "UNKNOWN_TOOL", message: `Unknown tool: ${name}` } };
    }
  } catch (e) {
    return {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: e instanceof Error ? e.message : "Unknown error",
      },
    };
  }
}
