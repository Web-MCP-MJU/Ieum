import type { Layout, Landmark, Seat } from "./types.ts";

/**
 * Unbranded US intercity rail car, business class, 2+2 seating.
 *
 * Geometry follows typical intercity dimensions but names no operator: contest
 * rules forbid third-party trademarks in a submission, and seat-layout facts are
 * not copyrightable while operator names are.
 *
 * Coordinate frame: x runs from the front of the car toward the rear, y across it.
 * Seats project onto the aisle at AISLE_Y to travel.
 */

const CAR_LENGTH_M = 22.0;
const CAR_WIDTH_M = 3.0;
const AISLE_Y = 1.5;
const ROW_PITCH_M = 1.1;
const FIRST_ROW_X = 3.0;
const ROWS = 15;

/** Lateral seat positions. A and D are at the windows, B and C flank the aisle. */
const SEAT_Y: Record<string, number> = { A: 0.35, B: 0.95, C: 2.05, D: 2.65 };

const landmarks: Landmark[] = [
  {
    key: "entrance_front",
    label: "Front door",
    position: { x_m: 0.8, y_m: AISLE_Y },
    landmarkType: "primary",
    // Sits on the aisle centreline at the end of the car: it cannot be walked past.
    sensoryChannels: ["tactile", "auditory", "airflow"],
    detectability: { caneUser: "high", dogGuide: "high" },
    signpostedAs: "CAR 6",
  },
  {
    key: "luggage_rack",
    label: "Luggage rack (front right)",
    position: { x_m: 1.6, y_m: 2.65 },
    landmarkType: "secondary",
    // Beside the path, so a cane sweeping the other side misses it.
    sensoryChannels: ["tactile"],
    detectability: { caneUser: "medium", dogGuide: "low" },
  },
  {
    key: "entrance_rear",
    label: "Rear door",
    position: { x_m: 19.8, y_m: AISLE_Y },
    landmarkType: "primary",
    sensoryChannels: ["tactile", "auditory", "airflow"],
    detectability: { caneUser: "high", dogGuide: "high" },
    signpostedAs: "CAR 6",
  },
  {
    key: "restroom",
    label: "Accessible restroom (rear left)",
    position: { x_m: 20.6, y_m: 0.7 },
    landmarkType: "secondary",
    sensoryChannels: ["tactile", "olfactory", "auditory"],
    detectability: { caneUser: "high", dogGuide: "medium" },
    signpostedAs: "RESTROOM",
  },
  {
    key: "cafe_car",
    label: "Cafe car (through the rear door)",
    position: { x_m: 21.6, y_m: AISLE_Y },
    landmarkType: "primary",
    sensoryChannels: ["auditory", "olfactory"],
    detectability: { caneUser: "high", dogGuide: "high" },
    signpostedAs: "CAFE",
  },
];

/** Rows 1-9 face forward; rows 10-15 face backward around the rear tables. */
const facingFor = (row: number): Seat["facing"] => (row <= 9 ? "forward" : "backward");

/** A deterministic pseudo-random hold pattern, so tests and demos are reproducible. */
const isHeld = (row: number, letter: string): boolean =>
  (row * 7 + letter.charCodeAt(0)) % 4 === 0;

function buildSeats(): Seat[] {
  const seats: Seat[] = [];

  for (let row = 1; row <= ROWS; row++) {
    const x = FIRST_ROW_X + (row - 1) * ROW_PITCH_M;
    const bulkhead = row === 1;

    for (const letter of ["A", "B", "C", "D"]) {
      const y = SEAT_Y[letter]!;
      const side: Seat["side"] = letter === "A" || letter === "D" ? "window" : "aisle";

      // 49 CFR 38.125(d): one wheelchair space plus an adjacent transfer seat and
      // a companion seat, all in the bulkhead row where the clear floor space is.
      const wheelchairSpace = row === 1 && letter === "D";
      const transferSeat = row === 1 && letter === "C";
      const companionSeat = row === 1 && letter === "B";

      // Movable aisle armrests on the forward half, so a transfer is possible
      // without walking the length of the car.
      const movableArmrest = side === "aisle" && row <= 7;

      const footSpace_in2 = bulkhead ? 1180 : side === "window" ? 560 : 640;

      const features: string[] = ["power_outlet"];
      if (row >= 10) features.push("table");
      if (row >= 12) features.push("quiet_zone");
      if (bulkhead) features.push("extra_legroom");

      seats.push({
        ref: `${row}${letter}`,
        row,
        seatLetter: letter,
        position: { x_m: x, y_m: y },
        side,
        facing: facingFor(row),
        price_usd: bulkhead ? 109 : row >= 12 ? 79 : 89,
        available: !isHeld(row, letter),
        wheelchairSpace,
        transferSeat,
        companionSeat,
        movableArmrest,
        footSpace_in2,
        bulkhead,
        exitRow: false,
        features,
      });
    }
  }
  return seats;
}

export const car6: Layout = {
  domain: "rail",
  layoutId: "Car 6, Business Class",
  bounds_m: { length: CAR_LENGTH_M, width: CAR_WIDTH_M },
  aisleY_m: AISLE_Y,
  rowPitch_m: ROW_PITCH_M,
  seats: buildSeats(),
  landmarks,
};
