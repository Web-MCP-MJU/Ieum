import type {
  AppliedCriteria, Candidate, Distance, DomainError, Layout, QueryCriteria, QueryData,
  RailCandidate, RenderOptions, Seat, SpatialRef,
} from "./types.ts";
import { routeLength } from "./route-engine.ts";
import { DEFAULTS, STEPS_NOTE, formatDistance } from "./render.ts";

/**
 * Query engine.
 *
 * Results are capped at MAX_RESULTS (12) items, never silently truncated: the
 * response always carries the true pre-cap `totalMatched` and, when the cap is
 * hit, exactly one deterministic narrowing hint (Architecture 6.1). Auditory-menu
 * research (Commarford et al., Human Factors 50(1), 2008) found broad-and-shallow
 * menus beat deep-and-narrow ones, which is why the cap is 12 flat items rather
 * than three plus a "see more" prompt.
 *
 * A criterion this domain cannot honour is REJECTED, never silently dropped.
 * Returning results while quietly ignoring "window seat" would have the agent
 * tell the user those seats are window seats. That is the failure mode the
 * ASSETS '25 study calls sycophantic confidence, and it destroys the one thing
 * the product exists to protect: the user's ability to judge for themselves.
 *
 * This engine builds only rail candidates. A hotel `Layout` is a documentation
 * proof (Architecture 18.2), not something this codebase has a fixture for.
 */

export const MAX_RESULTS = 12;

export type QueryOutcome = QueryData & { hint?: string };

const err = (code: DomainError["code"], message: string): DomainError => ({ code, message });

