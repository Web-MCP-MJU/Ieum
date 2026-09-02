# Bearing Architecture–PRD Synchronization Design

## Objective

Rewrite `docs/Architecture.md` as **Bearing Architecture v0.3.2** so it is an implementation-ready architectural specification for the complete PRD v0.3 product contract and is accurate about the official WebMCP Challenge rules, the current WebMCP draft, and GTFS Pathways. Preserve the useful layer boundaries, tests, evaluations, and decision records in the current Architecture while correcting every stale or ambiguous public contract.

This design specifies the rewrite; it does not claim that the product, target-runtime integration, accessibility validation, deployment, or submission is complete.

## Authority, Scope, and Change Control

Use this authority order:

1. The official challenge rules and submission page govern eligibility, required artifacts, judging, platform access, language, provenance, and intellectual-property obligations.
2. The current WebMCP Draft Community Group Report governs WebMCP API and platform facts. It is not a W3C Standard or W3C Standards Track document.
3. The official GTFS Schedule Reference governs the meaning and wire names of GTFS Pathways fields.
4. `docs/PRD v0.3.md` governs Bearing product intent, scope, user journey, public types, and UI requirements.
5. The existing `docs/Architecture.md` supplies only non-conflicting implementation detail.

Record the verification date (`2026-09-02`) and direct source links in the rewritten Architecture: the [official challenge page](https://webmcp.devpost.com/), [official rules](https://webmcp.devpost.com/rules), [current WebMCP report](https://webmachinelearning.github.io/webmcp/), [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp/imperative-api), [OpenAI Site Tools documentation](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app), and [GTFS Schedule Reference](https://gtfs.org/documentation/schedule/reference/).

Chrome and OpenAI runtime guidance is advisory and subordinate to the WebMCP draft. In particular, description/output guidance such as the recommended 1.5K-character individual-output ceiling is telemetry and optimization guidance, not a normative API limit and not authority to omit required contract fields.

The rewrite must:

- retain Architecture §§1–27 and each section's role, although subsections may be reorganized; convert the current numbered §0 revision summary into an unnumbered preamble so the document has exactly 27 numbered sections;
- preserve all nine public `a11y.*` tools and the complete judging journey (`get_layout → query → describe/get_route → compare → select/get_selection/undo → confirm`);
- preserve the PRD goals and non-goals without schedule-based cuts or new product capabilities;
- use `Bearing`, `rail`, `intercity-car-6.json`, `Car 6, Business Class`, and USD throughout prose, types, examples, ADRs, tests, phases, and success criteria;
- treat rail as the only implemented MVP domain and hotel as a contract-portability proof, not an implementation phase;
- leave `docs/PRD v0.3.md` unchanged; and
- label every departure from PRD wording as an explicit official-rule/specification erratum. An erratum may correct a platform or standards fact but may not silently reduce product scope.

Schedule estimates, deadline triage, cut lists, registration timing, and deployment sequencing are intentionally non-architectural. Official requirements remain architectural acceptance constraints even when the work to satisfy them is managed elsewhere.

## Required PRD Traceability Matrix

The rewritten Architecture must contain a traceability matrix. Every row must identify the PRD source, the target Architecture section(s), the verification evidence, and exactly one disposition:

- **Preserved** — represented normatively without reducing intent;
- **Official/spec erratum** — wording is corrected only because a higher-authority official rule or specification establishes a different fact, with the source and exact correction stated; or
- **Intentionally non-architectural** — excluded only because it is schedule/project administration rather than product architecture; the product obligation itself may not be discarded under this label.

At minimum, the matrix must contain separate rows for:

| Traceability item | Required disposition or treatment |
| --- | --- |
| G1–G5 and every §3.2 non-goal | Preserve individually; map each to architecture boundaries or explicit exclusions. |
| §4.1 standards gap | Preserve the bounded claim about the gap among GTFS Pathways, ITU-T F.921, 28 CFR 36.302(e), and 14 CFR 382.41; do not claim an exhaustive standards search. |
| §4.2 GTFS/OSDM relationship | Apply the GTFS naming/mode erratum below while preserving `max_slope`, `signposted_as`/`signpostedAs`, `walkSpeedPercent`, and `additionalTransferTime_s` semantics. |
| P1–P7 | Preserve individually in data, rendering, state, UI, or testing contracts. |
| M1–M6 | Preserve the product and evidence obligations; classify only schedule/order language as intentionally non-architectural. |
| E1 | Preserve as the nine-tool portability/specification proof. |
| E2 | Record that `a11y.set_preferences` is not one of the nine MVP tools; preferences remain `RenderOptions`/session state unless separately versioned. |
| E3 | Record hotel implementation as out of MVP while preserving the required hotel mapping proof. |
| Nine-tool contract and shared result/error contracts | Preserve with exact inputs, outputs, annotations, and state behavior. |
| Seat, query, landmark, layout, description, route, and rendering models | Preserve complete schemas; document only verified standards errata. |
| UI1–UI8 | Preserve individually, including the non-agent progressive-enhancement path. |
| ADRs | Preserve all architectural decisions that remain valid and replace stale names/types in the ADR text. |
| Portability proof | Preserve all four PRD elements: nine schemas, hotel mapping, GTFS junction, and 28 CFR mapping. |
| Judging journey | Preserve the complete user/agent flow and map it to Stage One and all four equally weighted Stage Two criteria. |
| Deployment and submission | Preserve official evidence requirements without adding a schedule or claiming completion. |
| Platform and target runtimes | Apply official/spec errata for the current WebMCP draft and require ChatGPT in-app browser plus Chrome-with-WebMCP validation. |
| Limitations | Preserve and expand only where official/spec uncertainty requires a bounded claim. |
| Risks and open questions | Carry unresolved runtime/accessibility facts forward as evidence-dependent questions, not assertions. |
| Identity | Preserve Bearing and bounded naming/novelty language; remove Wayfinder public identity. |

Before completion, every normative PRD subsection in §§3–14, 16–19, and 21 must map to at least one matrix row. PRD §15 schedule content may be classified intentionally non-architectural, but its embedded product requirements must be traced elsewhere. PRD source/bibliography material in §20 must remain available to support claims without being mistaken for a product contract.

## Architecture and Identity to Preserve

```text
External Browser Agent
        ↓
WebMCP Adapter
        ↓
Spatial Accessibility Bridge
        ↓
Application
        ↓
Domain Core ↔ App Store
        ↑
Accessible Human UI
```

- The external Browser Agent owns natural-language understanding, tool orchestration, and conversational-reference resolution.
- Bearing contains no internal LLM, generic recommendation agent, DOM scraping, or visual inference.
- UI and tools consume one structured spatial source of truth through Application use cases; neither calls the other.
- Domain Core remains pure TypeScript without DOM or WebMCP dependencies.
- WebMCP is progressive enhancement. Keyboard and ARIA operation must remain complete without it.
- State is browser-local, with no account, payment, real reservation, server, or database.
- The MVP has one synthetic rail car and no multi-car, multilevel, generic-pathfinding, scraping, browser-extension, full-locale, or implemented-hotel capability. Accessibility attributes may support compound needs, but the product claim remains scoped to nonvisual spatial decision support.

## Complete Public Contract

### Nine-tool contract matrix

The Architecture must include one canonical matrix and matching JSON Schemas/examples for all nine tools. Abbreviated names below retain the public `a11y.` prefix.

| Tool | Exact input | Exact successful `data` contract | State projection |
| --- | --- | --- | --- |
| `a11y.get_layout` | `RenderOptions` | `LayoutSummary` | none |
| `a11y.query` | `QueryCriteria & RenderOptions` | `{ items: Candidate[]; appliedCriteria: QueryCriteria; totalMatched: number }` | none |
| `a11y.describe` | `{ ref: string } & RenderOptions` | `Description` | none |
| `a11y.get_route` | `{ from: string; to: string } & RenderOptions` | `Route` | none |
| `a11y.compare` | `{ refs: string[] } & RenderOptions`, with exactly 2–4 unique valid refs | `Comparison` containing exactly the same 2–4 refs, in input order, compared on the same named axes | none |
| `a11y.select` | `{ ref: string }` | `{ selectedRef: string }` | required full `SelectionState` |
| `a11y.get_selection` | `{}` | `{ selected: string[] }` | required full `SelectionState` |
| `a11y.undo` | `{}` | `{ undone: string \| null }` | required full `SelectionState` |
| `a11y.confirm` | `{}` | `{ outcome: "confirmed" \| "cancelled" \| "timeout" }` | required full `SelectionState` in the same call |

The Architecture must define every referenced input and output type in full, without dangling aliases or prose-only fields. That includes `ToolResult<T>`, `SelectionState`, `ToolErrorCode`, `Seat`, `QueryCriteria`, `RenderOptions`, `Candidate`, `Comparison`, `Landmark`, `LayoutSummary`, `Description`, `RouteSegment`, `Route`, and `AppState`.

`ToolResult<T>` must define success and domain-failure shapes unambiguously, including whether `data`, `state`, `hint`, and `error` are required or forbidden in each branch. Expected domain failures return `ok: false`; unexpected runtime/programming failures reject. Every invocation of `select`, `undo`, or `confirm`, including an expected domain failure, returns the unchanged or resulting full `SelectionState`; read-only failures do not return state.

`SelectionState` must contain `selected`, `selectedCount`, `priceTotal_usd`, `undoable`, and `status: "draft" | "confirmation_pending" | "confirmed"`. `selectedCount` and `priceTotal_usd` are derived from `selected`; examples and tests must prove they cannot diverge.

The exact error vocabulary is:

```text
INVALID_REF
NO_ROUTE
NO_MATCH
NOT_AVAILABLE
INVALID_SELECTION
INVALID_CRITERIA
UNSUPPORTED_CRITERIA
NOTHING_TO_UNDO
CONFIRMATION_REQUIRED
```

Capability/bootstrap failures are not domain errors. The Architecture must keep unsupported, insecure context, permission denial, security rejection, and registration failure distinguishable.

### Query and comparison semantics

`a11y.query` and `a11y.compare` have different cardinality rules:

- `query` returns between 0 and 12 candidates. It filters first, records the pre-slice count in `totalMatched`, and sorts by: distance ascending when `near` exists; availability descending when `availableOnly` is false; `price_usd` ascending; row ascending; seat letter ascending; and `ref` ascending as the final tie-breaker.
- `compare` accepts exactly 2–4 unique valid refs and returns exactly those 2–4 candidates in input order. It never applies the query cap, performs search, or silently drops an invalid/unavailable ref.
- `query` has no `more`, page, cursor, continuation token, offset, or pagination behavior.
- For 13 or more matches, `query` returns the first 12, keeps the true count in `totalMatched`, and chooses the first absent applicable narrowing axis from: `near`; `maxDistance_m` when `near` exists; `priceMax_usd`; `needs.minFootSpace_in2`; `needs.wheelchairSpace`; `needs.transferSeat`; `needs.movableArmrest`; `needs.excludeExitRow`; `rail.facing`; `rail.side`; `rail.quietCar`. If every applicable axis is already present, choose the first active tighten-able axis in this order: decrease `maxDistance_m`, decrease `priceMax_usd`, increase `needs.minFootSpace_in2`. The hint names the field and direction but invents no threshold value.
- Zero matches is a successful query with `items: []`, `totalMatched: 0`, normalized `appliedCriteria`, and a deterministic relaxation `hint`. Choose the first active restriction in this order: set `availableOnly` to false; increase/remove `maxDistance_m`; increase/remove `priceMax_usd`; decrease/remove `needs.minFootSpace_in2`; remove the first active boolean `needs` flag in schema order; remove `rail.facing`, `rail.side`, then `rail.quietCar`; finally remove `near`. The hint names the field and relaxation direction but invents no value. `NO_MATCH` remains in the shared error vocabulary for use cases that require a singular match; query does not use it for an ordinary empty set.
- `appliedCriteria` contains normalized defaults, including `availableOnly: true`, and unsupported criteria are rejected rather than ignored.
- `maxDistance_m` without `near` is `INVALID_CRITERIA`; a domain-inapplicable block such as `hotel` while `domain === "rail"` is `UNSUPPORTED_CRITERIA`.

Required query tests cover 0, 12, and 13+ matches; deterministic order across repeated runs; complete ties resolved by `ref`; truthful `totalMatched`; hint-priority order; no pagination fields; and normalized defaults. Required compare tests cover 1/2/4/5 refs, duplicates, invalid refs, unavailable refs, input-order preservation, and identical comparison axes.

Canonical derived result types are:

```ts
type CandidateBase = {
  ref: string;
  label: string;
  line: string;
  price_usd: number;
  available: boolean;
  features: string[];
  distance?: { from: string; distance_m: number; rendered: string };
};

type Candidate = CandidateBase & (
  | {
      domain: "rail";
      rail: {
        row: number;
        seatLetter: string;
        side: "window" | "aisle";
        facing: "forward" | "backward";
      };
      hotel?: never;
      accessibility: {
        wheelchairSpace: boolean;
        transferSeat: boolean;
        companionSeat: boolean;
        movableArmrest: boolean;
        footSpace_in2: number;
        bulkhead: boolean;
        exitRow: boolean;
      };
    }
  | {
      domain: "hotel";
      hotel: {
        floor: number;
        bedToBathroom_m?: number;
      };
      rail?: never;
      accessibility: Record<string, string | number | boolean | null>;
    }
);

type Comparison = {
  axes: { key: string; label: string }[];
  rows: { ref: string; values: Record<string, string | number | boolean | null> }[];
};
```

`Comparison.rows` preserves input-ref order, every row has the same keys as `axes`, and neither type contains legacy bare `price`, authored `steps`, bare `train`, or index-coupled value arrays. `compare` may include unavailable candidates and exposes their availability on the common comparison axis; only `select` rejects an unavailable ref with `NOT_AVAILABLE`.

### Data, route, rendering, state, and undo

- Coordinates and source distances use meters: `position_m`, `length_m`, and `totalLength_m`.
- `Seat` must retain every PRD field, including all accessibility, service-animal decision, availability, pricing, direction, and feature fields. `QueryCriteria` must retain common, `needs`, `rail`, and `hotel` blocks and their validation rules.
- `RenderOptions` must retain `units`, `stepLength_m`, `directionStyle`, and `walkSpeedPercent`, with explicit defaults and validity ranges. Authored data must not contain `steps`; `steps` is a presentation-only approximation derived from meters and accompanied by `unitsNote`.
- Store direction as bearing plus reference frame. Relative, clock, and cardinal strings are presentation-boundary derivations.
- `Route` must include complete structured segments, total length/time, landmarks, and rendered output. The algorithm must preserve real lateral seat-to-aisle movement and may not collapse a cross-aisle route to zero. After merging only contiguous collinear segments with identical mode and bearing, return at most four segments. If more remain, set `requestedTo` to the original destination, set `to` to the last stable landmark reachable within four segments, and return `requiresContinuation: true` plus `checkpoint: { ref, label }` whose `ref === to`; `totalLength_m` and `totalTraversalTime_s` equal the sums of the returned partial-leg segments only. A follow-up route uses `from: checkpoint.ref` and `to: requestedTo`. For a complete route, `requestedTo === to`, totals cover all segments, `requiresContinuation: false`, and `checkpoint` is absent.
- `AppState` must retain domain, layout, selection, confirmation status, active route, highlighted refs, tool log, history, and preferences. Extend each `toolLog` entry to `{ name, args, appliedCriteria?, resultRefs, at }`, resolving the PRD UI4/AppState mismatch explicitly. Every UI and tool projection must derive from this shared state.
- Undo must specify the exact snapshot fields, push timing, one-step restoration behavior, empty-history behavior, and behavior during pending or completed confirmation. Tests must prove selection, highlights, totals, status, and `undoable` restore coherently.
- UI1–UI8 must each have a concrete component/behavior mapping and an acceptance test. Preserve CSS Grid, live referenced-seat highlighting, segment-derived SVG route overlay, tool log with arguments and `appliedCriteria`, persistent selection/price/status panel, keyboard plus ARIA grid/cell operation, focus-safe accessible confirmation dialog, and the unsupported-WebMCP banner.
- UI6 requires human controls for the complete non-agent journey: an accessible filter form, route from/to controls, 2–4 candidate comparison selection, seat description/details, select and current-selection inspection, undo, units/direction/walk-speed preferences, and confirmation. These controls call the same Application use cases and produce the same state transitions and errors as WebMCP.

The eight required route tests are exact acceptance cases, not examples that may be dropped:

1. `entrance_front → 6-12A`: longitudinal movement plus aisle-to-seat lateral movement and `countedFeatures` containing `{ feature: "row", count: 6 }`;
2. `6-12A → restroom`: seat-to-aisle lateral movement and landmark collection;
3. `6-12A → 6-14D`: lateral–longitudinal–lateral three-segment route;
4. `6-12A → 6-12D`: same-row cross-aisle route with `totalLength_m > 0`;
5. `6-12A → 6-12B`: same-row, same-side direct movement when physically traversable;
6. the same route rendered with all three `units` values: identical `segments`, changed `rendered` only;
7. `walkSpeedPercent: 50`: doubled `traversal_time_s` with unchanged `length_m`; and
8. a raw route with more than four non-mergeable segments: no more than four returned segments; `requestedTo` remains the requested destination; `to === checkpoint.ref`; totals equal the returned segment sums; and `requiresContinuation: true` yields a valid follow-up route from the checkpoint to `requestedTo`.

### Landmark and portability contracts

Replace string-only landmarks with the PRD O&M five-category model. Preserve sensory channels, cane-user and guide-dog detectability, optional sign text, meter coordinates, stable refs, structured relations, and follow-up questions. Concise summaries are derived conveniences; they may not replace interrogable facts.

The portability proof must contain all four elements:

1. all nine domain-independent tool names and input/output schemas;
2. a rail-to-hotel mapping for refs, coordinates, landmarks, accessibility facts, pathway modes, and relational questions;
3. the explicit GTFS Pathways mapping and Bearing extensions below; and
4. a mapping from 28 CFR 36.302(e) prose obligations to structured Bearing fields.

Hotel remains a schema/documentation proof. The Architecture must not promise a hotel adapter, hotel UI, multilevel algorithm, or tenth preferences tool as part of the nine-tool MVP.

## Human Confirmation Contract

`a11y.confirm` is a same-call human-control boundary, not a two-call polling protocol:

1. Preconditions are `status === "draft"` and a non-empty selection.
2. The use case captures the pre-confirm snapshot, changes status to `confirmation_pending`, opens the accessible in-page dialog, moves focus safely, and starts a 120-second timeout.
3. While pending, `select`, `undo`, and duplicate `confirm` calls fail deterministically with `CONFIRMATION_REQUIRED`; read-only state inspection remains available. No Agent call can produce `confirmed`.
4. The first terminal event wins exactly once:
   - the user's confirm action returns `{ outcome: "confirmed" }` with full state and status `confirmed`;
   - the user's cancel action returns `{ outcome: "cancelled" }` with the pre-confirm selection restored, status `draft`, and full state; or
   - 120 seconds returns `{ outcome: "timeout" }` with the same restoration and full state.
5. Per-call `options.signal` abort, document teardown, or unexpected dialog failure closes the dialog, clears timers/listeners, restores the pre-confirm state, restores focus when the document remains active, and terminates the execution through the runtime-failure/cancellation path. Agent abort is not misreported as the user's `cancelled` outcome.
6. Racing terminal events, repeated UI actions, and late callbacks are idempotent. They cannot settle twice, reopen the dialog, or overwrite a terminal state.

The public contract contains no `confirmation_pending` return outcome and no fallback that returns early and asks the Agent to poll `get_selection`. Blocking execution is an application contract implemented with an asynchronous tool promise; it is not described as a standardized WebMCP user-interaction primitive.

Target-runtime integration tests must exercise confirm, cancel, timeout, per-call abort, duplicate call, mutation lock, focus restoration, state restoration, and full same-call result in both the ChatGPT in-app browser and the challenge-specified Chrome runtime. If a target runtime cannot support the contract, record evidence as an open blocker and require a separately versioned technical erratum; do not silently change the public schema.

## WebMCP Adapter and Platform Contract

- Keep WebMCP isolated to the adapter. Tool descriptions are static; current layout data comes from tool results.
- Tool names are 1–128 characters and contain only ASCII alphanumerics, `_`, `-`, and `.`. All nine `a11y.*` names conform; no underscore fallback is public contract.
- Per-call cancellation is `execute(input, { signal })`. Registration lifecycle is `registerTool(definition, { signal })`. The two signals have different owners and must not be conflated.
- Each `execute` fulfills with a JSON-serializable plain `ToolResult` value. The draft serializes that JavaScript value to JSON. Do not wrap it in an MCP-server `{ content, isError }` envelope and do not claim special WebMCP semantics for `isError`.
- Outputs contain no DOM nodes, functions, class instances, circular references, `BigInt`, non-finite numbers, or other non-JSON values. Exact round-trip shape is a target-runtime integration test because WebMCP remains experimental.
- Require a Secure Context, an origin-keyed document/agent cluster where applicable, and permission to use the `tools` Permissions Policy feature. Capability diagnostics must distinguish absence/unsupported, insecure context, `NotAllowedError`, `SecurityError`, and other registration failure.
- Preserve top-level registration for the MVP. Cross-origin exposure and iframe registration are outside product scope even though the draft defines related mechanisms.
- The draft defines `readOnlyHint: true` as modifying no state, not merely no decision state. Because UI2–UI4 require every tool call to update visible highlights, overlays, or the tool log, v0.3.2 applies an explicit WebMCP erratum to the PRD annotation matrix and uses `readOnlyHint: false` for all nine tools. Do not describe a state-changing call as read-only. A future tool may use `true` only if its execution produces no application, presentation, DOM, log, preference, or persisted state change.
- Static, independently authored fixture output uses `untrustedContentHint: false`. Reassess each affected tool before accepting third-party or user-generated text/data.

The Architecture must contain this explicit nine-tool annotation matrix and keep registration examples consistent with it:

| Tool | `readOnlyHint` | `untrustedContentHint` |
| --- | --- | --- |
| `a11y.get_layout` | `false` | `false` |
| `a11y.query` | `false` | `false` |
| `a11y.describe` | `false` | `false` |
| `a11y.get_route` | `false` | `false` |
| `a11y.compare` | `false` | `false` |
| `a11y.select` | `false` | `false` |
| `a11y.get_selection` | `false` | `false` |
| `a11y.undo` | `false` | `false` |
| `a11y.confirm` | `false` | `false` |

## GTFS Pathways Semantics

Describe Bearing as **GTFS-Pathways-aligned**, not as a literal `pathways.txt` producer or a wire-compatible extension. The Architecture must include this mapping:

| Bearing field/value | GTFS Pathways source | Classification |
| --- | --- | --- |
| `length_m` | `length` (meters) | Unit-explicit Bearing name with GTFS semantics |
| `traversal_time_s` | `traversal_time` (seconds) | Unit-explicit Bearing name with GTFS semantics |
| `min_width_m` | `min_width` (meters) | Unit-explicit Bearing name with GTFS semantics |
| `stair_count` | `stair_count` | Same name and directional-count semantics |
| `max_slope` | `max_slope` | Same ratio semantics; optional because the single-level rail fixture generates no slope |
| `signpostedAs` | `signposted_as` | Camel-case Bearing name preserving literal sign text semantics |
| `pathway_mode: "walkway"` | `pathway_mode=1` | Human-readable Bearing representation of GTFS mode |
| `pathway_mode: "stairs"` | `pathway_mode=2` | Human-readable Bearing representation of GTFS mode |
| `pathway_mode: "elevator"` | `pathway_mode=5` | Human-readable Bearing representation of GTFS mode; type portability only in MVP |
| `pathway_mode: "door"` | no GTFS Pathways value | Bearing extension |
| `pathway_mode: "vestibule"` | no GTFS Pathways value | Bearing extension |

Also identify `from`/`to`, `bearing`, `countedFeatures`, `landmarksPassed`, `landmarks`, `rendered`, `requiresContinuation`, `checkpoint`, and aggregate totals as Bearing fields rather than GTFS wire fields. `walkSpeedPercent` and `additionalTransferTime_s` are OSDM-aligned effort/connection semantics; only `walkSpeedPercent` changes per-segment walking time in the rail MVP, while `additionalTransferTime_s` remains an optional portability field and is not silently applied. This corrects the PRD phrase that the route uses GTFS names "as-is" while preserving its intent to reuse standards semantics. Do not imply that GTFS Pathways models passenger-vehicle interiors.

## Challenge Compliance and Evidence

Architecture must express the following as acceptance evidence, never as unsupported completion claims and never as a schedule:

- The project passes Stage One by fitting the human-agent open-web theme and using a genuine working WebMCP implementation.
- Acceptance criteria map to all four equally weighted Stage Two criteria: WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition. Nine tools support a complete experience; tool count alone is not the achievement.
- The intended target platform and testing instructions explicitly cover ChatGPT's in-app browser and Google Chrome 149 or later with the WebMCP testing flag enabled.
- Judges receive an accessible, unauthenticated working live URL. Bearing adds no account or login flow and remains free of charge and unrestricted for judging through the judging period.
- The submission includes the required four-part written description: WebMCP fit, better UX, newly possible human-agent collaboration, and implementation approach.
- The public repository contains all source code, assets, and functional/testing instructions, plus the PRD-selected MIT license detectable in the repository About area.
- The demo is a public YouTube video under three minutes with a clear functioning demo and audio explaining the project and WebMCP use. It preserves the PRD journey (`query → get_route → compare → select → confirm`), the unit-rendering demonstration, and the hotel mapping proof. It uses English narration/captions and no background music.
- Submission materials, repository README/instructions, and product UI strings are English. If any submitted artifact is not English, provide the required English translation, including video, description, testing instructions, and all other submitted materials.
- Project provenance states whether the project was created during the submission period. If any part pre-existed, documentation and dated evidence distinguish prior work from meaningful WebMCP work added during the period.
- Every third-party dependency, SDK, API, dataset, image, font, audio track, and other asset has recorded provenance, license, and authorization basis. Third-party trademarks, copyrighted media, and unauthorized material do not appear in the UI, repository assets, or demo.
- `intercity-car-6.json` and any before/after mockup are independently authored, unbranded synthetic fixtures/assets. They may use documented operational facts such as common 2+2 seating or aisle placement, with sources recorded, but may not reproduce a third-party diagram, layout artwork, screenshot, or proprietary dataset.

Describe Bearing as an accessibility prototype informed by cited sources, not as certified legal, regulatory, WCAG, safety, routing, or real-world operational compliance. Use bounded claims such as "among the major standards reviewed" and "selected project name" unless a separately documented search supports more. Disclose that direct blind-user validation has not occurred; keyboard, screen-reader, monitor-off, and synthetic-fixture tests are engineering verification, not participant research.

## Verification Design

Verification must inspect exact contracts, not merely find tokens.

### Structural and traceability checks

1. Confirm exactly 27 numbered Architecture sections, §§1–27, in order; confirm the former §0 revision-summary role is preserved in an unnumbered preamble.
2. Confirm every required traceability row has one disposition, target section, and evidence; no normative PRD subsection is unaccounted for.
3. Confirm all nine tools appear exactly once in the canonical tool matrix and annotation matrix and that all examples/tests use the same names.
4. Confirm UI1–UI8, the eight route tests, all four portability-proof elements, all four judging criteria, all submission artifacts, platform requirements, limitations, risks/open questions, and identity are present.
5. Confirm no schedule, cut list, deadline triage, or implementation-completion claim entered Architecture.

### Exact schema and table checks

1. Compare every tool input, successful `data`, domain-failure result, state projection, and annotation cell against the canonical matrices and PRD §§7–10.
2. Compare complete field sets and enum values for `ToolResult`, `SelectionState`, errors, `Seat`, `QueryCriteria`, `RenderOptions`, `Candidate`, `Comparison`, `Landmark`, `LayoutSummary`, `Description`, `RouteSegment`, `Route`, and `AppState`; reject missing, extra, renamed, or contradictory fields unless labeled as an erratum.
3. Verify mutation and undo examples project full state and confirmation examples return only same-call `confirmed | cancelled | timeout` outcomes.
4. Verify the query 0/12/13+ boundaries, stable semantic ordering plus `ref`, `totalMatched`, supported-axis hint, compare 2–4 behavior, and absence of all pagination/token fields.
5. Verify the GTFS mapping table distinguishes literal GTFS fields/modes from unit-explicit names and Bearing extensions.

### Automated and manual review

1. Search obsolete public-contract tokens with word-boundary/context-aware checks: `Wayfinder`, `STEP_CALIBRATION`, authored `steps`, `maxSteps`, `totalWalkingSteps`, `atStep`, `MAX_AGENT_ITEMS = 5`, response `more`, `train-4.json`, bare `priceTotal`, KRW examples, underscore tool-name fallback, MCP `{ content, isError }`, early `confirmation_pending` response, and any standardized `requestUserInteraction` claim. Permit a term only in an explicitly labeled history/migration/negative assertion and inspect each match.
2. Search required tokens, then inspect their defining tables/types rather than accepting presence alone: `Bearing`, `position_m`, `length_m`, `totalLength_m`, `RenderOptions`, `unitsNote`, `maxDistance_m`, `priceTotal_usd`, `intercity-car-6.json`, `landmarkType`, `sensoryChannels`, `totalMatched`, and the 12-item rule.
3. Check placeholders (`TODO`, `TBD`, `FIXME`, `???`), empty sections, broken fences, malformed tables, duplicate headings, trailing whitespace, and Markdown link integrity.
4. Run contradiction scans for query versus compare cardinality, confirmation return versus state status, WebMCP registration versus execution signals, GTFS names versus Bearing names, read-only annotations versus state effects, hotel portability versus implementation scope, and requirements versus claims of completion.
5. Run `git diff --check`, inspect the complete Markdown diff, and confirm that only intended files changed.
6. Independently review the rewrite against PRD v0.3, the official challenge rules/submission page, the current WebMCP draft, and the official GTFS reference. Resolve every confirmed discrepancy before completion.

## Success Criteria

- Architecture has no known v0.2.1 public contract outside clearly labeled migration/history notes.
- Architecture has exactly §§1–27 plus an unnumbered revision preamble. All nine tools, PRD goals/non-goals, §4 standards relationships, P1–P7, M1–M6/E1–E3 dispositions, complete schemas, UI1–UI8, eight route tests, portability proof, judging journey, platform facts, compliance evidence, limitations, risks/open questions, and identity are traceable.
- `query` and `compare` have distinct, deterministic cardinality contracts and exact boundary tests.
- Confirmation is a same-call, 120-second, full-state, human-controlled contract with deterministic lock, abort, duplicate, timeout, and restoration behavior; there is no unverified public fallback.
- WebMCP API claims match the current draft and remain separated from advisory host guidance.
- GTFS-aligned semantics are accurate about field mappings, numeric GTFS pathway modes, and Bearing extensions.
- Official challenge requirements are represented as verifiable acceptance constraints without schedule management or unsupported completion claims.
- Architecture remains implementation-ready rather than repeating the PRD, and every unavoidable ambiguity is resolved explicitly.
