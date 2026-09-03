import { describe, expect, it } from 'vitest';

import { railFixture } from '@/src/data/fixture';
import { FixtureValidationError, loadRailFixture } from '@/src/data/validate-fixture';

type Raw = Record<string, unknown>;

function makeValidFixture(): Raw {
  const rows = Array.from({ length: 15 }, (_, index) => index + 7);
  const letters = ['A', 'B', 'C', 'D'] as const;
  const unavailable = new Set([
    '6-7A', '6-8D', '6-9B', '6-10C', '6-11A', '6-12D', '6-13B',
    '6-14C', '6-15A', '6-16D', '6-17B', '6-18C', '6-21D',
  ]);
  const seatX = { A: 0.35, B: 1.05, C: 2.05, D: 2.75 };
  const rowY = (row: number) => 2 + (row - 7) * 1.5;

  const seats = rows.flatMap((row) =>
    letters.map((seatLetter) => {
      const ref = `6-${row}${seatLetter}`;
      return {
        ref,
        row,
        seatLetter,
        position_m: { x: seatX[seatLetter], y: rowY(row) },
        side: seatLetter === 'A' || seatLetter === 'D' ? 'window' : 'aisle',
        facing: row % 4 < 2 ? 'forward' : 'backward',
        price_usd: 64 + (row % 5) * 4,
        available: !unavailable.has(ref),
        wheelchairSpace: ref === '6-7B' || ref === '6-7C',
        transferSeat: ref === '6-8B' || ref === '6-8C',
        companionSeat: ref === '6-7A' || ref === '6-7D',
        movableArmrest: seatLetter === 'B' || seatLetter === 'C',
        footSpace_in2: row === 7 ? 336 : 288,
        bulkhead: row === 7,
        exitRow: row === 14,
        features: row % 2 === 0 ? ['power_outlet', 'reading_light'] : ['reading_light'],
      };
    }),
  );

  const aisleAnchors = rows.map((row) => ({
    ref: `row_${row}_aisle`,
    label: `Row ${row} aisle`,
    position_m: { x: 1.55, y: rowY(row) },
    row,
    stableCheckpoint: [7, 10, 13, 16, 19, 21].includes(row),
  }));

  const pathEdges = [
    {
      id: 'edge_entrance_luggage', from: 'entrance_front', to: 'luggage_rack',
      bidirectional: true, traversable: true, pathway_mode: 'vestibule', length_m: 0.7,
      min_width_m: 0.9, bearing: { frame: 'car_axis', degrees: 180 },
    },
    {
      id: 'edge_luggage_row_7', from: 'luggage_rack', to: 'row_7_aisle',
      bidirectional: true, traversable: true, pathway_mode: 'walkway', length_m: 0.8,
      min_width_m: 0.85, bearing: { frame: 'car_axis', degrees: 180 },
    },
    ...rows.slice(0, -1).map((row) => ({
      id: `edge_row_${row}_${row + 1}`,
      from: `row_${row}_aisle`,
      to: `row_${row + 1}_aisle`,
      bidirectional: true,
      traversable: true,
      pathway_mode: 'walkway',
      length_m: 1.5,
      min_width_m: 0.85,
      bearing: { frame: 'car_axis', degrees: 180 },
    })),
    {
      id: 'edge_row_21_cafe', from: 'row_21_aisle', to: 'cafe_car',
      bidirectional: true, traversable: true, pathway_mode: 'door', length_m: 0.7,
      min_width_m: 0.82, signpostedAs: 'Café car',
      bearing: { frame: 'car_axis', degrees: 180 },
    },
    {
      id: 'edge_cafe_restroom', from: 'cafe_car', to: 'restroom',
      bidirectional: true, traversable: true, pathway_mode: 'vestibule', length_m: 0.8,
      min_width_m: 0.82, bearing: { frame: 'car_axis', degrees: 180 },
    },
    {
      id: 'edge_restroom_rear', from: 'restroom', to: 'entrance_rear',
      bidirectional: true, traversable: true, pathway_mode: 'door', length_m: 1,
      min_width_m: 0.82, bearing: { frame: 'car_axis', degrees: 180 },
    },
    ...seats.map((seat) => ({
      id: `edge_${String(seat.ref).replaceAll('-', '_')}`,
      from: `row_${seat.row}_aisle`,
      to: seat.ref,
      bidirectional: true,
      traversable: true,
      pathway_mode: 'walkway',
      length_m: Math.abs(Number((seat.position_m as { x: number }).x) - 1.55),
      min_width_m: 0.8,
      bearing: {
        frame: 'car_axis',
        degrees: Number((seat.position_m as { x: number }).x) < 1.55 ? 270 : 90,
      },
    })),
    {
      id: 'edge_6_12A_6_12B', from: '6-12A', to: '6-12B',
      bidirectional: true, traversable: true, pathway_mode: 'walkway', length_m: 0.7,
      min_width_m: 0.8, bearing: { frame: 'car_axis', degrees: 90 },
    },
  ];

  return {
    schemaVersion: 'bearing.rail-fixture.v1',
    domain: 'rail',
    layoutId: 'Car 6, Business Class',
    authoringSource: 'independently_authored_synthetic',
    bounds_m: { length: 26.4, width: 3.1 },
    car: { quietCar: true },
    seats,
    landmarks: [
      {
        key: 'luggage_rack', label: 'Front luggage rack', position_m: { x: 1.55, y: 1.2 },
        landmarkType: 'clue', sensoryChannels: ['tactile'],
        detectability: { caneUser: 'high', dogGuide: 'medium' },
      },
      {
        key: 'cafe_car', label: 'Café car door', position_m: { x: 1.55, y: 23.7 },
        landmarkType: 'information_point', sensoryChannels: ['auditory', 'olfactory'],
        detectability: { caneUser: 'medium', dogGuide: 'high' }, signpostedAs: 'Café car',
      },
      {
        key: 'restroom', label: 'Accessible restroom', position_m: { x: 1.55, y: 24.5 },
        landmarkType: 'primary', sensoryChannels: ['tactile', 'auditory'],
        detectability: { caneUser: 'high', dogGuide: 'high' }, signpostedAs: 'Restroom',
      },
    ],
    referencePoints: [
      {
        ref: 'entrance_front', label: 'Front entrance', position_m: { x: 1.55, y: 0.5 },
        kind: 'entrance', stableCheckpoint: true,
      },
      {
        ref: 'entrance_rear', label: 'Rear entrance', position_m: { x: 1.55, y: 25.5 },
        kind: 'entrance', stableCheckpoint: true,
      },
    ],
    aisleAnchors,
    pathEdges,
  };
}