function validate(layout: Layout, c: QueryCriteria): DomainError | null {
  // Q1: a distance limit with nothing to measure from is not a filter, it is a bug.
  if (c.maxDistance_m !== undefined && c.near === undefined) {
    return err("INVALID_CRITERIA",
      "A distance limit needs a starting point. Say which landmark to measure from, " +
      "for example the front door or the restroom.");
  }
  if (c.near !== undefined && !layout.landmarks.some((l) => l.key === c.near)) {
    // Fixed template: never echo the caller's string back into the message.
    const known = layout.landmarks.map((l) => l.key).join(", ");
    return err("INVALID_REF", `That is not a landmark in this car. Known landmarks: ${known}.`);
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

/** A wheelchair space has no seat installed (49 CFR 38.125(d)(2)), so it is never called one. */
function candidateLabel(seat: Seat): string {
  return seat.wheelchairSpace ? `Wheelchair space ${seat.ref}` : `Seat ${seat.ref}`;
}

function candidateLine(
  seat: Seat, label: string, distance: Distance | undefined, nearLabel: string | null,
): string {
  const parts: string[] = [];
  if (!seat.wheelchairSpace) parts.push(seat.side);
  parts.push(seat.facing === "forward" ? "faces front" : "faces rear");
  if (distance && nearLabel) parts.push(`${distance.rendered} from ${nearLabel}`);
  if (seat.movableArmrest) parts.push("movable armrest");
  if (seat.bulkhead) parts.push("extra legroom");
  parts.push(`$${seat.price_usd}`);
  return `${label} — ${parts.join(", ")}`;
}

function buildCandidate(
  seat: Seat, near: SpatialRef | undefined, distance_m: number | null,
  nearLabel: string | null, opts: RenderOptions,
): RailCandidate {
  let distance: Distance | undefined;
  if (near !== undefined && distance_m !== null) {
    const units = opts.units ?? DEFAULTS.units;
    const step = opts.stepLength_m ?? DEFAULTS.stepLength_m;
    distance = { from: near, distance_m, rendered: formatDistance(distance_m, units, step) };
  }

  const label = candidateLabel(seat);
  return {
    ref: seat.ref,
    label,
    line: candidateLine(seat, label, distance, nearLabel),
    price_usd: seat.price_usd,
    available: seat.available,
    features: seat.features,
    domain: "rail",
    rail: { row: seat.row, seatLetter: seat.seatLetter, side: seat.side, facing: seat.facing },
    accessibility: {
      wheelchairSpace: seat.wheelchairSpace,
      transferSeat: seat.transferSeat,
      companionSeat: seat.companionSeat,
      movableArmrest: seat.movableArmrest,
      footSpace_in2: seat.footSpace_in2,
      bulkhead: seat.bulkhead,
      exitRow: seat.exitRow,
    },
    ...(distance ? { distance } : {}),
  };
}

// ---------------------------------------------------------------------- hints

/**
 * 13+ matches: name the first applicable axis the caller has not yet set, in the
 * order Architecture 6.1 fixes. If every applicable axis is already in use, name
 * the first active axis that can be tightened further. Never invents a threshold.
 */
function narrowHint(c: AppliedCriteria): string {
  const hasNear = c.near !== undefined;
  const axes: { applicable: boolean; present: boolean; text: string }[] = [
    { applicable: true, present: hasNear,
      text: "Add a `near` landmark to narrow the results by distance." },
    { applicable: hasNear, present: c.maxDistance_m !== undefined,
      text: "Add a `maxDistance_m` limit to narrow the results by distance." },
    { applicable: true, present: c.priceMax_usd !== undefined,
      text: "Add a `priceMax_usd` limit to narrow the results by price." },
    { applicable: true, present: c.needs?.minFootSpace_in2 !== undefined,
      text: "Add a `needs.minFootSpace_in2` requirement to narrow the results by floor space." },
    { applicable: true, present: c.needs?.wheelchairSpace !== undefined,
      text: "Add a `needs.wheelchairSpace` requirement to narrow the results." },
    { applicable: true, present: c.needs?.transferSeat !== undefined,
      text: "Add a `needs.transferSeat` requirement to narrow the results." },
    { applicable: true, present: c.needs?.movableArmrest !== undefined,
      text: "Add a `needs.movableArmrest` requirement to narrow the results." },
    { applicable: true, present: c.needs?.excludeExitRow !== undefined,
      text: "Add a `needs.excludeExitRow` requirement to narrow the results." },
    { applicable: true, present: c.rail?.facing !== undefined,
      text: "Add a `rail.facing` filter to narrow the results." },
    { applicable: true, present: c.rail?.side !== undefined,
      text: "Add a `rail.side` filter to narrow the results." },
    { applicable: true, present: c.rail?.quietCar !== undefined,
      text: "Add a `rail.quietCar` filter to narrow the results." },
  ];

  const absent = axes.find((a) => a.applicable && !a.present);
  if (absent) return absent.text;

  if (c.maxDistance_m !== undefined) return "Decrease `maxDistance_m` to narrow the results further.";
  if (c.priceMax_usd !== undefined) return "Decrease `priceMax_usd` to narrow the results further.";
  return "Increase `needs.minFootSpace_in2` to narrow the results further.";
}

/**
 * 0 matches: name the first ACTIVE restriction to relax, in the order Architecture
 * 6.1 fixes. Never invents a replacement value — only the field and the direction.
 */
function relaxHint(c: AppliedCriteria): string {
  if (c.availableOnly) return "Set `availableOnly` to false to include unavailable seats.";
  if (c.maxDistance_m !== undefined) return "Increase or remove `maxDistance_m`.";
  if (c.priceMax_usd !== undefined) return "Increase or remove `priceMax_usd`.";
  if (c.needs?.minFootSpace_in2 !== undefined) return "Decrease or remove `needs.minFootSpace_in2`.";
  if (c.needs?.wheelchairSpace) return "Remove the `needs.wheelchairSpace` requirement.";
  if (c.needs?.transferSeat) return "Remove the `needs.transferSeat` requirement.";
  if (c.needs?.movableArmrest) return "Remove the `needs.movableArmrest` requirement.";
  if (c.needs?.excludeExitRow) return "Remove the `needs.excludeExitRow` requirement.";
  if (c.rail?.facing !== undefined) return "Remove the `rail.facing` filter.";
  if (c.rail?.side !== undefined) return "Remove the `rail.side` filter.";
  if (c.rail?.quietCar) return "Remove the `rail.quietCar` filter.";
  return "Remove the `near` filter.";
}

// ---------------------------------------------------------------------- query

export function query(
  layout: Layout, criteria: QueryCriteria = {}, opts: RenderOptions = {},
): QueryOutcome | DomainError {
  const invalid = validate(layout, criteria);
  if (invalid) return invalid;

  const availableOnly = criteria.availableOnly ?? true;
  const appliedCriteria: AppliedCriteria = { ...criteria, availableOnly };
  const near = criteria.near;
  const nearLabel = near
    ? layout.landmarks.find((l) => l.key === near)?.label.toLowerCase() ?? near
    : null;

  let scored = layout.seats
    .filter((s) => (availableOnly ? s.available : true))
    .filter((s) => (criteria.priceMax_usd === undefined ? true : s.price_usd <= criteria.priceMax_usd))
    .filter((s) => (criteria.needs ? matchesNeeds(s, criteria.needs) : true))
    .filter((s) => (criteria.rail ? matchesRail(s, criteria.rail) : true))
    .map((s) => ({
      seat: s,
      distance_m: near !== undefined ? routeLength(layout, near, s.ref) : null,
    }));

  // A candidate near a landmark must carry a real distance; one with no modelled
  // path cannot honestly claim to be included in a distance-anchored result.
  if (near !== undefined) scored = scored.filter((x) => x.distance_m !== null);
  if (criteria.maxDistance_m !== undefined) {
    const max = criteria.maxDistance_m;
    scored = scored.filter((x) => x.distance_m !== null && x.distance_m <= max);
  }

  const totalMatched = scored.length;

  // Sort keys, in exact order (Architecture 6.1). The final ref tie-break makes
  // this fully deterministic — nothing is left to array or insertion order.
  scored.sort((a, b) => {
    if (near !== undefined) {
      const d = (a.distance_m as number) - (b.distance_m as number);
      if (d !== 0) return d;
    }
    if (availableOnly === false) {
      const d = Number(b.seat.available) - Number(a.seat.available);
      if (d !== 0) return d;
    }
    const price = a.seat.price_usd - b.seat.price_usd;
    if (price !== 0) return price;
    const row = a.seat.row - b.seat.row;
    if (row !== 0) return row;
    const letter = a.seat.seatLetter.localeCompare(b.seat.seatLetter);
    if (letter !== 0) return letter;
    return a.seat.ref.localeCompare(b.seat.ref);
  });

  const items: Candidate[] = scored
    .slice(0, MAX_RESULTS)
    .map(({ seat, distance_m }) => buildCandidate(seat, near, distance_m, nearLabel, opts));

  const units = opts.units ?? DEFAULTS.units;
  const unitsNote = units === "steps" && items.some((i) => i.distance?.rendered) ? STEPS_NOTE : undefined;

  // Zero matches is success, not NO_MATCH: it still carries normalized criteria
  // and one deterministic relaxation hint (Architecture 6.1). Hints are otherwise
  // forbidden for 1-12 matches, so a listener never hears the same nag every time.
  let hint: string | undefined;
  if (totalMatched === 0) hint = relaxHint(appliedCriteria);
  else if (totalMatched > MAX_RESULTS) hint = narrowHint(appliedCriteria);

  return {
    items,
    appliedCriteria,
    totalMatched,
    ...(unitsNote ? { unitsNote } : {}),
    ...(hint ? { hint } : {}),
  };
}
