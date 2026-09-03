import { DomainError } from './errors';
import { normalizeRenderOptions } from './render';
import type { Comparison, LoadedRailFixture, RenderInput } from './types';

const axes = [
  { key: 'available', label: 'Available' },
  { key: 'price_usd', label: 'Price (USD)' },
  { key: 'side', label: 'Side' },
  { key: 'facing', label: 'Facing' },
  { key: 'quietCar', label: 'Quiet car' },
  { key: 'wheelchairSpace', label: 'Wheelchair space' },
  { key: 'transferSeat', label: 'Transfer seat' },
  { key: 'movableArmrest', label: 'Movable armrest' },
  { key: 'footSpace_in2', label: 'Foot space (sq in)' },
  { key: 'bulkhead', label: 'Bulkhead' },
  { key: 'exitRow', label: 'Exit row' },
] as const;

export function compareRefs(
  fixture: LoadedRailFixture,
  refs: string[],
  input: RenderInput = {},
): Comparison {
  normalizeRenderOptions(input);
  if (refs.length < 2 || refs.length > 4 || new Set(refs).size !== refs.length) {
    throw new DomainError('INVALID_SELECTION');
  }
  const seats = refs.map((ref) => fixture.seats.find((seat) => seat.ref === ref));
  if (seats.some((seat) => seat === undefined)) throw new DomainError('INVALID_REF');
  return {
    axes: axes.map((axis) => ({ ...axis })),
    rows: seats.map((seat) => ({
      ref: seat!.ref,
      values: {
        available: seat!.available,
        price_usd: seat!.price_usd,
        side: seat!.side,
        facing: seat!.facing,
        quietCar: seat!.quietCar,
        wheelchairSpace: seat!.wheelchairSpace,
        transferSeat: seat!.transferSeat,
        movableArmrest: seat!.movableArmrest,
        footSpace_in2: seat!.footSpace_in2,
        bulkhead: seat!.bulkhead,
        exitRow: seat!.exitRow,
      },
    })),
  };
}
