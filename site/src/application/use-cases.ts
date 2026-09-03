import { createStore, type AppState, type Store, type ToolLogEntry, type UndoSnapshot } from './store';
import { compareRefs } from '@/src/domain/compare';
import { describeRef } from '@/src/domain/describe';
import { DomainError } from '@/src/domain/errors';
import { querySeats } from '@/src/domain/query';
import { getRoute } from '@/src/domain/route';
import type { LoadedRailFixture, QueryInput, RenderInput } from '@/src/domain/types';

export type ConfirmationOutcome = 'confirmed' | 'cancelled' | 'timeout';
export type ConfirmationPort = { open(signal: AbortSignal): Promise<ConfirmationOutcome> };
export type CallOptions = { origin?: 'agent' | 'human'; signal?: AbortSignal; timeoutMs?: number };

let callSequence = 0;

function nextCallId(): string {
  callSequence += 1;
  return `bearing-${Date.now().toString(36)}-${callSequence.toString(36)}`;
}

function snapshot(state: AppState): UndoSnapshot {
  return {
    selection: [...state.selection],
    highlightedRefs: [...state.highlightedRefs],
    confirmationStatus: state.confirmationStatus,
    activeRoute: state.activeRoute,
  };
}

function compactToolLog(entries: ToolLogEntry[]): ToolLogEntry[] {
  const newestTerminalCallIds = new Set(
    entries
      .filter((entry) => entry.status !== 'pending')
      .slice(-10)
      .map((entry) => entry.callId),
  );
  return entries.filter((entry) => entry.status === 'pending' || newestTerminalCallIds.has(entry.callId));
}

function hasValidPositiveNumber(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value > 0);
}

