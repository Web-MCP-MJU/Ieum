# Bearing Working Demo Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the complete single-route Bearing rail demo in `site/`, with one accessible human UI and the same nine WebMCP-backed Application use cases.

**Architecture:** A validated synthetic fixture feeds pure TypeScript Domain functions. One reducer-style Application store owns selection, route, highlight, confirmation, and call-log state; the accessible React UI and WebMCP Adapter call the same use cases. Vinext produces the Sites deployment artifact.

**Tech Stack:** Node 24 LTS, npm 11, `@openai/create-sites@0.3.0`, Vinext/React/TypeScript, shadcn primitives, Zod, Vitest, Testing Library, Playwright, axe-core, Atkinson Hyperlegible, Lucide.

## Global Constraints

- Work only on `feat/bearing-demo` in the existing linked worktree.
- Implement exactly one English rail route and exactly nine `a11y.*` tools; do not add booking, payment, login, persistence, hotel runtime, analytics, or remote data.
- Use `docs/Architecture.md`, both schemas under `docs/contracts/`, the approved site design spec, and root `DESIGN.md` as binding contracts.
- Write each behavioral test first, run it to observe the intended failure, then add the minimum production code and rerun the focused and full suites.
- Keep fixture coordinates and lengths as the only spatial source; derive traversal time, reverse bearing, rendered units, totals, prose, SVG, and UI facts.
- Keep the human UI complete when WebMCP is absent; only a human action may settle confirmation as `confirmed`.
- Preserve 1216/760 responsive boundaries, forced-colors cues, 44px targets, exact grid keyboard behavior, and the fixed seat-state composition order.
- Make no runtime network requests except the document and bundled same-origin assets.
- A Site subagent may research, review, or create an image outside `site/`, but only the root Site owner may initialize or edit the Site checkout, host, or deploy it.

---

### Task 1: Scaffold the pinned Site and verification harness

**Files:**
- Create: `site/**` using `npm create --yes @openai/sites@0.3.0 site -- --yes --add-ons shadcn --install`
- Modify: `site/package.json`, `site/app/layout.tsx`, `site/app/globals.css`, `site/.openai/hosting.json`
- Create: `site/vitest.config.ts`, `site/playwright.config.ts`, `site/tests/setup.ts`, `site/tests/smoke.test.tsx`

**Interfaces:**
- Produces scripts `design:lint`, `lint`, `typecheck`, `test`, `test:e2e`, and `build`.
- Produces the `@/*` source alias and jsdom test environment used by all later tasks.

- [ ] Generate the Site once with the pinned CLI and shadcn add-on; inspect its package scripts, UI exports, and hosting manifest before editing.
- [ ] Add a failing smoke test that imports the page and expects the accessible name `Bearing rail workspace`; verify RED because starter content has no such region.
- [ ] Replace only starter metadata/theme shell needed for the named empty working surface, add exact verification scripts and test configuration, then verify the focused smoke test is GREEN.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; commit the scaffold and harness.

### Task 2: Implement the canonical rail fixture boundary

**Files:**
- Create: `site/src/domain/types.ts`, `site/src/data/intercity-car-6.json`, `site/src/data/fixture-schema.ts`, `site/src/data/validate-fixture.ts`
- Create: `site/tests/data/fixture.test.ts`

**Interfaces:**
- Produces `RailFixture`, `Seat`, `Landmark`, `RoutableRef`, and `loadRailFixture(raw): RailFixture`.
- Produces immutable `railFixture` with 60 seats, 47 available, car-level `quietCar`, shared unique refs, directed edges, and valid continuation checkpoints.

- [ ] Write failing tests for schema rejection, shared-ref duplicates, out-of-bounds coordinates, bad endpoints, wrong 60/47 counts, unreachable refs, and continuation non-progress.
- [ ] Write a failing valid-fixture test asserting exact counts, mandatory refs, stable sort order, and car-level `quietCar` copied into canonical seats.
- [ ] Implement Zod shape validation plus explicit graph/cross-field validation, then author the independently created fixture to satisfy it.
- [ ] Run focused fixture tests and the full suite; commit the fixture boundary.

