import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBearingApplication } from '@/src/application/use-cases';
import { railFixture } from '@/src/data/fixture';
import { DomainError } from '@/src/domain/errors';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Bearing application', () => {
  it('projects query, route, selection, and undo through one state', async () => {
    const app = createBearingApplication(railFixture, { open: async () => 'confirmed' });
    const query = app.query({ rail: { facing: 'forward', side: 'window' } });
    expect(query.data.items).toHaveLength(12);
    expect(app.getState().highlightedRefs).toEqual(query.data.items.map((item) => item.ref));

    const route = app.getRoute({ from: 'entrance_front', to: '6-12A' });
    expect(app.getState().activeRoute).toEqual(route);

    app.select({ ref: '6-12A' });
    expect(app.getSelection().selected).toEqual(['6-12A']);
    expect(app.getState().priceTotal_usd).toBe(72);
    expect(app.undo().undone).toBe('6-12A');
    expect(app.getSelection().selected).toEqual([]);
  });

  it('keeps select append-idempotent and rejects unavailable seats', () => {
    const app = createBearingApplication(railFixture, { open: async () => 'confirmed' });
    app.select({ ref: '6-12A' });
    app.select({ ref: '6-12A' });
    expect(app.getSelection().selected).toEqual(['6-12A']);
    const unavailable = railFixture.seats.find((seat) => !seat.available)!;
    expect(() => app.select({ ref: unavailable.ref })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'NOT_AVAILABLE' }),
    );
  });

  it('waits for the confirmation port and locks the confirmed selection', async () => {
    let settle!: (value: 'confirmed' | 'cancelled') => void;
    const app = createBearingApplication(railFixture, {
      open: () => new Promise((resolve) => { settle = resolve; }),
    });
    app.select({ ref: '6-12A' });
    const pending = app.confirm();
    expect(app.getState().confirmationStatus).toBe('confirmation_pending');
    settle('confirmed');
    await expect(pending).resolves.toEqual({ outcome: 'confirmed' });
    expect(app.getState().confirmationStatus).toBe('confirmed');
    expect(() => app.undo()).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'CONFIRMATION_REQUIRED' }),
    );
    await expect(app.confirm()).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    expect(app.getState().confirmationStatus).toBe('confirmed');
  });

  it('keeps pending confirmation locked when a duplicate confirm fails', async () => {
    let settle!: (value: 'confirmed' | 'cancelled') => void;
    const app = createBearingApplication(railFixture, {
      open: () => new Promise((resolve) => { settle = resolve; }),
    });
    app.select({ ref: '6-12A' });
    const pending = app.confirm();
    await expect(app.confirm()).rejects.toMatchObject({ code: 'CONFIRMATION_REQUIRED' });
    expect(app.getState().confirmationStatus).toBe('confirmation_pending');
    expect(() => app.select({ ref: '6-12B' })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'CONFIRMATION_REQUIRED' }),
    );
    settle('cancelled');
    await pending;
  });

  it('returns timeout in the same call and restores the draft snapshot', async () => {
    const app = createBearingApplication(railFixture, {
      open: (signal) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    });
    app.select({ ref: '6-12A' });
    const timeout = app.confirm({}, { timeoutMs: 1 });
    await expect(timeout).resolves.toEqual({ outcome: 'timeout' });
    expect(app.getState()).toMatchObject({
      confirmationStatus: 'draft', selection: ['6-12A'], highlightedRefs: ['6-12A'],
    });
  });

  it('restores the draft snapshot when the caller aborts confirmation', async () => {
    const app = createBearingApplication(railFixture, {
      open: (signal) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      }),
    });
    app.select({ ref: '6-12A' });
    const controller = new AbortController();
    const pending = app.confirm({}, { signal: controller.signal });
    controller.abort(new DOMException('Caller cancelled.', 'AbortError'));

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(app.getState()).toMatchObject({
      confirmationStatus: 'draft', selection: ['6-12A'], highlightedRefs: ['6-12A'],
    });
  });

  it('rejects invalid rendering preferences without replacing stored valid preferences', () => {
    const app = createBearingApplication(railFixture, { open: async () => 'confirmed' });
    const original = app.getState().prefs;

    expect(() => app.setPreferences({ stepLength_m: 0 })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_CRITERIA' }),
    );
    expect(() => app.setPreferences({ walkSpeedPercent: Number.POSITIVE_INFINITY })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_CRITERIA' }),
    );
    expect(app.getState().prefs).toEqual(original);
  });

  it('preserves stored numeric preferences when a partial update explicitly leaves them undefined', () => {
    const app = createBearingApplication(railFixture, { open: async () => 'confirmed' });
    app.setPreferences({ stepLength_m: 1.2, walkSpeedPercent: 85 });

    app.setPreferences({ units: 'meters', stepLength_m: undefined, walkSpeedPercent: undefined });
    expect(app.getState().prefs).toEqual(expect.objectContaining({
      units: 'meters', stepLength_m: 1.2, walkSpeedPercent: 85,
    }));

    const beforeInvalidUpdate = app.getState().prefs;
    expect(() => app.setPreferences({ directionStyle: 'clock', stepLength_m: 0 })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_CRITERIA' }),
    );
    expect(app.getState().prefs).toEqual(beforeInvalidUpdate);
  });

  it('keeps the confirmation wire code while explaining an empty selection', async () => {
    const app = createBearingApplication(railFixture, { open: async () => 'confirmed' });

    await expect(app.confirm()).rejects.toMatchObject({
      code: 'CONFIRMATION_REQUIRED',
      message: 'Select at least one seat before confirming.',
    });
  });

  it('records a human confirmation cancellation as cancelled', async () => {
    const app = createBearingApplication(railFixture, { open: async () => 'cancelled' });
    app.select({ ref: '6-12A' });

    await expect(app.confirm()).resolves.toEqual({ outcome: 'cancelled' });
    expect(app.getState().toolLog.at(-1)).toMatchObject({
      name: 'a11y.confirm', status: 'cancelled', outcome: 'cancelled',
    });
  });

  it('retains only the newest ten completed calls', () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => ++now);
    const app = createBearingApplication(railFixture, { open: async () => 'confirmed' });

    app.getLayout();
    const firstCallId = app.getState().toolLog[0]!.callId;
    for (let call = 0; call < 10; call += 1) app.getLayout();

    expect(app.getState().toolLog).toHaveLength(10);
    expect(app.getState().toolLog).not.toContainEqual(expect.objectContaining({ callId: firstCallId }));
    expect(app.getState().toolLog.every((entry) => entry.status !== 'pending')).toBe(true);
  });

  it('retains a pending confirmation through later calls and completes that same entry', async () => {
    let now = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => ++now);
    let settle!: (outcome: 'confirmed' | 'cancelled') => void;
    const app = createBearingApplication(railFixture, {
      open: () => new Promise((resolve) => { settle = resolve; }),
    });
    app.select({ ref: '6-12A' });
    const pending = app.confirm();
    const confirmationCallId = app.getState().toolLog.at(-1)!.callId;

    for (let call = 0; call < 10; call += 1) app.getLayout();

    expect(app.getState().toolLog).toHaveLength(11);
    expect(app.getState().toolLog).toContainEqual(expect.objectContaining({
      callId: confirmationCallId,
      status: 'pending',
    }));

    settle('cancelled');
    await expect(pending).resolves.toEqual({ outcome: 'cancelled' });

    expect(app.getState().toolLog).toHaveLength(10);
    expect(app.getState().toolLog).toContainEqual(expect.objectContaining({
      callId: confirmationCallId,
      status: 'cancelled',
      outcome: 'cancelled',
    }));
  });
});
