# Bearing Architecture–PRD Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the synchronization design and then rewrite `docs/Architecture.md` so it is implementation-ready, preserves PRD v0.3's complete nine-tool scope, and accurately reflects the official WebMCP Challenge rules and current WebMCP draft.

**Architecture:** Treat the official rules and current WebMCP draft as authoritative for compliance and API facts, PRD v0.3 as authoritative for product intent and scope, and the existing Architecture as authoritative only for non-conflicting implementation detail. Preserve the Architecture document's 27 numbered sections while replacing stale contracts consistently across prose, schemas, examples, tests, ADRs, and acceptance criteria.

**Tech Stack:** Markdown documentation, TypeScript/JSON contract examples, WebMCP imperative API, GTFS Pathways semantic mapping.

## Global Constraints

- Preserve all nine public `a11y.*` tools and the complete PRD v0.3 product journey; do not make schedule-based cuts.
- Keep same-call `a11y.confirm` completion as the normative contract; permit no alternate public schema without verified runtime evidence and a separately versioned technical erratum.
- Treat the WebMCP document as a Draft Community Group Report, not a W3C Standard.
- Treat current Chrome/OpenAI material as runtime guidance, subordinate to normative draft API facts and unable to reduce the product contract.
- Keep the Architecture's 27 numbered sections and their roles.
- Do not modify `docs/PRD v0.3.md`.
- Do not claim implementation, browser validation, blind-user validation, certification, or submission completion without evidence.
- Keep schedule and delivery management out of the synchronized Architecture.

---

### Task 1: Correct the synchronization design

**Files:**
- Modify: `docs/superpowers/specs/2026-09-02-architecture-prd-sync-design.md`
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: PRD v0.3, official challenge rules/submission requirements/judging criteria, current WebMCP draft, official GTFS Pathways reference.
- Produces: an unambiguous rewrite specification for the 27-section Architecture document.

- [x] **Step 1: Strengthen authority, scope, and traceability**

Require a PRD traceability matrix covering goals/non-goals, P1–P7, M1–M6/E1–E3, tool/data/route contracts, UI1–UI8, ADRs, portability proof, judging journey, deployment/submission, platform, limitations, risks/open questions, and identity. Each item must be classified as preserved, explicit official/spec erratum, or intentionally non-architectural.

- [x] **Step 2: Resolve query and comparison ambiguity**

Specify that `query` returns at most 12 candidates using stable semantic ordering plus `ref` as the final tie-breaker, while `compare` accepts and returns exactly 2–4 referenced candidates. Require `totalMatched`, a supported-axis `hint` for 13+ matches, no pagination/token, and 0/12/13+ boundary tests.

- [x] **Step 3: Lock the confirmation contract**

Preserve the same-call `confirmed | cancelled | timeout` result, 120-second timeout, full state projection, mutation lock, deterministic abort/duplicate/restore behavior, and target-runtime integration tests. Remove the unproven pending-return fallback from the public contract.

- [x] **Step 4: Add complete public-contract safeguards**

Require a nine-tool matrix; complete `ToolResult`, `SelectionState`, error vocabulary, `Seat`, `QueryCriteria`, `RenderOptions`, `Route`, `AppState`, undo, UI1–UI8, and portability-proof contracts; a nine-tool annotation matrix; and exact schema/table verification rather than token presence alone.

- [x] **Step 5: Correct standards and compliance language**

Document GTFS semantic mappings (`length_m` ↔ `length`, `traversal_time_s` ↔ `traversal_time`, `min_width_m` ↔ `min_width`) and Bearing extensions (`door`, `vestibule`). Add pre-existing-project provenance, target-runtime, written-description, testing-instruction, public-access, asset provenance, and independently authored synthetic-fixture requirements without schedule planning.

- [x] **Step 6: Self-review and verify the corrected design**

Run placeholder, contradiction, scope, exact-token, and Markdown diff checks; independently review the design against the source documents.

### Task 2: Rewrite Architecture identity, product contracts, and domain model

**Files:**
- Modify: `docs/Architecture.md`
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: corrected synchronization design and PRD v0.3.
- Produces: synchronized Architecture sections for identity, scope, principles, domain model, query, spatial, landmark, route, rendering, and nine tool contracts.

- [ ] **Step 1: Preserve the 27-section skeleton and replace identity/domain vocabulary**

