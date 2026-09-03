import type {
  AxisLabels, DirectionStyle, DistanceUnit, DomainError, Landmark,
  RenderOptions, RenderedRoute, RouteSegment,
} from "./types.ts";

export const DEFAULTS = {
  units: "feet" as DistanceUnit,
  stepLength_m: 0.75,
  directionStyle: "relative" as DirectionStyle,
  walkSpeedPercent: 100,
  /** Average adult walking pace. Scales traversal_time_s, never length_m. */
  baseWalkSpeed_mps: 1.2,
};

/** Verbatim from Architecture section 6. A contract test compares this string. */
export const STEPS_NOTE =
  "Step counts are converted from measured distance using an assumed " +
  `${DEFAULTS.stepLength_m} m stride and are approximate. ` +
  "Landmark counts (e.g. 'third row') are exact.";

const M_TO_FT = 3.28084;

/**
 * One leg of a route: the published segment plus the two headings rendering needs
 * and the segment itself cannot carry. `headingBefore` is the car-axis direction
 * the traveller faces on arriving at this leg, `null` when nobody measured it —
 * standing at a landmark, for instance. `carAxis` is this leg's own direction.
 */
export type Leg = {
  segment: RouteSegment;
  headingBefore: number | null;
  carAxis: number;
  /** Set when the traveller must turn to face `carAxis` before walking it. */
  turns: boolean;
  /** Set when this lateral move ends with the traveller standing in the aisle. */
  entersAisle: boolean;
};

/** What the traveller is walking toward, so the closing sentence can add information. */
export type Destination =
  | { kind: "seat"; ref: string; label: string; wheelchairSpace: boolean; side: "window" | "aisle" }
  | { kind: "landmark"; ref: string; landmark: Landmark };

// ------------------------------------------------------------------ distance

/**
 * The number the traveller hears. Totals are summed over THESE, never converted
 * from a metre total: sum(round(x)) and round(sum(x)) differ, and a person
 * counting segments aloud lands on the first one.
 */
export function distanceValue(
  length_m: number, units: DistanceUnit, stepLength_m: number,
): number {
  if (units === "meters") return round(length_m, 1);
  const raw = units === "feet" ? length_m * M_TO_FT : length_m / stepLength_m;
  // A real move never renders as "0 ft": a distance you must walk that is
  // announced as nothing is worse than one announced as slightly too much.
  return length_m > 0 ? Math.max(1, Math.round(raw)) : 0;
}

export function formatValue(value: number, units: DistanceUnit): string {
  if (units === "meters") return `${value} m`;
  if (units === "feet") return `${value} ft`;
  return `about ${value} step${value === 1 ? "" : "s"}`;
}

export const formatDistance = (
  length_m: number, units: DistanceUnit, stepLength_m: number,
): string => formatValue(distanceValue(length_m, units, stepLength_m), units);

// ----------------------------------------------------------------- direction

const norm = (deg: number): number => ((deg % 360) + 360) % 360;

const RELATIVE_POINTS = [
  "straight ahead", "ahead and to your right", "to your right",
  "behind you and to your right", "behind you", "behind you and to your left",
  "to your left", "ahead and to your left",
];

/** Clock positions carry half hours, so a 315-degree bearing is 10:30, not 11. */
function clockPhrase(egocentric: number): string {
  const hours = Math.round(norm(egocentric) / 15) / 2;
  const whole = Math.floor(hours) === 0 ? 12 : Math.floor(hours);
  return hours % 1 === 0
    ? `at your ${whole === 0 ? 12 : whole} o'clock`
    : `at your ${whole}:30`;
}

function cardinalPhrase(carAxis: number, labels: AxisLabels): string {
  const q = Math.round(norm(carAxis) / 90) % 4;
  return `toward ${[labels.front, labels.negY, labels.rear, labels.posY][q]}`;
}

/**
 * Direction phrasing is negotiated at render time, never baked into the data.
 * Blind travellers' stated preferences split across these styles, and shipping
 * apps (BlindSquare, Lazarillo) expose the same choice as a user setting.
 *
 * Relative and clock are egocentric and need a known heading; with none, both
 * fall back to the car's own axis rather than inventing which way a body faces.
 * Compass directions are meaningless inside a moving vehicle, so "cardinal"
 * resolves to the car axis by design.
 */
export function directionPhrase(leg: Leg, style: DirectionStyle, labels: AxisLabels): string {
  if (style === "cardinal" || leg.headingBefore === null) {
    return cardinalPhrase(leg.carAxis, labels);
  }
  const egocentric = norm(leg.carAxis - leg.headingBefore);
  if (style === "clock") return clockPhrase(egocentric);
  return RELATIVE_POINTS[Math.round(norm(egocentric) / 45) % 8]!;
}

/** The rotation that was missing between "step to your right" and "walk rearward". */
function turnSentence(leg: Leg, labels: AxisLabels): string | null {
  if (!leg.turns || leg.headingBefore === null) {
    return leg.turns ? `Face ${cardinalPhrase(leg.carAxis, labels).replace(/^toward /, "")}.` : null;
  }
  const turn = norm(leg.carAxis - leg.headingBefore);
  const facing = cardinalPhrase(leg.carAxis, labels);
  if (turn === 0) return null;
  if (turn === 180) return `Turn around, ${facing}.`;
  return `Turn ${turn < 180 ? "right" : "left"}, ${facing}.`;
}

// ----------------------------------------------------------------- sentences

type Fixed = Required<Pick<RenderOptions, "units" | "stepLength_m" | "directionStyle">>;

