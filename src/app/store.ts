import type { Route, SpatialRef } from "../domain/types.ts";

export type ConfirmationStatus = "draft" | "confirmation_pending" | "confirmed";

export type AppState = {
  layout: { layoutId: string; domain: "rail" | "hotel" };
  selection: SpatialRef[];
  highlightedRefs: SpatialRef[];
  activeRoute: Route | null;
  confirmationStatus: ConfirmationStatus;
  toolLog: Array<{ toolName: string; input: unknown; timestamp: number }>;
};

type Listener = (state: AppState) => void;

const initialState: AppState = {
  layout: { layoutId: "car-6", domain: "rail" },
  selection: [],
  highlightedRefs: [],
  activeRoute: null,
  confirmationStatus: "draft",
  toolLog: [],
};

let currentState = { ...initialState };
const listeners = new Set<Listener>();

export const store = {
  getState(): AppState {
    return currentState;
  },

  setState(updates: Partial<AppState>): void {
    currentState = { ...currentState, ...updates };
    listeners.forEach((l) => l(currentState));
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  select(ref: SpatialRef): void {
    this.setState({ selection: [ref] });
  },

  addLog(toolName: string, input: unknown): void {
    const toolLog = [
      ...currentState.toolLog.slice(-9),
      { toolName, input, timestamp: Date.now() },
    ];
    this.setState({ toolLog });
  },

  highlight(refs: SpatialRef[]): void {
    this.setState({ highlightedRefs: refs });
  },

  setRoute(route: Route | null): void {
    this.setState({ activeRoute: route });
  },

  setConfirmationStatus(status: ConfirmationStatus): void {
    this.setState({ confirmationStatus: status });
  },

  undo(): { undone: boolean } {
    if (currentState.selection.length === 0) {
      return { undone: false };
    }
    this.setState({
      selection: [],
      activeRoute: null,
      highlightedRefs: [],
    });
    return { undone: true };
  },

  reset(): void {
    currentState = { ...initialState };
    listeners.forEach((l) => l(currentState));
  },
};
