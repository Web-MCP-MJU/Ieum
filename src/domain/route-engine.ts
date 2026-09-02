import type {
  Bearing, DomainError, Landmark, Layout, Portal, Position, Route, RouteSegment,
  RenderOptions, Seat, SpatialRef,
} from "./types.ts";
import { MAX_SEGMENTS } from "./types.ts";
import type { Destination, Leg } from "./render.ts";
import { DEFAULTS, renderRoute, round, traversalTime, validateRenderOptions } from "./render.ts";

/**
 * Route engine. Pure TypeScript: knows nothing about the DOM or WebMCP.
 *
 * The algorithm is deliberately not a general pathfinder. A rail car is a single
 * aisle with seats on either side, so a leg is at most:
 *
 *   1. off-aisle origin      -> the aisle anchor for its row   (lateral)
 *   2. along the aisle                                          (longitudinal)
 *   3. any authored portals: a door, a vestibule                (longitudinal)
 *   4. the aisle anchor -> off-aisle destination                (lateral)
 *
 * Steps 1 and 4 exist precisely because projecting both endpoints onto the aisle
 * first would make route("6-12A", "6-12D") — same row, across the aisle — come out
 * as zero distance, and would drop the cost of getting out of your seat at all.
 *
 * Nothing here stores "left" or "right". Each segment carries a bearing in
 * degrees; which of the traveller's shoulders that falls on is a rendering
 * question, answered once the frame is known.
 */

const EPS = 1e-9;

/** car_axis: 0 points at the front of the car, and degrees increase clockwise. */
const carAxisDegrees = (dx: number, dy: number): number =>
  ((Math.atan2(-dy, -dx) * 180) / Math.PI + 360) % 360;

const norm = (deg: number): number => ((deg % 360) + 360) % 360;

const SEAT_HEADING = { forward: 0, backward: 180 } as const;

type Resolved = {
  ref: SpatialRef;
  position_m: Position;
  /**
   * The car-axis direction the traveller faces on starting, or null when the
   * layout does not record one. A seat's recline fixes it; standing at a door
   * does not, and guessing there would publish a measurement nobody took.
   */
  heading: number | null;
  seat?: Seat;
  landmark?: Landmark;
};

const isError = (v: unknown): v is DomainError =>
  typeof v === "object" && v !== null && "code" in v;

/** The aisle point level with a row, named so the UI and the agent can draw it. */
function aisleAnchor(layout: Layout, x: number): { ref: SpatialRef; position_m: Position } {
  const onAisle = layout.landmarks.find(
    (m) => Math.abs(m.position_m.y - layout.aisleY_m) < EPS && Math.abs(m.position_m.x - x) < EPS);
  if (onAisle) return { ref: onAisle.key, position_m: onAisle.position_m };

  let best: Seat | undefined;
  for (const s of layout.seats) {
    if (!best || Math.abs(s.position_m.x - x) < Math.abs(best.position_m.x - x)) best = s;
  }
  if (best && Math.abs(best.position_m.x - x) < EPS) {
    return { ref: `row_${best.row}_aisle`, position_m: { x, y: layout.aisleY_m } };
  }
  const beside = layout.landmarks.find((m) => Math.abs(m.position_m.x - x) < EPS);
  return {
    ref: beside ? `${beside.key}_aisle` : `aisle_at_${round(x, 2)}m`,
    position_m: { x, y: layout.aisleY_m },
  };
}

