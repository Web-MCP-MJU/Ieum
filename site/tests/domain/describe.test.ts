import { describe, expect, it } from 'vitest';

import { railFixture } from '@/src/data/fixture';
import { DomainError } from '@/src/domain/errors';
import { describeRef } from '@/src/domain/describe';

describe('describeRef', () => {
  it('describes a stable seat ref with structured facts and relations', () => {
    const result = describeRef(railFixture, '6-12A', { units: 'feet' });

    expect(result.ref).toBe('6-12A');
    expect(result.line).toContain('Seat 12A');
    expect(result.attributes).toMatchObject({ available: true, side: 'window', facing: 'forward' });
    expect(result.relations.some((relation) => relation.to === 'restroom')).toBe(true);
    expect(result.followUps.length).toBeGreaterThan(0);
    expect(result.unitsNote).toBeUndefined();
  });

  it('describes unavailable seats instead of treating them as invalid', () => {
    const unavailable = railFixture.seats.find((seat) => !seat.available)!;
    expect(describeRef(railFixture, unavailable.ref).attributes.available).toBe(false);
  });

  it('preserves complete landmark and reference-point facts as interrogable attributes', () => {
    const landmark = describeRef(railFixture, 'restroom');
    expect(landmark.attributes).toMatchObject({
      key: 'restroom',
      position_m: expect.any(Object),
      landmarkType: 'primary',
      sensoryChannels: ['tactile', 'auditory'],
      detectability: { caneUser: 'high', dogGuide: 'high' },
      signpostedAs: 'Restroom',
    });

    const entrance = describeRef(railFixture, 'entrance_front');
    expect(entrance.attributes).toMatchObject({
      ref: 'entrance_front', kind: 'entrance', stableCheckpoint: true, position_m: expect.any(Object),
    });
  });

  it('includes a step warning only for step-rendered relations', () => {
    const result = describeRef(railFixture, '6-12A', { units: 'steps' });
    expect(result.relations.every((relation) => relation.rendered.includes('steps'))).toBe(true);
    expect(result.unitsNote).toContain('0.75 m');
  });

  it('rejects an invalid ref with the fixed domain code', () => {
    expect(() => describeRef(railFixture, '<missing>')).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_REF' }),
    );
  });
});

describe('followUps are questions, not instructions', () => {
  // Architecture section 5 defines these as "named next questions". A traveler
  // deciding by ear needs the conversation carried forward; a list of things they
  // could type is useless to someone who is not reading the screen.
  it.each(['6-12A', 'restroom'])('puts a question to the traveler for %s', (ref) => {
    const { followUps } = describeRef(railFixture, ref);
    expect(followUps.length).toBeGreaterThan(0);
    expect(followUps.filter((item) => !item.trim().endsWith('?'))).toEqual([]);
  });
});
