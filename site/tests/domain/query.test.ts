import { describe, expect, it } from 'vitest';

import { railFixture } from '@/src/data/fixture';
import { DomainError } from '@/src/domain/errors';
import { querySeats } from '@/src/domain/query';

describe('querySeats', () => {
  it('normalizes defaults, caps 13+ matches, and sorts deterministically', () => {
    const result = querySeats(railFixture, {});

    expect(result.data.appliedCriteria).toEqual({ availableOnly: true });
    expect(result.data.totalMatched).toBe(47);
    expect(result.data.items).toHaveLength(12);
    expect(result.hint).toContain('near');
    expect(result.data.items.map((item) => item.ref)).toEqual(
      [...result.data.items]
        .sort((a, b) => a.price_usd - b.price_usd || a.rail.row - b.rail.row ||
          a.rail.seatLetter.localeCompare(b.rail.seatLetter) || a.ref.localeCompare(b.ref))
        .map((item) => item.ref),
    );
    expect(querySeats(railFixture, {}).data.items.map((item) => item.ref))
      .toEqual(result.data.items.map((item) => item.ref));
    expect(Object.hasOwn(result.data, 'hint')).toBe(false);
  });

  it('uses the exact narrowing-axis priority and a valid add/tighten direction', () => {
    const fixture = {
      ...railFixture,
      seats: railFixture.seats.map((seat) => ({
        ...seat,
        available: true,
        price_usd: 1,
        wheelchairSpace: true,
        transferSeat: true,
        movableArmrest: true,
        footSpace_in2: 500,
        exitRow: false,
        facing: 'forward' as const,
        side: 'window' as const,
        quietCar: true,
      })),
    };
    const cases = [
      [{}, 'near'],
      [{ near: 'entrance_front' }, 'maxDistance_m'],
      [{ near: 'entrance_front', maxDistance_m: 100 }, 'priceMax_usd'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100 }, 'needs.minFootSpace_in2'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0 } }, 'needs.wheelchairSpace'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0, wheelchairSpace: true } }, 'needs.transferSeat'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0, wheelchairSpace: true, transferSeat: true } }, 'needs.movableArmrest'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0, wheelchairSpace: true, transferSeat: true, movableArmrest: true } }, 'needs.excludeExitRow'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0, wheelchairSpace: true, transferSeat: true, movableArmrest: true, excludeExitRow: true } }, 'rail.facing'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0, wheelchairSpace: true, transferSeat: true, movableArmrest: true, excludeExitRow: true }, rail: { facing: 'forward' as const } }, 'rail.side'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0, wheelchairSpace: true, transferSeat: true, movableArmrest: true, excludeExitRow: true }, rail: { facing: 'forward' as const, side: 'window' as const } }, 'rail.quietCar'],
      [{ near: 'entrance_front', maxDistance_m: 100, priceMax_usd: 100, needs: { minFootSpace_in2: 0, wheelchairSpace: true, transferSeat: true, movableArmrest: true, excludeExitRow: true }, rail: { facing: 'forward' as const, side: 'window' as const, quietCar: true } }, 'maxDistance_m'],
    ] as const;

    for (const [criteria, field] of cases) {
      const result = querySeats(fixture, criteria);
      expect(result.data.totalMatched).toBe(60);
      expect(result.hint).toContain(field);
    }
    expect(querySeats(fixture, { near: 'entrance_front' }).hint).toContain('adding maxDistance_m');
  });

  it('uses ref as the final sort tie-breaker independent of fixture iteration order', () => {
    const tiedRefs = new Set(['6-7A', '6-7B', '6-7C']);
    const fixture = {
      ...railFixture,
      seats: railFixture.seats.map((seat) => ({
        ...seat,
        available: tiedRefs.has(seat.ref),
        price_usd: 1,
        row: tiedRefs.has(seat.ref) ? 7 : seat.row,
        seatLetter: tiedRefs.has(seat.ref) ? 'A' : seat.seatLetter,
      })).reverse(),
    };
    expect(querySeats(fixture, {}).data.items.map((item) => item.ref)).toEqual([
      '6-7A', '6-7B', '6-7C',
    ]);
  });

  it('returns exactly 12 matches without a narrowing hint', () => {
    const result = querySeats(railFixture, { rail: { facing: 'forward', side: 'window' } });
    expect(result.data.totalMatched).toBe(12);
    expect(result.data.items).toHaveLength(12);
    expect(result.hint).toBeUndefined();
  });

  it('applies every rail and accessibility filter as authored facts', () => {
    const result = querySeats(railFixture, {
      priceMax_usd: 100,
      needs: {
        wheelchairSpace: true,
        transferSeat: false,
        movableArmrest: true,
        minFootSpace_in2: 300,
        excludeExitRow: true,
      },
      rail: { facing: 'backward', side: 'aisle', quietCar: true },
    });

    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items.every((item) =>
      item.price_usd <= 100 && item.accessibility.wheelchairSpace &&
      !item.accessibility.transferSeat && item.accessibility.movableArmrest &&
      item.accessibility.footSpace_in2 >= 300 && !item.accessibility.exitRow &&
      item.rail.facing === 'backward' && item.rail.side === 'aisle' && item.rail.quietCar,
    )).toBe(true);
  });

  it.each([
    ['priceMax_usd', { priceMax_usd: 68 }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => item.price_usd <= 68],
    ['wheelchairSpace', { needs: { wheelchairSpace: true } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => item.accessibility.wheelchairSpace],
    ['transferSeat', { needs: { transferSeat: true } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => item.accessibility.transferSeat],
    ['movableArmrest', { needs: { movableArmrest: false } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => !item.accessibility.movableArmrest],
    ['minFootSpace_in2', { needs: { minFootSpace_in2: 300 } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => item.accessibility.footSpace_in2 >= 300],
    ['excludeExitRow', { needs: { excludeExitRow: true } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => !item.accessibility.exitRow],
    ['facing', { rail: { facing: 'backward' as const } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => item.rail.facing === 'backward'],
    ['side', { rail: { side: 'aisle' as const } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => item.rail.side === 'aisle'],
    ['quietCar', { rail: { quietCar: true } }, (item: ReturnType<typeof querySeats>['data']['items'][number]) => item.rail.quietCar],
  ])('independently applies %s', (_label, criteria, predicate) => {
    const result = querySeats(railFixture, criteria);
    expect(result.data.totalMatched).toBeGreaterThan(0);
    expect(result.data.items.every(predicate)).toBe(true);
  });

  it('uses graph distance for near filtering and step rendering', () => {
    const result = querySeats(railFixture, {
      near: 'entrance_front',
      maxDistance_m: 4,
      units: 'steps',
    });

    expect(result.data.items.length).toBeGreaterThan(0);
    expect(result.data.items.every((item) => item.distance && item.distance.distance_m <= 4)).toBe(true);
    expect(result.data.items[0].distance?.rendered).toMatch(/steps/);
    expect(result.data.unitsNote).toContain('approximate');
  });

  it('returns zero matches as success with the first deterministic relaxation', () => {
    const result = querySeats(railFixture, {
      availableOnly: false,
      needs: { excludeExitRow: false },
      rail: { quietCar: false },
    });
    expect(result.data).toMatchObject({ items: [], totalMatched: 0 });
    expect(result.hint).toContain('rail.quietCar');

    const availabilityFirst = querySeats(railFixture, {
      needs: { minFootSpace_in2: 10_000 },
    });
    expect(availabilityFirst.hint).toContain('availableOnly');
  });

  it('orders available seats before unavailable seats when both are requested', () => {
    const result = querySeats(railFixture, { availableOnly: false, priceMax_usd: 64 });
    const firstUnavailable = result.data.items.findIndex((item) => !item.available);
    expect(firstUnavailable).toBeGreaterThan(0);
    expect(result.data.items.slice(0, firstUnavailable).every((item) => item.available)).toBe(true);
  });

  it('rejects unsupported hotel criteria and invalid distance criteria', () => {
    expect(() => querySeats(railFixture, { hotel: { floorMin: 1 } })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'UNSUPPORTED_CRITERIA' }),
    );
    expect(() => querySeats(railFixture, { maxDistance_m: 2 })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_CRITERIA' }),
    );
    expect(() => querySeats(railFixture, { near: 'missing' })).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_REF' }),
    );
  });
});
