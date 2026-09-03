import { DomainError } from './errors';
import { pathDistance, shortestPathEdges } from './graph';
import { normalizeRenderOptions, renderDistance } from './render';
import type {
  LoadedRailFixture,
  QueryCriteria,
  QueryInput,
  QueryComputation,
  RailCandidate,
  Seat,
} from './types';

function nonnegativeFinite(value: number | undefined): boolean {
  return value === undefined || (Number.isFinite(value) && value >= 0);
}

function normalizeCriteria(input: QueryInput): QueryCriteria & { availableOnly: boolean } {
  if (input.hotel) throw new DomainError('UNSUPPORTED_CRITERIA');
  if (input.maxDistance_m !== undefined && input.near === undefined) {
    throw new DomainError('INVALID_CRITERIA');
  }
  if (!nonnegativeFinite(input.maxDistance_m) || !nonnegativeFinite(input.priceMax_usd) ||
    !nonnegativeFinite(input.needs?.minFootSpace_in2)) {
    throw new DomainError('INVALID_CRITERIA');
  }
  const criteria: QueryCriteria & { availableOnly: boolean } = {
    ...(input.near === undefined ? {} : { near: input.near }),
    ...(input.maxDistance_m === undefined ? {} : { maxDistance_m: input.maxDistance_m }),
    ...(input.priceMax_usd === undefined ? {} : { priceMax_usd: input.priceMax_usd }),
    availableOnly: input.availableOnly ?? true,
    ...(input.needs === undefined ? {} : { needs: { ...input.needs } }),
    ...(input.rail === undefined ? {} : { rail: { ...input.rail } }),
  };
  return criteria;
}

function candidateFromSeat(seat: Seat, distance?: RailCandidate['distance']): RailCandidate {
  return {
    ref: seat.ref,
    label: `Seat ${seat.row}${seat.seatLetter}`,
    line: `Seat ${seat.row}${seat.seatLetter}, ${seat.facing}-facing ${seat.side} seat.`,
    price_usd: seat.price_usd,
    available: seat.available,
    features: [...seat.features],
    ...(distance ? { distance } : {}),
    domain: 'rail',
    rail: {
      row: seat.row,
      seatLetter: seat.seatLetter,
      side: seat.side,
      facing: seat.facing,
      quietCar: seat.quietCar,
    },
    accessibility: {
      wheelchairSpace: seat.wheelchairSpace,
      transferSeat: seat.transferSeat,
      companionSeat: seat.companionSeat,
      movableArmrest: seat.movableArmrest,
      footSpace_in2: seat.footSpace_in2,
      bulkhead: seat.bulkhead,
      exitRow: seat.exitRow,
    },
  };
}

function narrowingHint(criteria: QueryCriteria): string {
  if (criteria.near === undefined) return 'Narrow results by adding near.';
  if (criteria.maxDistance_m === undefined) return 'Narrow results by adding maxDistance_m.';
  if (criteria.priceMax_usd === undefined) return 'Narrow results by decreasing priceMax_usd.';
  if (criteria.needs?.minFootSpace_in2 === undefined) return 'Narrow results by increasing needs.minFootSpace_in2.';
  for (const key of ['wheelchairSpace', 'transferSeat', 'movableArmrest', 'excludeExitRow'] as const) {
    if (criteria.needs?.[key] === undefined) return `Narrow results by adding needs.${key}.`;
  }
  for (const key of ['facing', 'side', 'quietCar'] as const) {
    if (criteria.rail?.[key] === undefined) return `Narrow results by adding rail.${key}.`;
  }
  return 'Narrow results by decreasing maxDistance_m.';
}

