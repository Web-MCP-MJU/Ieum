import type {
  Comparison, DomainError, Layout, RenderOptions, Seat, SpatialRef,
} from "./types.ts";
import { routeLength } from "./route-engine.ts";
import { DEFAULTS, formatDistance } from "./render.ts";

/**
 * Compare engine.
 *
 * Candidates are laid out on the SAME axes in the SAME order every time, so a
 * listener can hold one row in memory and compare it against the next without
 * re-deriving what each value means.
 */

const MIN_REFS = 2;
const MAX_REFS = 4;

type Axis = {
  key: string;
  label: string;
  value: (s: Seat) => string | number | boolean;
  /** Always shown, discriminating or not — see the comment at `kept` below. */
  core?: boolean;
};

const err = (code: DomainError["code"], message: string): DomainError => ({ code, message });

export function compare(
  layout: Layout, refs: SpatialRef[], opts: RenderOptions = {},
): Comparison | DomainError {
  if (refs.length < MIN_REFS || refs.length > MAX_REFS) {
    return err("INVALID_SELECTION",
      `Compare works with ${MIN_REFS} to ${MAX_REFS} seats at a time.`);
  }
  if (new Set(refs).size !== refs.length) {
    return err("INVALID_SELECTION", "Compare needs distinct seats — the same ref cannot appear twice.");
  }

  const seats: Seat[] = [];
  for (const ref of refs) {
    const seat = layout.seats.find((s) => s.ref === ref);
    // Fixed template: never echo the caller's string back into the message.
    if (!seat) return err("INVALID_REF", "That is not a seat in this car.");
    seats.push(seat);
  }

  const units = opts.units ?? DEFAULTS.units;
  const step = opts.stepLength_m ?? DEFAULTS.stepLength_m;
  const dist = (from: SpatialRef, to: SpatialRef): string => {
    const m = routeLength(layout, from, to);
    return m === null ? "n/a" : formatDistance(m, units, step);
  };

  const axes: Axis[] = [
    { key: "position", label: "Position", value: (s) => `row ${s.row}, ${s.seatLetter}`, core: true },
    { key: "price_usd", label: "Price", value: (s) => s.price_usd, core: true },
    { key: "available", label: "Available", value: (s) => s.available, core: true },
    { key: "side", label: "Window or aisle", value: (s) => (s.wheelchairSpace ? "wheelchair space" : s.side) },
    { key: "facing", label: "Facing", value: (s) => (s.facing === "forward" ? "front of train" : "rear of train") },
    { key: "distance_from_entrance_front", label: "From the front door", value: (s) => dist("entrance_front", s.ref) },
    { key: "distance_to_restroom", label: "To the restroom", value: (s) => dist(s.ref, "restroom") },
    { key: "footSpace_in2", label: "Floor space at the seat", value: (s) => `${s.footSpace_in2} sq in` },
    { key: "movableArmrest", label: "Movable armrest", value: (s) => s.movableArmrest },
    { key: "features", label: "Features", value: (s) => (s.features.length ? s.features.join(", ") : "none") },
  ];

  // Position, price, and availability are a fixed identifying core: even when
  // every candidate happens to agree on all three, dropping them would leave a
  // technically-valid row that says nothing a listener could use to tell the
  // seats apart from their refs. Everything else is added only when it actually
  // discriminates between the candidates — an axis they all agree on costs
  // listening time and decides nothing. When nothing past the core discriminates,
  // the honest answer is that these refs are not meaningfully distinguishable,
  // and the core is what is left to say so, not three manufactured axes.
  const discriminating = axes
    .filter((a) => !a.core)
    .filter((a) => new Set(seats.map((s) => a.value(s))).size > 1);
  const kept = [...axes.filter((a) => a.core), ...discriminating];

  return {
    axes: kept.map((a) => ({ key: a.key, label: a.label })),
    rows: seats.map((s) => ({
      ref: s.ref,
      values: Object.fromEntries(kept.map((a) => [a.key, a.value(s)])),
    })),
  };
}
