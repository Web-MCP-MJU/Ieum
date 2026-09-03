'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';

import type { Position, Route } from '@/src/domain/types';

type PixelPoint = { x: number; y: number };

type ProjectedSegment = {
  from: string;
  to: string;
  start: PixelPoint;
  end: PixelPoint;
};

type Projection = {
  width: number;
  height: number;
  segments: ProjectedSegment[];
  endpoint: PixelPoint | null;
};

type RouteOverlayProps = {
  route: Route;
  points: ReadonlyMap<string, Position>;
  stageRef: RefObject<HTMLDivElement | null>;
  gridRef: RefObject<HTMLDivElement | null>;
};

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function RouteOverlay({ route, points, stageRef, gridRef }: RouteOverlayProps) {
  const [projection, setProjection] = useState<Projection | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const grid = gridRef.current;
    if (!stage || !grid) return;

    const measure = () => {
      const stageRect = stage.getBoundingClientRect();
      const origin = {
        x: stageRect.left + stage.clientLeft,
        y: stageRect.top + stage.clientTop,
      };
      const seatPoints = new Map<string, PixelPoint>();
      const measuredSeats = [...grid.querySelectorAll<HTMLElement>('[id^="seat-"]')]
        .flatMap((seat) => {
          const ref = seat.id.slice('seat-'.length);
          const fixturePoint = points.get(ref);
          if (!fixturePoint) return [];
          const rect = seat.getBoundingClientRect();
          const pixelPoint = {
            x: rect.left + rect.width / 2 - origin.x,
            y: rect.top + rect.height / 2 - origin.y,
          };
          seatPoints.set(ref, pixelPoint);
          return [{ ref, fixturePoint, pixelPoint }];
        });
      if (measuredSeats.length === 0) return;

      const firstSeat = measuredSeats.reduce((first, seat) =>
        seat.fixturePoint.y < first.fixturePoint.y ? seat : first);
      const lastSeat = measuredSeats.reduce((last, seat) =>
        seat.fixturePoint.y > last.fixturePoint.y ? seat : last);
      const bColumn = measuredSeats.filter((seat) => seat.ref.endsWith('B'));
      const cColumn = measuredSeats.filter((seat) => seat.ref.endsWith('C'));
      if (bColumn.length === 0 || cColumn.length === 0) return;
      const aisleX = (
        average(bColumn.map((seat) => seat.pixelPoint.x)) +
        average(cColumn.map((seat) => seat.pixelPoint.x))
      ) / 2;

      const project = (ref: string): PixelPoint | undefined => {
        const seatPoint = seatPoints.get(ref);
        if (seatPoint) return seatPoint;
        const fixturePoint = points.get(ref);
        if (!fixturePoint) return undefined;
        const authoredSpan = lastSeat.fixturePoint.y - firstSeat.fixturePoint.y;
        const renderedSpan = lastSeat.pixelPoint.y - firstSeat.pixelPoint.y;
        return {
          x: aisleX,
          y: firstSeat.pixelPoint.y +
            ((fixturePoint.y - firstSeat.fixturePoint.y) / authoredSpan) * renderedSpan,
        };
      };

      const segments = route.segments.flatMap((segment) => {
        const start = project(segment.from);
        const end = project(segment.to);
        return start && end ? [{ from: segment.from, to: segment.to, start, end }] : [];
      });
      setProjection({
        width: stage.clientWidth,
        height: stage.clientHeight,
        segments,
        endpoint: segments.at(-1)?.end ?? null,
      });
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [gridRef, points, route, stageRef]);

  if (!projection) return null;
  const viewBox = `0 0 ${projection.width} ${projection.height}`;

  return (
    <>
      <svg
        className="route-overlay"
        viewBox={viewBox}
        preserveAspectRatio="none"
        aria-label={`Route from ${route.from} to ${route.to}`}
      >
        {projection.segments.map((segment, index) => <line
          key={`${segment.from}-${segment.to}-${index}`}
          data-from={segment.from}
          data-to={segment.to}
          x1={segment.start.x}
          y1={segment.start.y}
          x2={segment.end.x}
          y2={segment.end.y}
        />)}
      </svg>
      {projection.endpoint && <svg
        className="route-marker-overlay"
        viewBox={viewBox}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <circle
          className="route-endpoint-halo"
          cx={projection.endpoint.x}
          cy={projection.endpoint.y}
          r="17"
        />
        <circle
          className="route-endpoint-marker"
          cx={projection.endpoint.x}
          cy={projection.endpoint.y}
          r="17"
        />
      </svg>}
    </>
  );
}
