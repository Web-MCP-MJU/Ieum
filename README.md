# Ieum — Spatial Accessibility Bridge

Transform how people with visual disabilities navigate and book seats by exposing spatial structure as WebMCP tools instead of visual tables.

## What This Is

A WebMCP implementation that turns seat selection screens into a set of tools an external agent can query—letting users with visual disabilities **explore, compare, and decide** independently, rather than getting a summary they can't verify.

**9 tools** expose seat/room layout as structured data:
- `a11y.get_layout` — Overall structure
- `a11y.query` — Search by criteria (accessibility needs, price, distance)
- `a11y.describe` — Individual seat details
- `a11y.get_route` — Walking paths with turn-by-turn directions
- `a11y.compare` — Compare 2-4 seats on the same axes
- `a11y.select` / `a11y.get_selection` — Manage selection state
- `a11y.undo` — Clear selection
- `a11y.confirm` — Final approval (120s user-controlled wait)

## The Problem

WCAG 2.2 requires semantic connections between table cells, not spatial relationships. A seat's **location IS the information**, but current standards don't require exposing it.

- **28 CFR 36.302(e)** mandates "sufficient detail" for independent judgment
- **14 CFR 382.41** requires per-seat accessibility data
- **No standard schema** exists. Everything is free text, unparseable.

Ieum demonstrates a structured alternative using an unbranded rail car model: **15 rows of 4 seats, 60 in all**.

## How It Works

**Three-layer architecture:**

```
Domain Core (src/domain/)
  ↓ Pure TypeScript, no DOM
Application (src/app/)
  ↓ store + 9 use cases
WebMCP Adapter (src/webmcp/)
  ↓ Chrome API binding
External Browser Agent (ChatGPT, Claude, etc.)
```

Run locally:
```bash
npm install
npm test          # 91/91 ✔
npm run typecheck # strict mode ✔
```

Open `public/smoke.html` in Chrome 149+ or ChatGPT desktop to test tool registration.

## Design Decisions

### 1. Flat Results, Not Truncated
Audio menu research (Commarford et al., *Human Factors* 50(1), 2008) shows **broad shallow structures beat deep narrow ones**. Return up to 12 candidates, not 3+More.

### 2. Unsupported Filters Are Rejected, Not Silently Dropped
Passing `{ hotel: { floor: 8 } }` to a rail car query silently drops `hotel` → agent tells user about floors that don't exist. Return structured error instead.

### 3. Distances Are Walking Paths, Not Straight Lines
Route engine accounts for actual movement (step out of seat → aisle → walk → step in). Same physical movement gets opposite direction names depending on traveler's facing.

### 4. No Stored Step Counts
Stride length varies within a single walk. Store distances in meters; convert to steps at render time with `stepLength_m` parameter.

### 5. Fields From GTFS-Pathways
Use existing transit standard vocabulary (length_m, traversal_time_s, pathway_mode, min_width_m) to signal that this is an extension of an adopted standard, not a new one.

## Accessibility Features (Required by Design)

- Keyboard navigation via `<input role="grid">` + arrow keys
- `aria-label` on each seat cell with position + accessibility features
- `aria-live="polite"` for tool results
- `aria-modal` on confirmation dialog with focus management
- **User always controls final selection** — agent cannot auto-confirm

## Research & Standards References

- **W3C-OGC Maps for the Web Workshop (2020):** WCAG gaps in spatial information
- **49 CFR 38.125(d):** Wheelchair space and transfer seat requirements (rail)
- **14 CFR 382.41:** Movable armrest seat locations (air)
- **28 CFR 36.302(e):** Hotel accessibility disclosure requirement
- **GTFS-Pathways:** Standard for transit pathway data (`pathways.txt`)
- **OSDM Convention:** Walk speed percentage (100 = average)

## Files

```
src/
├─ data/
│  └─ intercity-car-6.json   Authored spatial truth: 60 seats, landmarks, portals
├─ domain/          Pure TypeScript, knows nothing about the DOM
│  ├─ types.ts      The TypeScript face of the output contract
│  ├─ car-6.ts      Loads and validates the fixture
│  ├─ route-engine.ts
│  ├─ query-engine.ts
│  ├─ compare-engine.ts
│  └─ render.ts     Metres and degrees in, spoken instructions out
├─ app/
│  ├─ store.ts      AppState, undo history, SelectionState selectors
│  └─ usecases.ts   9 use cases, one per tool
├─ webmcp/
│  ├─ capability.ts document.modelContext detection and diagnostics
│  └─ register.ts   registerTool x 9, wired to the use cases
└─ ui/              (In progress)

tests/
├─ schema.ts        Validates output against docs/contracts/ieum-output.schema.json
├─ contract.test.ts Schema conformance + the validator's own self-check
├─ route.test.ts    Architecture section 7 acceptance cases
├─ query.test.ts
├─ app.test.ts      State, undo, and the confirmation boundary
└─ webmcp.test.ts   Registration, annotations, serialization

docs/
├─ PRD v0.3.md       Requirements & research
├─ Architecture.md   System design
├─ INTERFACE.md      Engine ↔ UI contract
└─ DEV-PLAN.md      Execution plan & checkpoints

tests/
├─ route.test.ts    12 cases
└─ query.test.ts    15 cases
```

## Testing

All 27 test cases pass:
- Route engine: aisle projection, counted features, direction relativity
- Query engine: Q1 (distance needs origin), Q2 (domain mismatch), Q3 (unknown refs)
- Compare engine: axis filtering, candidate validation

```bash
npm test
```

## License

MIT. See [LICENSE](LICENSE).

## Acknowledgments

Research supervision by accessibility specialists at Smith-Kettlewell Eye Research Institute. Built for the MJU WebMCP competition.