const landmarkPhrase = (m: Landmark): string =>
  m.signpostedAs ? `${m.label.toLowerCase()} (signed ${m.signpostedAs})` : m.label.toLowerCase();

function passing(leg: Leg, byKey: Map<string, Landmark>): string {
  const counted = leg.segment.countedFeatures;
  const rows = counted
    ? `, passing ${counted.count} ${counted.feature}${counted.count === 1 ? "" : "s"}`
    : "";
  const marks = leg.segment.landmarksPassed
    .map((k) => byKey.get(k))
    .filter((m): m is Landmark => m !== undefined);
  if (marks.length === 0) return rows;
  return `${rows}. You pass ${marks.map(landmarkPhrase).join(", then ")}`;
}

function legSentences(leg: Leg, o: Fixed, labels: AxisLabels, byKey: Map<string, Landmark>): string[] {
  const s = leg.segment;
  const dist = formatDistance(s.length_m, o.units, o.stepLength_m);
  const dir = directionPhrase(leg, o.directionStyle, labels);
  const out: string[] = [];

  const turn = turnSentence(leg, labels);
  if (turn) out.push(turn);

  if (s.pathway_mode === "door") {
    out.push(`Go through ${s.signpostedAs ? `the door signed ${s.signpostedAs}` : "the door"}, ${dist}.`);
  } else if (s.pathway_mode === "vestibule") {
    out.push(`Cross the vestibule, ${dist}.`);
  } else if (leg.turns) {
    // Once a turn has been given, the traveller is facing the way they are about
    // to walk. Repeating the direction here would either restate the turn or,
    // worse, describe the walk from the heading they no longer have — which is
    // how "Turn around ... walk behind you" came out.
    out.push(turn
      ? `Walk ${dist}${passing(leg, byKey)}.`
      : `Walk ${dist} ${dir}${passing(leg, byKey)}.`);
  } else {
    // No turn means a sidestep: the traveller moves without changing which way
    // they face, which is how anyone actually leaves a seat.
    out.push(`Step ${dist} ${dir}${leg.entersAisle ? " into the aisle" : ""}${passing(leg, byKey)}.`);
  }
  return out;
}

const detectabilityClause = (m: Landmark): string | null => {
  if (m.detectability.caneUser === "high") return "A cane finds it directly";
  if (m.detectability.dogGuide === "high") return "A dog guide can target it";
  if (m.sensoryChannels.includes("olfactory")) return "You can smell it before you reach it";
  if (m.sensoryChannels.includes("auditory")) return "You can hear it before you reach it";
  return null;
};

/** The closing sentence names the destination and says what the walk did not. */
function arrivalSentence(legs: Leg[], dest: Destination, o: Fixed, labels: AxisLabels): string {
  const last = legs.at(-1);
  const where = last ? ` ${directionPhrase(last, o.directionStyle, labels)}` : "";

  if (dest.kind === "seat") {
    const what = dest.wheelchairSpace
      ? `Wheelchair space ${dest.ref}`
      : `Seat ${dest.ref}, ${dest.side === "window" ? "a window seat" : "an aisle seat"},`;
    return `${what} is${where}.`;
  }

  const m = dest.landmark;
  const sign = m.signpostedAs ? ` It is signed ${m.signpostedAs}.` : "";
  const clue = detectabilityClause(m);
  return `${m.label} is${where}.${sign}${clue ? ` ${clue}.` : ""}`;
}

// -------------------------------------------------------------------- render

export function renderRoute(
  legs: Leg[], dest: Destination, labels: AxisLabels, landmarks: Landmark[],
  opts: RenderOptions = {},
): RenderedRoute {
  const o: Fixed = {
    units: opts.units ?? DEFAULTS.units,
    stepLength_m: opts.stepLength_m ?? DEFAULTS.stepLength_m,
    directionStyle: opts.directionStyle ?? DEFAULTS.directionStyle,
  };
  const byKey = new Map(landmarks.map((m) => [m.key, m]));

  const instructions = legs.flatMap((leg) => legSentences(leg, o, labels, byKey));

  // Architecture section 7-7: the total a listener reaches by adding up what they
  // were told must be the total they are told.
  const total = legs.reduce(
    (n, leg) => n + distanceValue(leg.segment.length_m, o.units, o.stepLength_m), 0);

  const summary = [
    ...instructions,
    `Total ${formatValue(round(total, 1), o.units)}.`,
    arrivalSentence(legs, dest, o, labels),
  ].join(" ");

  return {
    units: o.units,
    directionStyle: o.directionStyle,
    instructions,
    summary,
    ...(o.units === "steps" ? { unitsNote: STEPS_NOTE } : {}),
  };
}

// --------------------------------------------------------------------- utils

export const round = (n: number, places = 2): number =>
  Math.round(n * 10 ** places) / 10 ** places;

export const traversalTime = (length_m: number, walkSpeedPercent: number): number =>
  round(length_m / (DEFAULTS.baseWalkSpeed_mps * (walkSpeedPercent / 100)), 1);

/**
 * Architecture section 6: both are finite and in (0, +inf). Left unchecked they
 * reach the traveller as "about Infinity steps" and a negative walking time.
 */
export function validateRenderOptions(o: RenderOptions): DomainError | null {
  const positive = (n: number | undefined): boolean =>
    n === undefined || (Number.isFinite(n) && n > 0);

  if (!positive(o.stepLength_m)) {
    return {
      code: "INVALID_CRITERIA",
      message: "Step length must be a positive number of metres.",
    };
  }
  if (!positive(o.walkSpeedPercent)) {
    return {
      code: "INVALID_CRITERIA",
      message: "Walking speed must be a positive percentage of an average pace.",
    };
  }
  return null;
}