export function createBearingApplication(fixture: LoadedRailFixture, port: ConfirmationPort) {
  const store: Store = createStore({
    domain: 'rail',
    layoutId: fixture.layoutId,
    selection: [],
    confirmationStatus: 'draft',
    activeRoute: null,
    highlightedRefs: [],
    toolLog: [],
    history: [],
    prefs: { units: 'feet', stepLength_m: 0.75, directionStyle: 'relative', walkSpeedPercent: 100 },
    priceTotal_usd: 0,
  });

  const price = (selection: string[]) => selection.reduce(
    (total, ref) => total + (fixture.seats.find((seat) => seat.ref === ref)?.price_usd ?? 0),
    0,
  );
  const begin = (name: `a11y.${string}`, args: Record<string, unknown>, options?: CallOptions) => {
    const entry: ToolLogEntry = {
      callId: nextCallId(),
      origin: options?.origin ?? 'human',
      name,
      args,
      resultRefs: [],
      status: 'pending',
      startedAt: Date.now(),
    };
    store.update((state) => ({ ...state, toolLog: compactToolLog([...state.toolLog, entry]) }));
    return entry.callId;
  };
  const finish = (
    callId: string,
    update: Partial<ToolLogEntry>,
    stateUpdate: Partial<AppState> = {},
  ) => store.update((state) => {
    const pendingEntry = state.toolLog.find((entry) => entry.callId === callId);
    if (!pendingEntry) return { ...state, ...stateUpdate };
    const completedEntry: ToolLogEntry = {
      ...pendingEntry,
      status: 'succeeded',
      completedAt: Date.now(),
      ...update,
    };
    return {
      ...state,
      ...stateUpdate,
      toolLog: compactToolLog([
        ...state.toolLog.filter((entry) => entry.callId !== callId),
        completedEntry,
      ]),
    };
  });
  const fail = (callId: string, error: unknown): never => {
    const domain = error instanceof DomainError;
    finish(callId, {
      status: domain ? 'domain_failed' : 'rejected',
      ...(domain ? { errorCode: error.code } : {}),
    });
    throw error;
  };

  const app = {
    getState: () => store.getState(),
    subscribe: (listener: () => void) => store.subscribe(listener),
    setPreferences(prefs: RenderInput) {
      if (!hasValidPositiveNumber(prefs.stepLength_m) || !hasValidPositiveNumber(prefs.walkSpeedPercent)) {
        throw new DomainError('INVALID_CRITERIA');
      }
      store.update((state) => ({ ...state, prefs: { ...state.prefs, ...prefs } }));
    },
    getLayout(input: RenderInput = {}, options?: CallOptions) {
      const callId = begin('a11y.get_layout', input, options);
      const data = {
        domain: 'rail' as const,
        layoutId: fixture.layoutId,
        bounds_m: fixture.bounds_m,
        seatCount: { total: fixture.seats.length, available: fixture.seats.filter((seat) => seat.available).length },
        accessibleCount: {
          wheelchairSpaces: fixture.seats.filter((seat) => seat.wheelchairSpace).length,
          transferSeats: fixture.seats.filter((seat) => seat.transferSeat).length,
          movableArmrestSeats: fixture.seats.filter((seat) => seat.movableArmrest).length,
        },
        landmarks: fixture.landmarks,
        referencePoints: fixture.referencePoints.map((point) => point.ref),
        summary: `${fixture.layoutId} has ${fixture.seats.length} seats and ${fixture.seats.filter((seat) => seat.available).length} available.`,
      };
      finish(callId, { resultRefs: data.referencePoints }, { highlightedRefs: data.referencePoints });
      return data;
    },
    query(input: QueryInput = {}, options?: CallOptions) {
      const callId = begin('a11y.query', input, options);
      try {
        const result = querySeats(fixture, { ...store.getState().prefs, ...input });
        const refs = result.data.items.map((item) => item.ref);
        finish(callId, { resultRefs: refs, appliedCriteria: result.data.appliedCriteria }, { highlightedRefs: refs });
        return result;
      } catch (error) { return fail(callId, error); }
    },
    describe(input: { ref: string } & RenderInput, options?: CallOptions) {
      const callId = begin('a11y.describe', input, options);
      try {
        const data = describeRef(fixture, input.ref, { ...store.getState().prefs, ...input });
        finish(callId, { resultRefs: [input.ref] }, { highlightedRefs: [input.ref] });
        return data;
      } catch (error) { return fail(callId, error); }
    },
    getRoute(input: { from: string; to: string } & RenderInput, options?: CallOptions) {
      const callId = begin('a11y.get_route', input, options);
      try {
        const data = getRoute(fixture, input.from, input.to, { ...store.getState().prefs, ...input });
        const refs = [data.from, ...data.segments.map((segment) => segment.to)];
        finish(callId, { resultRefs: refs }, { activeRoute: data, highlightedRefs: refs });
        return data;
      } catch (error) { return fail(callId, error); }
    },
    compare(input: { refs: string[] } & RenderInput, options?: CallOptions) {
      const callId = begin('a11y.compare', input, options);
      try {
        const data = compareRefs(fixture, input.refs, { ...store.getState().prefs, ...input });
        finish(callId, { resultRefs: input.refs }, { highlightedRefs: [...input.refs] });
        return data;
      } catch (error) { return fail(callId, error); }
    },
    select(input: { ref: string }, options?: CallOptions) {
      const callId = begin('a11y.select', input, options);
      try {
        const state = store.getState();
        if (state.confirmationStatus !== 'draft') throw new DomainError('CONFIRMATION_REQUIRED');
        const seat = fixture.seats.find((item) => item.ref === input.ref);
        if (!seat) throw new DomainError('INVALID_REF');
        if (!seat.available) throw new DomainError('NOT_AVAILABLE');
        if (state.selection.includes(input.ref)) {
          finish(callId, { resultRefs: [input.ref] }, { highlightedRefs: [input.ref] });
          return { selectedRef: input.ref };
        }
        const selection = [...state.selection, input.ref];
        finish(callId, { resultRefs: [input.ref] }, {
          selection,
          highlightedRefs: [input.ref],
          history: [...state.history, snapshot(state)],
          priceTotal_usd: price(selection),
        });
        return { selectedRef: input.ref };
      } catch (error) { return fail(callId, error); }
    },
    getSelection(_input: Record<string, never> = {}, options?: CallOptions) {
      const callId = begin('a11y.get_selection', {}, options);
      const selected = [...store.getState().selection];
      finish(callId, { resultRefs: selected }, { highlightedRefs: selected });
      return { selected };
    },
    undo(_input: Record<string, never> = {}, options?: CallOptions) {
      const callId = begin('a11y.undo', {}, options);
      try {
        const state = store.getState();
        if (state.confirmationStatus !== 'draft') throw new DomainError('CONFIRMATION_REQUIRED');
        const previous = state.history.at(-1);
        if (!previous) throw new DomainError('NOTHING_TO_UNDO');
        const undone = state.selection.find((ref) => !previous.selection.includes(ref)) ?? null;
        finish(callId, { resultRefs: previous.selection }, {
          ...previous,
          history: state.history.slice(0, -1),
          priceTotal_usd: price(previous.selection),
        });
        return { undone };
      } catch (error) { return fail(callId, error); }
    },
    async confirm(_input: Record<string, never> = {}, options?: CallOptions) {
      const callId = begin('a11y.confirm', {}, options);
      const state = store.getState();
      if (state.confirmationStatus !== 'draft') {
        return fail(callId, new DomainError('CONFIRMATION_REQUIRED'));
      }
      if (state.selection.length === 0) {
        return fail(callId, new DomainError(
          'CONFIRMATION_REQUIRED',
          'Select at least one seat before confirming.',
        ));
      }

      const before = snapshot(state);
      const controller = new AbortController();
      let timedOut = false;
      const abortFromCaller = () => controller.abort(options?.signal?.reason);
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort(new DOMException('Confirmation timed out.', 'TimeoutError'));
      }, options?.timeoutMs ?? 120_000);
      if (options?.signal?.aborted) controller.abort(options.signal.reason);
      else options?.signal?.addEventListener('abort', abortFromCaller, { once: true });
      store.update((current) => ({ ...current, confirmationStatus: 'confirmation_pending' }));

      try {
        if (controller.signal.aborted) throw controller.signal.reason;
        const outcome = await port.open(controller.signal);
        if (controller.signal.aborted) throw controller.signal.reason;
        if (outcome === 'confirmed') {
          finish(callId, { outcome }, { confirmationStatus: 'confirmed', history: [] });
        } else {
          finish(callId, { outcome, status: 'cancelled' }, { ...before });
        }
        return { outcome };
      } catch (error) {
        if (timedOut) {
          finish(callId, { outcome: 'timeout' }, { ...before });
          return { outcome: 'timeout' as const };
        }
        store.update((current) => ({ ...current, ...before }));
        return fail(callId, error);
      } finally {
        clearTimeout(timeout);
        options?.signal?.removeEventListener('abort', abortFromCaller);
      }
    },
  };
  return app;
}

export type BearingApplication = ReturnType<typeof createBearingApplication>;