function invalidCode(raw: Raw): string | undefined {
  try {
    loadRailFixture(raw);
    return undefined;
  } catch (error) {
    if (error instanceof FixtureValidationError) return error.code;
    throw error;
  }
}

describe('loadRailFixture', () => {
  it('loads the shipped independently authored fixture', () => {
    expect(railFixture.layoutId).toBe('Car 6, Business Class');
    expect(railFixture.seats).toHaveLength(60);
    expect(railFixture.seats.filter((seat) => seat.available)).toHaveLength(47);
    expect(Object.isFrozen(railFixture)).toBe(true);
    expect(Object.isFrozen(railFixture.seats)).toBe(true);
    expect(Object.isFrozen(railFixture.seats[0])).toBe(true);
  });

  it('accepts the canonical 60-seat fixture and copies the car quiet fact', () => {
    const raw = makeValidFixture();
    raw.seats = [...(raw.seats as Raw[])].reverse();
    const fixture = loadRailFixture(raw);

    expect(fixture.seats).toHaveLength(60);
    expect(fixture.seats.filter((seat) => seat.available)).toHaveLength(47);
    expect(fixture.seats.every((seat) => seat.quietCar)).toBe(true);
    expect(fixture.seats[0].ref).toBe('6-7A');
    expect(fixture.seats.at(-1)?.ref).toBe('6-21D');
    for (const ref of [
      'entrance_front',
      'entrance_rear',
      'luggage_rack',
      'cafe_car',
      'restroom',
    ]) {
      expect(fixture.routableRefs.has(ref)).toBe(true);
    }
    expect(fixture.pathEdges).toContainEqual(
      expect.objectContaining({ from: '6-12A', to: '6-12B', length_m: 0.7 }),
    );
  });

  it('rejects a malformed source shape', () => {
    expect(invalidCode({ ...makeValidFixture(), domain: 'hotel' })).toBe('SCHEMA_INVALID');
  });

  it('rejects duplicate refs across authored collections', () => {
    const raw = makeValidFixture();
    const referencePoints = raw.referencePoints as Raw[];
    referencePoints.push({ ...referencePoints[0], ref: 'restroom' });
    expect(invalidCode(raw)).toBe('DUPLICATE_REF');
  });

  it('rejects coordinates outside the car bounds', () => {
    const raw = makeValidFixture();
    const seats = raw.seats as Raw[];
    seats[0] = { ...seats[0], position_m: { x: 4, y: 2 } };
    expect(invalidCode(raw)).toBe('OUT_OF_BOUNDS');
  });

  it('rejects invalid edge endpoints', () => {
    const raw = makeValidFixture();
    const pathEdges = raw.pathEdges as Raw[];
    pathEdges[0] = { ...pathEdges[0], to: 'missing_ref' };
    expect(invalidCode(raw)).toBe('INVALID_EDGE_ENDPOINT');
  });

  it('rejects a seat count other than 60', () => {
    const raw = makeValidFixture();
    (raw.seats as Raw[]).pop();
    expect(invalidCode(raw)).toBe('SCHEMA_INVALID');
  });

  it('rejects an availability count other than 47', () => {
    const raw = makeValidFixture();
    (raw.seats as Raw[])[1] = { ...(raw.seats as Raw[])[1], available: false };
    expect(invalidCode(raw)).toBe('INVALID_AVAILABILITY_COUNT');
  });

  it('rejects a routable ref disconnected from the front entrance', () => {
    const raw = makeValidFixture();
    raw.pathEdges = (raw.pathEdges as Raw[]).filter((edge) => edge.to !== 'restroom');
    expect(invalidCode(raw)).toBe('UNREACHABLE_REF');
  });

  it('rejects long paths that cannot reach a progressing checkpoint', () => {
    const raw = makeValidFixture();
    raw.aisleAnchors = (raw.aisleAnchors as Raw[]).map((anchor) => ({
      ...anchor,
      stableCheckpoint: false,
    }));
    raw.pathEdges = (raw.pathEdges as Raw[]).map((edge, index) =>
      String(edge.id).startsWith('edge_row_')
        ? { ...edge, pathway_mode: index % 2 === 0 ? 'walkway' : 'door' }
        : edge,
    );
    expect(invalidCode(raw)).toBe('INVALID_CONTINUATION');
  });

  it('accepts exhaustive continuation when stable checkpoints strictly progress', () => {
    const raw = makeValidFixture();
    raw.aisleAnchors = (raw.aisleAnchors as Raw[]).map((anchor) => ({
      ...anchor,
      stableCheckpoint: true,
    }));
    raw.pathEdges = (raw.pathEdges as Raw[]).map((edge, index) =>
      String(edge.id).startsWith('edge_row_')
        ? { ...edge, pathway_mode: index % 2 === 0 ? 'walkway' : 'door' }
        : edge,
    );

    expect(loadRailFixture(raw).seats).toHaveLength(60);
  });

  it('rejects an authored bearing that disagrees with edge geometry', () => {
    const raw = makeValidFixture();
    const pathEdges = raw.pathEdges as Raw[];
    const index = pathEdges.findIndex((edge) => edge.id === 'edge_6_12A');
    pathEdges[index] = {
      ...pathEdges[index],
      bearing: { frame: 'car_axis', degrees: 180 },
    };
    expect(invalidCode(raw)).toBe('INVALID_EDGE_GEOMETRY');
  });
});
