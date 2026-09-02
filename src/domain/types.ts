/**
 * Ieum domain types.
 *
 * Field names follow GTFS-Pathways (`pathways.txt`) wherever an equivalent exists,
 * so a Route reads as a continuation of an already-adopted standard rather than a
 * new one. GTFS-Pathways models a transit station and stops at the boarding area;
 * we continue the same vocabulary into the vehicle interior.
 *
 * Distances are stored in METERS. Never store step counts — stride length varies
 * within a single walk, so a stored step count is wrong exactly where accuracy
 * matters most. Steps are a rendering-time conversion (see RenderOptions).
 */

export type SpatialRef = string;

/** Metres from the car origin: x runs along the car, y across it. */
export type Point = { x_m: number; y_m: number };

// ---------------------------------------------------------------- landmarks

/**
 * O&M literature distinguishes these; they are not stylistic labels.
 * A clue is temporary, a landmark is permanent. A primary landmark lies ON the
 * path and cannot be missed; a secondary one is beside it and is often walked past.
 */
export type LandmarkType =
  | "primary"
  | "secondary"
  | "clue"
  | "information_point"
  | "environmental_regularity";

export type SensoryChannel =
  | "tactile" | "auditory" | "olfactory" | "thermal" | "airflow" | "visual";

/** The same object is not equally findable with a cane and with a dog guide. */
export type Detectability = "high" | "medium" | "low";

export type Landmark = {
  key: SpatialRef;
  label: string;
  position: Point;
  landmarkType: LandmarkType;
  sensoryChannels: SensoryChannel[];
  detectability: { caneUser: Detectability; dogGuide: Detectability };
  /** GTFS-Pathways `signposted_as`: the text as it appears on physical signage. */
  signpostedAs?: string;
};

// -------------------------------------------------------------------- seats

export type Seat = {
  ref: SpatialRef;
  row: number;
  seatLetter: string;
  position: Point;
  side: "window" | "aisle";
  facing: "forward" | "backward";
  price_usd: number;
  available: boolean;

  /** 49 CFR 38.125(d)(2): clear floor space 48in x 30in, no seat installed. */
  wheelchairSpace: boolean;
  /** 49 CFR 38.125(d)(1): seat reachable for transfer, with space to stow a chair. */
  transferSeat: boolean;
  companionSeat: boolean;
  /** Disclosed by row and seat number under 14 CFR 382.41 for air; same idea here. */
  movableArmrest: boolean;

  /** Decision data for a dog guide handler, who needs floor area, not a boolean. */
  footSpace_in2: number;
  bulkhead: boolean;
  /** Air rule; kept so the contract carries across domains. Always false for rail. */
  exitRow: boolean;

  features: string[];
};

// ------------------------------------------------------------------- routes

/** GTFS-Pathways `pathway_mode`, narrowed to the modes a vehicle interior has. */
export type PathwayMode = "walkway" | "stairs" | "elevator" | "door" | "vestibule";

export type Direction = "forward" | "backward" | "left" | "right";

export type RouteSegment = {
  pathway_mode: PathwayMode;
  from: SpatialRef;
  to: SpatialRef;
  /** GTFS-Pathways `length`. */
  length_m: number;
  /** GTFS-Pathways `traversal_time`, scaled by RenderOptions.walkSpeedPercent. */
  traversal_time_s: number;
  /** GTFS-Pathways `min_width`. 49 CFR 38.125(d)(1) requires 32in on the accessible route. */
  min_width_m?: number;
  direction: Direction;
  /**
   * Countable discrete features passed, e.g. { feature: "row", count: 6 }.
   * DOJ's own model wayfinding sentence counts doors, not steps:
   * "the emergency exit stairway will be the fifth door on your right."
   */
  countedFeatures?: { feature: string; count: number };
  landmarksPassed: SpatialRef[];
};

export type Route = {
  from: SpatialRef;
  to: SpatialRef;
  totalLength_m: number;
  totalTraversalTime_s: number;
  /** The truth. `rendered` is derived from this; UI and agent both read it. */
  segments: RouteSegment[];
  turns: { atSegment: number; direction: "left" | "right" }[];
  landmarks: Landmark[];
  rendered: RenderedRoute;
};

export type RenderedRoute = {
  units: DistanceUnit;
  directionStyle: DirectionStyle;
  instructions: string[];
  summary: string;
  /** Present only when units === "steps", so the agent can pass the caveat on. */
  unitsNote?: string;
};

// -------------------------------------------------------- render negotiation

export type DistanceUnit = "meters" | "feet" | "steps";
export type DirectionStyle = "relative" | "clock" | "cardinal";

export type RenderOptions = {
  units?: DistanceUnit;
  /** Only used when units === "steps". Default 0.75 m; the conversion is soft. */
  stepLength_m?: number;
  directionStyle?: DirectionStyle;
  /** OSDM convention: 100 = average. Scales traversal_time_s, never length_m. */
  walkSpeedPercent?: number;
};

// -------------------------------------------------------------------- query

export type QueryCriteria = {
  near?: SpatialRef;
  /** Requires `near`; alone it has no origin to measure from. */
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
    facing?: "forward" | "backward";
    side?: "window" | "aisle";
    quietCar?: boolean;
  };
  hotel?: {
    floorMin?: number;
    floorMax?: number;
    bedToBathroomMax_m?: number;
  };
};

export type Candidate = { ref: SpatialRef; line: string };

export type Description = {
  ref: SpatialRef;
  line: string;
  attributes: Record<string, unknown>;
  relations: {
    to: SpatialRef;
    distance_m: number;
    rendered: string;
    landmarksPassed: SpatialRef[];
  }[];
  /** Named next questions. The point is to be interrogable, not to be summarised. */
  followUps: string[];
};

export type Comparison = {
  axes: string[];
  rows: { ref: SpatialRef; values: string[] }[];
};

export type LayoutSummary = {
  domain: "rail" | "hotel";
  layoutId: string;
  bounds_m: { length: number; width: number };
  seatCount: { total: number; available: number };
  accessibleCount: {
    wheelchairSpaces: number;
    transferSeats: number;
    movableArmrestSeats: number;
  };
  landmarks: Landmark[];
  referencePoints: SpatialRef[];
  summary: string;
};

// ------------------------------------------------------------------- layout

export type Layout = {
  domain: "rail" | "hotel";
  layoutId: string;
  bounds_m: { length: number; width: number };
  /** y coordinate of the aisle centreline. Seats project onto this to travel. */
  aisleY_m: number;
  rowPitch_m: number;
  seats: Seat[];
  landmarks: Landmark[];
};

// -------------------------------------------------------------------- errors

export type ToolErrorCode =
  | "INVALID_REF"
  | "NO_ROUTE"
  | "NO_MATCH"
  | "NOT_AVAILABLE"
  | "INVALID_SELECTION"
  | "INVALID_CRITERIA"
  | "UNSUPPORTED_CRITERIA"
  | "NOTHING_TO_UNDO"
  | "CONFIRMATION_REQUIRED";

export type DomainError = { code: ToolErrorCode; message: string };