export function resolve(layout: Layout, ref: SpatialRef): Resolved | DomainError {
  const seat = layout.seats.find((s) => s.ref === ref);
  if (seat) {
    return { ref, position_m: seat.position_m, seat, heading: SEAT_HEADING[seat.facing] };
  }
  const landmark = layout.landmarks.find((l) => l.key === ref);
  if (landmark) {
    return { ref, position_m: landmark.position_m, landmark, heading: null };
  }
  const portal = layout.portals.find((p) => p.ref === ref);
  if (portal) return { ref, position_m: portal.position_m, heading: null };

  // Anchors are published inside `segments`, so a caller can legitimately ask for
  // a route from one. Every ref this engine emits has to come back through here.
  const row = /^row_(\d+)_aisle$/.exec(ref);
  if (row) {
    const seatInRow = layout.seats.find((s) => s.row === Number(row[1]));
    if (seatInRow) {
      return { ref, position_m: { x: seatInRow.position_m.x, y: layout.aisleY_m }, heading: null };
    }
  }
  const beside = /^(.+)_aisle$/.exec(ref);
  if (beside) {
    const m = layout.landmarks.find((l) => l.key === beside[1]);
    if (m) return { ref, position_m: { x: m.position_m.x, y: layout.aisleY_m }, heading: null };
  }
  const at = /^aisle_at_([\d.]+)m$/.exec(ref);
  if (at) return { ref, position_m: { x: Number(at[1]), y: layout.aisleY_m }, heading: null };

  // Section 19: a fixed template. The raw ref is never echoed back into prose.
  return { code: "INVALID_REF", message: "That is not a place in this car." };
}

/** Rows whose centreline falls strictly between two points on the aisle. */
function rowsBetween(layout: Layout, x1: number, x2: number): number {
  const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
  const rows = new Set<number>();
  for (const s of layout.seats) {
    if (s.position_m.x > lo + EPS && s.position_m.x < hi - EPS) rows.add(s.row);
  }
  return rows.size;
}

function landmarksBetween(
  layout: Layout, x1: number, x2: number, exclude: SpatialRef[],
): SpatialRef[] {
  const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
  return layout.landmarks
    .filter((l) => l.position_m.x > lo + EPS && l.position_m.x < hi - EPS && !exclude.includes(l.key))
    .map((l) => l.key);
}

const directPathAllowed = (layout: Layout, a: Seat, b: Seat): boolean =>
  a.row === b.row &&
  layout.directPathLetters.some(
    ([p, q]) => (p === a.seatLetter && q === b.seatLetter) || (p === b.seatLetter && q === a.seatLetter));

// ------------------------------------------------------------------ leg build

type LegDraft = {
  from: SpatialRef;
  to: SpatialRef;
  fromPos: Position;
  toPos: Position;
  mode: RouteSegment["pathway_mode"];
  /** True for a longitudinal move the traveller must turn to face. */
  turns: boolean;
  onAisle: boolean;
  /** A lateral move that ends standing in the walkway, which is worth saying. */
  entersAisle?: boolean;
  counted?: { feature: string; count: number };
  landmarksPassed: SpatialRef[];
  signpostedAs?: string;
};

