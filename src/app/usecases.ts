import type {
  Candidate, Comparison, DomainError, Description, Layout, LayoutSummary,
  QueryCriteria, RenderOptions, Route, SpatialRef,
} from "../domain/types.ts";
import { route } from "../domain/route-engine.ts";
import { query } from "../domain/query-engine.ts";
import { compare } from "../domain/compare-engine.ts";
import { car6 } from "../domain/car-6.ts";
import { store } from "./store.ts";

export type ToolErrorCode =
  | "INVALID_REF"
  | "NO_ROUTE"
  | "NO_MATCH"
  | "NOT_AVAILABLE"
  | "INVALID_SELECTION"
  | "INVALID_CRITERIA"
  | "UNSUPPORTED_CRITERIA"
  | "NOTHING_TO_UNDO"
  | "CONFIRMATION_REQUIRED";

export type ToolResult<T> = {
  ok: boolean;
  data?: T;
  hint?: string;
  error?: { code: ToolErrorCode; message: string };
};

const ok = <T,>(data: T, hint?: string): ToolResult<T> => ({ ok: true, data, ...(hint && { hint }) });
const err = (code: ToolErrorCode, message: string): ToolResult<never> => ({
  ok: false,
  error: { code, message },
});

const getLayout = (opts?: RenderOptions): ToolResult<LayoutSummary> => {
  const layout = car6;
  store.addLog("a11y.get_layout", opts);

  const data: LayoutSummary = {
    domain: layout.domain,
    layoutId: layout.layoutId,
    bounds_m: layout.bounds_m,
    seatCount: {
      total: layout.seats.length,
      available: layout.seats.filter((s) => s.available).length,
    },
    accessibleCount: {
      wheelchairSpaces: layout.seats.filter((s) => s.wheelchairSpace).length,
      transferSeats: layout.seats.filter((s) => s.transferSeat).length,
      movableArmrestSeats: layout.seats.filter((s) => s.movableArmrest).length,
    },
    landmarks: layout.landmarks,
    referencePoints: layout.landmarks.map((l) => l.key),
    summary: `${layout.seats.length} seats: ${layout.seats.filter((s) => s.available).length} available`,
  };

  return ok(data);
};

export type QueryOutput = {
  items: Candidate[];
  appliedCriteria: QueryCriteria;
  totalMatched: number;
  hint?: string;
};

const querySeats = (criteria: QueryCriteria, opts?: RenderOptions): ToolResult<QueryOutput> => {
  const layout = car6;
  store.addLog("a11y.query", criteria);

  const result = query(layout, criteria, opts);
  if ("code" in result) {
    return err(result.code, result.message);
  }

  store.highlight(result.items.map((item) => item.ref));
  return ok(result, result.hint);
};

export type DescriptionOutput = {
  ref: SpatialRef;
  line: string;
  attributes: Record<string, unknown>;
  relations: {
    to: SpatialRef;
    distance_m: number;
    rendered: string;
    landmarksPassed: SpatialRef[];
  }[];
  followUps: string[];
};

const describe = (
  input: { ref: SpatialRef },
  opts?: RenderOptions,
): ToolResult<DescriptionOutput> => {
  const layout = car6;
  store.addLog("a11y.describe", input);

  const seat = layout.seats.find((s) => s.ref === input.ref);
  if (!seat) {
    return err("INVALID_REF", `Seat "${input.ref}" not found`);
  }

  const relations = layout.landmarks.map((landmark) => {
    const r = route(layout, input.ref, landmark.key);
    if ("code" in r) {
      return {
        to: landmark.key,
        distance_m: 0,
        rendered: "Route not available",
        landmarksPassed: [],
      };
    }
    return {
      to: landmark.key,
      distance_m: r.totalLength_m,
      rendered: r.rendered.summary,
      landmarksPassed: r.landmarks.map((l) => l.key),
    };
  });

  const data: DescriptionOutput = {
    ref: input.ref,
    line: `Seat ${seat.ref} – ${seat.side}, ${seat.facing}, $${seat.price_usd}`,
    attributes: {
      row: seat.row,
      side: seat.side,
      facing: seat.facing,
      price: seat.price_usd,
      wheelchairSpace: seat.wheelchairSpace,
      transferSeat: seat.transferSeat,
      movableArmrest: seat.movableArmrest,
    },
    relations,
    followUps: [
      "What is the distance from the entrance?",
      "Show me nearby seats",
      "Compare with another seat",
    ],
  };

  return ok(data);
};

