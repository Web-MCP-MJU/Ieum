import { describe, expect, it } from 'vitest';

import { railFixture } from '@/src/data/fixture';
import { DomainError } from '@/src/domain/errors';
import { getRoute } from '@/src/domain/route';

describe('getRoute', () => {
  it('keeps longitudinal and lateral movement from the front entrance to 12A', () => {
    const route = getRoute(railFixture, 'entrance_front', '6-12A');
    expect(route.segments.length).toBeGreaterThanOrEqual(2);
    expect(route.segments.at(-1)?.to).toBe('6-12A');
    expect(route.segments.at(-1)?.length_m).toBeCloseTo(1.2);
    expect(route.segments.some((segment) => segment.countedFeatures?.count === 6)).toBe(true);
  });

  it('keeps seat-to-aisle lateral movement and landmarks on the way to the restroom', () => {
    const route = getRoute(railFixture, '6-12A', 'restroom');
    expect(route.segments[0]).toMatchObject({ from: '6-12A', length_m: 1.2 });
    expect(route.landmarks.map((landmark) => landmark.key)).toContain('cafe_car');
  });

  it('returns lateral-longitudinal-lateral movement between different rows', () => {
    const route = getRoute(railFixture, '6-12A', '6-14D');
    expect(route.segments).toHaveLength(3);
    expect(route.segments.map((segment) => segment.bearing.degrees)).toEqual([90, 180, 90]);
  });

  it('does not collapse a same-row cross-aisle route', () => {
    expect(getRoute(railFixture, '6-12A', '6-12D').totalLength_m).toBeGreaterThan(0);
  });

  it('uses the authored same-side direct path from 12A to 12B', () => {
    const route = getRoute(railFixture, '6-12A', '6-12B');
    expect(route.segments).toHaveLength(1);
    expect(route.totalLength_m).toBeCloseTo(0.7);
  });

  it('changes only rendering when units change', () => {
    const feet = getRoute(railFixture, '6-12A', '6-14D', { units: 'feet' });
    const meters = getRoute(railFixture, '6-12A', '6-14D', { units: 'meters' });
    const steps = getRoute(railFixture, '6-12A', '6-14D', { units: 'steps' });
    expect(meters.segments).toEqual(feet.segments);
    expect(steps.segments).toEqual(feet.segments);
    expect(steps.rendered.unitsNote).toContain('approximate');
  });

  it('doubles only traversal time at half walking speed', () => {
    const normal = getRoute(railFixture, '6-12A', '6-14D');
    const slower = getRoute(railFixture, '6-12A', '6-14D', { walkSpeedPercent: 50 });
    expect(slower.totalLength_m).toBe(normal.totalLength_m);
    expect(slower.totalTraversalTime_s).toBeCloseTo(normal.totalTraversalTime_s * 2);
    expect(slower.segments.map((segment) => segment.length_m))
      .toEqual(normal.segments.map((segment) => segment.length_m));
  });

  it('derives reverse bearing by adding 180 degrees', () => {
    expect(getRoute(railFixture, '6-12B', '6-12A').segments[0].bearing.degrees).toBe(270);
  });

  it('does not traverse a one-way edge in reverse', () => {
    const fixture = {
      ...railFixture,
      pathEdges: railFixture.pathEdges.map((edge) =>
        edge.id === 'edge_6_12A_6_12B' ? { ...edge, bidirectional: false } : edge,
      ),
    };
    expect(getRoute(fixture, '6-12B', '6-12A').totalLength_m).toBeGreaterThan(0.7);
  });

  it('returns a progressing continuation with partial totals for more than four segments', () => {
    const route = getRoute(railFixture, 'entrance_front', 'entrance_rear');
    expect(route.requiresContinuation).toBe(true);
    expect(route.segments.length).toBeLessThanOrEqual(4);
    expect(route.requestedTo).toBe('entrance_rear');
    expect(route.to).toBe(route.checkpoint?.ref);
    expect(route.totalLength_m).toBeCloseTo(
      route.segments.reduce((sum, segment) => sum + segment.length_m, 0),
    );
    const followUp = getRoute(railFixture, route.to, route.requestedTo);
    expect(followUp.totalLength_m).toBeLessThan(26.4);
  });

  it('rejects invalid refs safely', () => {
    expect(() => getRoute(railFixture, 'missing', 'restroom')).toThrow(
      expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_REF' }),
    );
  });

  it('terminates every ordered routable pair through unique continuation checkpoints', () => {
    const refs = [...railFixture.routableRefs];
    for (const origin of refs) {
      for (const destination of refs) {
        if (origin === destination) continue;
        let from = origin;
        const checkpoints = new Set<string>();
        for (let leg = 0; leg < refs.length; leg += 1) {
          const route = getRoute(railFixture, from, destination);
          expect(route.segments.length).toBeLessThanOrEqual(4);
          if (!route.requiresContinuation) break;
          expect(checkpoints.has(route.to)).toBe(false);
          checkpoints.add(route.to);
          from = route.to;
          if (leg === refs.length - 1) throw new Error('Continuation did not terminate.');
        }
      }
    }
  });
});

describe('rendered guidance', () => {
  const spokenNumbers = (text: string): number[] =>
    [...text.matchAll(/([\d.]+) (?:feet|meters|steps?)\b/g)].map((match) => Number(match[1]));

  it.each(['feet', 'meters', 'steps'] as const)(
    'states a total that equals the sum of the spoken segments in %s',
    (units) => {
      // A listener who counts along must not be contradicted by the last sentence:
      // sum(round(x)) and round(sum(x)) differ, so the total is summed over what
      // was actually said.
      for (const [from, to] of [
        ['entrance_front', '6-12A'],
        ['6-12A', 'restroom'],
        ['6-12A', '6-14D'],
      ] as const) {
        const route = getRoute(railFixture, from, to, { units });
        const parts = route.rendered.instructions.flatMap(spokenNumbers);
        const total = spokenNumbers(route.rendered.summary).at(-1);
        expect(total).toBeCloseTo(parts.reduce((sum, part) => sum + part, 0), 1);
      }
    },
  );

  it('tells the traveler to turn when the heading changes, and not when it does not', () => {
    const turning = getRoute(railFixture, '6-12A', 'restroom');
    const headings = turning.segments.map((segment) => segment.bearing.degrees);
    expect(new Set(headings).size).toBeGreaterThan(1);
    expect(turning.rendered.instructions.join(' ')).toMatch(/Turn (left|right|around)/);

    // Consecutive segments on the same heading need no rotation, and saying one
    // would contradict the walk that follows it.
    const straight = getRoute(railFixture, '6-12A', '6-12D');
    expect(new Set(straight.segments.map((segment) => segment.bearing.degrees)).size).toBe(1);
    expect(straight.rendered.instructions.join(' ')).not.toMatch(/Turn /);
  });

  it('names the landmarks a segment passes instead of only collecting them', () => {
    const route = getRoute(railFixture, '6-12A', 'restroom');
    const passed = route.segments.flatMap((segment) => segment.landmarksPassed);
    expect(passed.length).toBeGreaterThan(0);

    const labels = passed
      .map((key) => railFixture.landmarks.find((item) => item.key === key)?.label)
      .filter((label): label is string => label !== undefined);

    const spoken = route.rendered.instructions.join(' ');
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.filter((label) => !spoken.includes(label))).toEqual([]);
  });
});