function plan(
  layout: Layout, from: Resolved, to: Resolved, portals: Portal[],
): LegDraft[] {
  const drafts: LegDraft[] = [];
  const aisleY = layout.aisleY_m;

  // Same row, and the fixture marks the pair physically traversable: the window
  // passenger squeezes past their neighbour without entering the walkway.
  if (from.seat && to.seat && directPathAllowed(layout, from.seat, to.seat)) {
    drafts.push({
      from: from.ref, to: to.ref, fromPos: from.position_m, toPos: to.position_m,
      mode: "walkway", turns: false, onAisle: false, landmarksPassed: [],
    });
    return drafts;
  }

  const startsOffAisle = Math.abs(from.position_m.y - aisleY) > EPS;
  const endsOffAisle = Math.abs(to.position_m.y - aisleY) > EPS;
  const startAnchor = aisleAnchor(layout, from.position_m.x);
  const endAnchor = aisleAnchor(layout, to.position_m.x);

  if (startsOffAisle) {
    drafts.push({
      from: from.ref, to: startAnchor.ref,
      fromPos: from.position_m, toPos: startAnchor.position_m,
      mode: "walkway", turns: false, onAisle: false, entersAisle: true,
      landmarksPassed: [],
    });
  }

  // Walk the aisle. Portals sit on it, so the walk stops at the first one.
  const walkFrom = startsOffAisle ? startAnchor : { ref: from.ref, position_m: from.position_m };
  const firstPortal = portals[0];
  const walkTo = firstPortal
    ? { ref: firstPortal.ref, position_m: firstPortal.position_m }
    : (endsOffAisle ? endAnchor : { ref: to.ref, position_m: to.position_m });

  if (Math.abs(walkTo.position_m.x - walkFrom.position_m.x) > EPS) {
    const rows = rowsBetween(layout, walkFrom.position_m.x, walkTo.position_m.x);
    drafts.push({
      from: walkFrom.ref, to: walkTo.ref,
      fromPos: walkFrom.position_m, toPos: walkTo.position_m,
      mode: "walkway", turns: true, onAisle: true,
      ...(rows > 0 ? { counted: { feature: "row", count: rows } } : {}),
      landmarksPassed: landmarksBetween(
        layout, walkFrom.position_m.x, walkTo.position_m.x, [from.ref, to.ref]),
    });
  }

  // Authored thresholds: a door is not a stretch of walkway with a different name.
  portals.forEach((p, i) => {
    const next = portals[i + 1];
    const target = next
      ? { ref: next.ref, position_m: next.position_m }
      : (endsOffAisle ? endAnchor : { ref: to.ref, position_m: to.position_m });
    drafts.push({
      from: p.ref, to: target.ref, fromPos: p.position_m, toPos: target.position_m,
      mode: p.mode, turns: false, onAisle: false, landmarksPassed: [],
      ...(p.signpostedAs ? { signpostedAs: p.signpostedAs } : {}),
    });
  });

  if (endsOffAisle) {
    drafts.push({
      from: endAnchor.ref, to: to.ref,
      fromPos: endAnchor.position_m, toPos: to.position_m,
      mode: "walkway", turns: false, onAisle: false, landmarksPassed: [],
    });
  }

  return drafts;
}

function toLegs(layout: Layout, drafts: LegDraft[], startHeading: number | null, walkSpeed: number): Leg[] {
  let heading = startHeading;
  return drafts.map((d) => {
    const dx = d.toPos.x - d.fromPos.x;
    const dy = d.toPos.y - d.fromPos.y;
    const length_m = round(Math.hypot(dx, dy));
    const carAxis = carAxisDegrees(dx, dy);
    const headingBefore = heading;

    const bearing: Bearing = headingBefore === null
      ? { frame: "car_axis", degrees: round(carAxis, 1) }
      : { frame: "egocentric", degrees: round(norm(carAxis - headingBefore), 1) };

    const segment: RouteSegment = {
      pathway_mode: d.mode,
      from: d.from,
      to: d.to,
      length_m,
      traversal_time_s: traversalTime(length_m, walkSpeed),
      ...(d.onAisle && layout.aisleWidth_m !== undefined
        ? { min_width_m: layout.aisleWidth_m }
        : {}),
      ...(d.signpostedAs ? { signpostedAs: d.signpostedAs } : {}),
      bearing,
      ...(d.counted ? { countedFeatures: d.counted } : {}),
      landmarksPassed: d.landmarksPassed,
    };

    // Only a move you turn to face changes which way you are facing afterwards.
    if (d.turns) heading = carAxis;

    return { segment, headingBefore, carAxis, turns: d.turns, entersAisle: d.entersAisle === true };
  });
}

// -------------------------------------------------------------------- public

function describeDestination(layout: Layout, ref: SpatialRef): Destination {
  const seat = layout.seats.find((s) => s.ref === ref);
  if (seat) {
    return {
      kind: "seat", ref, label: seat.ref,
      wheelchairSpace: seat.wheelchairSpace, side: seat.side,
    };
  }
  const landmark = layout.landmarks.find((l) => l.key === ref);
  if (landmark) return { kind: "landmark", ref, landmark };
  return {
    kind: "landmark", ref,
    landmark: {
      key: ref, label: ref.replace(/_/g, " "), position_m: { x: 0, y: 0 },
      landmarkType: "information_point", sensoryChannels: [],
      detectability: { caneUser: "low", dogGuide: "low" },
    },
  };
}

