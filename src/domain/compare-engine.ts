import type {
  Comparison, DomainError, Layout, RenderOptions, Seat, SpatialRef,
} from "./types.ts";
import { route } from "./route-engine.ts";
import { DEFAULTS, formatDistance } from "./render.ts";

/**
 * Compare engine.
 *
 * Candidates are laid out on the SAME axes in the SAME order every time, so a
 * listener can hold one row in memory and compare it against the next without
 * re-deriving what each value means. Axes that are identical across every
 * candidate are dropped: they cost listening time and decide nothing.
 */

const MIN_REFS = 2;
const MAX_REFS = 4;

type Axis = { name: string; value: (s: Seat) => string };

export function compare(
  layout: Layout, refs: SpatialRef[], opts: RenderOptions = {},
): Comparison | DomainError {
  if (refs.length < MIN_REFS || refs.length > MAX_REFS) {
    return {
      code: "INVALID_SELECTION",
      message: `Compare works with ${MIN_REFS} to ${MAX_REFS} seats at a time. You gave ${refs.length}.`,
    };
  }

  const seats: Seat[] = [];
  for (const ref of refs) {
    const seat = layout.seats.find((s) => s.ref === ref);
    if (!seat) {
      return { code: "INVALID_REF", message: `There is no seat called "${ref}" in this car.` };
    }
    seats.push(seat);
  }

  const units = opts.units ?? DEFAULTS.units;
  const step = opts.stepLength_m ?? DEFAULTS.stepLength_m;
  const dist = (from: SpatialRef, to: SpatialRef): string => {
    const r = route(layout, from, to);
    return "code" in r ? "n/a" : formatDistance(r.totalLength_m, units, step);
  };

  const axes: Axis[] = [
    { name: "Position", value: (s) => `row ${s.row}, ${s.seatLetter}` },
    { name: "Window or aisle", value: (s) => (s.wheelchairSpace ? "wheelchair space" : s.side) },
    { name: "Facing", value: (s) => (s.facing === "forward" ? "front of train" : "rear of train") },
    { name: "From the front door", value: (s) => dist("entrance_front", s.ref) },
    { name: "To the restroom", value: (s) => dist(s.ref, "restroom") },
    { name: "Floor space at the seat", value: (s) => `${s.footSpace_in2} sq in` },
    { name: "Movable armrest", value: (s) => (s.movableArmrest ? "yes" : "no") },
    { name: "Price", value: (s) => `$${s.price_usd}` },
    { name: "Features", value: (s) => (s.features.length ? s.features.join(", ") : "none") },
  ];

  // An axis every candidate agrees on decides nothing, so it is not worth saying.
  const discriminating = axes.filter((axis) => {
    const values = seats.map(axis.value);
    return new Set(values).size > 1;
  });
  const kept = discriminating.length > 0 ? discriminating : axes.slice(0, 3);

  return {
    axes: kept.map((a) => a.name),
    rows: seats.map((s) => ({ ref: s.ref, values: kept.map((a) => a.value(s)) })),
  };
}
