import type { FixtureEdge, LoadedRailFixture, Position } from './types';

export type TraversalEdge = FixtureEdge & {
  directedFrom: string;
  directedTo: string;
  degrees: number;
};

export function refPositions(fixture: LoadedRailFixture): ReadonlyMap<string, Position> {
  return new Map([
    ...fixture.seats.map((item) => [item.ref, item.position_m] as const),
    ...fixture.landmarks.map((item) => [item.key, item.position_m] as const),
    ...fixture.referencePoints.map((item) => [item.ref, item.position_m] as const),
    ...fixture.aisleAnchors.map((item) => [item.ref, item.position_m] as const),
  ]);
}

export function traversalEdges(fixture: LoadedRailFixture): TraversalEdge[] {
  return fixture.pathEdges.flatMap((edge) => {
    const forward = { ...edge, directedFrom: edge.from, directedTo: edge.to, degrees: edge.bearing.degrees };
    return edge.bidirectional
      ? [forward, { ...edge, directedFrom: edge.to, directedTo: edge.from, degrees: (edge.bearing.degrees + 180) % 360 }]
      : [forward];
  });
}

export function shortestPathEdges(
  fixture: LoadedRailFixture,
  from: string,
  to: string,
): TraversalEdge[] | null {
  if (from === to) return [];
  const adjacency = new Map<string, TraversalEdge[]>();
  for (const edge of traversalEdges(fixture)) {
    const outgoing = adjacency.get(edge.directedFrom) ?? [];
    outgoing.push(edge);
    adjacency.set(edge.directedFrom, outgoing);
  }
  for (const outgoing of adjacency.values()) {
    outgoing.sort((a, b) => a.directedTo.localeCompare(b.directedTo) || a.id.localeCompare(b.id));
  }

  const distance = new Map<string, number>([[from, 0]]);
  const pathKey = new Map<string, string>([[from, from]]);
  const previous = new Map<string, TraversalEdge>();
  const pending = new Set<string>([from]);
  while (pending.size > 0) {
    const current = [...pending].sort((a, b) =>
      (distance.get(a) ?? Infinity) - (distance.get(b) ?? Infinity) ||
      (pathKey.get(a) ?? a).localeCompare(pathKey.get(b) ?? b),
    )[0];
    pending.delete(current);
    if (current === to) break;
    for (const edge of adjacency.get(current) ?? []) {
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
  const result: TraversalEdge[] = [];
  let cursor = to;
  while (cursor !== from) {
    const edge = previous.get(cursor);
    if (!edge) return null;
    result.unshift(edge);
    cursor = edge.directedFrom;
  }
  return result;
}

export function pathDistance(edges: readonly TraversalEdge[]): number {
  return edges.reduce((total, edge) => total + edge.length_m, 0);
}
