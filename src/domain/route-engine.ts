import type {
  DomainError, Landmark, Layout, Point, Route, RouteSegment,
  RenderOptions, Seat, SpatialRef,
} from "./types.ts";
import type { Destination } from "./render.ts";
import { DEFAULTS, renderRoute, round, traversalTime } from "./render.ts";

/**
 * Route engine. Pure TypeScript: knows nothing about the DOM or WebMCP.
 *
 * The algorithm is deliberately not a general pathfinder. A rail car is a single
 * aisle with seats on either side, so the route is always at most three moves:
 *
 *   1. off-aisle origin      -> aisle          (lateral)
 *   2. along the aisle                          (longitudinal)
 *   3. aisle -> off-aisle destination           (lateral)
 *
 * Steps 1 and 3 exist precisely because projecting both endpoints onto the aisle
 * first would make route("12A", "12D") — same row, across the aisle — come out as
 * zero distance, and would drop the cost of getting out of your seat at all.
 */

/** 49 CFR 38.125(d)(1): the accessible route must be at least 32 inches wide. */
const AISLE_WIDTH_M = 0.81;

type Resolved = {
  ref: SpatialRef;
  position: Point;
  /** Which way the traveller is facing when they start. -x is the front of the car. */
  facingAxis: "+x" | "-x";
  seat?: Seat;
  landmark?: Landmark;
};

function resolve(layout: Layout, ref: SpatialRef): Resolved | DomainError {
  const seat = layout.seats.find((s) => s.ref === ref);
  if (seat) {
    return {
      ref, position: seat.position, seat,
      facingAxis: seat.facing === "forward" ? "-x" : "+x",
    };
  }
  const landmark = layout.landmarks.find((l) => l.key === ref);
  if (landmark) {
    return { ref, position: landmark.position, landmark, facingAxis: "+x" };
  }
  return {
    code: "INVALID_REF",
    message: `There is no seat or landmark called "${ref}" in this car.`,
  };
}

const isError = (v: unknown): v is DomainError =>
  typeof v === "object" && v !== null && "code" in v;

/**
 * Left or right depends on which way the traveller faces, so it is computed,
 * never stored. Facing the front of the car (-x), increasing y is to the left.
 */
function lateral(fromY: number, toY: number, facingAxis: "+x" | "-x"): "left" | "right" {
  const goingPositive = toY > fromY;
  return facingAxis === "-x"
    ? (goingPositive ? "left" : "right")
    : (goingPositive ? "right" : "left");
}

/** Rows whose centreline falls strictly between two points on the aisle. */
function rowsBetween(layout: Layout, x1: number, x2: number): number {
  const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
  const rows = new Set<number>();
  for (const s of layout.seats) {
    if (s.position.x_m > lo && s.position.x_m < hi) rows.add(s.row);
  }
  return rows.size;
}

function landmarksBetween(layout: Layout, x1: number, x2: number, exclude: SpatialRef[]): SpatialRef[] {
  const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
  return layout.landmarks
    .filter((l) => l.position.x_m > lo && l.position.x_m < hi && !exclude.includes(l.key))
    .map((l) => l.key);
}

