# Bearing Working Demo Site Design

## 1. Decision and authority

Build Bearing as a single-route, English, publicly deployable working web application on `feat/bearing-demo`. It implements the complete rail MVP defined by `docs/PRD v0.3.md` and corrected by `docs/Architecture.md`; it does not implement booking, payment, login, a backend, real inventory, or the hotel runtime.

Authority order for implementation decisions:

1. Current WebMCP draft and official challenge rules for API and submission facts.
2. `docs/PRD v0.3.md` for product intent and complete scope.
3. `docs/Architecture.md`, `docs/contracts/bearing-output.schema.json`, and `docs/contracts/ieum-rail-fixture.schema.json` for technical contracts.
4. Root `DESIGN.md` for normative visual tokens and visual-component rules.

The site uses Google Labs' current alpha `DESIGN.md` format: normative YAML tokens plus the canonical prose section sequence. The implementation maps those tokens to shared CSS custom properties and validates the source document with `@google/design.md`.

## 2. Chosen product shape

Use a single-page working surface rather than a landing page plus app, or separate human and WebMCP harnesses. This keeps the challenge argument observable: a person and an external browser Agent use the same authored spatial model, Application use cases, and state while only the person can complete confirmation.

The first viewport exposes the task rather than promotional copy. On desktop it shows query controls, the rail-seat workspace, and decision state/tool activity. Responsive layouts preserve this document order and all functions without introducing a separate mobile feature set.

## 3. User journeys

### 3.1 Human-only journey

With WebMCP unavailable, a keyboard and screen-reader user can:

1. inspect layout facts and filter seats;
2. move through the named seat grid;
3. describe a stable ref and request a structured route;
4. choose 2–4 candidates and compare identical axes;
5. select an available seat, inspect totals, and undo;
6. open the confirmation dialog and explicitly confirm or cancel.

### 3.2 Agent-assisted journey

An external browser Agent discovers exactly nine tools and can complete:

`a11y.get_layout → a11y.query → a11y.describe/a11y.get_route → a11y.compare → a11y.select → a11y.get_selection/a11y.undo → a11y.confirm`

Every invocation uses the same Application store observed by the human and applies only its defined visible effects: result refs may update highlights, routes update the route projection, mutations update selection/history, and every invocation updates its own lifecycle log entry. `a11y.confirm` remains pending in the same call until the human confirms, cancels, the 120-second timeout fires, or the call aborts.

## 4. Experience architecture

### 4.1 Primary regions

- **Control rail:** all rail-applicable query criteria plus units, step length, direction style, and walking-speed preferences.
- **Workspace:** layout summary, result summary, accessible seat grid, selected-seat description, structured route instructions, and SVG overlay derived from returned route segments.
- **Decision rail:** compare picker/table, persistent selection summary, undo and confirmation controls, capability banner, and tool log.

### 4.2 Responsive behavior

- 1216px and above: three-region grid with 24px outer gutters, a 300px control rail, flexible workspace of at least 480px, 340px decision rail, and 24px internal gaps.
- 760–1215px: 280px controls plus a flexible workspace; the decision rail spans below both columns.
- 759px and below: one document-order column with no horizontal page or component scrolling. Comparison always becomes candidate-labeled definition-list rows, preserving every axis association.

Only the desktop decision-rail selection summary is sticky (`top: 16px`). It becomes static below 1216px and never obscures focused content or the dialog.

### 4.3 Visual identity

Bearing uses high-contrast rail-instrument styling: warm ivory foundation, deep ink text, cobalt actions/routes, amber selection, and violet keyboard focus. State is never encoded by color alone. Panels are tonal and outlined; the confirmation modal is the only elevated surface. There is no hero, copied operator branding, decorative rail artwork, stock image, gradient, or glass effect.

## 5. Technical architecture

Create a one-route React and TypeScript Site with shadcn primitives where they meet the contract. Keep each boundary independently testable:

```text
independently authored rail fixture
            ↓
pure Domain Core ↔ single App Store
            ↑               ↑
Application use cases       │
      ↑                 Accessible UI
Spatial Bridge
      ↑
WebMCP Adapter
```

