# Bearing Architecture–PRD Synchronization Design

## Objective

Update `docs/Architecture.md` comprehensively so that it preserves PRD v0.3's complete product scope while conforming to the official WebMCP Challenge rules and the current WebMCP specification. Preserve the Architecture document's useful layer boundaries, implementation detail, tests, evaluations, and decision records.

## Authority and Scope

- Authority order is: official challenge rules and current WebMCP specification for compliance and platform facts; `docs/PRD v0.3.md` for product intent and scope; existing `docs/Architecture.md` for implementation detail that does not conflict with either source.
- The resulting document version is `Bearing Architecture v0.3.2`.
- Preserve the existing 27-section organization unless a subsection becomes redundant after synchronization.
- Do not change `docs/PRD v0.3.md` as part of this task.
- Do not add product capabilities beyond PRD v0.3.
- Do not reduce the nine-tool product scope or remove requirements based on schedule estimates. Schedule and delivery management remain outside this document synchronization task.

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
- Preserve the invariant that an Agent call alone can never produce `confirmed`.
- Treat blocking execution and pending-state execution as adapter strategies rather than WebMCP guarantees. The current WebMCP specification provides per-call cancellation but no standardized user-interaction primitive.
- Prefer same-call completion when verified in the target runtime. If the runtime cannot reliably keep the call pending while the page dialog is used, return `confirmation_pending`, require direct user action in the accessible page dialog, and expose the final state through `a11y.get_selection`.
- In either strategy, cancellation, timeout, duplicate calls, and state restoration must have explicit deterministic behavior.

### WebMCP Adapter

- Keep WebMCP isolated to the adapter and continue using static descriptions, `readOnlyHint`, registration lifecycle control, and capability diagnostics.
- State the current normative tool-name constraint precisely: 1–128 characters using ASCII alphanumerics, `_`, `-`, and `.`. The nine `a11y.*` names conform; an underscore fallback is not part of the public contract.
- Use `execute(input, { signal })` for per-call cancellation and `{ signal }` in `registerTool` options for registration lifecycle. Do not conflate the two signals.
- Return a JSON-serializable plain `ToolResult` value. Do not claim that the MCP-server `{ content, isError }` envelope is required or that `isError` receives special WebMCP semantics. Expected domain failures use `ok: false`; unexpected runtime failures reject.
- Keep output free of DOM nodes, functions, class instances, circular references, and non-JSON values.
- Record target-runtime return-shape validation as an integration test because WebMCP remains an experimental draft.
- Require Secure Context, an origin-keyed document, and an allowed `tools` Permissions Policy. Distinguish unsupported, insecure, permission-denied, security-rejected, and registration-failed states.
- Apply `readOnlyHint` only to tools that do not change decision or persisted application state. Treat visual highlighting and logs as observable presentation effects and verify host behavior.
- Keep static fixture output marked `untrustedContentHint: false`; require reassessment if third-party or user-generated data is introduced.
- Keep tool descriptions and outputs concise and verify the current Chrome guidance budgets, including the recommended 1.5K-character individual output ceiling.

### Challenge Compliance and Claims

- Preserve all nine tools and the complete PRD product journey. Judging favors a genuine, working, non-trivial WebMCP implementation; tool count itself is not presented as the achievement.
- Connect acceptance criteria explicitly to the four official judging criteria: WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition.
- Require a working live URL, public repository, visible open-source license, complete source/assets/instructions, English submission materials, and a public demo video under three minutes with audio.
- Use only independently authored synthetic rail data. Do not reproduce a third-party diagram or claim that factual inspiration automatically eliminates IP risk.
- Keep third-party trademarks, logos, copyrighted music, and unauthorized media out of the UI, repository assets, and demo video.
- Record the license and authorization basis for every third-party dependency, dataset, image, font, and other asset.
- Describe Bearing as an accessibility prototype informed by cited sources, not as certified legal, regulatory, WCAG, or real-world operational compliance.
- Replace absolute novelty and trademark-safety claims with bounded language: “among the major standards reviewed” and “selected project name,” unless a separate documented search supports stronger claims.
- Disclose that direct blind-user validation has not yet occurred; keyboard, screen-reader, and monitor-off tests are engineering verification, not a substitute for participant research.
- Keep internal Korean planning documents permissible, while ensuring every submitted artifact and required translation is in English.

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
6. Search for obsolete platform claims: unconstrained `DOMString`, required `{ content, isError }` envelope, missing per-call signal, standardized user-interaction primitive, and guaranteed blocking confirmation.
7. Verify official submission and IP constraints are represented without turning Architecture into a schedule or submission-management document.
8. Dispatch independent reviews for spatial/query contracts and WebMCP/state/testing/compliance contracts; resolve every confirmed mismatch before completion.

## Success Criteria

- Architecture has no known v0.2.1 public contract remaining.
- Product names, types, examples, ADRs, tests, and acceptance criteria agree with PRD v0.3 except where an explicit technical erratum is required by the current WebMCP specification or official challenge rules.
- All nine `a11y.*` tools and the full documented product journey remain in scope.
- Architecture contains no schedule-based feature cuts or delivery recommendations.
- WebMCP API claims match the current specification and Chrome/OpenAI integration documentation.
- Official challenge submission, IP, language, and claims constraints are reflected accurately.
- The Architecture document remains implementation-ready and does not merely repeat the PRD.
- Any unavoidable PRD ambiguity is resolved explicitly in Architecture without silently changing product intent.
