export type Position = { x: number; y: number };
export type DirectionStyle = 'relative' | 'clock' | 'cardinal';
export type Units = 'meters' | 'feet' | 'steps';

export type RenderOptions = {
  units: Units;
  stepLength_m: number;
  directionStyle: DirectionStyle;
  walkSpeedPercent: number;
};

export type FixtureSeat = {
  ref: string;
  row: number;
  seatLetter: string;
  position_m: Position;
  side: 'window' | 'aisle';
  facing: 'forward' | 'backward';
  price_usd: number;
  available: boolean;
  wheelchairSpace: boolean;
  transferSeat: boolean;
  companionSeat: boolean;
  movableArmrest: boolean;
  footSpace_in2: number;
  bulkhead: boolean;
  exitRow: boolean;
  features: string[];
};

export type Seat = FixtureSeat & { quietCar: boolean };

export type Landmark = {
  key: string;
  label: string;
  position_m: Position;
  landmarkType:
    | 'primary'
    | 'secondary'
    | 'clue'
    | 'information_point'
    | 'environmental_regularity';
  sensoryChannels: Array<
    'tactile' | 'auditory' | 'olfactory' | 'thermal' | 'airflow' | 'visual'
  >;
  detectability: {
    caneUser: 'high' | 'medium' | 'low';
    dogGuide: 'high' | 'medium' | 'low';
  };
  signpostedAs?: string;
};

export type FixtureReferencePoint = {
  ref: string;
  label: string;
  position_m: Position;
  kind: 'entrance' | 'restroom' | 'service' | 'connector';
  stableCheckpoint: boolean;
};

export type FixtureAisleAnchor = {
  ref: string;
  label: string;
  position_m: Position;
  row: number;
  stableCheckpoint: boolean;
};

export type FixtureEdge = {
  id: string;
  from: string;
  to: string;
  bidirectional: boolean;
  traversable: true;
  pathway_mode: 'walkway' | 'stairs' | 'elevator' | 'door' | 'vestibule';
  length_m: number;
  stair_count?: number;
  min_width_m?: number;
  max_slope?: number;
  signpostedAs?: string;
  bearing: { frame: 'car_axis'; degrees: number };
};

export type RailFixture = {
  schemaVersion: 'bearing.rail-fixture.v1';
  domain: 'rail';
  layoutId: string;
  authoringSource: 'independently_authored_synthetic';
  bounds_m: { length: number; width: number };
  car: { quietCar: boolean };
  seats: FixtureSeat[];
  landmarks: Landmark[];
  referencePoints: FixtureReferencePoint[];
  aisleAnchors: FixtureAisleAnchor[];
  pathEdges: FixtureEdge[];
};

export type LoadedRailFixture = Omit<RailFixture, 'seats'> & {
  seats: Seat[];
  routableRefs: ReadonlySet<string>;
};
