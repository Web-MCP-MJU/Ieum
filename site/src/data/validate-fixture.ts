import { railFixtureSchema } from './fixture-schema';
import type {
  FixtureEdge,
  LoadedRailFixture,
  Position,
  RailFixture,
} from '@/src/domain/types';

export type FixtureValidationCode =
  | 'SCHEMA_INVALID'
  | 'DUPLICATE_REF'
  | 'DUPLICATE_EDGE_ID'
  | 'DUPLICATE_SEAT_POSITION'
  | 'OUT_OF_BOUNDS'
  | 'INVALID_EDGE_ENDPOINT'
  | 'INVALID_EDGE_GEOMETRY'
  | 'INVALID_AVAILABILITY_COUNT'
  | 'MISSING_REQUIRED_REF'
  | 'UNREACHABLE_REF'
  | 'INVALID_CONTINUATION';

export class FixtureValidationError extends Error {
  constructor(
    public readonly code: FixtureValidationCode,
    message: string,
  ) {
    super(message);
    this.name = 'FixtureValidationError';
  }
}

type DirectedEdge = FixtureEdge & { directedFrom: string; directedTo: string; degrees: number };
type EdgeGraph = ReadonlyMap<string, readonly DirectedEdge[]>;

function fail(code: FixtureValidationCode, message: string): never {
  throw new FixtureValidationError(code, message);
}

function assertUnique(values: string[], code: FixtureValidationCode, label: string) {
  if (new Set(values).size !== values.length) fail(code, `${label} must be unique.`);
}

function assertInBounds(position: Position, fixture: RailFixture) {
  if (position.x > fixture.bounds_m.width || position.y > fixture.bounds_m.length) {
    fail('OUT_OF_BOUNDS', 'A coordinate is outside the authored car bounds.');
  }
}

function directedEdges(fixture: RailFixture): DirectedEdge[] {
  return fixture.pathEdges.flatMap((edge) => {
    const forward: DirectedEdge = {
      ...edge,
      directedFrom: edge.from,
      directedTo: edge.to,
      degrees: edge.bearing.degrees,
    };
    if (!edge.bidirectional) return [forward];
    return [
      forward,
      {
        ...edge,
        directedFrom: edge.to,
        directedTo: edge.from,
        degrees: (edge.bearing.degrees + 180) % 360,
      },
    ];
  });
}

function createEdgeGraph(edges: DirectedEdge[]): EdgeGraph {
  const graph = new Map<string, DirectedEdge[]>();
  for (const edge of edges) {
    const outgoing = graph.get(edge.directedFrom) ?? [];
    outgoing.push(edge);
    graph.set(edge.directedFrom, outgoing);
  }
  for (const outgoing of graph.values()) {
    outgoing.sort((a, b) => a.directedTo.localeCompare(b.directedTo) || a.id.localeCompare(b.id));
  }
  return graph;
}

function shortestPath(graph: EdgeGraph, from: string, to: string): DirectedEdge[] | null {
  if (from === to) return [];
  const distance = new Map<string, number>([[from, 0]]);
  const pathKey = new Map<string, string>([[from, from]]);
  const previous = new Map<string, DirectedEdge>();
  const pending = new Set<string>([from]);

  while (pending.size > 0) {
    const current = [...pending].sort((a, b) => {
      const delta = (distance.get(a) ?? Infinity) - (distance.get(b) ?? Infinity);
      return delta || (pathKey.get(a) ?? a).localeCompare(pathKey.get(b) ?? b);
    })[0];
    pending.delete(current);
    if (current === to) break;

    const candidates = graph.get(current) ?? [];
    for (const edge of candidates) {
      const nextDistance = (distance.get(current) ?? Infinity) + edge.length_m;
      const nextKey = `${pathKey.get(current) ?? current}>${edge.directedTo}`;
      const knownDistance = distance.get(edge.directedTo) ?? Infinity;
      const knownKey = pathKey.get(edge.directedTo) ?? '\uffff';
      if (nextDistance < knownDistance || (nextDistance === knownDistance && nextKey < knownKey)) {
        distance.set(edge.directedTo, nextDistance);
        pathKey.set(edge.directedTo, nextKey);
        previous.set(edge.directedTo, edge);
        pending.add(edge.directedTo);
      }
    }
  }

  if (!previous.has(to)) return null;
  const result: DirectedEdge[] = [];
  let cursor = to;
  while (cursor !== from) {
    const edge = previous.get(cursor);
    if (!edge) return null;
    result.unshift(edge);
    cursor = edge.directedFrom;
  }
  return result;
}

type MergedStep = {
  from: string;
  to: string;
  length_m: number;
  pathway_mode: FixtureEdge['pathway_mode'];
  degrees: number;
};

function mergedSteps(edges: DirectedEdge[]): MergedStep[] {
  const merged: MergedStep[] = [];
  for (const edge of edges) {
    const last = merged.at(-1);
    if (
      last &&
      last.to === edge.directedFrom &&
      last.pathway_mode === edge.pathway_mode &&
      last.degrees === edge.degrees
    ) {
      last.to = edge.directedTo;
      last.length_m += edge.length_m;
    } else {
      merged.push({
        from: edge.directedFrom,
        to: edge.directedTo,
        length_m: edge.length_m,
        pathway_mode: edge.pathway_mode,
        degrees: edge.degrees,
      });
    }
  }
  return merged;
}

function pathLength(edges: DirectedEdge[]): number {
  return edges.reduce((total, edge) => total + edge.length_m, 0);
}

