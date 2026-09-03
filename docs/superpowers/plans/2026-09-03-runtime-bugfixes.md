# Ieum Runtime Bugfixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the confirmed WebMCP lifecycle, UI contract, and responsive route-rendering defects and open a verified pull request targeting `dev`.

**Architecture:** Keep the existing Domain and Application boundaries. Add cancellation at the WebMCP registration owner boundary, enforce preferences and log invariants in Application, keep comparison intent in UI state, and isolate route-to-pixel projection in a dedicated component that reads the existing route rather than calculating one.

**Tech Stack:** TypeScript 5.9, React 19, Vinext, Vitest, Testing Library, Playwright 1.62, Chrome WebMCP.

## Global Constraints

- Preserve the nine `a11y.*` tool names, schemas, and `readOnlyHint: false` policy.
- Preserve `CONFIRMATION_REQUIRED` as the wire code for an empty confirmation request.
- Use `Ieum` for user-visible branding; internal `Bearing*` TypeScript names may remain.
- Do not merge `main`, deploy Sites, or change access policy in this PR.
- Every production-code fix starts with a focused failing test and recorded RED result.
- Run with Node `24.20.0` from `site/.nvmrc` for final verification.

---

### Task 1: Registration lifetime and capability classification

**Files:**
- Modify: `site/src/webmcp/register.ts`
- Modify: `site/src/ui/BearingApp.tsx`
- Test: `site/tests/webmcp/register.test.ts`
- Test: `site/tests/ui/human-journey.test.tsx`

**Interfaces:**
- Consumes: `registerBearingTools(documentLike, app)` and `WebMCPCapability`.
- Produces: `registerBearingTools(documentLike, app, { signal? })`; capability adds `'insecure-context'`.

- [ ] **Step 1: Add failing registration lifecycle tests**

Add deferred `registerTool` tests proving an already-aborted owner registers zero tools, abort during the first await prevents the second registration after late resolution, late rejection stays disposed, and every shared registration signal is aborted. Add a UI test that unmounts before resolution and observes no late capability update warning.

- [ ] **Step 2: Run focused tests and record RED**

Run: `cd site && npm test -- tests/webmcp/register.test.ts tests/ui/human-journey.test.tsx`

Expected: failure because the owner signal parameter and insecure capability do not exist.

- [ ] **Step 3: Implement owner cancellation and capability mapping**

Create one registration controller, forward the owner abort to it, check `registration.signal.aborted` before and after each awaited `registerTool`, remove the owner listener on terminal completion, and make `dispose` idempotent. In the effect, create the owner controller synchronously, abort it during cleanup, and guard late state updates. Return `insecure-context` when `globalThis.isSecureContext === false` before model-context detection.

- [ ] **Step 4: Run focused tests and record GREEN**

Run: `cd site && npm test -- tests/webmcp/register.test.ts tests/ui/human-journey.test.tsx`

- [ ] **Step 5: Commit**

Run: `git add site/src/webmcp/register.ts site/src/ui/BearingApp.tsx site/tests/webmcp/register.test.ts site/tests/ui/human-journey.test.tsx && git commit -m "fix: clean up WebMCP registration lifecycle"`

### Task 2: Application preference and log invariants

**Files:**
- Modify: `site/src/domain/errors.ts`
- Modify: `site/src/application/use-cases.ts`
- Test: `site/tests/application/application.test.ts`

**Interfaces:**
- Consumes: `setPreferences(RenderInput)`, `ToolLogEntry`, and `DomainError`.
- Produces: validated `setPreferences`; safe optional DomainError message override; log compaction that retains all pending plus ten terminal entries.

- [ ] **Step 1: Add failing invariant tests**

Test that non-finite/non-positive preferences are rejected without changing stored prefs; empty confirmation rejects with code `CONFIRMATION_REQUIRED` and message `Select at least one seat before confirming.`; cancellation records status `cancelled`; and eleven completed calls retain ten terminal entries while a pending confirmation survives ten later calls and updates the same entry on completion.

- [ ] **Step 2: Run focused tests and record RED**

Run: `cd site && npm test -- tests/application/application.test.ts`

- [ ] **Step 3: Implement boundary validation and pending-safe compaction**

Let `DomainError` accept an optional fixed internal message. Validate `stepLength_m` and `walkSpeedPercent` at `setPreferences`. Add `compactToolLog(entries)` that returns every pending entry plus the newest ten terminal entries. Apply it after begin and finish. Pass `{ status: 'cancelled' }` for human cancellation.

- [ ] **Step 4: Run focused tests and record GREEN**

Run: `cd site && npm test -- tests/application/application.test.ts`

- [ ] **Step 5: Commit**

Run: `git add site/src/domain/errors.ts site/src/application/use-cases.ts site/tests/application/application.test.ts && git commit -m "fix: enforce application state invariants"`

### Task 3: Human comparison, query, status, and branding contracts

**Files:**
- Modify: `site/src/ui/BearingApp.tsx`
- Modify: `site/app/layout.tsx`
- Modify: `DESIGN.md`
- Test: `site/tests/ui/human-journey.test.tsx`
- Test: `site/tests/smoke.test.tsx`

**Interfaces:**
- Consumes: current `results`, `app.compare`, `app.query`, `WebMCPCapability`, and validated stored preferences.
- Produces: `comparisonRefs: Set<string>` scoped to current query results and accessible complete query controls.

- [ ] **Step 1: Add failing UI contract tests**

