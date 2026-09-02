# Bearing Architecture–PRD Synchronization Design

## Objective

Update `docs/Architecture.md` comprehensively so that `docs/PRD v0.3.md` is the authoritative product and public-contract source while preserving the Architecture document's useful layer boundaries, implementation detail, tests, evaluations, and decision records.

## Authority and Scope

- `docs/PRD v0.3.md` is authoritative whenever the two documents disagree.
- The resulting document version is `Bearing Architecture v0.3.2`.
- Preserve the existing 27-section organization unless a subsection becomes redundant after synchronization.
- Do not change `docs/PRD v0.3.md` as part of this task.
- Do not add product capabilities beyond PRD v0.3.

## Contract Changes

### Identity and MVP Domain

- Replace `Wayfinder` with `Bearing` throughout prose, examples, ADRs, and success criteria.
- Use the domain value `rail`, the fixture name `intercity-car-6.json`, the layout example `Car 6, Business Class`, and USD-denominated fields.
- Treat rail as the only implemented MVP domain. Hotel remains a contract-portability proof documented through a mapping, not an implementation phase.

### Spatial Data and Routing

- Store coordinates and distances in meters using `position_m`, `length_m`, and `totalLength_m`.
- Remove `STEP_CALIBRATION`, authored `steps`, `maxSteps`, `totalWalkingSteps`, and `atStep` as source-of-truth fields.
- Permit `steps` only as a rendered approximation using `stepLength_m`, accompanied by `unitsNote`.
- Store direction as a bearing plus reference frame. Render relative, clock, or cardinal language only at the presentation boundary.
- Define routes with GTFS-Pathways-aligned semantics: `pathway_mode`, `length_m`, `traversal_time_s`, `stair_count`, `min_width_m`, bearing, counted features, and structured landmarks.
- Use aisle-aware geometry: same-side movement may remain direct when physically traversable; crossing seat blocks or rows must use aisle anchors. No route may collapse a real cross-aisle movement to zero distance.

### Query and Response Shaping

- Replace the five-item response rule with a flat maximum of 12 items.
- Remove `more` and all pagination or continuation-token behavior.
- When more than 12 candidates match, return a deterministic 12-item slice and a `hint` that identifies a supported narrowing axis. Preserve `totalMatched` so the Agent can disclose that the result was narrowed.
- Use `maxDistance_m`, `priceMax_usd`, `rail`, and PRD v0.3 accessibility-need fields.
- Return normalized `appliedCriteria` including defaults and reject unsupported criteria rather than silently ignoring them.

### Landmark and Description Contracts

- Replace string-only landmarks with the O&M-based five-category model.
- Include sensory channels, cane-user and guide-dog detectability, optional sign text, and meter coordinates.
- Keep concise summaries as derived conveniences while making structured facts, stable refs, relations, and follow-up questions the primary interrogable contract. “Do not summarize” means “do not stop at a summary.”

### State and Human Confirmation

- Use `priceTotal_usd` and the PRD selection-status vocabulary.
- Keep full state projection after every mutating tool.
- Make `a11y.confirm` block until the user confirms, cancels, execution aborts, or the 120-second timeout occurs; return the outcome in that same call.
- Remove the asynchronous pending-return fallback from the public contract. Runtime compatibility remains an adapter verification concern and cannot weaken the human-confirmation invariant.

### WebMCP Adapter

- Keep WebMCP isolated to the adapter and continue using static descriptions, `readOnlyHint`, registration lifecycle control, and capability diagnostics.
- Describe dotted tool names as valid at the specification level but retain `a11y_*` as a host-compatibility fallback until the target ChatGPT runtime is tested.
- Follow PRD v0.3's `toWire()` contract for the Architecture document: successful and domain-error payloads are serialized into the WebMCP content envelope, with `isError: true` for domain errors.
- Record target-runtime return-shape validation as the first implementation gate because WebMCP remains a draft and the PRD marks host behavior for verification.

## Preserved Architecture

The following boundaries remain unchanged in intent:

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
- UI and tools derive from one structured spatial source of truth.
- WebMCP is progressive enhancement; keyboard and ARIA operation must remain complete without it.

## Verification Design

After editing `docs/Architecture.md`:

1. Search for obsolete public-contract tokens: `Wayfinder`, `STEP_CALIBRATION`, `maxSteps`, `totalWalkingSteps`, `MAX_AGENT_ITEMS = 5`, `more`, `train-4.json`, `priceTotal`, and KRW examples.
2. Search for required v0.3 tokens: `Bearing`, `position_m`, `length_m`, `RenderOptions`, `unitsNote`, `maxDistance_m`, `priceTotal_usd`, `intercity-car-6.json`, `landmarkType`, `sensoryChannels`, and the 12-item rule.
3. Compare every Architecture tool input/output table against PRD §§7–9.
4. Check examples, tests, ADRs, implementation phases, and success criteria for the same names and types used by the main contracts.
5. Run Markdown structural checks, `git diff --check`, and inspect the complete diff.
6. Dispatch independent reviews for spatial/query contracts and WebMCP/state/testing contracts; resolve every confirmed mismatch before completion.

## Success Criteria

- Architecture has no known v0.2.1 public contract remaining.
- All public names, types, examples, ADRs, tests, and acceptance criteria agree with PRD v0.3.
- The Architecture document remains implementation-ready and does not merely repeat the PRD.
- Any unavoidable PRD ambiguity is resolved explicitly in Architecture without silently changing product intent.
