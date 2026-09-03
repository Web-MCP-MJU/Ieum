import type { QueryCriteria, RenderOptions, Route } from '@/src/domain/types';

export type ToolLogEntry = {
  callId: string;
  origin: 'agent' | 'human';
  name: `a11y.${string}`;
  args: Record<string, unknown>;
  appliedCriteria?: QueryCriteria;
  resultRefs: string[];
  status: 'pending' | 'succeeded' | 'domain_failed' | 'cancelled' | 'rejected';
  startedAt: number;
  completedAt?: number;
  errorCode?: string;
  outcome?: 'confirmed' | 'cancelled' | 'timeout';
};

export type UndoSnapshot = {
  selection: string[];
  highlightedRefs: string[];
  confirmationStatus: AppState['confirmationStatus'];
  activeRoute: Route | null;
};

export type AppState = {
  domain: 'rail';
  layoutId: string;
  selection: string[];
  confirmationStatus: 'draft' | 'confirmation_pending' | 'confirmed';
  activeRoute: Route | null;
  highlightedRefs: string[];
  toolLog: ToolLogEntry[];
  history: UndoSnapshot[];
  prefs: RenderOptions;
  priceTotal_usd: number;
};

export type Store = {
  getState(): AppState;
  update(recipe: (state: AppState) => AppState): void;
  subscribe(listener: () => void): () => void;
};

export function createStore(initial: AppState): Store {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    update(recipe) {
      state = recipe(state);
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
