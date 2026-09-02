# Bearing Working Demo Site Design

## 1. Decision and authority

Build Bearing as a single-route, English, publicly deployable working web application on `feat/bearing-demo`. It implements the complete rail MVP defined by `docs/PRD v0.3.md` and corrected by `docs/Architecture.md`; it does not implement booking, payment, login, a backend, real inventory, or the hotel runtime.

Authority order for implementation decisions:

1. Current WebMCP draft and official challenge rules for API and submission facts.
2. `docs/PRD v0.3.md` for product intent and complete scope.
3. `docs/Architecture.md` and `docs/contracts/bearing-output.schema.json` for technical contracts.
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

Every invocation updates the same UI highlights, route, selection state, and log observed by the human. `a11y.confirm` remains pending in the same call until the human confirms, cancels, the 120-second timeout fires, or the call aborts.

## 4. Experience architecture

### 4.1 Primary regions

- **Control rail:** all rail-applicable query criteria plus units, step length, direction style, and walking-speed preferences.
- **Workspace:** layout summary, result summary, accessible seat grid, selected-seat description, structured route instructions, and SVG overlay derived from returned route segments.
- **Decision rail:** compare picker/table, persistent selection summary, undo and confirmation controls, capability banner, and tool log.

### 4.2 Responsive behavior

- Above 960px: three-region grid matching `DESIGN.md` widths.
- 721–960px: controls and workspace first; decision rail spans below.
- 720px and below: one document-order column with no horizontally scrolling page. Comparison may scroll within its labeled container or transform into candidate-labeled rows.

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

- **Fixture:** one unbranded `Car 6, Business Class` JSON layout with meter-source coordinates, 60 seats, stable refs, paths, landmarks, prices, availability, accessibility facts, and a car-level `quietCar` boolean. Fixture loading copies that validated fact to each canonical `Seat.quietCar`; query tests cover both requested boolean values, and `Candidate.rail.quietCar` exposes the result fact.
- **Domain:** deterministic query, compare, describe, route, continuation, and rendering functions without DOM dependencies.
- **Application:** nine use cases plus atomic visible/log/state effects, derived totals, one-step undo, and confirmation coordination.
- **Bridge:** exact input validation and exact output/error projection from the canonical contracts.
- **WebMCP Adapter:** capability detection, nine top-level registrations, lifecycle/cancellation, and plain JSON results only.
- **UI:** consumes Application directly; it never calls public tools and never recalculates route geometry.

The site has no server state or authentication. Mutable demo state is in-memory browser-local state and resets on reload. No third-party operator API, diagram, screenshot, or proprietary dataset is used.

Atkinson Hyperlegible is installed from a pinned `@fontsource/atkinson-hyperlegible` package and served from the application bundle; the site makes no runtime font-CDN request. Icons come only from a pinned `lucide-react` package and are bundled. `THIRD_PARTY_NOTICES.md` records exact package version, upstream URL, detected package license, font/icon asset license, and included license-file path after dependencies are locked. Missing or incompatible license evidence blocks deployment and causes the implementation to fall back to system fonts or text-only controls rather than substituting an unverified asset.

## 6. State and data flow

One successful human or Agent use case produces one Application transaction:

1. validate input and current state;
2. call pure Domain logic;
3. commit selection/history/route/highlight/log changes atomically;
4. derive public `SelectionState` and presentation strings;
5. notify accessible UI projections;
6. return the corresponding plain JSON tool result when Agent-originated.

Invalid criteria, refs, selection cardinality, unavailable selection, empty undo, and confirmation locks return the Architecture's expected error vocabulary without partial mutation. Unexpected errors and cancellation reject rather than impersonating domain failures.

## 7. Safety and accessibility

- Render arguments, refs, labels, sign text, logs, status, and errors only through escaped text nodes; never use raw HTML injection.
- Bound public ref strings to 1–128 characters and other free text to 1–300 characters.
- Implement named grid/row/gridcell ownership, roving tabindex, arrows, Home/End, Enter/Space, `aria-selected`, and independent visible focus.
- Implement a named `aria-modal` dialog, inert background, contained focus, Escape cancellation, terminal cleanup, and focus restoration.
- Use concise polite status announcements and test Agent-originated changes for duplicate speech.
- Make the complete human journey usable with WebMCP disabled.
- Describe Bearing as an engineering prototype; do not claim certification or completed blind-user validation.

## 8. Error, loading, and capability states

The fixture loads locally with the initial page, so the normal experience has no remote loading dependency. A fixture/bootstrap failure replaces the working surface with a concise recovery message and never registers partial tools.

WebMCP capability states distinguish available, unsupported, insecure context, permission denial, security rejection, and other registration failure. The banner explains the state while keeping all human controls enabled. Zero query results are a successful empty state with a deterministic relaxation hint; 13+ results return the first 12 with a deterministic narrowing hint.

## 9. Verification strategy

### 9.1 Automated

- Unit-test query 0/12/13+, stable ordering, hints, render units, compare 1/2/4/5 and unavailable refs, eight exact route cases, continuation, totals, and serialization.
- Test selection derivation, append-idempotence, undo snapshots, expected-failure non-mutation, confirm/cancel/timeout/abort, and mutation locks.
- Test exactly nine WebMCP registrations, exact names/schemas/annotations, registration versus execution signals, capability mapping, and JSON result shape with a controlled `document.modelContext` test double.
- Test the human journey and accessibility semantics with component/integration tests, keyboard events, fake timers, and accessibility assertions.
- Build the deployable Site and lint `DESIGN.md`; zero errors are required. Contrast warnings must be resolved, not waived.

### 9.2 Runtime evidence

- Exercise all nine real calls in Chrome with WebMCP testing enabled.
- Exercise the judging journey in ChatGPT's in-app browser.
- Complete keyboard-only, screen-reader engineering, monitor-off, capability-disabled, confirmation, and responsive walkthroughs.

Runtime evidence is recorded honestly. Failure of same-call confirmation or tool discovery is a blocker requiring a versioned technical erratum, not an undocumented schema fallback.

## 10. Deployment and demo acceptance

Deploy one accessible HTTPS URL with no account, fee, or judge restriction. The deployed first viewport must expose the working task. The public demo is accepted only when:

- all nine tools register and return canonical results;
- `query → get_route → compare → select → confirm` completes with visible synchronized state;
- only human interaction produces `confirmed`;
- the same complete journey works without WebMCP;
- DESIGN.md tokens and prohibited-pattern rules match the rendered implementation;
- build, contract, accessibility, and runtime checks have recorded evidence;
- `THIRD_PARTY_NOTICES.md` accounts for every shipped font, icon, dependency, and other asset, with bundled Atkinson and Lucide license files verified from the installed versions; and
- the repository remains independently authored, MIT-licensed, English, and free of third-party operator branding.

## 11. Explicit non-goals

- No booking, payment, login, backend, analytics, tracking, or persistent personal data.
- No real railway identity, inventory, map, screenshot, or operator integration.
- No hotel runtime, multilevel routing, multiple rail cars, generic pathfinding, or internal LLM.
- No marketing subsite, blog, account area, or additional public tool.