export function route(
  layout: Layout, fromRef: SpatialRef, toRef: SpatialRef, opts: RenderOptions = {},
): Route | DomainError {
  const badOpts = validateRenderOptions(opts);
  if (badOpts) return badOpts;

  const from = resolve(layout, fromRef);
  if (isError(from)) return from;
  const to = resolve(layout, toRef);
  if (isError(to)) return to;

  if (fromRef === toRef) {
    return { code: "NO_ROUTE", message: "The start and destination are the same place." };
  }

  const walkSpeed = opts.walkSpeedPercent ?? DEFAULTS.walkSpeedPercent;

  // `reachedThrough` lists every threshold between the car and the destination.
  // A continuation leg starts partway along that list, so keep only the ones still
  // ahead: otherwise resuming from a checkpoint walks back through a door already
  // crossed. Inclusive at the origin, because standing at a door is still short of
  // being through it.
  const ahead = (p: Portal): boolean => {
    const lo = Math.min(from.position_m.x, to.position_m.x);
    const hi = Math.max(from.position_m.x, to.position_m.x);
    return p.position_m.x >= lo - EPS && p.position_m.x < hi - EPS;
  };
  const portals = (layout.reachedThrough[toRef] ?? [])
    .map((r) => layout.portals.find((p) => p.ref === r))
    .filter((p): p is Portal => p !== undefined && ahead(p));

  const drafts = plan(layout, from, to, portals);
  if (drafts.length === 0) {
    return { code: "NO_ROUTE", message: "There is no modelled path between those two places." };
  }

  const legs = toLegs(layout, drafts, from.heading, walkSpeed);
  return assemble(layout, fromRef, toRef, legs, opts);
}

/**
 * Architecture section 7-8: a leg longer than MAX_SEGMENTS ends at the last stable
 * landmark it can actually reach, and the caller asks again from there. Totals
 * then describe the returned leg only, never the journey the traveller has not
 * been told about yet.
 */
function cut(layout: Layout, legs: Leg[]): { legs: Leg[]; checkpoint?: { ref: SpatialRef; label: string } } {
  if (legs.length <= MAX_SEGMENTS) return { legs };

  for (let i = MAX_SEGMENTS; i > 0; i--) {
    const ref = legs[i - 1]!.segment.to;
    const landmark = layout.landmarks.find((l) => l.key === ref);
    if (landmark) {
      return { legs: legs.slice(0, i), checkpoint: { ref, label: landmark.label } };
    }
  }
  // No landmark within reach, so stop at the cap and name the anchor we reached.
  const ref = legs[MAX_SEGMENTS - 1]!.segment.to;
  return { legs: legs.slice(0, MAX_SEGMENTS), checkpoint: { ref, label: ref.replace(/_/g, " ") } };
}

function assemble(
  layout: Layout, fromRef: SpatialRef, requestedTo: SpatialRef, allLegs: Leg[], opts: RenderOptions,
): Route {
  const { legs, checkpoint } = cut(layout, allLegs);
  const segments = legs.map((l) => l.segment);
  const to = checkpoint ? checkpoint.ref : requestedTo;

  const passed = new Set(segments.flatMap((s) => s.landmarksPassed));
  for (const ref of [fromRef, to]) {
    if (layout.landmarks.some((l) => l.key === ref)) passed.add(ref);
  }

  return {
    from: fromRef,
    requestedTo,
    to,
    // Section 7-7: aggregate totals equal every segment sum, so a listener adding
    // up what they heard reaches the number they are given.
    totalLength_m: round(segments.reduce((n, s) => n + s.length_m, 0)),
    totalTraversalTime_s: round(segments.reduce((n, s) => n + s.traversal_time_s, 0), 1),
    segments,
    landmarks: layout.landmarks.filter((l) => passed.has(l.key)),
    requiresContinuation: checkpoint !== undefined,
    ...(checkpoint ? { checkpoint } : {}),
    rendered: renderRoute(
      legs, describeDestination(layout, to), layout.axisLabels, layout.landmarks, opts),
  };
}
