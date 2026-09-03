/**
 * Ieum domain types.
 *
 * This file is the TypeScript face of `docs/contracts/ieum-output.schema.json`.
 * That schema is `additionalProperties: false`, so a field that exists here and
 * not there is a contract violation, not a convenience.
 *
 * Field names follow GTFS-Pathways (`pathways.txt`) wherever an equivalent exists,
 * so a Route reads as a continuation of an already-adopted standard rather than a
 * new one. GTFS-Pathways models a transit station and stops at the boarding area;
 * we continue the same vocabulary into the vehicle interior.
 *
 * Distances are stored in METERS and headings in DEGREES. Never store step counts
 * or the words "left" and "right" — stride length varies within a single walk, and
 * left depends on which way the traveller is facing. Both are rendering-time
 * derivations (see RenderOptions).
 */

export type SpatialRef = string;

/** Metres from the car origin: x runs from the front of the car toward the rear, y across it. */
export type Position = { x: number; y: number };

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
  position_m: Position;
  landmarkType: LandmarkType;
  sensoryChannels: SensoryChannel[];
  detectability: { caneUser: Detectability; dogGuide: Detectability };
  /** GTFS-Pathways `signposted_as`: the text as it appears on physical signage. */
  signpostedAs?: string;
};

/**
 * A door or vestibule that must be crossed to reach a landmark beyond the aisle.
 * Authored, not inferred: whether a threshold exists is a fact about the vehicle.
 */
export type Portal = {
  ref: SpatialRef;
  mode: Extract<PathwayMode, "door" | "vestibule">;
  label: string;
  /** Where the crossing begins. Its length is the gap to whatever comes next, so
   *  there is no second number that can disagree with the geometry. */
  position_m: Position;
  signpostedAs?: string;
};

// -------------------------------------------------------------------- seats