export function route(
  layout: Layout, fromRef: SpatialRef, toRef: SpatialRef, opts: RenderOptions = {},
): Route | DomainError {
  const from = resolve(layout, fromRef);
  if (isError(from)) return from;
  const to = resolve(layout, toRef);
  if (isError(to)) return to;

  if (fromRef === toRef) {
    return { code: "NO_ROUTE", message: "The start and destination are the same place." };
  }

  const walkSpeed = opts.walkSpeedPercent ?? DEFAULTS.walkSpeedPercent;
  const aisleY = layout.aisleY_m;
  const seg = (s: Omit<RouteSegment, "traversal_time_s">): RouteSegment =>
    ({ ...s, traversal_time_s: traversalTime(s.length_m, walkSpeed) });

  const segments: RouteSegment[] = [];
  const sameSideOfAisle =
    (from.position.y_m - aisleY) * (to.position.y_m - aisleY) > 0;
  const aisleDistance = Math.abs(to.position.x_m - from.position.x_m);

  // Same row and same side: a direct lateral move, no need to enter the aisle.
  if (aisleDistance < 1e-9 && sameSideOfAisle) {
    const d = Math.abs(to.position.y_m - from.position.y_m);
    segments.push(seg({
      pathway_mode: "walkway", from: fromRef, to: toRef, length_m: round(d),
      direction: lateral(from.position.y_m, to.position.y_m, from.facingAxis),
      landmarksPassed: [],
    }));
    return assemble(layout, fromRef, toRef, segments, walkSpeed, opts);
  }

  // Same row, opposite sides: one continuous lateral traverse across the aisle.
  if (aisleDistance < 1e-9) {
    const d = Math.abs(to.position.y_m - from.position.y_m);
    segments.push(seg({
      pathway_mode: "walkway", from: fromRef, to: toRef, length_m: round(d),
      min_width_m: AISLE_WIDTH_M,
      direction: lateral(from.position.y_m, to.position.y_m, from.facingAxis),
      landmarksPassed: [],
    }));
    return assemble(layout, fromRef, toRef, segments, walkSpeed, opts);
  }

  // 1. Step out to the aisle, if not already on it.
  const startsOffAisle = Math.abs(from.position.y_m - aisleY) > 1e-9;
  if (startsOffAisle) {
    segments.push(seg({
      pathway_mode: "walkway", from: fromRef, to: "aisle",
      length_m: round(Math.abs(aisleY - from.position.y_m)),
      direction: lateral(from.position.y_m, aisleY, from.facingAxis),
      landmarksPassed: [],
    }));
  }

  // 2. Along the aisle. Travelling toward +x is toward the rear of the car.
  const travelDirection = to.position.x_m > from.position.x_m ? "backward" : "forward";
  const rows = rowsBetween(layout, from.position.x_m, to.position.x_m);
  segments.push(seg({
    pathway_mode: "walkway", from: startsOffAisle ? "aisle" : fromRef, to: "aisle",
    length_m: round(aisleDistance),
    min_width_m: AISLE_WIDTH_M,
    direction: travelDirection,
    ...(rows > 0 ? { countedFeatures: { feature: "row", count: rows } } : {}),
    landmarksPassed: landmarksBetween(layout, from.position.x_m, to.position.x_m, [fromRef, toRef]),
  }));

  // 3. Step off the aisle to the destination. The traveller now faces the way
  //    they just walked, which is what makes left and right well-defined here.
  const endsOffAisle = Math.abs(to.position.y_m - aisleY) > 1e-9;
  if (endsOffAisle) {
    const facingAfterWalk: "+x" | "-x" = travelDirection === "backward" ? "+x" : "-x";
    segments.push(seg({
      pathway_mode: "walkway", from: "aisle", to: toRef,
      length_m: round(Math.abs(to.position.y_m - aisleY)),
      direction: lateral(aisleY, to.position.y_m, facingAfterWalk),
      landmarksPassed: [],
    }));
  }

  return assemble(layout, fromRef, toRef, segments, walkSpeed, opts);
}

/** Gives the closing sentence something to say beyond repeating the last turn. */
function describeDestination(layout: Layout, ref: SpatialRef): Destination {
  const seat = layout.seats.find((s) => s.ref === ref);
  if (seat) {
    return {
      ref, label: `Seat ${ref}`,
      kind: seat.wheelchairSpace ? "wheelchair space" : `${seat.side} seat`,
    };
  }
  const landmark = layout.landmarks.find((l) => l.key === ref);
  return { ref, label: landmark ? landmark.label : ref };
}

function assemble(
  layout: Layout, fromRef: SpatialRef, toRef: SpatialRef,
  segments: RouteSegment[], walkSpeed: number, opts: RenderOptions,
): Route {
  const totalLength_m = round(segments.reduce((n, s) => n + s.length_m, 0));
  const passed = new Set(segments.flatMap((s) => s.landmarksPassed));
  for (const ref of [fromRef, toRef]) {
    if (layout.landmarks.some((l) => l.key === ref)) passed.add(ref);
  }

  return {
    from: fromRef,
    to: toRef,
    totalLength_m,
    totalTraversalTime_s: traversalTime(totalLength_m, walkSpeed),
    segments,
    turns: segments.flatMap((s, i) =>
      s.direction === "left" || s.direction === "right"
        ? [{ atSegment: i, direction: s.direction }]
        : []),
    landmarks: layout.landmarks.filter((l) => passed.has(l.key)),
    rendered: renderRoute(segments, describeDestination(layout, toRef), opts),
  };
}
