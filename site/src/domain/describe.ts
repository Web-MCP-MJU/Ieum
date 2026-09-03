import { DomainError } from './errors';
import { pathDistance, refPositions, shortestPathEdges } from './graph';
import { normalizeRenderOptions, renderDirection, renderDistance } from './render';
import type { Description, LoadedRailFixture, RenderInput } from './types';

export function describeRef(
  fixture: LoadedRailFixture,
  ref: string,
  input: RenderInput = {},
): Description {
  if (!fixture.routableRefs.has(ref)) throw new DomainError('INVALID_REF');
  const options = normalizeRenderOptions(input);
  const seat = fixture.seats.find((item) => item.ref === ref);
  const landmark = fixture.landmarks.find((item) => item.key === ref);
  const reference = fixture.referencePoints.find((item) => item.ref === ref) ??
    fixture.aisleAnchors.find((item) => item.ref === ref);
  const label = seat ? `Seat ${seat.row}${seat.seatLetter}` : (landmark?.label ?? reference?.label ?? ref);
  const attributes: Description['attributes'] = seat
    ? { ...seat, position_m: { ...seat.position_m }, features: [...seat.features] }
    : landmark
      ? {
          ...landmark,
          position_m: { ...landmark.position_m },
          sensoryChannels: [...landmark.sensoryChannels],
          detectability: { ...landmark.detectability },
        }
      : { ...reference, position_m: { ...reference!.position_m } };
  const landmarkRefs = new Set(fixture.landmarks.map((item) => item.key));
  const relations = fixture.landmarks
    .filter((item) => item.key !== ref)
    .map((item) => {
      const path = shortestPathEdges(fixture, ref, item.key);
      if (!path) throw new DomainError('NO_ROUTE');
      const distance_m = pathDistance(path);
      const distance = renderDistance(distance_m, options).rendered;
      const direction = path[0]
        ? renderDirection(path[0].degrees, 'car_axis', options.directionStyle)
        : '';
      return {
        to: item.key,
        distance_m,
        rendered: direction ? `${distance} ${direction}` : distance,
        landmarksPassed: path
          .map((edge) => edge.directedTo)
          .filter((pathRef) => pathRef !== item.key && landmarkRefs.has(pathRef)),
      };
    })
    .sort((a, b) => a.distance_m - b.distance_m || a.to.localeCompare(b.to));
  const positions = refPositions(fixture);
  if (!positions.has(ref)) throw new DomainError('INVALID_REF');
  return {
    ref,
    line: seat
      ? `${label} is a ${seat.facing}-facing ${seat.side} seat.`
      : `${label} is a stable reference in the current layout.`,
    attributes,
    relations,
    followUps: seat
      ? ['Ask for the route from the front entrance.', 'Compare this seat with another candidate.']
      : ['Ask for nearby available seats.', 'Ask for a route to this reference.'],
    ...(options.units === 'steps' ? { unitsNote: renderDistance(0, options).unitsNote } : {}),
  };
}