function relaxationHint(criteria: QueryCriteria & { availableOnly: boolean }): string {
  if (criteria.availableOnly) return 'Relax results by setting availableOnly to false.';
  if (criteria.maxDistance_m !== undefined) return 'Relax results by increasing or removing maxDistance_m.';
  if (criteria.priceMax_usd !== undefined) return 'Relax results by increasing or removing priceMax_usd.';
  if (criteria.needs?.minFootSpace_in2 !== undefined) return 'Relax results by decreasing or removing needs.minFootSpace_in2.';
  for (const key of ['wheelchairSpace', 'transferSeat', 'movableArmrest', 'excludeExitRow'] as const) {
    if (criteria.needs?.[key] === true || (key !== 'excludeExitRow' && criteria.needs?.[key] === false)) {
      return `Relax results by removing needs.${key}.`;
    }
  }
  for (const key of ['facing', 'side', 'quietCar'] as const) {
    if (criteria.rail?.[key] !== undefined) return `Relax results by removing rail.${key}.`;
  }
  return 'Relax results by removing near.';
}

export function querySeats(
  fixture: LoadedRailFixture,
  input: QueryInput = {},
): QueryComputation<RailCandidate> {
  const options = normalizeRenderOptions(input);
  const criteria = normalizeCriteria(input);
  if (criteria.near !== undefined && !fixture.routableRefs.has(criteria.near)) {
    throw new DomainError('INVALID_REF');
  }

  const withDistance = fixture.seats.map((seat) => {
    if (!criteria.near) return { seat, distance_m: undefined };
    const path = shortestPathEdges(fixture, criteria.near, seat.ref);
    if (!path) return { seat, distance_m: Infinity };
    return { seat, distance_m: pathDistance(path) };
  });
  const matches = withDistance.filter(({ seat, distance_m }) => {
    const needs = criteria.needs;
    const rail = criteria.rail;
    return (!criteria.availableOnly || seat.available) &&
      (criteria.priceMax_usd === undefined || seat.price_usd <= criteria.priceMax_usd) &&
      (criteria.maxDistance_m === undefined || (distance_m ?? Infinity) <= criteria.maxDistance_m) &&
      (needs?.wheelchairSpace === undefined || seat.wheelchairSpace === needs.wheelchairSpace) &&
      (needs?.transferSeat === undefined || seat.transferSeat === needs.transferSeat) &&
      (needs?.movableArmrest === undefined || seat.movableArmrest === needs.movableArmrest) &&
      (needs?.minFootSpace_in2 === undefined || seat.footSpace_in2 >= needs.minFootSpace_in2) &&
      (!needs?.excludeExitRow || !seat.exitRow) &&
      (rail?.facing === undefined || seat.facing === rail.facing) &&
      (rail?.side === undefined || seat.side === rail.side) &&
      (rail?.quietCar === undefined || seat.quietCar === rail.quietCar);
  });
  matches.sort((a, b) =>
    (criteria.near ? (a.distance_m ?? Infinity) - (b.distance_m ?? Infinity) : 0) ||
    (!criteria.availableOnly ? Number(b.seat.available) - Number(a.seat.available) : 0) ||
    a.seat.price_usd - b.seat.price_usd || a.seat.row - b.seat.row ||
    a.seat.seatLetter.localeCompare(b.seat.seatLetter) || a.seat.ref.localeCompare(b.seat.ref),
  );
  const items = matches.slice(0, 12).map(({ seat, distance_m }) => {
    const rendered = distance_m === undefined ? undefined : renderDistance(distance_m, options).rendered;
    return candidateFromSeat(seat, rendered === undefined ? undefined : {
      from: criteria.near!, distance_m: distance_m!, rendered,
    });
  });
  return {
    data: {
      items,
      appliedCriteria: criteria,
      totalMatched: matches.length,
      ...(criteria.near && options.units === 'steps'
        ? { unitsNote: renderDistance(0, options).unitsNote }
        : {}),
    },
    ...(matches.length === 0
      ? { hint: relaxationHint(criteria) }
      : matches.length >= 13 ? { hint: narrowingHint(criteria) } : {}),
  };
}