- **Fixture:** one unbranded `Car 6, Business Class` JSON layout with meter-source coordinates, 60 seats, stable refs/checkpoints, directed `car_axis` path bearings, lengths, landmarks, prices, availability, accessibility facts, and a car-level `quietCar` boolean. Traversal time is derived per call from path length and walking-speed preference; it is never authored twice. Exhaustive ordered-pair validation proves every continuation leg progresses and terminates. Fixture loading copies the validated car fact to each canonical `Seat.quietCar`; query tests cover both requested boolean values, and `Candidate.rail.quietCar` exposes the result fact.
- **Domain:** deterministic query, compare, describe, route, continuation, and rendering functions without DOM dependencies.
- **Application:** nine use cases plus atomic visible/log/state effects, derived totals, one-step undo, and confirmation coordination.
- **Bridge:** exact input validation and exact output/error projection from the canonical contracts.
- **WebMCP Adapter:** capability detection, nine top-level registrations, lifecycle/cancellation, and plain JSON results only.
- **UI:** consumes Application directly; it never calls public tools and never recalculates route geometry.

The site has no server state or authentication. Mutable demo state is in-memory browser-local state and resets on reload. Bootstrap validates `docs/contracts/ieum-rail-fixture.schema.json` plus the Architecture's cross-field invariants before Domain or Adapter creation. A malformed fixture renders recovery UI and exposes zero tools. No third-party operator API, diagram, screenshot, or proprietary dataset is used.

Atkinson Hyperlegible is installed from a pinned `@fontsource/atkinson-hyperlegible` package and served from the application bundle; the site makes no runtime font-CDN request. Icons come only from a pinned `lucide-react` package and are bundled. `THIRD_PARTY_NOTICES.md` records exact package version, upstream URL, detected package license, font/icon asset license, and included license-file path after dependencies are locked. Missing or incompatible license evidence blocks deployment and causes the implementation to fall back to system fonts or text-only controls rather than substituting an unverified asset.

## 6. State and data flow

Every non-confirmation human or Agent use case produces one atomic Application transition:

1. validate input and current state;
2. call pure Domain logic;
3. commit selection/history/route/highlight/log changes atomically;
4. derive public `SelectionState` and presentation strings;
5. notify accessible UI projections;
6. return the corresponding plain JSON tool result when Agent-originated.

Confirmation is one unresolved call but two atomic transitions: an open transition captures the private restore snapshot, sets `confirmation_pending`, creates the pending log entry, and reveals the dialog; a later terminal transition confirms or restores state and terminally updates the same log entry. No single transaction is held open across human think time.

Each use case receives a collision-resistant call ID and origin (`human` or `agent`). The log appends `pending` before execution and terminally updates that exact entry to `succeeded`, `domain_failed`, `cancelled`, or `rejected`, including start/completion times, ordered result refs, normalized query criteria, fixed error code, and confirmation outcome where applicable. A zero-result query is successful, not failed.

Invalid criteria, refs, selection cardinality, unavailable selection, empty undo, and confirmation locks return the Architecture's expected error vocabulary without partial mutation. Unexpected errors and cancellation reject rather than impersonating domain failures.

## 7. Safety and accessibility

- Render arguments, refs, labels, sign text, logs, status, and errors only through escaped text nodes; never use raw HTML injection.
- Bound Agent-input ref strings to 1–128 characters and other Agent-input free text to 1–300 characters. Independently authored fixture/result strings use the canonical fixture/output schemas and their cross-field validator; visible logs use an escaped, length-bounded projection.
- Implement named grid/row/gridcell ownership across all 60 seats. Exactly one cell is in the roving tab stop. Left/Right moves to the nearest cell in-row across the aisle; Up/Down moves by seat letter in the adjacent row with nearest-x fallback; none wrap. Home/End moves to row edges, Enter describes, and Space selects only an available seat. Unavailable cells remain focusable with `aria-disabled="true"` and announce why selection did not change.
- Compose overlapping cell states in this order: availability, route marker, selected fill/check, transient highlight, then the outer focus ring. Preserve each earlier state's non-color cue.
- Implement a named `aria-modal` dialog, inert background, contained focus, Escape cancellation, terminal cleanup, and focus restoration.
- Use concise polite status announcements and test Agent-originated changes for duplicate speech.
- Make the complete human journey usable with WebMCP disabled.
- Describe Bearing as an engineering prototype; do not claim certification or completed blind-user validation.

## 8. Error, loading, and capability states

The fixture loads locally with the initial page, so the normal experience has no remote loading dependency. Successful bootstrap initializes the fixture/store, runs human-originated `get_layout({})` and `query({ availableOnly: true })`, and displays the first 12 stable results, applied-default summary, and corresponding log entries in the first viewport. A fixture/bootstrap failure replaces the working surface with a concise recovery message and never registers tools.