Replace Wayfinder and legacy fixture/currency/domain values with Bearing, `rail`, `intercity-car-6.json`, `Car 6, Business Class`, and USD while retaining all section roles.

- [ ] **Step 2: Replace spatial, route, and rendering contracts**

Use meter-source geometry, unit-explicit Bearing fields mapped to GTFS semantics, structured bearings/landmarks, aisle-aware routing, complete `Route` types, the 1.2 m/s formula, four-segment behavior, and the seven PRD route tests.

- [ ] **Step 3: Replace query, seat, and landmark contracts**

Apply the complete PRD schemas/defaults, `query` ≤12 stable results, `compare` 2–4, `totalMatched`, supported narrowing hints, O&M landmark taxonomy, and rail-domain rejection of hotel-only criteria.

- [ ] **Step 4: Replace the nine-tool common and per-tool contracts**

Synchronize exact inputs, outputs, annotations, `ToolResult`, `SelectionState`, error codes, mutation state projection, `RenderOptions`, and examples without adding or removing tools.

- [ ] **Step 5: Review Task 2 as a coherent contract set**

Compare every affected type/table/example against PRD §§5–9 and the corrected design; resolve confirmed mismatches before proceeding.

### Task 3: Rewrite WebMCP, state, UI, testing, compliance, and ADR sections

**Files:**
- Modify: `docs/Architecture.md`
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: Task 2 contract vocabulary and corrected design.
- Produces: synchronized adapter/runtime behavior, application state, UI, tests, portability proof, compliance, ADRs, and success criteria.

- [ ] **Step 1: Correct WebMCP adapter and runtime facts**

Document current draft status, tool-name constraint, per-call versus registration signals, JSON-serializable plain results, secure-context/origin/policy requirements, capability diagnostics, concise-output guidance as advisory telemetry, and ChatGPT/Chrome runtime testing.

- [ ] **Step 2: Synchronize state and human confirmation**

Preserve the shared local App Store, complete `AppState`, history snapshots, full mutation projections, same-call confirmation, focus-safe accessible dialog, 120-second timeout, mutation lock, cancellation, duplicate-call, and restoration rules.

- [ ] **Step 3: Synchronize UI and progressive enhancement**

Preserve UI1–UI8 including CSS grid, live highlights, segment-derived SVG route overlay, tool log, persistent selection panel, ARIA grid/cell labeling, accessible modal/focus behavior, and unsupported-WebMCP banner.

- [ ] **Step 4: Synchronize portability, tests, ADRs, and success criteria**

Preserve all four portability-proof elements, all nine live-call tests, exact route/query/state/confirmation tests, top-level registration, local-only state, non-goals/limitations, and explicit technical errata.

- [ ] **Step 5: Synchronize challenge compliance without delivery planning**

Represent official judging criteria, accessible live URL, public repository/license, source/assets/instructions, four-part written description, public under-three-minute YouTube demo with audio, English/translation rule, pre-existing-project provenance, third-party authorization, and bounded claims.

- [ ] **Step 6: Review Task 3 against PRD and official sources**

Trace every normative PRD section and each official requirement to an Architecture section or explicit non-architectural classification.

### Task 4: Perform complete-document verification

**Files:**
- Modify: `docs/Architecture.md` only for confirmed verification fixes.
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: the complete rewritten Architecture.
- Produces: evidence that the document is internally consistent and source-aligned.

- [ ] **Step 1: Run exact obsolete-contract scans**

Use word-boundary/context-aware searches for legacy-only names, fields, types, examples, and WebMCP claims. Allow obsolete terms only inside clearly labeled migration/history notes.

- [ ] **Step 2: Run required-contract scans and structural checks**

Confirm all 27 numbered sections, all nine tools, complete schemas, UI1–UI8, route tests, compliance obligations, and no schedule-based cuts.

- [ ] **Step 3: Inspect the full diff and run Markdown hygiene checks**

Run `git diff --check`, inspect the complete diff, check headings/fences/tables, and verify there are no placeholders or contradictory contracts.

- [ ] **Step 4: Dispatch independent final reviews**

Review spatial/query/domain contracts separately from WebMCP/state/UI/compliance contracts, resolve every confirmed finding, and repeat scoped verification.

- [ ] **Step 5: Record final evidence**

Complete the Review section in `tasks/todo.md` with changed files, source hierarchy, checks run, remaining evidence-dependent limitations, and the final readiness verdict.
