import type {
  Comparison, Description, DomainError, Layout, LayoutSummary, QueryCriteria,
  QueryData, ReadFailure, ReadResult, QueryResult, RenderOptions, Route,
  SelectionState, SpatialRef, StateResult, StateSuccess, ToolErrorCode,
} from "../domain/types.ts";
import { route } from "../domain/route-engine.ts";
import { query as queryEngine } from "../domain/query-engine.ts";
import { compare as compareEngine } from "../domain/compare-engine.ts";
import { car6 } from "../domain/car-6.ts";
import { STEPS_NOTE } from "../domain/render.ts";
import type { AppState, Store, UndoSnapshot } from "./store.ts";
import { selectionState, store as defaultStore } from "./store.ts";

/**
 * One use case per public tool. The human UI calls these same functions, so a
 * button and a tool call cannot drift apart.
 *
 * Every message here is a fixed template. Architecture 19: expected errors never
 * concatenate a raw argument into prose, because that text is read aloud and
 * rendered, and the caller is not necessarily the user.
 */

export const CONFIRM_TIMEOUT_MS = 120_000;

const RENDER_KEYS = ["units", "stepLength_m", "directionStyle", "walkSpeedPercent"] as const;

/** Tool inputs are flat: `{ from, to, units }`, not `{ from, to, opts: { units } }`. */
function splitOptions<T extends Record<string, unknown>>(
  input: T, prefs: RenderOptions,
): { opts: RenderOptions; rest: Record<string, unknown> } {
  const opts: Record<string, unknown> = { ...prefs };
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if ((RENDER_KEYS as readonly string[]).includes(k)) {
      if (v !== undefined) opts[k] = v;
    } else {
      rest[k] = v;
    }
  }
  return { opts: opts as RenderOptions, rest };
}

const isError = (v: unknown): v is DomainError =>
  typeof v === "object" && v !== null && "code" in v;

const fail = (code: ToolErrorCode, message: string, hint?: string): ReadFailure => ({
  ok: false, error: { code, message }, ...(hint ? { hint } : {}),
});

