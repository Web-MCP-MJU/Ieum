import { describe, expect, it } from 'vitest';

import { railFixture } from '@/src/data/fixture';
import { compareRefs } from '@/src/domain/compare';
import { DomainError } from '@/src/domain/errors';

describe('compareRefs', () => {
  it.each([
    ['one ref', ['6-12A']],
    ['five refs', ['6-12A', '6-12B', '6-12C', '6-12D', '6-13A']],
    ['duplicates', ['6-12A', '6-12A']],
  ])('rejects invalid selection cardinality or uniqueness: %s', (_label, refs) => {
    expect(() => compareRefs(railFixture, refs)).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_SELECTION' }),
    );
  });

  it('accepts two and four refs, preserves input order, and keeps identical axes', () => {
    for (const refs of [
      ['6-14D', '6-12A'],
      ['6-12D', '6-12A', '6-13C', '6-13B'],
    ]) {
      const comparison = compareRefs(railFixture, refs);
      const keys = comparison.axes.map((axis) => axis.key);
      expect(comparison.rows.map((row) => row.ref)).toEqual(refs);
      expect(comparison.rows.every((row) => Object.keys(row.values).toSorted().join() === keys.toSorted().join())).toBe(true);
    }
  });

  it('includes unavailable seats and their availability fact', () => {
    const unavailable = railFixture.seats.find((seat) => !seat.available)!;
    const comparison = compareRefs(railFixture, ['6-12A', unavailable.ref]);
    expect(comparison.rows[1].values.available).toBe(false);
  });

  it('rejects an invalid ref without dropping it', () => {
    expect(() => compareRefs(railFixture, ['6-12A', 'missing'])).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_REF' }),
    );
  });
});