export type RouteOutput = Route;

const getRoute = (
  input: { from: SpatialRef; to: SpatialRef },
  opts?: RenderOptions,
): ToolResult<RouteOutput> => {
  const layout = car6;
  store.addLog("a11y.get_route", input);

  const result = route(layout, input.from, input.to, opts);
  if ("code" in result) {
    return err(result.code, result.message);
  }

  store.setRoute(result);
  return ok(result, result.rendered.summary);
};

export type ComparisonOutput = Comparison;

const compareSeats = (
  input: { refs: SpatialRef[] },
  opts?: RenderOptions,
): ToolResult<ComparisonOutput> => {
  const layout = car6;
  store.addLog("a11y.compare", input);

  const result = compare(layout, input.refs, opts);
  if ("code" in result) {
    return err(result.code, result.message);
  }

  return ok(result, `Comparing ${input.refs.length} seats`);
};

export type SelectionOutput = { selected: SpatialRef[] };

const getSelection = (): ToolResult<SelectionOutput> => {
  store.addLog("a11y.get_selection", null);
  const state = store.getState();
  return ok({ selected: state.selection }, state.selection.length > 0 ? `${state.selection.length} seat(s) selected` : "No selection yet");
};

export type SelectOutput = { selectedRef: SpatialRef };

const select = (input: { ref: SpatialRef }): ToolResult<SelectOutput> => {
  const layout = car6;
  store.addLog("a11y.select", input);

  const seat = layout.seats.find((s) => s.ref === input.ref);
  if (!seat) {
    return err("INVALID_REF", `Seat "${input.ref}" not found`);
  }

  store.select(input.ref);
  store.setConfirmationStatus("draft");
  return ok({ selectedRef: input.ref }, `Selected ${input.ref}`);
};

export type UndoOutput = { undone: boolean };

const undo = (): ToolResult<UndoOutput> => {
  store.addLog("a11y.undo", null);
  const result = store.undo();

  if (!result.undone) {
    return err("NOTHING_TO_UNDO", "No selection to undo");
  }

  return ok({ undone: true }, "Selection cleared");
};

export type ConfirmOutput = { outcome: "confirmed" | "cancelled" };

const confirm = async (): Promise<ToolResult<ConfirmOutput>> => {
  store.addLog("a11y.confirm", null);
  const state = store.getState();

  if (state.selection.length === 0) {
    return err("INVALID_SELECTION", "No seat selected to confirm");
  }

  store.setConfirmationStatus("confirmation_pending");

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      store.setConfirmationStatus("draft");
      resolve(err("CONFIRMATION_REQUIRED", "Confirmation timeout (120s)"));
    }, 120_000);

    const checkConfirmation = () => {
      const currentState = store.getState();
      if (currentState.confirmationStatus === "confirmed") {
        clearTimeout(timeout);
        resolve(ok({ outcome: "confirmed" }, "Booking confirmed"));
      } else if (currentState.confirmationStatus === "cancelled") {
        clearTimeout(timeout);
        resolve(ok({ outcome: "cancelled" }, "Booking cancelled"));
      }
    };

    store.subscribe(() => checkConfirmation());
  });
};

export const usecases = {
  getLayout,
  query: querySeats,
  describe,
  getRoute,
  compare: compareSeats,
  getSelection,
  select,
  undo,
  confirm,
};
