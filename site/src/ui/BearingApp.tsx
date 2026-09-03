'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- ARIA grid requires non-table spatial controls. */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, MapPin, RotateCcw, Route as RouteIcon, Search, Sparkles } from 'lucide-react';

import { createBearingApplication, type BearingApplication, type ConfirmationOutcome } from '@/src/application/use-cases';
import { railFixture } from '@/src/data/fixture';
import type { Comparison, Description, RailCandidate } from '@/src/domain/types';
import { registerBearingTools, type DocumentWithModelContext, type WebMCPCapability } from '@/src/webmcp/register';

type PendingConfirmation = { resolve(value: ConfirmationOutcome): void; reject(reason?: unknown): void };

function createConfirmationBroker(onOpen: () => void) {
  let pending: PendingConfirmation | null = null;
  return {
    port: {
      open(signal: AbortSignal) {
        onOpen();
        return new Promise<ConfirmationOutcome>((resolve, reject) => {
          pending = { resolve, reject };
          signal.addEventListener('abort', () => {
            pending = null;
            reject(signal.reason);
          }, { once: true });
        });
      },
    },
    respond(outcome: ConfirmationOutcome) {
      const request = pending;
      pending = null;
      request?.resolve(outcome);
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The action could not be completed.';
}

export function BearingApp() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmation] = useState(() => createConfirmationBroker(() => setDialogOpen(true)));
  const [app] = useState<BearingApplication>(() => {
    const application = createBearingApplication(railFixture, confirmation.port);
    application.getLayout();
    return application;
  });
  const [results, setResults] = useState<RailCandidate[]>(
    () => app.query({ availableOnly: true }).data.items,
  );
  const [activeRef, setActiveRef] = useState('6-12A');
  const [description, setDescription] = useState<Description | null>(() => app.describe({ ref: '6-12A' }));
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [facing, setFacing] = useState('any');
  const [side, setSide] = useState('any');
  const [minimumFootSpace, setMinimumFootSpace] = useState('');
  const [capability, setCapability] = useState<WebMCPCapability>('unsupported');
  const [announcement, setAnnouncement] = useState('Ready to explore the car.');
  const state = useSyncExternalStore(
    (listener) => app.subscribe(listener),
    () => app.getState(),
    () => app.getState(),
  );

  useEffect(() => {
    let dispose = () => {};
    void registerBearingTools(document as DocumentWithModelContext, app).then((registration) => {
      setCapability(registration.capability);
      dispose = () => registration.dispose();
    });
    return () => dispose();
  }, [app]);

  const runQuery = () => {
    try {
      const query = app.query({
        rail: {
          ...(facing === 'any' ? {} : { facing: facing as 'forward' | 'backward' }),
          ...(side === 'any' ? {} : { side: side as 'window' | 'aisle' }),
        },
        ...(minimumFootSpace ? { needs: { minFootSpace_in2: Number(minimumFootSpace) } } : {}),
      });
      setResults(query.data.items);
      setAnnouncement(`${query.data.totalMatched} seats matched. Showing ${query.data.items.length}.`);
    } catch (error) { setAnnouncement(errorMessage(error)); }
  };

  const inspect = (ref: string) => {
    setActiveRef(ref);
    try {
      setDescription(app.describe({ ref }));
      setAnnouncement(`${ref} details opened.`);
    } catch (error) { setAnnouncement(errorMessage(error)); }
  };

  const selectActive = () => {
    try {
      app.select({ ref: activeRef });
      setAnnouncement(`${activeRef} added to your selection.`);
    } catch (error) { setAnnouncement(errorMessage(error)); }
  };

  const showRoute = () => {
    try {
      app.getRoute({ from: 'entrance_front', to: activeRef });
      setAnnouncement(`Route to ${activeRef} is ready.`);
    } catch (error) { setAnnouncement(errorMessage(error)); }
  };

  const compareSelected = () => {
    try {
      setComparison(app.compare({ refs: state.selection.slice(0, 4) }));
      setAnnouncement('Selected seats are ready to compare.');
    } catch (error) { setAnnouncement(errorMessage(error)); }
  };

  const moveGridFocus = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const rowStart = Math.floor(index / 4) * 4;
    let next = index;
    if (event.key === 'ArrowLeft' && index > rowStart) next -= 1;
    if (event.key === 'ArrowRight' && index < rowStart + 3) next += 1;
    if (event.key === 'ArrowUp' && index >= 4) next -= 4;
    if (event.key === 'ArrowDown' && index < railFixture.seats.length - 4) next += 4;
    if (event.key === 'Home') next = rowStart;
    if (event.key === 'End') next = rowStart + 3;
    if (next !== index) {
      event.preventDefault();
      inspect(railFixture.seats[next].ref);
      document.getElementById(`seat-${railFixture.seats[next].ref}`)?.focus();
    }
    if (event.key === 'Enter') inspect(railFixture.seats[index].ref);
    if (event.key === ' ') {
      event.preventDefault();
      const seat = railFixture.seats[index];
      if (!seat.available) setAnnouncement(`${seat.ref} is unavailable and was not selected.`);
      else {
        setActiveRef(seat.ref);
        try {
          app.select({ ref: seat.ref });
          setAnnouncement(`${seat.ref} added to your selection.`);
        } catch (error) { setAnnouncement(errorMessage(error)); }
      }
    }
  };

  const settleConfirmation = (outcome: ConfirmationOutcome) => {
    setDialogOpen(false);
    confirmation.respond(outcome);
  };

  const activeSeat = railFixture.seats.find((seat) => seat.ref === activeRef)!;
  const point = new Map([
    ...railFixture.seats.map((item) => [item.ref, item.position_m] as const),
    ...railFixture.landmarks.map((item) => [item.key, item.position_m] as const),
    ...railFixture.referencePoints.map((item) => [item.ref, item.position_m] as const),
    ...railFixture.aisleAnchors.map((item) => [item.ref, item.position_m] as const),
  ]);

  return (
    <main aria-label="Bearing rail workspace" className="app-shell">
      <div inert={dialogOpen ? true : undefined}>
        <header className="site-header">
          <div>
            <p className="eyebrow">Spatial accessibility bridge</p>
            <h1>Bearing</h1>
            <p className="subtitle">Interrogate the space. Keep the decision yours.</p>
          </div>
          <div className={`capability capability-${capability}`}>
            <Sparkles aria-hidden="true" size={16} />
            {capability === 'available' ? 'WebMCP connected' : 'Human controls ready'}
          </div>
        </header>

        <section className="workspace-shell" aria-label="Rail decision workspace">
          <aside className="panel filter-panel" aria-labelledby="filters-title">
            <div className="panel-heading"><Search aria-hidden="true" /><div><p className="eyebrow">01 · Discover</p><h2 id="filters-title">Find a seat</h2></div></div>
            <label>Facing<select value={facing} onChange={(event) => setFacing(event.target.value)}><option value="any">Any direction</option><option value="forward">Forward</option><option value="backward">Backward</option></select></label>
            <label>Position<select value={side} onChange={(event) => setSide(event.target.value)}><option value="any">Window or aisle</option><option value="window">Window</option><option value="aisle">Aisle</option></select></label>
            <label>Minimum foot space<input inputMode="numeric" min="0" value={minimumFootSpace} onChange={(event) => setMinimumFootSpace(event.target.value)} placeholder="e.g. 280 sq in" /></label>
            <button className="primary-action" type="button" onClick={runQuery}><Search aria-hidden="true" size={18} />Find matching seats</button>
            <p className="result-count"><strong>{results.length}</strong> candidates shown</p>
            <ol className="candidate-list">
              {results.map((candidate) => <li key={candidate.ref}><button type="button" onClick={() => inspect(candidate.ref)} aria-current={candidate.ref === activeRef ? 'true' : undefined}><span>{candidate.label}</span><small>${candidate.price_usd} · {candidate.rail.side}</small></button></li>)}
            </ol>
          </aside>

          <section className="panel layout-panel" aria-labelledby="layout-title">
            <div className="layout-header"><div><p className="eyebrow">02 · Understand</p><h2 id="layout-title">Car 6 · Business Class</h2><p><strong>60 seats</strong> · <span className="available-copy">47 available</span> · Quiet car</p></div><MapPin aria-hidden="true" size={28} /></div>
            <div className="car-stage">
              {state.activeRoute && <svg className="route-overlay" viewBox="0 0 310 2640" aria-label={`Route from ${state.activeRoute.from} to ${state.activeRoute.to}`}>
                {state.activeRoute.segments.map((segment) => {
                  const from = point.get(segment.from); const to = point.get(segment.to);
                  return from && to ? <line key={`${segment.from}-${segment.to}`} x1={from.x * 100} y1={from.y * 100} x2={to.x * 100} y2={to.y * 100} /> : null;
                })}
              </svg>}
              <div className="car-nose">FRONT ENTRANCE</div>
              <div role="grid" aria-label="Car 6 seat grid" className="seat-grid">
                {Array.from({ length: 15 }, (_, rowIndex) => (
                  <div role="row" className="seat-row" key={rowIndex + 7}>
                    <span className="row-number" aria-hidden="true">{rowIndex + 7}</span>
                    {railFixture.seats.slice(rowIndex * 4, rowIndex * 4 + 4).map((seat, columnIndex) => {
                      const selected = state.selection.includes(seat.ref);
                      const highlighted = state.highlightedRefs.includes(seat.ref);
                      const onRoute = state.activeRoute?.segments.some((segment) => segment.from === seat.ref || segment.to === seat.ref);
                      return <button
                        id={`seat-${seat.ref}`}
                        key={seat.ref}
                        type="button"
                        role="gridcell"
                        tabIndex={seat.ref === activeRef ? 0 : -1}
                        aria-disabled={!seat.available}
                        aria-selected={selected}
                        aria-label={`Seat ${seat.row}${seat.seatLetter}, ${seat.available ? 'available' : 'unavailable'}, $${seat.price_usd}, ${seat.facing}-facing ${seat.side}`}
                        className={`seat ${!seat.available ? 'unavailable' : ''} ${selected ? 'selected' : ''} ${highlighted ? 'highlighted' : ''} ${onRoute ? 'on-route' : ''}`}
                        onClick={() => inspect(seat.ref)}
                        onKeyDown={(event) => moveGridFocus(event, rowIndex * 4 + columnIndex)}
                      >{seat.seatLetter}</button>;
                    })}
                  </div>
                ))}
              </div>
              <div className="car-nose rear">REAR · CAFÉ · RESTROOM</div>
            </div>
            {state.activeRoute && <section className="route-summary" aria-label="Active route"><h3><RouteIcon aria-hidden="true" size={18} />Route to {state.activeRoute.requestedTo}</h3><ol>{state.activeRoute.rendered.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>}
          </section>

          <aside className="right-column">
            <section className="panel detail-panel" aria-labelledby="detail-title">
              <p className="eyebrow">03 · Decide</p><h2 id="detail-title">Seat {activeSeat.row}{activeSeat.seatLetter}</h2>
              {description && <><p>{description.line}</p><dl><div><dt>Price</dt><dd>${activeSeat.price_usd}</dd></div><div><dt>Position</dt><dd>{activeSeat.side}</dd></div><div><dt>Facing</dt><dd>{activeSeat.facing}</dd></div><div><dt>Foot space</dt><dd>{activeSeat.footSpace_in2} sq in</dd></div></dl></>}
              <div className="action-stack"><button className="primary-action" type="button" disabled={!activeSeat.available || state.confirmationStatus !== 'draft'} onClick={selectActive}><Check aria-hidden="true" size={18} />Select seat {activeSeat.row}{activeSeat.seatLetter}</button><button className="secondary-action" type="button" onClick={showRoute}><RouteIcon aria-hidden="true" size={18} />Route from front</button></div>
            </section>

            <section className="panel selection-panel" aria-label="Current selection">
              <div className="panel-heading"><Check aria-hidden="true" /><div><p className="eyebrow">Your decision</p><h2>Selected seats</h2></div></div>
              {state.selection.length ? <ul>{state.selection.map((ref) => <li key={ref}><strong>{ref}</strong><span>${railFixture.seats.find((seat) => seat.ref === ref)?.price_usd}</span></li>)}</ul> : <p>No seats selected</p>}
              <p className="selection-total"><span>Total</span><strong>${state.priceTotal_usd}</strong></p>
              <div className="action-stack"><button className="secondary-action" type="button" disabled={!state.history.length || state.confirmationStatus !== 'draft'} onClick={() => { try { app.undo(); setAnnouncement('Last selection undone.'); } catch (error) { setAnnouncement(errorMessage(error)); } }}><RotateCcw aria-hidden="true" size={18} />Undo last selection</button><button type="button" className="secondary-action" disabled={state.selection.length < 2} onClick={compareSelected}>Compare selected</button><button className="confirm-action" type="button" disabled={!state.selection.length || state.confirmationStatus !== 'draft'} onClick={() => { void app.confirm().then(({ outcome }) => setAnnouncement(`Selection ${outcome}.`)).catch((error: unknown) => setAnnouncement(errorMessage(error))); }}>Review and confirm</button></div>
            </section>

            {comparison && <section className="panel comparison-panel" aria-label="Seat comparison"><h2>Comparison</h2><div className="comparison-scroll"><table><thead><tr><th>Seat</th>{comparison.rows.map((row) => <th key={row.ref}>{row.ref}</th>)}</tr></thead><tbody>{comparison.axes.slice(0, 5).map((axis) => <tr key={axis.key}><th>{axis.label}</th>{comparison.rows.map((row) => <td key={row.ref}>{String(row.values[axis.key])}</td>)}</tr>)}</tbody></table></div></section>}

            <section className="panel tool-log" aria-label="Tool activity"><p className="eyebrow">Shared activity</p><h2>Human + Agent log</h2><ol>{state.toolLog.slice(-6).reverse().map((entry) => <li key={entry.callId}><span>{entry.name}</span><small>{entry.origin} · {entry.status}</small></li>)}</ol></section>
          </aside>
        </section>
      </div>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {dialogOpen && <div className="dialog-backdrop"><dialog open aria-modal="true" aria-labelledby="confirm-title" className="confirmation-dialog"><p className="eyebrow">Human confirmation required</p><h2 id="confirm-title">Confirm {state.selection.length} selected {state.selection.length === 1 ? 'seat' : 'seats'}?</h2><p>This demo does not book or charge anything. Your action only confirms the current local decision.</p><p className="dialog-total">Total · ${state.priceTotal_usd}</p><div className="dialog-actions"><button type="button" className="secondary-action" autoFocus onClick={() => settleConfirmation('cancelled')}>Keep reviewing</button><button type="button" className="confirm-action" onClick={() => settleConfirmation('confirmed')}>Confirm selection</button></div></dialog></div>}
    </main>
  );
}
