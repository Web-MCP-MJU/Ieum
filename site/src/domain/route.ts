import { DomainError } from './errors';
import { shortestPathEdges } from './graph';
import { normalizeRenderOptions, renderDirection, renderDistance, walkingTimeSeconds } from './render';
import type { LoadedRailFixture, RenderInput, Route, RouteSegment } from './types';

function rowEndpoint(ref: string): boolean {
  return /^row_\d+_aisle$/.test(ref);
}

function mergeSegments(segments: RouteSegment[]): RouteSegment[] {
  const merged: RouteSegment[] = [];
  for (const segment of segments) {
    const last = merged.at(-1);
    if (last && last.to === segment.from &&
      last.pathway_mode === segment.pathway_mode &&
      last.bearing.frame === segment.bearing.frame &&
      last.bearing.degrees === segment.bearing.degrees) {
      last.to = segment.to;
      last.length_m += segment.length_m;
      last.traversal_time_s += segment.traversal_time_s;
      last.landmarksPassed.push(...segment.landmarksPassed);
      if (segment.countedFeatures) {
        last.countedFeatures = {
          feature: 'row',
          count: (last.countedFeatures?.count ?? 0) + segment.countedFeatures.count,
        };
      }
      if (segment.min_width_m !== undefined) {
        last.min_width_m = Math.min(last.min_width_m ?? Infinity, segment.min_width_m);
      }
      if (segment.stair_count !== undefined) {
        last.stair_count = (last.stair_count ?? 0) + segment.stair_count;
      }
    } else {
      merged.push({
        ...segment,
        bearing: { ...segment.bearing },
        landmarksPassed: [...segment.landmarksPassed],
        ...(segment.countedFeatures ? { countedFeatures: { ...segment.countedFeatures } } : {}),
      });
    }
  }
  return merged;
}

function stableCheckpointRefs(fixture: LoadedRailFixture): ReadonlySet<string> {
  return new Set([
    ...fixture.referencePoints.filter((item) => item.stableCheckpoint).map((item) => item.ref),
    ...fixture.aisleAnchors.filter((item) => item.stableCheckpoint).map((item) => item.ref),
  ]);
}

function checkpointLabel(fixture: LoadedRailFixture, ref: string): string {
  return fixture.referencePoints.find((item) => item.ref === ref)?.label ??
    fixture.aisleAnchors.find((item) => item.ref === ref)?.label ?? ref;
}

export function getRoute(
  fixture: LoadedRailFixture,
  from: string,
  requestedTo: string,
  input: RenderInput = {},
): Route {
  if (!fixture.routableRefs.has(from) || !fixture.routableRefs.has(requestedTo)) {
    throw new DomainError('INVALID_REF');
  }
  const options = normalizeRenderOptions(input);
  const path = shortestPathEdges(fixture, from, requestedTo);
  if (!path) throw new DomainError('NO_ROUTE');
  const landmarkRefs = new Set(fixture.landmarks.map((landmark) => landmark.key));
  const allSegments = mergeSegments(path.map((edge) => ({
    pathway_mode: edge.pathway_mode,
    from: edge.directedFrom,
    to: edge.directedTo,
    length_m: edge.length_m,
    traversal_time_s: walkingTimeSeconds(edge.length_m, options.walkSpeedPercent),
    ...(edge.stair_count === undefined ? {} : { stair_count: edge.stair_count }),
    ...(edge.min_width_m === undefined ? {} : { min_width_m: edge.min_width_m }),
    ...(edge.max_slope === undefined ? {} : { max_slope: edge.max_slope }),
    ...(edge.signpostedAs === undefined ? {} : { signpostedAs: edge.signpostedAs }),
    bearing: { frame: 'car_axis' as const, degrees: edge.degrees },
    ...(rowEndpoint(edge.directedTo)
      ? { countedFeatures: { feature: 'row', count: 1 } }
      : {}),
    landmarksPassed: landmarkRefs.has(edge.directedTo) ? [edge.directedTo] : [],
  })));

  const stable = stableCheckpointRefs(fixture);
  const checkpointSegment = allSegments.length > 4
    ? allSegments.slice(0, 4).reverse().find((segment) => stable.has(segment.to))
    : undefined;
  if (allSegments.length > 4 && !checkpointSegment) throw new DomainError('NO_ROUTE');
  const returned = checkpointSegment
    ? allSegments.slice(0, allSegments.indexOf(checkpointSegment) + 1)
    : allSegments;
  const to = checkpointSegment?.to ?? requestedTo;
  const encounteredRefs = new Set(returned.flatMap((segment) => segment.landmarksPassed));
  const landmarks = fixture.landmarks.filter((landmark) => encounteredRefs.has(landmark.key));
  const totalLength_m = returned.reduce((sum, segment) => sum + segment.length_m, 0);
  const totalTraversalTime_s = returned.reduce(
    (sum, segment) => sum + segment.traversal_time_s,
    0,
  );
  const instructions = returned.map((segment) => {
    const distance = renderDistance(segment.length_m, options).rendered;
    const direction = renderDirection(
      segment.bearing.degrees,
      segment.bearing.frame,
      options.directionStyle,
    );
    const rows = segment.countedFeatures
      ? `, passing ${segment.countedFeatures.count} ${segment.countedFeatures.count === 1 ? 'row' : 'rows'}`
      : '';
    return `Move ${direction} for ${distance}${rows}.`;
  });
  return {
    from,
    requestedTo,
    to,
    totalLength_m,
    totalTraversalTime_s,
    segments: returned,
    landmarks,
    requiresContinuation: checkpointSegment !== undefined,
    ...(checkpointSegment
      ? { checkpoint: { ref: checkpointSegment.to, label: checkpointLabel(fixture, checkpointSegment.to) } }
      : {}),
    rendered: {
      units: options.units,
      directionStyle: options.directionStyle,
      instructions,
      summary: checkpointSegment
        ? `Continue to ${checkpointLabel(fixture, checkpointSegment.to)}, then request the remaining route.`
        : `Follow ${returned.length} route ${returned.length === 1 ? 'segment' : 'segments'} to ${requestedTo}.`,
      ...(options.units === 'steps' ? { unitsNote: renderDistance(0, options).unitsNote } : {}),
    },
  };
}
