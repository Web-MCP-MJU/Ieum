const renderProperties = {
  units: { type: 'string', enum: ['meters', 'feet', 'steps'] },
  stepLength_m: { type: 'number', exclusiveMinimum: 0 },
  directionStyle: { type: 'string', enum: ['relative', 'clock', 'cardinal'] },
  walkSpeedPercent: { type: 'number', exclusiveMinimum: 0 },
} as const;

const ref = { type: 'string', minLength: 1, maxLength: 128 } as const;
const object = (properties: Record<string, unknown>, required?: string[]) => ({
  type: 'object',
  additionalProperties: false,
  properties,
  ...(required ? { required } : {}),
});

export const inputSchemas = {
  'a11y.get_layout': object({ ...renderProperties }),
  'a11y.query': object({
    near: ref,
    maxDistance_m: { type: 'number', minimum: 0 },
    priceMax_usd: { type: 'number', minimum: 0 },
    availableOnly: { type: 'boolean' },
    needs: object({
      wheelchairSpace: { type: 'boolean' }, transferSeat: { type: 'boolean' },
      movableArmrest: { type: 'boolean' }, minFootSpace_in2: { type: 'number', minimum: 0 },
      excludeExitRow: { type: 'boolean' },
    }),
    rail: object({
      facing: { type: 'string', enum: ['forward', 'backward'] },
      side: { type: 'string', enum: ['window', 'aisle'] }, quietCar: { type: 'boolean' },
    }),
    hotel: object({
      floorMin: { type: 'number', minimum: 0 }, floorMax: { type: 'number', minimum: 0 },
      bedToBathroomMax_m: { type: 'number', minimum: 0 },
    }),
    ...renderProperties,
  }),
  'a11y.describe': object({ ref, ...renderProperties }, ['ref']),
  'a11y.get_route': object({ from: ref, to: ref, ...renderProperties }, ['from', 'to']),
  'a11y.compare': object({
    refs: { type: 'array', minItems: 2, maxItems: 4, uniqueItems: true, items: ref },
    ...renderProperties,
  }, ['refs']),
  'a11y.select': object({ ref }, ['ref']),
  'a11y.get_selection': object({}),
  'a11y.undo': object({}),
  'a11y.confirm': object({}),
} as const;

export type ToolName = keyof typeof inputSchemas;
