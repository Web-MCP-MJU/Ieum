import { DomainError } from './errors';
import type { DirectionStyle, RenderInput, RenderOptions } from './types';

const DEFAULTS: RenderOptions = {
  units: 'feet',
  stepLength_m: 0.75,
  directionStyle: 'relative',
  walkSpeedPercent: 100,
};

function positiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function normalizeRenderOptions(input: RenderInput = {}): RenderOptions {
  const result = { ...DEFAULTS, ...input };
  if (!positiveFinite(result.stepLength_m) || !positiveFinite(result.walkSpeedPercent)) {
    throw new DomainError('INVALID_CRITERIA');
  }
  return result;
}

export function stepUnitsNote(stepLength_m: number): string {
  return `Step counts are converted from measured distance using an assumed ${stepLength_m} m stride and are approximate. Landmark counts (e.g. 'third row') are exact.`;
}

function concise(value: number, fractionDigits = 1): string {
  return Number(value.toFixed(fractionDigits)).toString();
}

/**
 * The number the traveler hears, in whatever units they asked for.
 *
 * Totals must be summed over these, never converted once from a meter total:
 * sum(round(x)) and round(sum(x)) differ, and someone counting the segments
 * aloud arrives at the first one.
 */
export function distanceValue(distance_m: number, options: RenderOptions): number {
  if (options.units === 'meters') return Number(concise(distance_m));
  if (options.units === 'feet') return Math.round(distance_m * 3.28084);
  return Math.round(distance_m / options.stepLength_m);
}

export function formatDistanceValue(value: number, units: RenderOptions['units']): string {
  if (units === 'meters') return `${value} meters`;
  if (units === 'feet') return `${value} feet`;
  // Read aloud, so "about 1 steps" is worth the conditional.
  return `about ${value} step${value === 1 ? '' : 's'}`;
}

export function renderDistance(
  distance_m: number,
  input: RenderInput = {},
): { rendered: string; unitsNote?: string } {
  if (!Number.isFinite(distance_m) || distance_m < 0) throw new DomainError('INVALID_CRITERIA');
  const options = normalizeRenderOptions(input);
  const rendered = formatDistanceValue(distanceValue(distance_m, options), options.units);
  return options.units === 'steps'
    ? { rendered, unitsNote: stepUnitsNote(options.stepLength_m) }
    : { rendered };
}

function quadrant(degrees: number): 0 | 90 | 180 | 270 {
  return (Math.round(degrees / 90) * 90 % 360) as 0 | 90 | 180 | 270;
}

export function renderDirection(
  degrees: number,
  frame: 'egocentric' | 'car_axis',
  style: DirectionStyle,
): string {
  if (!Number.isFinite(degrees) || degrees < 0 || degrees >= 360) {
    throw new DomainError('INVALID_CRITERIA');
  }
  if (style === 'clock') {
    const roundedHour = Math.round(degrees / 30) % 12;
    const hour = roundedHour === 0 ? 12 : roundedHour;
    return `${hour} o'clock`;
  }
  const direction = quadrant(degrees);
  if (style === 'cardinal' || frame === 'car_axis') {
    return ({
      0: 'toward the front of the car',
      90: 'right',
      180: 'toward the rear of the car',
      270: 'left',
    } as const)[direction];
  }
  return ({ 0: 'ahead', 90: 'right', 180: 'behind', 270: 'left' } as const)[direction];
}

export function walkingTimeSeconds(length_m: number, walkSpeedPercent: number): number {
  if (!Number.isFinite(length_m) || length_m < 0 || !positiveFinite(walkSpeedPercent)) {
    throw new DomainError('INVALID_CRITERIA');
  }
  return length_m / (1.2 * walkSpeedPercent / 100);
}
