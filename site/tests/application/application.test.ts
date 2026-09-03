import { describe, expect, it } from 'vitest';

import { createBearingApplication } from '@/src/application/use-cases';
import { railFixture } from '@/src/data/fixture';
import { DomainError } from '@/src/domain/errors';

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
});