### Task 3: Implement pure query, description, comparison, and rendering

**Files:**
- Create: `site/src/domain/query.ts`, `site/src/domain/describe.ts`, `site/src/domain/compare.ts`, `site/src/domain/render.ts`, `site/src/domain/errors.ts`
- Create: `site/tests/domain/query.test.ts`, `site/tests/domain/describe.test.ts`, `site/tests/domain/compare.test.ts`, `site/tests/domain/render.test.ts`

**Interfaces:**
- Produces `querySeats(fixture, criteria): QueryData`, `describeRef(fixture, ref, options): Description`, `compareRefs(fixture, refs, options): Comparison`, and pure unit/direction renderers.
- Uses the exact Architecture error codes and 0/12/13+ hint policy.

- [ ] Write failing query tests for defaults, every rail/need filter, stable ordering, zero-result relaxation, 12 results, 13+ truncation/narrowing, both `quietCar` booleans, and unsupported criteria.
- [ ] Implement minimal deterministic query and rerun focused tests GREEN.
- [ ] Write failing description/comparison tests for stable refs, invalid refs, unavailable candidates, 1/2/4/5 cardinality, duplicate refs, input order, and identical axes; implement and rerun GREEN.
- [ ] Write failing render tests for meters/feet/steps, approximation note, direction styles, finite positive guards, and walk-speed scaling; implement and rerun GREEN.
- [ ] Run the full suite; commit pure read operations.

### Task 4: Implement deterministic route and continuation

**Files:**
- Create: `site/src/domain/route.ts`, `site/src/domain/graph.ts`
- Create: `site/tests/domain/route.test.ts`

**Interfaces:**
- Produces `getRoute(fixture, from, to, options): Route` and a deterministic graph path ordered by cost then ref.
- Returns at most four merged segments, partial-leg totals, and a strictly progressing checkpoint when continuation is required.

- [ ] Write failing tests for all eight Architecture route cases, cross-aisle lateral movement, reverse `+180°`, no unidirectional reverse, segment merge, totals, rendered-only changes, and call-specific walking time.
- [ ] Write failing exhaustive ordered-pair tests proving each continuation leg has 1–4 segments, decreases remaining path length, never repeats a checkpoint, and terminates.
- [ ] Implement deterministic graph traversal, segment construction/merge, continuation selection, totals, and rendering; verify focused tests GREEN.
- [ ] Run the full suite; commit route behavior.

### Task 5: Implement shared Application state and confirmation

**Files:**
- Create: `site/src/application/store.ts`, `site/src/application/use-cases.ts`, `site/src/application/confirmation.ts`, `site/src/application/selectors.ts`
- Create: `site/tests/application/store.test.ts`, `site/tests/application/confirmation.test.ts`

**Interfaces:**
- Produces `createBearingApplication(fixture, confirmationPort)` with nine typed use cases and `subscribe/getState`.
- `ConfirmationPort.open(signal)` resolves only from a human UI event with `confirmed` or `cancelled`; the coordinator owns the 120-second timeout.

- [ ] Write failing tests for pending→terminal call-log lifecycle, safe origin/call IDs, use-case-specific highlights/routes, empty success versus domain failure, append-idempotent selection, derived totals, one-step undo, and failure non-mutation.
- [ ] Implement the store/use cases and rerun focused tests GREEN.
- [ ] Write failing fake-timer tests for confirmation open/terminal atomic transitions, human confirm/cancel, timeout, abort, teardown, duplicate/racing events, mutation locks, state restoration, and focus-port cleanup.
- [ ] Implement the confirmation coordinator and rerun focused tests GREEN.
- [ ] Run the full suite; commit the Application layer.

### Task 6: Implement atomic WebMCP registration

**Files:**
- Create: `site/src/webmcp/types.d.ts`, `site/src/webmcp/schemas.ts`, `site/src/webmcp/register.ts`, `site/src/webmcp/capability.ts`
- Create: `site/tests/webmcp/register.test.ts`

**Interfaces:**
- Produces `registerBearingTools(document, application): Promise<{ capability; dispose() }>`.
- Registers exactly the canonical nine names with static schemas/annotations and returns plain JSON `ToolResult` values.

