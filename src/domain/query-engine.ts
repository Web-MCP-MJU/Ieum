import type {
  Candidate, DomainError, Layout, QueryCriteria, RenderOptions, Seat, SpatialRef,
} from "./types.ts";
import { route } from "./route-engine.ts";
import { DEFAULTS, formatDistance } from "./render.ts";

/**
 * Query engine.
 *
 * Two decisions here come straight from the research rather than from taste.
 *
 * 1. Results are returned FLAT and LONG, not truncated to three with a "there
 *    are more" signal. Auditory-menu research (Commarford et al., Human Factors
 *    50(1), 2008) found broad shallow structures beat deep narrow ones, and the
 *    effect grew for listeners with less working memory. Trained blind listeners
 *    decode speech far faster than a sighted designer assumes, so the expensive
 *    resource is the re-query round trip, not the seconds spent listening.
 *
 * 2. A criterion this domain cannot honour is REJECTED, never silently dropped.
 *    Returning results while quietly ignoring "window seat" would have the agent
 *    tell the user those seats are window seats. That is the failure mode the
 *    ASSETS '25 study calls sycophantic confidence, and it destroys the one thing
 *    the product exists to protect: the user's ability to judge for themselves.
 */

export const MAX_RESULTS = 12;

export type QueryOutcome = {
  items: Candidate[];
  appliedCriteria: QueryCriteria;
  totalMatched: number;
  hint?: string;
};

const err = (code: DomainError["code"], message: string): DomainError => ({ code, message });

function validate(layout: Layout, c: QueryCriteria): DomainError | null {
  // Q1: a distance limit with nothing to measure from is not a filter, it is a bug.
  if (c.maxDistance_m !== undefined && c.near === undefined) {
    return err("INVALID_CRITERIA",
      "A distance limit needs a starting point. Say which landmark to measure from, " +
      "for example the front door or the restroom.");
  }
  if (c.near !== undefined && !layout.landmarks.some((l) => l.key === c.near)) {
    const known = layout.landmarks.map((l) => l.key).join(", ");
    return err("INVALID_REF", `There is no landmark called "${c.near}". This car has: ${known}.`);
  }
  // Q2/Q3: the other domain's block is a real request we cannot honour.
  if (layout.domain === "rail" && c.hotel) {
    return err("UNSUPPORTED_CRITERIA",
      "Floor and bathroom-distance filters apply to hotel rooms, not to seats in a rail car.");
  }
  if (layout.domain === "hotel" && c.rail) {
    return err("UNSUPPORTED_CRITERIA",
      "Seat direction and window/aisle filters apply to a rail car, not to hotel rooms.");
  }
  return null;
}

function matchesNeeds(seat: Seat, needs: NonNullable<QueryCriteria["needs"]>): boolean {
  if (needs.wheelchairSpace && !seat.wheelchairSpace) return false;
  if (needs.transferSeat && !seat.transferSeat) return false;
  if (needs.movableArmrest && !seat.movableArmrest) return false;
  if (needs.minFootSpace_in2 !== undefined && seat.footSpace_in2 < needs.minFootSpace_in2) return false;
  if (needs.excludeExitRow && seat.exitRow) return false;
  return true;
}

function matchesRail(seat: Seat, rail: NonNullable<QueryCriteria["rail"]>): boolean {
  if (rail.facing && seat.facing !== rail.facing) return false;
  if (rail.side && seat.side !== rail.side) return false;
  if (rail.quietCar && !seat.features.includes("quiet_zone")) return false;
  return true;
}

/** Walking distance, not straight-line: it is what the traveller actually pays. */
function walkingDistance(layout: Layout, from: SpatialRef, to: SpatialRef): number | null {
  const r = route(layout, from, to);
  return "code" in r ? null : r.totalLength_m;
}

function describeSeat(
  seat: Seat, distance_m: number | null, nearLabel: string | null, opts: RenderOptions,
): string {
  const units = opts.units ?? DEFAULTS.units;
  const step = opts.stepLength_m ?? DEFAULTS.stepLength_m;

  const parts = [
    seat.wheelchairSpace ? "wheelchair space" : `${seat.side}`,
    seat.facing === "forward" ? "faces front" : "faces rear",
  ];
  if (distance_m !== null && nearLabel) {
    parts.push(`${formatDistance(distance_m, units, step)} from ${nearLabel}`);
  }
  if (seat.movableArmrest) parts.push("movable armrest");
  if (seat.bulkhead) parts.push("extra legroom");
  parts.push(`$${seat.price_usd}`);

  return `${seat.ref} — ${parts.join(", ")}`;
}

/** Named so the agent can offer a next move instead of ending the exchange. */
function suggestHint(layout: Layout, c: QueryCriteria, matched: number): string | undefined {
  if (matched === 0) return undefined;
  if (matched > MAX_RESULTS && !c.near) {
    return "You can narrow this by distance from the front door or the restroom.";
  }
  if (matched > MAX_RESULTS && !c.rail?.side) {
    return "You can narrow this to window or aisle seats.";
  }
  if (!c.needs?.minFootSpace_in2) {
    return "If you travel with a dog guide, you can filter by floor space at the seat.";
  }
  return undefined;
}

export function query(
  layout: Layout, criteria: QueryCriteria = {}, opts: RenderOptions = {},
): QueryOutcome | DomainError {
  const invalid = validate(layout, criteria);
  if (invalid) return invalid;

  const availableOnly = criteria.availableOnly ?? true;
  const near = criteria.near;
  const nearLabel = near
    ? layout.landmarks.find((l) => l.key === near)?.label.replace(/\s*\(.*\)$/, "").toLowerCase() ?? near
    : null;

  const scored = layout.seats
    .filter((s) => (availableOnly ? s.available : true))
    .filter((s) => (criteria.priceMax_usd === undefined ? true : s.price_usd <= criteria.priceMax_usd))
    .filter((s) => (criteria.needs ? matchesNeeds(s, criteria.needs) : true))
    .filter((s) => (criteria.rail ? matchesRail(s, criteria.rail) : true))
    .map((s) => ({ seat: s, distance_m: near ? walkingDistance(layout, near, s.ref) : null }))
    .filter(({ distance_m }) =>
      criteria.maxDistance_m === undefined || (distance_m !== null && distance_m <= criteria.maxDistance_m));

  scored.sort((a, b) =>
    a.distance_m !== null && b.distance_m !== null
      ? a.distance_m - b.distance_m
      : a.seat.row - b.seat.row || a.seat.seatLetter.localeCompare(b.seat.seatLetter));

  const items: Candidate[] = scored.slice(0, MAX_RESULTS).map(({ seat, distance_m }) => ({
    ref: seat.ref,
    line: describeSeat(seat, distance_m, nearLabel, opts),
  }));

  if (scored.length === 0) {
    return err("NO_MATCH", "No seats match all of those conditions.");
  }

  const hint = suggestHint(layout, criteria, scored.length);
  return {
    items,
    appliedCriteria: criteria,
    totalMatched: scored.length,
    ...(hint ? { hint } : {}),
  };
}
