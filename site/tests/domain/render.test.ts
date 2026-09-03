import { describe, expect, it } from 'vitest';

import { DomainError } from '@/src/domain/errors';
import {
  normalizeRenderOptions,
  renderDirection,
  renderDistance,
  walkingTimeSeconds,
} from '@/src/domain/render';

describe('rendering', () => {
  it('normalizes the documented defaults', () => {
    expect(normalizeRenderOptions()).toEqual({
      units: 'feet', stepLength_m: 0.75, directionStyle: 'relative', walkSpeedPercent: 100,
    });
  });

  it('renders meters, feet, and approximate steps without changing source meters', () => {
    expect(renderDistance(7.3, { units: 'meters' }).rendered).toBe('7.3 meters');
    expect(renderDistance(7.3, { units: 'feet' }).rendered).toBe('24 feet');
    const steps = renderDistance(7.3, { units: 'steps' });
    expect(steps.rendered).toBe('about 10 steps');
    expect(steps.unitsNote).toContain('approximate');
  });

  it('renders the same bearing in all direction styles', () => {
    expect(renderDirection(90, 'car_axis', 'relative')).toBe('right');
    expect(renderDirection(90, 'egocentric', 'clock')).toBe("3 o'clock");
    expect(renderDirection(180, 'car_axis', 'cardinal')).toBe('toward the rear of the car');
    expect(renderDirection(30, 'egocentric', 'clock')).toBe("1 o'clock");
    expect(renderDirection(300, 'egocentric', 'clock')).toBe("10 o'clock");
  });

  it('derives walking time only from length and call speed', () => {
    expect(walkingTimeSeconds(12, 100)).toBe(10);
    expect(walkingTimeSeconds(12, 50)).toBe(20);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid positive finite render input: %s',
    (value) => {
      expect(() => normalizeRenderOptions({ stepLength_m: value })).toThrow(
        expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_CRITERIA' }),
      );
      expect(() => walkingTimeSeconds(1, value)).toThrow(
        expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_CRITERIA' }),
      );
    },
  );

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid source distance: %s',
    (value) => {
      expect(() => renderDistance(value)).toThrow(
        expect.objectContaining<Partial<DomainError>>({ code: 'INVALID_CRITERIA' }),
      );
    },
  );
});