- [ ] Write failing tests for exact names, schemas, annotations, separate registration/execution signals, successful JSON round-trip, and capability classifications.
- [ ] Write nine failing rollback tests, rejecting once at each registration position and asserting zero discoverable tools/listeners plus a clean retry.
- [ ] Implement prebuilt definitions, one shared registration controller, all-or-nothing registration, abort cleanup, and fresh retry; rerun focused tests GREEN.
- [ ] Run the full suite; commit the WebMCP Adapter.

### Task 7: Build the complete accessible working surface

**Files:**
- Modify: `site/app/page.tsx`, `site/app/globals.css`, `site/app/layout.tsx`
- Create: `site/src/ui/BearingApp.tsx`, `site/src/ui/FilterPanel.tsx`, `site/src/ui/RailSeatGrid.tsx`, `site/src/ui/RoutePanel.tsx`, `site/src/ui/ComparisonPanel.tsx`, `site/src/ui/DecisionPanel.tsx`, `site/src/ui/ToolLog.tsx`, `site/src/ui/ConfirmationDialog.tsx`, `site/src/ui/CapabilityBanner.tsx`
- Create: `site/tests/ui/human-journey.test.tsx`, `site/tests/ui/grid-keyboard.test.tsx`, `site/tests/ui/confirmation-dialog.test.tsx`

**Interfaces:**
- Consumes the Application directly for human actions; never calls the public WebMCP surface.
- Produces the first viewport with controls, 12 available results, named 60-cell grid, decision state, capability state, and tool log.

- [ ] Write failing UI tests for bootstrap projection, every visible control, complete no-WebMCP journey, synchronized Agent-originated state, and escaped tool-log content.
- [ ] Write failing exact keyboard tests for roving tabindex, non-wrapping row/letter navigation, aisle/ragged fallback, Home/End, Enter description, available Space selection, and unavailable Space announcement.
- [ ] Write failing dialog tests for name/modal semantics, inert background, least-destructive focus, trap, Escape, terminal action, cleanup, and restoration.
- [ ] Implement the React UI with installed shadcn primitives and Lucide, then rerun all focused UI tests GREEN.
- [ ] Apply `DESIGN.md` tokens, state layering, forced-colors mappings, 1216/760 layouts, narrow definition lists/JSON wrapping, reduced motion, and 44px targets in shared CSS.
- [ ] Start the retained development server, request the exact local URL once, and hand off the first meaningful preview without visual inspection.
- [ ] Run the full suite; commit the complete working surface.

### Task 8: Add runtime, accessibility, asset, and deployment evidence

**Files:**
- Create: `site/tests/e2e/bearing.spec.ts`, `site/tests/e2e/accessibility.spec.ts`, `site/public/og.png`, `site/THIRD_PARTY_NOTICES.md`, `docs/evidence/demo-runtime.json`
- Modify: `site/app/layout.tsx`, `site/package.json`, `site/.openai/hosting.json`

**Interfaces:**
- Produces root metadata and original social preview, complete asset notices, deployment headers, and a schema-stable evidence manifest.
- Produces E2E coverage for keyboard journey, 320px reflow, 200/400% zoom, text spacing, forced colors, runtime requests, and bundled Atkinson/Lucide.

- [ ] Write failing E2E assertions for the complete human path, WebMCP test double path, accessibility scan, responsive states, zoom/reflow/text spacing, forced colors, font weights, and same-origin request inventory.
- [ ] Add bundled Atkinson 400/700, exact notices/licenses, original `og.png`, English Open Graph/X metadata, security headers, and evidence-manifest shape; rerun E2E GREEN.
- [ ] Run `npm ci`, design lint, lint, typecheck, unit/integration tests, E2E, and build from `site/`; verify the three required `dist` artifacts.
- [ ] Perform Chrome and ChatGPT in-app browser runtime calls when available and record only observed evidence; leave unavailable checks explicitly pending rather than fabricating success.
- [ ] Commit evidence and release assets, request whole-branch code review, fix validated findings, rerun the complete verification gate, then proceed to Sites hosting.

