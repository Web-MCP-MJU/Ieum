import type {
  Direction, DirectionStyle, DistanceUnit, RenderOptions,
  RenderedRoute, RouteSegment,
} from "./types.ts";

export const DEFAULTS = {
  units: "feet" as DistanceUnit,
  stepLength_m: 0.75,
  directionStyle: "relative" as DirectionStyle,
  walkSpeedPercent: 100,
  /** Average adult walking pace. Scales traversal_time_s, never length_m. */
  baseWalkSpeed_mps: 1.2,
};

export const STEPS_NOTE =
  "Step counts are converted from measured distance using an assumed " +
  `${DEFAULTS.stepLength_m} m stride and are approximate. ` +
  "Counted features (for example 'the third row') are exact.";

const M_TO_FT = 3.28084;

/** What the traveller is walking toward, so the closing sentence can add information. */
export type Destination = {
  ref: string;
  /** Human label: a landmark's sign text, or a seat ref. */
  label: string;
  /** e.g. "window seat", "aisle seat". Omitted for landmarks. */
  kind?: string;
};

export function formatDistance(
  length_m: number, units: DistanceUnit, stepLength_m: number,
): string {
  if (units === "meters") return `${round(length_m, 1)} m`;
  if (units === "feet") return `${Math.round(length_m * M_TO_FT)} ft`;
  return `about ${Math.round(length_m / stepLength_m)} steps`;
}

const isLateral = (d: Direction): d is "left" | "right" => d === "left" || d === "right";

/**
 * Direction phrasing is negotiated at render time, never baked into the data.
 * Blind travellers' stated preferences split across these styles, and shipping
 * apps (BlindSquare, Lazarillo) expose the same choice as a user setting.
 *
 * Two deliberate limits:
 *  - Clock positions describe where a target lies relative to how you are facing.
 *    They do not describe which way to walk, so a longitudinal move never gets a
 *    clock phrase: walking toward the rear does not put the rear at your 6.
 *  - Compass directions are meaningless inside a moving vehicle, so "cardinal"
 *    resolves to the car's own axis.
 */
export function directionPhrase(d: Direction, style: DirectionStyle): string {
  if (style === "clock" && isLateral(d)) {
    return d === "left" ? "at your 9 o'clock" : "at your 3 o'clock";
  }
  if (style === "cardinal") {
    return { forward: "toward the front of the car", backward: "toward the rear of the car",
             left: "toward the A-B side", right: "toward the C-D side" }[d];
  }
  return { forward: "toward the front", backward: "toward the rear",
           left: "to your left", right: "to your right" }[d];
}

type Fixed = Required<Pick<RenderOptions, "units" | "stepLength_m" | "directionStyle">>;

function segmentSentence(s: RouteSegment, o: Fixed): string {
  const dist = formatDistance(s.length_m, o.units, o.stepLength_m);
  const dir = directionPhrase(s.direction, o.directionStyle);

  if (s.pathway_mode === "door") return `Go through the ${s.to.replace(/_/g, " ")}.`;
  if (s.pathway_mode === "vestibule") return `Cross the vestibule, ${dist}.`;

  const counted = s.countedFeatures
    ? `, passing ${s.countedFeatures.count} ${s.countedFeatures.feature}${s.countedFeatures.count === 1 ? "" : "s"}`
    : "";

  return isLateral(s.direction)
    ? `Step ${dist} ${dir}${counted}.`
    : `Walk ${dist} ${dir} along the aisle${counted}.`;
}

/**
 * The closing sentence names the destination and says something the instructions
 * did not already say. If it would only repeat the last turn, it is dropped.
 */
function arrivalSentence(
  segments: RouteSegment[], dest: Destination, o: Fixed,
): string | null {
  const last = segments.at(-1);
  if (!last) return null;
  const side = isLateral(last.direction)
    ? ` on your ${last.direction}`
    : "";
  if (!dest.kind && !side) return null;
  const what = dest.kind ? `${dest.label} is the ${dest.kind}` : `${dest.label} is`;
  return side ? `${what}${side}.` : `${what} straight ahead.`;
}

export function renderRoute(
  segments: RouteSegment[], dest: Destination, opts: RenderOptions = {},
): RenderedRoute {
  const o: Fixed = {
    units: opts.units ?? DEFAULTS.units,
    stepLength_m: opts.stepLength_m ?? DEFAULTS.stepLength_m,
    directionStyle: opts.directionStyle ?? DEFAULTS.directionStyle,
  };

  const instructions = segments.map((s) => segmentSentence(s, o));
  const total = segments.reduce((n, s) => n + s.length_m, 0);
  const arrival = arrivalSentence(segments, dest, o);

  const summary = [
    instructions.join(" "),
    `Total ${formatDistance(total, o.units, o.stepLength_m)}.`,
    arrival,
  ].filter(Boolean).join(" ");

  return {
    units: o.units,
    directionStyle: o.directionStyle,
    instructions,
    summary,
    ...(o.units === "steps" ? { unitsNote: STEPS_NOTE } : {}),
  };
}

export const round = (n: number, places = 2): number =>
  Math.round(n * 10 ** places) / 10 ** places;

export const traversalTime = (length_m: number, walkSpeedPercent: number): number =>
  round(length_m / (DEFAULTS.baseWalkSpeed_mps * (walkSpeedPercent / 100)), 1);
