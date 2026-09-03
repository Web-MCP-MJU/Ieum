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

export type RenderInput = Partial<RenderOptions>;

export type QueryCriteria = {
  near?: string;
  maxDistance_m?: number;
  priceMax_usd?: number;
  availableOnly?: boolean;
  needs?: {
    wheelchairSpace?: boolean;
    transferSeat?: boolean;
    movableArmrest?: boolean;
    minFootSpace_in2?: number;
    excludeExitRow?: boolean;
  };
  rail?: {
    facing?: Seat['facing'];
    side?: Seat['side'];
    quietCar?: boolean;
  };
  hotel?: {
    floorMin?: number;
    floorMax?: number;
    bedToBathroomMax_m?: number;
  };
};

export type QueryInput = QueryCriteria & RenderInput;

export type CandidateBase = {
  ref: string;
  label: string;
  line: string;
  price_usd: number;
  available: boolean;
  features: string[];
  distance?: { from: string; distance_m: number; rendered: string };
};

export type RailCandidate = CandidateBase & {
  domain: 'rail';
  rail: {
    row: number;
    seatLetter: string;
    side: Seat['side'];
    facing: Seat['facing'];
    quietCar: boolean;
  };
  accessibility: {
    wheelchairSpace: boolean;
    transferSeat: boolean;
    companionSeat: boolean;
    movableArmrest: boolean;
    footSpace_in2: number;
    bulkhead: boolean;
    exitRow: boolean;
  };
};

export type HotelCandidate = CandidateBase & {
  domain: 'hotel';
  hotel: { floor: number; bedToBathroom_m?: number };
  accessibility: Record<string, string | number | boolean | null>;
};

export type Candidate = RailCandidate | HotelCandidate;

export type QueryData<TCandidate extends Candidate = Candidate> = {
  items: TCandidate[];
  appliedCriteria: QueryCriteria & { availableOnly: boolean };
  totalMatched: number;
  unitsNote?: string;
};

export type QueryComputation<TCandidate extends Candidate = Candidate> = {
  data: QueryData<TCandidate>;
  hint?: string;
};

export type Description = {
  ref: string;
  line: string;
  attributes: Record<string, unknown>;
  relations: Array<{
    to: string;
    distance_m: number;
    rendered: string;
    landmarksPassed: string[];
  }>;
  followUps: string[];
  unitsNote?: string;
};

export type Comparison = {
  axes: Array<{ key: string; label: string }>;
  rows: Array<{
    ref: string;
    values: Record<string, string | number | boolean | null>;
  }>;
  unitsNote?: string;
};
