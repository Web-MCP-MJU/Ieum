import type { Layout, Seat } from "./types.ts";
import fixture from "../data/intercity-car-6.json" with { type: "json" };

/**
 * Unbranded US intercity rail car, business class, 2+2 seating.
 *
 * The spatial truth lives in `src/data/intercity-car-6.json` and is authored, not
 * generated: a hold pattern produced by a formula is a formula, and reviewers
 * cannot tell which coordinates were measured and which fell out of a loop. This
 * module only loads that file and refuses to publish it if it is incoherent.
 *
 * Geometry follows typical intercity dimensions but names no operator: contest
 * rules forbid third-party trademarks in a submission, and seat-layout facts are
 * not copyrightable while operator names are.
 *
 * Coordinate frame: x runs from the front of the car toward the rear, y across it.
 */

const layout = fixture as unknown as Layout;

function fail(message: string): never {
  throw new Error(`intercity-car-6.json: ${message}`);
}

function validate(l: Layout): Layout {
  const refs = new Set<string>();
  for (const s of l.seats) {
    if (refs.has(s.ref)) fail(`duplicate seat ref ${s.ref}`);
    refs.add(s.ref);

    const { x, y } = s.position_m;
    if (!Number.isFinite(x) || !Number.isFinite(y)) fail(`${s.ref} has a non-finite position`);
    if (x < 0 || x > l.bounds_m.length) fail(`${s.ref} sits outside the car at x=${x}`);
    if (y < 0 || y > l.bounds_m.width) fail(`${s.ref} sits outside the car at y=${y}`);

    // A seat on the aisle centreline would make its step-out distance zero and
    // hide the cost of getting out of the seat at all.
    if (y === l.aisleY_m) fail(`${s.ref} sits on the aisle centreline`);

    // 49 CFR 38.125(d)(2) is clear floor space with no seat installed, so there
    // is no armrest to move and nothing to transfer out of.
    if (s.wheelchairSpace && s.movableArmrest) fail(`${s.ref} is a wheelchair space with an armrest`);
    if (s.wheelchairSpace && s.transferSeat) fail(`${s.ref} is both the space and the transfer seat`);
  }

  for (const k of Object.keys(l.reachedThrough)) {
    if (!l.landmarks.some((m) => m.key === k)) fail(`reachedThrough names unknown landmark ${k}`);
    for (const p of l.reachedThrough[k] ?? []) {
      if (!l.portals.some((q) => q.ref === p)) fail(`reachedThrough names unknown portal ${p}`);
    }
  }

  for (const m of l.landmarks) {
    if (refs.has(m.key)) fail(`${m.key} is both a seat and a landmark`);
  }

  return l;
}

export const car6: Layout = validate(layout);

/** Seat lookup by ref, used by every engine that has to resolve one. */
export const seatByRef = (l: Layout, ref: string): Seat | undefined =>
  l.seats.find((s) => s.ref === ref);