function validateContinuation(
  refs: string[],
  stableRefs: ReadonlySet<string>,
  graph: EdgeGraph,
) {
  const cache = new Map<string, DirectedEdge[] | null>();
  const path = (from: string, to: string) => {
    const key = `${from}\u0000${to}`;
    if (!cache.has(key)) cache.set(key, shortestPath(graph, from, to));
    return cache.get(key) ?? null;
  };

  for (const origin of refs) {
    for (const destination of refs) {
      if (origin === destination) continue;
      let current = origin;
      let remaining = path(current, destination);
      if (!remaining) fail('UNREACHABLE_REF', 'Every routable ref must be connected.');
      let previousLength = pathLength(remaining);
      const used = new Set<string>();

      while (mergedSteps(remaining).length > 4) {
        const firstFour = mergedSteps(remaining).slice(0, 4);
        const checkpoint = [...firstFour].reverse().find((step) => stableRefs.has(step.to));
        if (!checkpoint || checkpoint.to === current || used.has(checkpoint.to)) {
          fail('INVALID_CONTINUATION', 'A long route lacks a progressing stable checkpoint.');
        }
        const next = path(checkpoint.to, destination);
        if (!next || pathLength(next) >= previousLength) {
          fail('INVALID_CONTINUATION', 'Continuation must strictly reduce remaining path length.');
        }
        used.add(checkpoint.to);
        current = checkpoint.to;
        remaining = next;
        previousLength = pathLength(next);
      }
    }
  }
}

function assertEdgeGeometry(edge: FixtureEdge, positions: ReadonlyMap<string, Position>) {
  const from = positions.get(edge.from);
  const to = positions.get(edge.to);
  if (!from || !to) return;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const radians = (edge.bearing.degrees * Math.PI) / 180;
  const expectedX = Math.sin(radians);
  const expectedY = -Math.cos(radians);
  const cross = dx * expectedY - dy * expectedX;
  const dot = dx * expectedX + dy * expectedY;
  if (length === 0 || Math.abs(cross) > Math.max(1, length) * 1e-8 || dot <= 0) {
    fail('INVALID_EDGE_GEOMETRY', 'An edge bearing must agree with its authored coordinates.');
  }
}

export function loadRailFixture(raw: unknown): LoadedRailFixture {
  const parsed = railFixtureSchema.safeParse(raw);
  if (!parsed.success) fail('SCHEMA_INVALID', 'Fixture does not match the source schema.');
  const fixture: RailFixture = parsed.data;

  if (fixture.seats.filter((seat) => seat.available).length !== 47) {
    fail('INVALID_AVAILABILITY_COUNT', 'The demo fixture must expose exactly 47 available seats.');
  }

  const refs = [
    ...fixture.seats.map((seat) => seat.ref),
    ...fixture.landmarks.map((landmark) => landmark.key),
    ...fixture.referencePoints.map((point) => point.ref),
    ...fixture.aisleAnchors.map((anchor) => anchor.ref),
  ];
  assertUnique(refs, 'DUPLICATE_REF', 'Routable refs');
  assertUnique(fixture.pathEdges.map((edge) => edge.id), 'DUPLICATE_EDGE_ID', 'Edge IDs');
  assertUnique(
    fixture.seats.map((seat) => `${seat.row}:${seat.seatLetter}`),
    'DUPLICATE_SEAT_POSITION',
    'Seat row and letter pairs',
  );

  for (const required of ['entrance_front', 'entrance_rear', 'luggage_rack', 'cafe_car', 'restroom']) {
    if (!refs.includes(required)) fail('MISSING_REQUIRED_REF', `Missing required ref ${required}.`);
  }

  for (const item of [
    ...fixture.seats,
    ...fixture.landmarks,
    ...fixture.referencePoints,
    ...fixture.aisleAnchors,
  ]) {
    assertInBounds(item.position_m, fixture);
  }

  const refSet = new Set(refs);
  const positions = new Map<string, Position>([
    ...fixture.seats.map((seat) => [seat.ref, seat.position_m] as const),
    ...fixture.landmarks.map((landmark) => [landmark.key, landmark.position_m] as const),
    ...fixture.referencePoints.map((point) => [point.ref, point.position_m] as const),
    ...fixture.aisleAnchors.map((anchor) => [anchor.ref, anchor.position_m] as const),
  ]);
  for (const edge of fixture.pathEdges) {
    if (!refSet.has(edge.from) || !refSet.has(edge.to) || edge.from === edge.to) {
      fail('INVALID_EDGE_ENDPOINT', 'Edges must connect two distinct routable refs.');
    }
    assertEdgeGeometry(edge, positions);
  }

  const edges = directedEdges(fixture);
  const graph = createEdgeGraph(edges);
  const reachable = new Set<string>(['entrance_front']);
  const queue = ['entrance_front'];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.get(current) ?? []) {
      if (!reachable.has(edge.directedTo)) {
        reachable.add(edge.directedTo);
        queue.push(edge.directedTo);
      }
    }
  }
  if (refs.some((ref) => !reachable.has(ref))) {
    fail('UNREACHABLE_REF', 'Every routable ref must be reachable from entrance_front.');
  }

  const stableRefs = new Set([
    ...fixture.referencePoints.filter((point) => point.stableCheckpoint).map((point) => point.ref),
    ...fixture.aisleAnchors.filter((anchor) => anchor.stableCheckpoint).map((anchor) => anchor.ref),
  ]);
  validateContinuation(refs, stableRefs, graph);

  return {
    ...fixture,
    seats: fixture.seats
      .map((seat) => ({ ...seat, quietCar: fixture.car.quietCar }))
      .sort((a, b) => a.row - b.row || a.seatLetter.localeCompare(b.seatLetter)),
    routableRefs: refSet,
  };
}
