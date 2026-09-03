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