export type Seat = {
  ref: SpatialRef;
  row: number;
  seatLetter: string;
  position_m: Position;
  side: "window" | "aisle";
  facing: "forward" | "backward";
  price_usd: number;
  available: boolean;

  /**
   * 49 CFR 38.125(d)(2): clear floor space 48in x 30in, no seat installed.
   * No seat installed is why rendering never calls one of these "Seat 6-1D".
   */
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

// ------------------------------------------------------------------- layout

/**
 * Words for the four directions along the car's own axes. Authored per layout
 * because "the A-B side" is a fact about this car, not about rendering.
 */
export type AxisLabels = {
  front: string;
  rear: string;
  /** Toward decreasing y. */
  negY: string;
  /** Toward increasing y. */
  posY: string;
};

export type Layout = {
  domain: "rail" | "hotel";
  layoutId: string;
  bounds_m: { length: number; width: number };
  /** y coordinate of the aisle centreline. Seats project onto this to travel. */
  aisleY_m: number;
  /**
   * Measured clear width of the aisle, authored. Absent means unmeasured, and an
   * unmeasured aisle publishes no `min_width_m` rather than the legal minimum:
   * a regulatory floor is not a measurement of this vehicle.
   */
  aisleWidth_m?: number;
  rowPitch_m: number;
  axisLabels: AxisLabels;
  seats: Seat[];
  landmarks: Landmark[];
  portals: Portal[];
  /**
   * Landmarks reached only by crossing portals, in crossing order.
   * Keyed by landmark key; absent means the landmark is on this car's aisle.
   */
  reachedThrough: Record<SpatialRef, SpatialRef[]>;
  /**
   * Seat-letter pairs within one row that a traveller can move between without
   * entering the aisle. Architecture 7-4: a same-row same-side direct path may be
   * used only when the fixture marks it physically traversable, so an unlisted
   * pair routes through the aisle even when the two seats sit side by side.
   */
  directPathLetters: [string, string][];
};

// ------------------------------------------------------------------- routes

/** GTFS-Pathways `pathway_mode`, narrowed to the modes a vehicle interior has. */
export type PathwayMode = "walkway" | "stairs" | "elevator" | "door" | "vestibule";

/**
 * `car_axis` measures from the authored front of the car; `egocentric` measures
 * from the traveller's incoming heading. Both increase clockwise seen from above,
 * so 90 is to the right of 0 in either frame. Always finite and in [0, 360).
 *
 * A landmark does not record which way someone standing at it faces, so a leg
 * that starts at one is published in `car_axis`. Inventing an egocentric heading
 * there would state a fact about the traveller's body that nobody measured.
 */
export type BearingFrame = "egocentric" | "car_axis";

export type Bearing = { frame: BearingFrame; degrees: number };

export type RouteSegment = {
  pathway_mode: PathwayMode;
  from: SpatialRef;
  to: SpatialRef;
  /** GTFS-Pathways `length`. */
  length_m: number;
  /** GTFS-Pathways `traversal_time`, scaled by RenderOptions.walkSpeedPercent. */
  traversal_time_s: number;
  stair_count?: number;
  /** GTFS-Pathways `min_width`. Published only where the layout authored a measurement. */
  min_width_m?: number;
  max_slope?: number;
  signpostedAs?: string;
  bearing: Bearing;
  /**
   * Countable discrete features passed, e.g. { feature: "row", count: 6 }.
   * DOJ's own model wayfinding sentence counts doors, not steps:
   * "the emergency exit stairway will be the fifth door on your right."
   */
  countedFeatures?: { feature: string; count: number };
  landmarksPassed: SpatialRef[];
};

/** Architecture 7-7: a leg longer than this ends at a checkpoint and continues. */
export const MAX_SEGMENTS = 4;

export type Route = {
  from: SpatialRef;
  /** The destination that was asked for, which survives a checkpoint split. */
  requestedTo: SpatialRef;
  /** Where this leg actually ends: the request, or the checkpoint. */
  to: SpatialRef;
  totalLength_m: number;
  totalTraversalTime_s: number;
  /** The truth. `rendered` is derived from this; UI and agent both read it. */
  segments: RouteSegment[];
  landmarks: Landmark[];
  requiresContinuation: boolean;
  checkpoint?: { ref: SpatialRef; label: string };
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
  /** Only used when units === "steps". Default 0.75 m; finite and in (0, +inf). */
  stepLength_m?: number;
  directionStyle?: DirectionStyle;
  /** OSDM convention: 100 = average. Scales traversal_time_s, never length_m. */
  walkSpeedPercent?: number;
};

// -------------------------------------------------------------------- query

export type QueryNeeds = {
  wheelchairSpace?: boolean;
  transferSeat?: boolean;
  movableArmrest?: boolean;
  minFootSpace_in2?: number;
  excludeExitRow?: boolean;
};

export type QueryRail = {
  facing?: "forward" | "backward";
  side?: "window" | "aisle";
  quietCar?: boolean;
};

export type QueryHotel = {
  floorMin?: number;
  floorMax?: number;
  bedToBathroomMax_m?: number;
};

export type QueryCriteria = {
  near?: SpatialRef;
  /** Requires `near`; alone it has no origin to measure from. */
  maxDistance_m?: number;
  priceMax_usd?: number;
  availableOnly?: boolean;
  needs?: QueryNeeds;
  rail?: QueryRail;
  hotel?: QueryHotel;
};

/** What was actually applied, defaults filled in. `availableOnly` is never implicit. */
export type AppliedCriteria = QueryCriteria & { availableOnly: boolean };

export type Distance = { from: SpatialRef; distance_m: number; rendered: string };

export type RailFacts = {
  row: number;
  seatLetter: string;
  side: "window" | "aisle";
  facing: "forward" | "backward";
  /**
   * Also derivable from `features`, but the contract makes it a first-class rail
   * fact because `QueryCriteria.rail.quietCar` filters on it: an agent that can
   * filter by something must be able to read it back without parsing a string list.
   */
  quietCar: boolean;
};

export type RailAccessibility = {
  wheelchairSpace: boolean;
  transferSeat: boolean;
  companionSeat: boolean;
  movableArmrest: boolean;
  footSpace_in2: number;
  bulkhead: boolean;
  exitRow: boolean;
};

export type CandidateBase = {
  ref: SpatialRef;
  label: string;
  /** A derived convenience. The structured fields beside it are the contract. */
  line: string;
  price_usd: number;
  available: boolean;
  features: string[];
  distance?: Distance;
};

export type RailCandidate = CandidateBase & {
  domain: "rail";
  rail: RailFacts;
  accessibility: RailAccessibility;
};

export type HotelCandidate = CandidateBase & {
  domain: "hotel";
  hotel: { floor: number; bedToBathroom_m?: number };
  accessibility: Record<string, string | number | boolean | null>;
};

export type Candidate = RailCandidate | HotelCandidate;

export type QueryData = {
  items: Candidate[];
  appliedCriteria: AppliedCriteria;
  /** The full pre-slice count. There is no pagination, cursor, or offset. */
  totalMatched: number;
  unitsNote?: string;
};

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
  unitsNote?: string;
};

export type ComparisonAxis = { key: string; label: string };

export type Comparison = {
  axes: ComparisonAxis[];
  /** Every row has exactly the keys named by `axes`, in input-ref order. */
  rows: { ref: SpatialRef; values: Record<string, string | number | boolean | null> }[];
  unitsNote?: string;
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
  unitsNote?: string;
};

// --------------------------------------------------------------- tool result

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

export type ConfirmationStatus = "draft" | "confirmation_pending" | "confirmed";

/**
 * `selectedCount` and `priceTotal_usd` are selectors over `selected`, never
 * independently writable. `undoable` means an undo can succeed right now.
 */
export type SelectionState = {
  selected: SpatialRef[];
  selectedCount: number;
  priceTotal_usd: number;
  undoable: boolean;
  status: ConfirmationStatus;
};

export type ReadSuccess<T> = { ok: true; data: T };
export type QuerySuccess<T> = { ok: true; data: T; hint?: string };
export type StateSuccess<T> = { ok: true; data: T; state: SelectionState };
export type ReadFailure = { ok: false; error: DomainError; hint?: string };
export type StateFailure = { ok: false; state: SelectionState; error: DomainError; hint?: string };

/**
 * Read tools never carry `state`; the three mutating tools always do, on success
 * and on expected failure alike, so an agent never has to re-query to find out
 * what its own failed call left behind.
 */
export type ReadResult<T> = ReadSuccess<T> | ReadFailure;
export type QueryResult<T> = QuerySuccess<T> | ReadFailure;
export type StateResult<T> = StateSuccess<T> | StateFailure;