WebMCP capability states distinguish available, unsupported, insecure context, permission denial, security rejection, and other registration failure. Registration is atomic: prebuild all definitions, register all nine under one controller, and on any rejection abort/await cleanup and expose zero tools. Retry uses a fresh controller rather than resuming a partial loop. The banner explains the state while keeping all human controls enabled. Zero query results are a successful empty state with a deterministic relaxation hint; 13+ results return the first 12 with a deterministic narrowing hint.

## 9. Verification strategy

### 9.1 Automated

- Unit-test query 0/12/13+, stable ordering, hints, render units, compare 1/2/4/5 and unavailable refs, eight exact route cases, continuation, totals, and serialization.
- Test selection derivation, append-idempotence, undo snapshots, expected-failure non-mutation, confirm/cancel/timeout/abort, and mutation locks.
- Test exactly nine WebMCP registrations, exact names/schemas/annotations, registration versus execution signals, capability mapping, and JSON result shape with a controlled `document.modelContext` test double. Reject positions 1–9 independently and prove zero remaining tools, no lifecycle leak, and clean retry each time.
- Test the human journey and accessibility semantics with component/integration tests, exact grid keyboard events, fake timers, and automated accessibility assertions.
- Test at 200% and 400% browser zoom, 320 CSS px reflow, WCAG text-spacing overrides, Chromium forced-colors emulation, and a real Windows high-contrast walkthrough. No task content or focus indicator may clip, overlap, disappear, or require two-dimensional scrolling.
- Verify `document.fonts` loads bundled Atkinson 400/700, Lucide SVGs are bundled, all runtime requests stay same-origin and expected, installed license files match `THIRD_PARTY_NOTICES.md`, and system-font/text-only fallback remains usable when either asset is unavailable.
- Build the deployable Site and lint `DESIGN.md`; zero errors and zero warnings are required.

### 9.2 Runtime evidence

- Exercise all nine real calls in Chrome with WebMCP testing enabled.
- Exercise the judging journey in ChatGPT's in-app browser.
- Complete keyboard-only, screen-reader engineering, monitor-off, capability-disabled, confirmation, and responsive walkthroughs.

Every walkthrough records commit SHA, deployed URL, UTC timestamp, browser/runtime version, secure-context and capability status, discovered tool names, call ID/status/outcome, and evidence artifact path in `docs/evidence/demo-runtime.json`. Failure of same-call confirmation or tool discovery is a blocker requiring a versioned technical erratum, not an undocumented schema fallback.

## 10. Deployment and demo acceptance

Implementation lives in `site/` and uses Node 24 LTS, npm 11, a committed lockfile, pinned direct dependency versions, and `create-sites@0.3.0`. `site/package.json` provides `design:lint`, `lint`, `typecheck`, `test`, `test:e2e`, and `build`. Clean verification is `npm ci` followed by those six scripts. The Vinext build must emit `site/dist/server/index.js`, the `site/dist/client/_next/static/` asset tree, and a staged `site/dist/.openai/hosting.json` copied from the reviewed `site/.openai/hosting.json`; missing output fails the build.

The public response is HTTPS, top-level, same-origin and sends at least `Permissions-Policy: tools=(self)`, `Origin-Agent-Cluster: ?1`, a CSP without `unsafe-inline`/`unsafe-eval`, and `X-Content-Type-Options: nosniff`. The only runtime network requests are the initial document and bundled same-origin assets. `public/og.png` is an original Bearing preview with explicit English title/description metadata and no operator branding.

Deploy one accessible HTTPS URL with no account, fee, or judge restriction. The deployed first viewport exposes controls, available-seat results, the grid, selection state, capability state, and tool activity without promotional interruption. The public demo is accepted only when:

- all nine tools register and return canonical results;
- `query → get_route → compare → select → confirm` completes with visible synchronized state;
- only human interaction produces `confirmed`;
- the same complete journey works without WebMCP;
- DESIGN.md tokens and prohibited-pattern rules match the rendered implementation;
- build, contract, accessibility, and runtime checks have recorded evidence;
- clean install/build output, headers, request inventory, and `docs/evidence/demo-runtime.json` are reproducible from the recorded commit;
- `THIRD_PARTY_NOTICES.md` accounts for every shipped font, icon, dependency, and other asset, with bundled Atkinson and Lucide license files verified from the installed versions; and
- the repository remains independently authored, MIT-licensed, English, and free of third-party operator branding.

## 11. Explicit non-goals

- No booking, payment, login, backend, analytics, tracking, or persistent personal data.
- No real railway identity, inventory, map, screenshot, or operator integration.
- No hotel runtime, multilevel routing, multiple rail cars, generic pathfinding, or internal LLM.
- No marketing subsite, blog, account area, or additional public tool.