export function createUsecases(
  store: Store, layout: Layout = car6, confirmTimeoutMs = CONFIRM_TIMEOUT_MS,
) {
  const state = (): AppState => store.getState();
  const projection = (): SelectionState => selectionState(state(), layout);

  const stateFail = (code: ToolErrorCode, message: string): StateResult<never> => ({
    ok: false, state: projection(), error: { code, message },
  });

  const seatOf = (ref: SpatialRef) => layout.seats.find((s) => s.ref === ref);
  const landmarkOf = (ref: SpatialRef) => layout.landmarks.find((l) => l.key === ref);

  /** A wheelchair space has no seat installed, so it is never called a seat. */
  const nameOf = (ref: SpatialRef): string => {
    const seat = seatOf(ref);
    if (seat) return seat.wheelchairSpace ? `Wheelchair space ${ref}` : `Seat ${ref}`;
    return landmarkOf(ref)?.label ?? ref;
  };

  // ------------------------------------------------------------------- reads

  const getLayout = (input: RenderOptions = {}): ReadResult<LayoutSummary> => {
    const available = layout.seats.filter((s) => s.available).length;
    store.log({ name: "a11y.get_layout", args: { ...input }, resultRefs: layout.landmarks.map((l) => l.key) });
    store.highlight(layout.landmarks.map((l) => l.key));

    return {
      ok: true,
      data: {
        domain: layout.domain,
        layoutId: layout.layoutId,
        bounds_m: layout.bounds_m,
        seatCount: { total: layout.seats.length, available },
        accessibleCount: {
          wheelchairSpaces: layout.seats.filter((s) => s.wheelchairSpace).length,
          transferSeats: layout.seats.filter((s) => s.transferSeat).length,
          movableArmrestSeats: layout.seats.filter((s) => s.movableArmrest).length,
        },
        landmarks: layout.landmarks,
        referencePoints: layout.landmarks.map((l) => l.key),
        summary:
          `${layout.layoutId}: ${layout.seats.length} seats, ${available} available, ` +
          `${layout.landmarks.length} reference points.`,
      },
    };
  };

  const query = (input: QueryCriteria & RenderOptions = {}): QueryResult<QueryData> => {
    const { opts, rest } = splitOptions(input, state().prefs);
    const criteria = rest as QueryCriteria;

    const result = queryEngine(layout, criteria, opts);
    if (isError(result)) {
      store.log({ name: "a11y.query", args: { ...input }, resultRefs: [] });
      return fail(result.code, result.message);
    }

    const refs = result.items.map((i) => i.ref);
    store.log({
      name: "a11y.query", args: { ...input },
      appliedCriteria: result.appliedCriteria, resultRefs: refs,
    });
    store.highlight(refs);

    const { hint, ...data } = result;
    return { ok: true, data, ...(hint ? { hint } : {}) };
  };

  const describe = (input: { ref: SpatialRef } & RenderOptions): ReadResult<Description> => {
    const { opts } = splitOptions(input, state().prefs);
    const ref = input.ref;
    const seat = seatOf(ref);
    const landmark = landmarkOf(ref);

    store.log({ name: "a11y.describe", args: { ...input }, resultRefs: seat || landmark ? [ref] : [] });

    if (!seat && !landmark) {
      return fail("INVALID_REF", "That is not a place in this car.",
        "Ask for the layout to see the seats and reference points it has.");
    }
    store.highlight([ref]);

    // Architecture 5: relations are the walk to each reference point. The
    // landmarks passed are the ones on the way, not the destination itself.
    const relations = layout.landmarks
      .filter((l) => l.key !== ref)
      .map((l) => {
        const r = route(layout, ref, l.key, opts);
        if (isError(r)) return null;
        return {
          to: l.key,
          distance_m: r.totalLength_m,
          rendered: r.rendered.summary,
          landmarksPassed: [...new Set(r.segments.flatMap((s) => s.landmarksPassed))],
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const steps = opts.units === "steps";

    if (seat) {
      const kind = seat.wheelchairSpace ? "wheelchair space" : `${seat.side} seat`;
      return {
        ok: true,
        data: {
          ref,
          line:
            `${nameOf(ref)} — ${kind}, faces ${seat.facing === "forward" ? "the front" : "the rear"}, ` +
            `$${seat.price_usd}, ${seat.available ? "available" : "already taken"}.`,
          attributes: {
            row: seat.row, seatLetter: seat.seatLetter, side: seat.side, facing: seat.facing,
            price_usd: seat.price_usd,
            // Whether it can be booked is the first thing anyone needs and was
            // the one fact this tool used to leave out.
            available: seat.available,
            wheelchairSpace: seat.wheelchairSpace, transferSeat: seat.transferSeat,
            companionSeat: seat.companionSeat, movableArmrest: seat.movableArmrest,
            footSpace_in2: seat.footSpace_in2, bulkhead: seat.bulkhead, exitRow: seat.exitRow,
            features: seat.features,
          },
          relations,
          followUps: [
            "How do I get there from the front door?",
            "What is near it?",
            "Compare it with another seat.",
          ],
          ...(steps ? { unitsNote: STEPS_NOTE } : {}),
        },
      };
    }

    const m = landmark!;
    return {
      ok: true,
      data: {
        ref,
        line: `${m.label}${m.signpostedAs ? `, signed ${m.signpostedAs}` : ""} — ${m.landmarkType} landmark.`,
        attributes: {
          landmarkType: m.landmarkType,
          sensoryChannels: m.sensoryChannels,
          detectability: m.detectability,
          ...(m.signpostedAs ? { signpostedAs: m.signpostedAs } : {}),
        },
        relations,
        followUps: [
          "Which seats are closest to it?",
          "How do I get there from my seat?",
        ],
        ...(steps ? { unitsNote: STEPS_NOTE } : {}),
      },
    };
  };

  const getRoute = (
    input: { from: SpatialRef; to: SpatialRef } & RenderOptions,
  ): ReadResult<Route> => {
    const { opts } = splitOptions(input, state().prefs);
    const r = route(layout, input.from, input.to, opts);

    if (isError(r)) {
      store.log({ name: "a11y.get_route", args: { ...input }, resultRefs: [] });
      return fail(r.code, r.message);
    }

    store.log({ name: "a11y.get_route", args: { ...input }, resultRefs: [r.from, r.to] });
    store.setRoute(r);
    store.highlight([r.from, r.to]);
    return { ok: true, data: r };
  };

  const compare = (
    input: { refs: SpatialRef[] } & RenderOptions,
  ): ReadResult<Comparison> => {
    const { opts } = splitOptions(input, state().prefs);
    const result = compareEngine(layout, input.refs ?? [], opts);

    if (isError(result)) {
      store.log({ name: "a11y.compare", args: { ...input }, resultRefs: [] });
      return fail(result.code, result.message);
    }

    store.log({ name: "a11y.compare", args: { ...input }, resultRefs: input.refs });
    store.highlight(input.refs);
    return { ok: true, data: result };
  };

  // -------------------------------------------------------------- selection

  const LOCKED =
    "This booking is waiting on your confirmation, so the selection cannot change.";

  const getSelection = (): StateSuccess<{ selected: SpatialRef[] }> | ReadFailure => {
    const s = projection();
    store.log({ name: "a11y.get_selection", args: {}, resultRefs: s.selected });
    store.highlight(s.selected);
    return { ok: true, data: { selected: s.selected }, state: s };
  };

  const select = (input: { ref: SpatialRef }): StateResult<{ selectedRef: SpatialRef }> => {
    const ref = input.ref;
    store.log({ name: "a11y.select", args: { ...input }, resultRefs: [ref] });

    if (state().confirmationStatus !== "draft") {
      return stateFail("CONFIRMATION_REQUIRED", LOCKED);
    }

    const seat = seatOf(ref);
    if (!seat) return stateFail("INVALID_REF", "That is not a seat in this car.");
    if (!seat.available) {
      // Architecture 6.2: compare may still include it; select alone refuses.
      return stateFail("NOT_AVAILABLE", "That seat is already taken.");
    }

    store.select(ref);
    return { ok: true, data: { selectedRef: ref }, state: projection() };
  };

  const undo = (): StateResult<{ undone: SpatialRef | null }> => {
    store.log({ name: "a11y.undo", args: {}, resultRefs: [] });

    if (state().confirmationStatus !== "draft") {
      return stateFail("CONFIRMATION_REQUIRED", LOCKED);
    }
    if (state().history.length === 0) {
      return stateFail("NOTHING_TO_UNDO", "There is nothing to undo yet.");
    }

    const { undone } = store.undo();
    store.highlight(state().selection);
    return { ok: true, data: { undone }, state: projection() };
  };

  /**
   * Architecture 13: one asynchronous call that returns a terminal outcome, not a
   * two-call polling protocol. The agent starting it never finishes it — only the
   * human dialog, the timer, or the caller's own abort can.
   */
  const confirm = (
    options: { signal?: AbortSignal } = {},
  ): Promise<StateResult<{ outcome: "confirmed" | "cancelled" | "timeout" }>> => {
    store.log({ name: "a11y.confirm", args: {}, resultRefs: state().selection });

    if (state().confirmationStatus !== "draft") {
      return Promise.resolve(stateFail("CONFIRMATION_REQUIRED", LOCKED));
    }
    if (state().selection.length === 0) {
      return Promise.resolve(
        stateFail("INVALID_SELECTION", "There is nothing selected to confirm."));
    }
    if (options.signal?.aborted) {
      return Promise.reject(options.signal.reason ?? new Error("aborted"));
    }

    // Private to this call: a cancelled confirmation is not a step the user took,
    // so it must not consume or create an entry in their undo history.
    const before: UndoSnapshot = store.snapshot();

    return new Promise((resolve, reject) => {
      let settled = false;
      let unsubscribe = (): void => {};
      let timer: ReturnType<typeof setTimeout> | undefined;

      // One idempotent settle. Racing UI actions and late callbacks cannot
      // resolve twice, reopen the dialog, or overwrite a terminal state.
      const settle = (finish: () => void): void => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        unsubscribe();
        options.signal?.removeEventListener("abort", onAbort);
        finish();
      };

      function onAbort(): void {
        // An agent giving up is not the human saying no, so this rejects rather
        // than reporting a cancellation the user never made.
        settle(() => {
          store.restore(before);
          reject(options.signal?.reason ?? new Error("aborted"));
        });
      }

      const terminal = (outcome: "confirmed" | "cancelled" | "timeout"): void => {
        settle(() => {
          if (outcome !== "confirmed") store.restore(before);
          resolve({ ok: true, data: { outcome }, state: projection() });
        });
      };

      store.setConfirmationStatus("confirmation_pending");
      options.signal?.addEventListener("abort", onAbort, { once: true });

      unsubscribe = store.subscribe((s) => {
        if (s.confirmationStatus === "confirmed") terminal("confirmed");
        else if (s.confirmationStatus === "draft") terminal("cancelled");
      });

      // Deliberately not unref'd. An unref'd timer only fires while something else
      // keeps the loop alive, which would make the 120-second contract depend on
      // what else the host happens to be doing. The caller awaits this promise,
      // so the pending timer is exactly as long-lived as the call itself.
      timer = setTimeout(() => terminal("timeout"), confirmTimeoutMs);
    });
  };

  return { getLayout, query, describe, getRoute, compare, getSelection, select, undo, confirm };
}

export type Usecases = ReturnType<typeof createUsecases>;

/** The instance the WebMCP adapter and the human UI share. */
export const usecases: Usecases = createUsecases(defaultStore, car6);