Test candidate comparison with two through four refs, rejection announcement for a fifth, clearing choices/table after a new query, and independence from booking selection. Test include-unavailable default false UI mapping to `availableOnly: true`, `Any / Quiet / Non-quiet` payloads, invalid step draft affecting only steps actions, invalid speed affecting only route, one describe log entry for Enter, all six capability messages, `role="status"` plus `aria-atomic="true"`, and `Ieum` heading/metadata/accessibility names.

- [ ] **Step 2: Run focused tests and record RED**

Run: `cd site && npm test -- tests/ui/human-journey.test.tsx tests/smoke.test.tsx`

- [ ] **Step 3: Implement the UI contracts**

Replace selection slicing with candidate checkboxes backed by a `Set`; clear compare state after a successful query. Add include-unavailable and quiet-car controls with `undefined/true/false` mapping. Parse drafts using a finite-positive helper and forward only last valid stored values. Remove manual Enter inspection. Map every capability enum to stable text. Add live-region attributes and replace user-visible `Bearing` with `Ieum` in UI, metadata, and `DESIGN.md`.

- [ ] **Step 4: Run focused tests and design lint**

Run: `cd site && npm test -- tests/ui/human-journey.test.tsx tests/smoke.test.tsx && npm run design:lint`

- [ ] **Step 5: Commit**

Run: `git add site/src/ui/BearingApp.tsx site/app/layout.tsx site/tests/ui/human-journey.test.tsx site/tests/smoke.test.tsx DESIGN.md && git commit -m "fix: align human controls with the Ieum contract"`

### Task 4: Responsive route projection and result focus

**Files:**
- Create: `site/src/ui/RouteOverlay.tsx`
- Modify: `site/src/ui/BearingApp.tsx`
- Modify: `site/app/globals.css`
- Modify: `site/playwright.config.ts`
- Modify: `site/e2e/human-journey.spec.ts`

**Interfaces:**
- Consumes: `activeRoute.segments`, the fixture point positions, seat element IDs, and the car-stage/grid elements.
- Produces: `<RouteOverlay route points stageRef gridRef />`, projected line segments, visible endpoint markers, and focusable route summary.

- [ ] **Step 1: Add failing responsive E2E assertions**

At 760, 759, 390, and 320 CSS pixels, request the default route. Transform every SVG segment to viewport pixels and assert the aisle segment intersects no unrelated seat rectangle; assert the final endpoint is within 4px of the target seat centre; select the target and assert a route marker remains distinguishable; assert the route summary receives focus. Set `reuseExistingServer: false`.

- [ ] **Step 2: Run the focused E2E and record RED**

Run: `cd site && npx playwright test e2e/human-journey.spec.ts -g "responsive route"`

Expected: 759, 390, and 320 widths intersect B-column seats; endpoint error exceeds 4px; summary does not receive focus.

- [ ] **Step 3: Implement shared responsive projection**

Create `RouteOverlay` with a `ResizeObserver`. Read rendered A/B/C/D seat centres, use exact seat centres for seat refs, use the B/C midpoint for every centre-aisle ref, and map fixture y values from the first and last rendered row centres. Render only existing route segments. Add a non-covering endpoint ring above selected/availability fills while keeping corridor strokes below labels. Give the route summary `tabIndex={-1}` and focus it after successful human route creation.

- [ ] **Step 4: Run focused responsive E2E and record GREEN**

Run: `cd site && npx playwright test e2e/human-journey.spec.ts -g "responsive route"`

- [ ] **Step 5: Commit**

Run: `git add site/src/ui/RouteOverlay.tsx site/src/ui/BearingApp.tsx site/app/globals.css site/playwright.config.ts site/e2e/human-journey.spec.ts && git commit -m "fix: keep route geometry aligned on narrow screens"`

### Task 5: Full verification and pull request

**Files:**
- Modify: `tasks/todo.md`
- Modify: `docs/superpowers/specs/2026-09-03-runtime-bugfixes-design.md`
- Create: `.superpowers/sdd/2026-09-03-runtime-bugfixes/` review artifacts (ignored)

**Interfaces:**
- Consumes: commits from Tasks 1–4.
- Produces: verified branch and GitHub pull request targeting `dev`.

- [ ] **Step 1: Run the full local verification matrix**

Run under Node 24: `cd site && npm test && npm run typecheck && npm run lint && npm run design:lint && npm run build && npm run test:e2e`; then run `npm test` at repository root and `git diff --check`.

- [ ] **Step 2: Run real Chrome WebMCP smoke verification**

Use Chrome DevTools MCP to load the local production server, confirm nine tools, execute `a11y.get_layout`, dispose/unmount the page, reload, and confirm a clean nine-tool registration with no duplicate-name failure. Record exact outcomes in `tasks/todo.md` and the PR body.

- [ ] **Step 3: Request independent code review and address findings**

Review the complete `dev...HEAD` diff for spec compliance, responsive geometry, lifecycle races, accessibility, and test gaps. Fix any validated blocking finding with a focused regression test and rerun its verification.

- [ ] **Step 4: Update the task review record**

Mark all runtime bugfix checklist items complete and replace `진행 중.` with the verification totals, responsive viewport results, Chrome WebMCP evidence, and deferred `main/dev` plus `readOnlyHint` risks.

- [ ] **Step 5: Push and open the PR**

Run: `git push -u origin fix/runtime-webmcp-bugs`; then create a GitHub PR targeting `dev` with title `fix: resolve WebMCP lifecycle and responsive route bugs`.
