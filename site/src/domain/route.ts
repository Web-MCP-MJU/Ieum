import { DomainError } from './errors';
import { shortestPathEdges } from './graph';
import {
  distanceValue,
  formatDistanceValue,
  normalizeRenderOptions,
  stepUnitsNote,
  renderDirection,
  walkingTimeSeconds,
} from './render';
import type { Landmark, LoadedRailFixture, RenderInput, Route, RouteSegment } from './types';

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

/** The rotation between two car-axis headings, or undefined when there is none. */
function turnPhrase(previousDegrees: number, degrees: number): string | undefined {
  const turn = ((degrees - previousDegrees) % 360 + 360) % 360;
  if (turn === 0) return undefined;
  if (turn === 180) return 'Turn around';
  return turn < 180 ? 'Turn right' : 'Turn left';
}

/**
 * Landmarks on the way, named. The fixture authors sign text and detectability
 * for exactly this, and without it a route is only distances and headings —
 * the shape O&M literature calls insufficient.
 */
function passedPhrase(
  landmarksPassed: readonly string[],
  byKey: ReadonlyMap<string, Landmark>,
): string {
  const names = landmarksPassed
    .map((key) => byKey.get(key))
    .filter((landmark): landmark is Landmark => landmark !== undefined)
    .map((landmark) => landmark.signpostedAs
      ? `${landmark.label} (signed ${landmark.signpostedAs})`
      : landmark.label);
  return names.length === 0 ? '' : ` You pass ${names.join(', then ')}.`;
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
  const landmarkByKey = new Map(fixture.landmarks.map((landmark) => [landmark.key, landmark]));
  const instructions = returned.map((segment, index) => {
    const value = distanceValue(segment.length_m, options);
    const distance = formatDistanceValue(value, options.units);
    const rows = segment.countedFeatures
      ? `, passing ${segment.countedFeatures.count} ${segment.countedFeatures.count === 1 ? 'row' : 'rows'}`
      : '';

    // Every segment this engine emits is car_axis, so the change in heading
    // between two of them is the rotation the traveler has to make. Without it
    // the instructions jump from one facing to another and never say to turn.
    const previous = returned[index - 1];
    const turn = previous === undefined
      ? undefined
      : turnPhrase(previous.bearing.degrees, segment.bearing.degrees);

    // Naming the direction again after a turn either repeats it or, worse,
    // describes the walk from the heading the traveler has just left.
    const lead = turn
      ? `${turn}, then continue for ${distance}`
      : `${index === 0 ? 'Move' : 'Continue'} ${renderDirection(
          segment.bearing.degrees,
          segment.bearing.frame,
          options.directionStyle,
        )} for ${distance}`;

    return `${lead}${rows}.${passedPhrase(segment.landmarksPassed, landmarkByKey)}`;
  });
  // Section 7-7: the total a listener reaches by adding up what they were told
  // must be the total they are told, so it is summed over displayed values.
  const spokenTotal = formatDistanceValue(
    Number(returned
      .reduce((sum, segment) => sum + distanceValue(segment.length_m, options), 0)
      .toFixed(1)),
    options.units,
  );

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
        ? `Continue to ${checkpointLabel(fixture, checkpointSegment.to)}, then request the remaining route. Total ${spokenTotal} so far.`
        : `Follow ${returned.length} route ${returned.length === 1 ? 'segment' : 'segments'} to ${requestedTo}. Total ${spokenTotal}.`,
      ...(options.units === 'steps' ? { unitsNote: stepUnitsNote(options.stepLength_m) } : {}),
    },
  };
}
