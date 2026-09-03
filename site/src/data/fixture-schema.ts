import { z } from 'zod';

const refString = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
const publicText = z.string().min(1).max(300);
const finiteNonnegative = z.number().nonnegative();
const finitePositive = z.number().positive();
const position = z.strictObject({ x: finiteNonnegative, y: finiteNonnegative });

const fixtureSeat = z.strictObject({
  ref: refString,
  row: z.number().int().min(1),
  seatLetter: z.string().regex(/^[A-Z]$/),
  position_m: position,
  side: z.enum(['window', 'aisle']),
  facing: z.enum(['forward', 'backward']),
  price_usd: finiteNonnegative,
  available: z.boolean(),
  wheelchairSpace: z.boolean(),
  transferSeat: z.boolean(),
  companionSeat: z.boolean(),
  movableArmrest: z.boolean(),
  footSpace_in2: finiteNonnegative,
  bulkhead: z.boolean(),
  exitRow: z.boolean(),
  features: z.array(refString).refine((items) => new Set(items).size === items.length),
});

const landmark = z.strictObject({
  key: refString,
  label: publicText,
  position_m: position,
  landmarkType: z.enum([
    'primary',
    'secondary',
    'clue',
    'information_point',
    'environmental_regularity',
  ]),
  sensoryChannels: z
    .array(z.enum(['tactile', 'auditory', 'olfactory', 'thermal', 'airflow', 'visual']))
    .min(1)
    .refine((items) => new Set(items).size === items.length),
  detectability: z.strictObject({
    caneUser: z.enum(['high', 'medium', 'low']),
    dogGuide: z.enum(['high', 'medium', 'low']),
  }),
  signpostedAs: publicText.optional(),
});

const referencePoint = z.strictObject({
  ref: refString,
  label: publicText,
  position_m: position,
  kind: z.enum(['entrance', 'restroom', 'service', 'connector']),
  stableCheckpoint: z.boolean(),
});

const aisleAnchor = z.strictObject({
  ref: refString,
  label: publicText,
  position_m: position,
  row: z.number().int().min(1),
  stableCheckpoint: z.boolean(),
});

const fixtureEdge = z.strictObject({
  id: refString,
  from: refString,
  to: refString,
  bidirectional: z.boolean(),
  traversable: z.literal(true),
  pathway_mode: z.enum(['walkway', 'stairs', 'elevator', 'door', 'vestibule']),
  length_m: finitePositive,
  stair_count: z.number().int().optional(),
  min_width_m: finitePositive.optional(),
  max_slope: z.number().optional(),
  signpostedAs: publicText.optional(),
  bearing: z.strictObject({
    frame: z.literal('car_axis'),
    degrees: z.number().min(0).lt(360),
  }),
});

export const railFixtureSchema = z.strictObject({
  schemaVersion: z.literal('bearing.rail-fixture.v1'),
  domain: z.literal('rail'),
  layoutId: publicText,
  authoringSource: z.literal('independently_authored_synthetic'),
  bounds_m: z.strictObject({ length: finitePositive, width: finitePositive }),
  car: z.strictObject({ quietCar: z.boolean() }),
  seats: z.array(fixtureSeat).length(60),
  landmarks: z.array(landmark).min(1),
  referencePoints: z.array(referencePoint).min(2),
  aisleAnchors: z.array(aisleAnchor).min(1),
  pathEdges: z.array(fixtureEdge).min(1),
});
