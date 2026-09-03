import type {
  ConfirmationStatus, Layout, QueryCriteria, RenderOptions, Route,
  SelectionState, SpatialRef,
} from "../domain/types.ts";
import { DEFAULTS } from "../domain/render.ts";

/**
 * Application state.
 *
 * One store serves the agent and the human UI. There is no second agent-only
 * copy: if the two could disagree, the tool would eventually describe a screen
 * the user is not looking at.
 */

export type UndoSnapshot = {
  selection: SpatialRef[];
  highlightedRefs: SpatialRef[];
  confirmationStatus: ConfirmationStatus;
  activeRoute: Route | null;
};

export type ToolLogEntry = {
  name: string;
  args: Record<string, unknown>;
  /** Query only: what was actually applied, defaults filled in. */
  appliedCriteria?: QueryCriteria;
  resultRefs: SpatialRef[];
  at: number;
};

export type AppState = {
  domain: "rail" | "hotel";
  layoutId: string;
  selection: SpatialRef[];
  confirmationStatus: ConfirmationStatus;
  activeRoute: Route | null;
  highlightedRefs: SpatialRef[];
  toolLog: ToolLogEntry[];
  history: UndoSnapshot[];
  prefs: RenderOptions;
};

export type Listener = (state: AppState) => void;

const LOG_LIMIT = 10;

const initial = (): AppState => ({
  domain: "rail",
  layoutId: "Car 6, Business Class",
  selection: [],
  confirmationStatus: "draft",
  activeRoute: null,
  highlightedRefs: [],
  toolLog: [],
  history: [],
  prefs: {
    units: DEFAULTS.units,
    stepLength_m: DEFAULTS.stepLength_m,
    directionStyle: DEFAULTS.directionStyle,
    walkSpeedPercent: DEFAULTS.walkSpeedPercent,
  },
});

export type Store = ReturnType<typeof createStore>;

/**
 * A factory rather than a module singleton, so a test can hold its own state.
 * A shared global made the confirmation and undo paths untestable, which is a
 * large part of why they were never tested.
 */
export function createStore(seed: Partial<AppState> = {}) {
  let state: AppState = { ...initial(), ...seed };
  const listeners = new Set<Listener>();

  const emit = (): void => {
    // Copy first: a listener that unsubscribes itself must not skip its neighbour.
    for (const l of [...listeners]) l(state);
  };

  const set = (updates: Partial<AppState>): void => {
    state = { ...state, ...updates };
    emit();
  };

  const snapshot = (): UndoSnapshot => ({
    selection: [...state.selection],
    highlightedRefs: [...state.highlightedRefs],
    confirmationStatus: state.confirmationStatus,
    activeRoute: state.activeRoute,
  });

  return {
    getState: (): AppState => state,
    setState: set,

    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },

    /** Test seam: how many listeners are attached right now. */
    listenerCount: (): number => listeners.size,

    log(entry: Omit<ToolLogEntry, "at">): void {
      set({ toolLog: [...state.toolLog.slice(-(LOG_LIMIT - 1)), { ...entry, at: Date.now() }] });
    },

    highlight(refs: SpatialRef[]): void {
      set({ highlightedRefs: refs });
    },

    setRoute(activeRoute: Route | null): void {
      set({ activeRoute });
    },

    setPrefs(prefs: RenderOptions): void {
      set({ prefs: { ...state.prefs, ...prefs } });
    },

    snapshot,

    /**
     * Architecture 12: append-idempotent. Selecting a ref that is already
     * selected changes nothing and pushes no snapshot, so an agent repeating
     * itself cannot quietly consume the single undo step.
     */
    select(ref: SpatialRef): { appended: boolean } {
      if (state.selection.includes(ref)) return { appended: false };
      set({
        history: [...state.history, snapshot()],
        selection: [...state.selection, ref],
        highlightedRefs: [ref],
      });
      return { appended: true };
    },

    /**
     * Architecture 14: one step, restoring all four fields at once, and
     * reporting which ref that restoration removed.
     */
    undo(): { undone: SpatialRef | null } {
      const previous = state.history.at(-1);
      if (!previous) return { undone: null };
      const removed = state.selection.find((r) => !previous.selection.includes(r)) ?? null;
      set({
        history: state.history.slice(0, -1),
        selection: [...previous.selection],
        highlightedRefs: [...previous.highlightedRefs],
        confirmationStatus: previous.confirmationStatus,
        activeRoute: previous.activeRoute,
      });
      return { undone: removed };
    },

    setConfirmationStatus(confirmationStatus: ConfirmationStatus): void {
      set({ confirmationStatus });
    },

    /**
     * Restores the private pre-confirm snapshot without touching the user's undo
     * history: a cancelled confirmation is not a step the user took.
     */
    restore(s: UndoSnapshot): void {
      set({
        selection: [...s.selection],
        highlightedRefs: [...s.highlightedRefs],
        confirmationStatus: s.confirmationStatus,
        activeRoute: s.activeRoute,
      });
    },

    /** The human control the confirmation dialog calls. The agent cannot. */
    resolveConfirmation(outcome: "confirmed" | "cancelled"): void {
      set({ confirmationStatus: outcome === "confirmed" ? "confirmed" : "draft" });
    },

    reset(): void {
      state = initial();
      emit();
    },
  };
}

/**
 * `selectedCount` and `priceTotal_usd` are derived on every read, never stored:
 * a stored total is a total that can drift from the selection it describes.
 * `undoable` answers "can an undo succeed right now", not "has anything happened".
 */
export function selectionState(state: AppState, layout: Layout): SelectionState {
  const priceTotal_usd = state.selection.reduce((sum, ref) => {
    const seat = layout.seats.find((s) => s.ref === ref);
    return sum + (seat?.price_usd ?? 0);
  }, 0);

  return {
    selected: [...state.selection],
    selectedCount: state.selection.length,
    priceTotal_usd: Math.round(priceTotal_usd * 100) / 100,
    undoable: state.confirmationStatus === "draft" && state.history.length > 0,
    status: state.confirmationStatus,
  };
}

/** The instance the human UI subscribes to. Tests build their own. */
export const store = createStore();
