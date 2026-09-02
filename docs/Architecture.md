# Bearing Architecture v0.3.2 — Spatial Accessibility Bridge

**Product contract:** `docs/PRD v0.3.md`

**Specification date:** 2026-09-02

**Document role:** implementation-ready architecture and acceptance contract; it does not claim that implementation, runtime integration, accessibility validation, deployment, or submission is complete.

This revision replaces the v0.3.1 public contract. Bearing is the selected project name; the only implemented MVP domain is `rail`; the independently authored fixture is `data/intercity-car-6.json`, its unbranded `layoutId` is `Car 6, Business Class`, and all prices are USD. The former numbered revision summary is retained here as an unnumbered preamble so the architecture has exactly §§1–27.

Authority, in descending order:

1. [Official challenge page](https://webmcp.devpost.com/) and [official rules](https://webmcp.devpost.com/rules) for eligibility, judging, submission, language, provenance, and IP.
2. [Current WebMCP Draft Community Group Report](https://webmachinelearning.github.io/webmcp/) for WebMCP API facts. It is a Draft Community Group Report, not a W3C Standard or W3C Standards Track document.
3. [GTFS Schedule Reference](https://gtfs.org/documentation/schedule/reference/) for GTFS Pathways wire names and semantics.
4. `docs/PRD v0.3.md` for Bearing product intent, scope, user journey, types, and UI.
5. The earlier Architecture only for non-conflicting implementation detail.

[Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp/imperative-api) and [OpenAI Site Tools documentation](https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app) are target-runtime guidance, subordinate to the draft. Host guidance such as a recommended 1.5K-character individual-output ceiling is optimization guidance, not a normative API limit and not permission to omit required fields.

Explicit higher-authority corrections in this revision are labeled **Official/spec erratum**. Schedule estimates, deadline triage, cut lists, registration timing, and deployment sequencing are intentionally non-architectural; product and evidence obligations remain normative.

---

## 1. One-sentence architecture definition

> **Bearing projects one authored, structured spatial model through deterministic Application use cases into both an accessible human UI and nine stable `a11y.*` WebMCP contracts, so a person can interrogate layout, route, comparison, selection, and confirmation facts without relying on visual inference.**

Bearing is a Spatial Accessibility Bridge, not an AI recommendation agent. It contains no LLM, natural-language parser, autonomous planner, generic recommendation tool, DOM scraper, OCR, or visual inference. The external Browser Agent owns natural-language understanding, tool orchestration, and conversational-reference resolution; Bearing owns deterministic spatial facts, state transitions, accessible human controls, and contract projection.

“Visual to semantic” means that UI and tools are projections of the same authored data. It never means reconstructing geometry from pixels or the DOM.

Identity claims are bounded: Bearing is the selected project name and, among the major standards reviewed in PRD §4, addresses a gap in interrogable pre-selection spatial information. No exhaustive naming, trademark, standards, safety, or accessibility-certification claim is made.

## 2. Why the Bridge boundary is sufficient

The retained modular-monolith boundaries are sufficient when “Bridge” means the combined semantic contract, not merely a browser API adapter:

```text
Structured spatial source
        ↓
Domain Core
        ↓
Application use cases ↔ App Store
        ↓
Spatial Accessibility Bridge
        ↓
WebMCP Adapter
        ↓
External Browser Agent
```

The product goals map to concrete boundaries:

| PRD goal | Architectural realization |
| --- | --- |
| G1: expose 2D seat/room information as interrogable tools | Nine domain-independent contracts in §10 |
| G2: treat routes as first-class data | Meter-source `RouteSegment[]` and `Route` in §7 |
| G3: support interrogation, not summary-only output | Stable refs, structured facts, relations, and `followUps`; summaries remain derived conveniences |
| G4: ground vocabulary in O&M literature | Five-category `Landmark` and sensory/detectability facts in §5 |
| G5: make `a11y.*` reusable | Rail implementation plus hotel/standards/legal portability proof in §18 |

The bridge covers the complete journey:

```text
get_layout → query → describe and/or get_route → compare
           → select → get_selection and/or undo → confirm
```

Tool count alone is not the product value. The value is a coherent, inspectable journey in which UI and Agent observe the same spatial and decision state and only the human can complete confirmation.

## 3. Overall architecture

Bearing is a browser-local modular monolith.

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

Dependency rules:

- `Domain Core` is pure TypeScript and has no DOM, UI framework, Agent, or WebMCP dependency.
- `Application` calls Domain Core and the App Store. It has no DOM or WebMCP dependency.
- `Spatial Accessibility Bridge` validates public inputs, invokes Application, and projects public results/errors.
- `WebMCP Adapter` owns only capability detection, registration, execution binding, serialization constraints, and lifecycle.
- `Accessible Human UI` calls the same Application use cases as the Bridge; UI and tools never call each other.
- `App Store` is the single source of mutable browser-local state.
- The authored fixture is the single source of spatial truth. UI overlays, prose rendering, tests, and tool results derive from Domain output.

WebMCP is progressive enhancement. When unavailable, every human task remains possible through keyboard- and screen-reader-operable controls (§17). There is no account, login, payment, real reservation, server, or database.

## 4. Agent and Bridge responsibility boundary

### 4.1 External Browser Agent

- Understand natural-language intent and choose/sequence the nine tools.
- Resolve phrases such as “the second one” against stable refs and prior ordered results.
- Explain structured results in the user’s requested language or level of detail.
- Ask follow-up questions and preserve user agency.
- Never invent a spatial fact, silently relax a criterion, or claim confirmation without the tool result.

### 4.2 Bearing

- Resolve stable refs against the loaded layout.
- Validate and normalize criteria and render options.
- Calculate deterministic search, comparison, relations, route geometry, and derived rendering.
- Preserve authored meters and bearing/reference-frame values.
- Expose structured facts plus derived `line`, `rendered`, and `followUps` conveniences.
- Keep UI highlights, overlays, log, selection, totals, undo, and confirmation coherent.
- Reject expected domain failures with the exact §19 vocabulary.
- Prevent Agent-only confirmation.

### 4.3 Explicit exclusions

Bearing does not implement actual booking/payment; accounts, login, or multiple users; scraping or a browser extension; an internal LLM; generic pathfinding or geometry; multilevel or multi-car routing; full locale separation; actual hotel UI/adapter/routing; real operator data; a copied real-world layout; authored step counts; or autonomous confirmation. Accessibility attributes can describe compound needs, but the product claim stays scoped to nonvisual spatial decision support.

## 5. Domain Core and complete data contracts

The Domain Core consumes validated authored data and produces facts. It never formats Agent protocol envelopes or manipulates UI.

```ts
type Seat = {
  ref: string;
  row: number;
  seatLetter: string;
  position_m: { x: number; y: number };
  side: "window" | "aisle";
  facing: "forward" | "backward";
  price_usd: number;
  available: boolean;
  wheelchairSpace: boolean;
  transferSeat: boolean;
  companionSeat: boolean;
  movableArmrest: boolean;
  footSpace_in2: number;
  bulkhead: boolean;
  exitRow: boolean;
  features: string[];
};
```

`Seat` exposes individual decision facts rather than an opaque `accessible` boolean. Wheelchair, transfer, companion, armrest, service-animal foot-space, bulkhead, and exit-row facts remain separately interrogable.

```ts
type LandmarkType =
  | "primary"
  | "secondary"
  | "clue"
  | "information_point"
  | "environmental_regularity";

type SensoryChannel =
  | "tactile"
  | "auditory"
  | "olfactory"
  | "thermal"
  | "airflow"
  | "visual";

type Landmark = {
  key: string;
  label: string;
  position_m: { x: number; y: number };
  landmarkType: LandmarkType;
  sensoryChannels: SensoryChannel[];
  detectability: {
    caneUser: "high" | "medium" | "low";
    dogGuide: "high" | "medium" | "low";
  };
  signpostedAs?: string;
};
```

The five O&M categories are not collapsed to strings. A concise landmark phrase is derived from these facts and never replaces category, sensory channel, detectability, sign text, stable key, or position.

```ts
type LayoutSummary = {
  domain: "rail" | "hotel";
  layoutId: string;
  bounds_m: { length: number; width: number };
  seatCount: { total: number; available: number };
  accessibleCount: {
    wheelchairSpaces: number;
    transferSeats: number;
    movableArmrestSeats: number;
  };
  landmarks: Landmark[];
  referencePoints: string[];
  summary: string;
  unitsNote?: string;
};

type Description = {
  ref: string;
  line: string;
  attributes: Record<string, unknown>;
  relations: {
    to: string;
    distance_m: number;
    rendered: string;
    landmarksPassed: string[];
  }[];
  followUps: string[];
  unitsNote?: string;
};
```

`LayoutSummary.summary` and `Description.line` are derived conveniences. Stable refs, typed landmarks, attributes, structured relations, and follow-up prompts are the interrogable contract.

Query and compare use one discriminated result model across the rail implementation and hotel documentation proof:

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
  rows: {
    ref: string;
    values: Record<string, string | number | boolean | null>;
  }[];
  unitsNote?: string;
};

type QueryData = {
  items: Candidate[];
  appliedCriteria: QueryCriteria;
  totalMatched: number;
  unitsNote?: string;
};
```

Every `Comparison.rows` entry has exactly the keys named by `axes`; rows preserve input-ref order. Common axes include availability, so unavailable refs can be compared. Only `select` rejects an unavailable seat. There is no index-coupled value array, bare `price`, or undiscriminated domain block.

## 6. Query and rendering contracts

```ts
type QueryCriteria = {
  near?: string;
  maxDistance_m?: number;
  priceMax_usd?: number;
  availableOnly?: boolean;
  needs?: {
    wheelchairSpace?: boolean;
    transferSeat?: boolean;
    movableArmrest?: boolean;
    minFootSpace_in2?: number;
    excludeExitRow?: boolean;
  };
  rail?: {
    facing?: "forward" | "backward";
    side?: "window" | "aisle";
    quietCar?: boolean;
  };
  hotel?: {
    floorMin?: number;
    floorMax?: number;
    bedToBathroomMax_m?: number;
  };
};

type RenderOptions = {
  units?: "meters" | "feet" | "steps";
  stepLength_m?: number;
  directionStyle?: "relative" | "clock" | "cardinal";
  walkSpeedPercent?: number;
};
```

Normalization and validation:

| Field/rule | Contract |
| --- | --- |
| `availableOnly` | defaults to `true` and is present in `appliedCriteria` |
| `units` | defaults to `feet` |
| `directionStyle` | defaults to `relative` |
| `stepLength_m` | defaults to `0.75`; finite and in `(0, +∞)`; stored as an inactive preference outside step rendering and consumed only when `units: "steps"` |
| `walkSpeedPercent` | defaults to `100`; finite and in `(0, +∞)` |
| distance, price, foot-space, floor bounds | finite and non-negative; `floorMin <= floorMax` when both exist |
| `maxDistance_m` | requires `near`, otherwise `INVALID_CRITERIA` |
| domain block | `hotel` in the rail MVP is `UNSUPPORTED_CRITERIA`, never ignored |
| unknown input field | rejected by the input schema (`additionalProperties: false`) |

Meters and bearing/reference-frame values are source data. Feet, steps, relative, clock, and cardinal strings are presentation-boundary derivations. Authored data never contains steps. When `units === "steps"`, every spatial result that renders a step estimate includes:

```json
{
  "unitsNote": "Step counts are converted from measured distance using an assumed 0.75 m stride and are approximate. Landmark counts (e.g. 'third row') are exact."
}
```

The warning is represented at the result-data boundary: `LayoutSummary.unitsNote`, `QueryData.unitsNote`, `Description.unitsNote`, and `Comparison.unitsNote`; `Route` uses `rendered.unitsNote`. It is required whenever that result contains a step-rendered string and forbidden otherwise, so an Agent never has to infer approximation from prose alone.

### 6.1 Query cardinality, order, and hints

`query` filters first, sets `totalMatched` to the full pre-slice count, sorts deterministically, then returns the first 0–12 candidates. It has no pagination, cursor, continuation token, offset, or response count field outside `totalMatched`.

Sort keys, in exact order:

1. distance ascending when `near` exists;
2. availability descending when `availableOnly === false`;
3. `price_usd` ascending;
4. rail row ascending;
5. rail seat letter ascending;
6. `ref` ascending as the final tie-breaker.

For 13 or more matches, return 12 and provide one deterministic narrowing `hint`. Choose the first absent applicable axis in this order: `near`; `maxDistance_m` when `near` exists; `priceMax_usd`; `needs.minFootSpace_in2`; `needs.wheelchairSpace`; `needs.transferSeat`; `needs.movableArmrest`; `needs.excludeExitRow`; `rail.facing`; `rail.side`; `rail.quietCar`. If every applicable axis is present, choose the first active tighten-able axis: decrease `maxDistance_m`, decrease `priceMax_usd`, then increase `needs.minFootSpace_in2`. The hint names the field and direction and invents no threshold.

Zero matches is success: `items: []`, `totalMatched: 0`, normalized `appliedCriteria`, and one deterministic relaxation `hint`. Choose the first active restriction in this order: set `availableOnly` false; increase/remove `maxDistance_m`; increase/remove `priceMax_usd`; decrease/remove `needs.minFootSpace_in2`; remove the first active boolean `needs` field in schema order; remove `rail.facing`, `rail.side`, then `rail.quietCar`; finally remove `near`. The hint names the field/direction and invents no value. `query` does not use `NO_MATCH` for an ordinary empty set.

### 6.2 Compare semantics

`compare` accepts exactly 2–4 unique valid refs. It returns exactly those refs in input order, with the same named axes for every row. It does not search, rank, apply the query cap, or silently drop an invalid ref. Unavailable refs are valid comparison inputs and expose `available` on the common axis; `select` alone returns `NOT_AVAILABLE` for them.

## 7. Route Engine

The Route Engine is pure TypeScript. Geometry is meter-source and aisle-aware; rendering is derived.

```ts
type RouteSegment = {
  pathway_mode: "walkway" | "stairs" | "elevator" | "door" | "vestibule";
  from: string;
  to: string;
  length_m: number;
  traversal_time_s: number;
  stair_count?: number;
  min_width_m?: number;
  max_slope?: number;
  signpostedAs?: string;
  bearing: {
    frame: "egocentric" | "car_axis";
    degrees: number;
  };
  countedFeatures?: {
    feature: string;
    count: number;
  };
  landmarksPassed: string[];
};

type Route = {
  from: string;
  requestedTo: string;
  to: string;
  totalLength_m: number;
  totalTraversalTime_s: number;
  segments: RouteSegment[];
  landmarks: Landmark[];
  requiresContinuation: boolean;
  checkpoint?: { ref: string; label: string };
  rendered: {
    units: "meters" | "feet" | "steps";
    directionStyle: "relative" | "clock" | "cardinal";
    instructions: string[];
    summary: string;
    unitsNote?: string;
  };
};
```

`bearing.degrees` is finite and normalized to `[0, 360)`. In `car_axis`, `0` is the authored forward end of the car; in `egocentric`, `0` is the traveler’s incoming heading. Relative, clock, and cardinal instructions are derived only after this frame is known.

`additionalTransferTime_s` is an optional OSDM-aligned portability fact outside the rail `Route` result; the rail MVP does not author or silently apply it. `walkSpeedPercent` alone scales rail walking time:

```text
traversal_time_s = length_m / (1.2 × walkSpeedPercent / 100)
```

Algorithm:

1. Resolve the exact meter coordinates for `from` and requested destination.
2. If the origin is off-aisle, add its real lateral path to the same-row aisle anchor.
3. Move longitudinally along the aisle to the destination row, recording exact counted rows and encountered landmarks.
4. If the destination is off-aisle, add its real lateral path from the aisle anchor. A same-row, same-side direct path may be used only when the fixture marks it physically traversable.
5. Calculate bearings, modes, lengths, widths/slopes/sign text when authored, and walking times.
6. Merge only contiguous, collinear segments with identical `pathway_mode` and bearing.
7. If at most four segments remain, return a complete route: `requestedTo === to`, `requiresContinuation: false`, no `checkpoint`, and aggregate totals equal every segment sum.
8. If more than four remain, end at the last stable landmark reachable within four segments. Keep the original destination in `requestedTo`; set `to` and `checkpoint.ref` to that stable ref; set `requiresContinuation: true`; and make totals equal only the returned partial-leg segment sums. The next call uses `{ from: checkpoint.ref, to: requestedTo }`.
9. Derive the requested rendering without changing `segments`.

A cross-aisle route such as `6-12A → 6-12D` cannot collapse to zero. Projecting both endpoints to the aisle before recording lateral movement is forbidden.

Required route acceptance cases:

1. `entrance_front → 6-12A`: longitudinal plus aisle-to-seat lateral movement and `{ feature: "row", count: 6 }`.
2. `6-12A → restroom`: seat-to-aisle lateral movement and landmark collection.
3. `6-12A → 6-14D`: lateral–longitudinal–lateral three-segment route.
4. `6-12A → 6-12D`: same-row cross-aisle route with `totalLength_m > 0`.
5. `6-12A → 6-12B`: same-row, same-side direct movement when physically traversable.
6. One route with all three units: identical `segments`; only `rendered` changes.
7. `walkSpeedPercent: 50`: doubled `traversal_time_s`; unchanged `length_m`.
8. More than four raw non-mergeable segments: at most four returned; original `requestedTo`; `to === checkpoint.ref`; partial totals equal returned segment sums; and a valid follow-up route.

## 8. Application Layer

There is one Application use case for each public tool. Human controls call these same use cases.

```text
getLayout  query  describe  getRoute  compare
select     getSelection     undo      confirm
```

Application responsibilities:

- Route the request to the current `rail` domain.
- Invoke pure Domain operations and normalize their results.
- Apply the exact App Store transition atomically.
- Update highlights, active route, tool log, and selection projections.
- Coordinate the accessible confirmation dialog and timeout.
- Preserve typed domain errors for Bridge mapping.

Application does not know WebMCP, register tools, manipulate SVG/DOM directly, interpret natural language, or recalculate presentation geometry. A tool call that fails validation still records a log entry but does not partially apply its intended domain transition.

Observable effects by successful use case:

| Use case | Shared-state effect |
| --- | --- |
| `getLayout` | log; highlight reference points |
| `query` | log with normalized `appliedCriteria`; highlight returned refs |
| `describe` | log; highlight described ref |
| `getRoute` | log; set `activeRoute`; highlight route refs; render overlay from segments |
| `compare` | log; highlight the exact input refs |
| `select` | snapshot, selection, highlights, log |
| `getSelection` | log; highlight selected refs |
| `undo` | restore one snapshot; log |
| `confirm` | same-call pending/terminal transition; log |

These visible/log effects are real state changes and drive the annotation erratum in §16.

## 9. Spatial Accessibility Bridge contract

The Bridge is a small in-browser boundary module, not a server or microservice. Its responsibilities are:

1. **Semantic exposure:** stable refs and structured facts, never DOM selectors.
2. **Validation:** exact schema, semantic, cardinality, and domain applicability checks.
3. **Presentation projection:** derived one-line summaries, distance/direction rendering, and deterministic hints without destroying source facts.
4. **State projection:** full, derived `SelectionState` where §10 requires it.
5. **Action safety:** availability checks, one-step undo, mutation lock, and human-only confirmation.
6. **Observability:** one use-case result drives tool output, highlights/overlay, and tool log.
7. **Error separation:** expected domain failures fulfill with `ok: false`; runtime/programming/cancellation failures reject.

The Bridge does not cap compare results, paginate query results, infer user intent, or silently drop unsupported fields. The output size contract is semantic: query returns at most 12 candidates; route returns at most four segments per leg. Host output-size guidance cannot remove required fields.

## 10. Canonical nine-tool public contract

The `a11y.` prefix and these nine names are the complete MVP tool catalog. `a11y.set_preferences` is not a tenth MVP tool; preferences are session state and `RenderOptions` unless a future version explicitly adds it.

### 10.1 Canonical tool matrix

| Tool | Exact input | Exact successful `data` | `SelectionState` projection |
| --- | --- | --- | --- |
| `a11y.get_layout` | `RenderOptions` | `LayoutSummary` | forbidden |
| `a11y.query` | `QueryCriteria & RenderOptions` | `QueryData` | forbidden |
| `a11y.describe` | `{ ref: string } & RenderOptions` | `Description` | forbidden |
| `a11y.get_route` | `{ from: string; to: string } & RenderOptions` | `Route` | forbidden |
| `a11y.compare` | `{ refs: string[] } & RenderOptions`; 2–4 unique valid refs | `Comparison` with the same refs in input order | forbidden |
| `a11y.select` | `{ ref: string }` | `{ selectedRef: string }` | required on success and expected failure |
| `a11y.get_selection` | `{}` | `{ selected: string[] }` | required on success; forbidden on expected failure |
| `a11y.undo` | `{}` | `{ undone: string \| null }` | required on success and expected failure |
| `a11y.confirm` | `{}` | `{ outcome: "confirmed" \| "cancelled" \| "timeout" }` | required on success and expected failure, in the same call |

### 10.2 Canonical input JSON Schemas

The implementation may generate these objects, but generated schemas must deep-equal this catalog. Every object rejects unknown fields.

```json
{
  "$defs": {
    "RenderOptionsProperties": {
      "units": { "type": "string", "enum": ["meters", "feet", "steps"] },
      "stepLength_m": { "type": "number", "exclusiveMinimum": 0 },
      "directionStyle": { "type": "string", "enum": ["relative", "clock", "cardinal"] },
      "walkSpeedPercent": { "type": "number", "exclusiveMinimum": 0 }
    },
    "Needs": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "wheelchairSpace": { "type": "boolean" },
        "transferSeat": { "type": "boolean" },
        "movableArmrest": { "type": "boolean" },
        "minFootSpace_in2": { "type": "number", "minimum": 0 },
        "excludeExitRow": { "type": "boolean" }
      }
    },
    "RailCriteria": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "facing": { "type": "string", "enum": ["forward", "backward"] },
        "side": { "type": "string", "enum": ["window", "aisle"] },
        "quietCar": { "type": "boolean" }
      }
    },
    "HotelCriteria": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "floorMin": { "type": "number", "minimum": 0 },
        "floorMax": { "type": "number", "minimum": 0 },
        "bedToBathroomMax_m": { "type": "number", "minimum": 0 }
      }
    }
  },
  "tools": {
    "a11y.get_layout": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "units": { "$ref": "#/$defs/RenderOptionsProperties/units" },
        "stepLength_m": { "$ref": "#/$defs/RenderOptionsProperties/stepLength_m" },
        "directionStyle": { "$ref": "#/$defs/RenderOptionsProperties/directionStyle" },
        "walkSpeedPercent": { "$ref": "#/$defs/RenderOptionsProperties/walkSpeedPercent" }
      }
    },
    "a11y.query": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "near": { "type": "string", "minLength": 1, "maxLength": 128 },
        "maxDistance_m": { "type": "number", "minimum": 0 },
        "priceMax_usd": { "type": "number", "minimum": 0 },
        "availableOnly": { "type": "boolean" },
        "needs": { "$ref": "#/$defs/Needs" },
        "rail": { "$ref": "#/$defs/RailCriteria" },
        "hotel": { "$ref": "#/$defs/HotelCriteria" },
        "units": { "$ref": "#/$defs/RenderOptionsProperties/units" },
        "stepLength_m": { "$ref": "#/$defs/RenderOptionsProperties/stepLength_m" },
        "directionStyle": { "$ref": "#/$defs/RenderOptionsProperties/directionStyle" },
        "walkSpeedPercent": { "$ref": "#/$defs/RenderOptionsProperties/walkSpeedPercent" }
      }
    },
    "a11y.describe": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "ref": { "type": "string", "minLength": 1, "maxLength": 128 },
        "units": { "$ref": "#/$defs/RenderOptionsProperties/units" },
        "stepLength_m": { "$ref": "#/$defs/RenderOptionsProperties/stepLength_m" },
        "directionStyle": { "$ref": "#/$defs/RenderOptionsProperties/directionStyle" },
        "walkSpeedPercent": { "$ref": "#/$defs/RenderOptionsProperties/walkSpeedPercent" }
      },
      "required": ["ref"]
    },
    "a11y.get_route": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "from": { "type": "string", "minLength": 1, "maxLength": 128 },
        "to": { "type": "string", "minLength": 1, "maxLength": 128 },
        "units": { "$ref": "#/$defs/RenderOptionsProperties/units" },
        "stepLength_m": { "$ref": "#/$defs/RenderOptionsProperties/stepLength_m" },
        "directionStyle": { "$ref": "#/$defs/RenderOptionsProperties/directionStyle" },
        "walkSpeedPercent": { "$ref": "#/$defs/RenderOptionsProperties/walkSpeedPercent" }
      },
      "required": ["from", "to"]
    },
    "a11y.compare": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "refs": {
          "type": "array",
          "minItems": 2,
          "maxItems": 4,
          "uniqueItems": true,
          "items": { "type": "string", "minLength": 1, "maxLength": 128 }
        },
        "units": { "$ref": "#/$defs/RenderOptionsProperties/units" },
        "stepLength_m": { "$ref": "#/$defs/RenderOptionsProperties/stepLength_m" },
        "directionStyle": { "$ref": "#/$defs/RenderOptionsProperties/directionStyle" },
        "walkSpeedPercent": { "$ref": "#/$defs/RenderOptionsProperties/walkSpeedPercent" }
      },
      "required": ["refs"]
    },
    "a11y.select": {
      "type": "object",
      "additionalProperties": false,
      "properties": { "ref": { "type": "string", "minLength": 1, "maxLength": 128 } },
      "required": ["ref"]
    },
    "a11y.get_selection": { "type": "object", "additionalProperties": false, "properties": {} },
    "a11y.undo": { "type": "object", "additionalProperties": false, "properties": {} },
    "a11y.confirm": { "type": "object", "additionalProperties": false, "properties": {} }
  }
}
```

In addition to schema validation, Application enforces finite numbers, consumes `stepLength_m` only with `units: "steps"`, requires `maxDistance_m` only with `near`, checks `floorMin <= floorMax`, rejects inactive-domain blocks, and resolves valid loaded refs.

### 10.3 Canonical output JSON Schemas

The machine-valid Draft 2020-12 output catalog is [bearing-output.schema.json](./contracts/bearing-output.schema.json). Its nine top-level properties map one-to-one to this section's tool matrix and reference complete success/failure envelopes plus all nested result types. WebMCP currently has no `outputSchema` registration member, so the Adapter does not send this catalog to `registerTool`; Bridge contract tests validate every fulfilled result against the corresponding `$defs/*Output` schema and then verify the cross-field invariants that JSON Schema cannot express (derived totals, query hint conditions, row/axis equality, continuation endpoints, and step-warning presence).

The input bundle above is documentation shorthand. Registration builds each tool's individual schema by copying the shared `$defs` into that tool schema; it never passes the outer `tools` catalog object as `inputSchema`, and contract tests resolve every `$ref` before registration.

### 10.4 Canonical successful examples

Examples show the complete successful envelope, including required state projection.

| Tool | Example input | Example successful projection |
| --- | --- | --- |
| `a11y.get_layout` | `{ "units": "feet" }` | `{ "ok": true, "data": { "domain": "rail", "layoutId": "Car 6, Business Class", "bounds_m": { "length": 26.4, "width": 3.1 }, "seatCount": { "total": 60, "available": 47 }, "accessibleCount": { "wheelchairSpaces": 2, "transferSeats": 2, "movableArmrestSeats": 16 }, "landmarks": [], "referencePoints": ["entrance_front", "restroom"], "summary": "One single-level intercity rail car." } }` |
| `a11y.query` | `{ "near": "restroom", "rail": { "facing": "forward", "side": "window" } }` | `{ "ok": true, "data": { "items": [{ "ref": "6-12A", "label": "Seat 12A", "line": "Seat 12A, forward-facing window seat.", "price_usd": 72, "available": true, "features": ["power_outlet"], "distance": { "from": "restroom", "distance_m": 7.3, "rendered": "24 feet" }, "domain": "rail", "rail": { "row": 12, "seatLetter": "A", "side": "window", "facing": "forward" }, "accessibility": { "wheelchairSpace": false, "transferSeat": false, "companionSeat": false, "movableArmrest": true, "footSpace_in2": 288, "bulkhead": false, "exitRow": false } }], "appliedCriteria": { "near": "restroom", "availableOnly": true, "rail": { "facing": "forward", "side": "window" } }, "totalMatched": 1 } }` |
| `a11y.describe` | `{ "ref": "6-12A", "directionStyle": "relative" }` | `{ "ok": true, "data": { "ref": "6-12A", "line": "Seat 12A is a forward-facing window seat.", "attributes": { "price_usd": 72, "available": true }, "relations": [{ "to": "restroom", "distance_m": 7.3, "rendered": "24 feet toward the rear", "landmarksPassed": ["luggage_rack"] }], "followUps": ["Ask for the route from the front entrance."] } }` |
| `a11y.get_route` | `{ "from": "entrance_front", "to": "6-12A" }` | `{ "ok": true, "data": { "from": "entrance_front", "requestedTo": "6-12A", "to": "6-12A", "totalLength_m": 7.3, "totalTraversalTime_s": 6.08, "segments": [{ "pathway_mode": "walkway", "from": "entrance_front", "to": "row_12_aisle", "length_m": 6.7, "traversal_time_s": 5.58, "bearing": { "frame": "car_axis", "degrees": 180 }, "countedFeatures": { "feature": "row", "count": 6 }, "landmarksPassed": [] }, { "pathway_mode": "walkway", "from": "row_12_aisle", "to": "6-12A", "length_m": 0.6, "traversal_time_s": 0.5, "bearing": { "frame": "egocentric", "degrees": 270 }, "landmarksPassed": [] }], "landmarks": [], "requiresContinuation": false, "rendered": { "units": "feet", "directionStyle": "relative", "instructions": ["Move toward the rear, passing 6 rows.", "Move left from the aisle to seat 12A."], "summary": "Walk toward the rear, then move left to seat 12A." } } }` |
| `a11y.compare` | `{ "refs": ["6-12A", "6-14D"] }` | `{ "ok": true, "data": { "axes": [{ "key": "available", "label": "Available" }, { "key": "price_usd", "label": "Price (USD)" }], "rows": [{ "ref": "6-12A", "values": { "available": true, "price_usd": 72 } }, { "ref": "6-14D", "values": { "available": false, "price_usd": 68 } }] } }` |
| `a11y.select` | `{ "ref": "6-12A" }` | `{ "ok": true, "data": { "selectedRef": "6-12A" }, "state": { "selected": ["6-12A"], "selectedCount": 1, "priceTotal_usd": 72, "undoable": true, "status": "draft" } }` |
| `a11y.get_selection` | `{}` | `{ "ok": true, "data": { "selected": ["6-12A"] }, "state": { "selected": ["6-12A"], "selectedCount": 1, "priceTotal_usd": 72, "undoable": true, "status": "draft" } }` |
| `a11y.undo` | `{}` | `{ "ok": true, "data": { "undone": "6-12A" }, "state": { "selected": [], "selectedCount": 0, "priceTotal_usd": 0, "undoable": false, "status": "draft" } }` |
| `a11y.confirm` | `{}` | `{ "ok": true, "data": { "outcome": "confirmed" }, "state": { "selected": ["6-12A"], "selectedCount": 1, "priceTotal_usd": 72, "undoable": false, "status": "confirmed" } }` |

The route example satisfies the §7 aggregate invariants: segment lengths total 7.3 m and segment traversal times total 6.08 seconds.

## 11. Tool result and selection-state contract

```ts
type ToolErrorCode =
  | "INVALID_REF"
  | "NO_ROUTE"
  | "NO_MATCH"
  | "NOT_AVAILABLE"
  | "INVALID_SELECTION"
  | "INVALID_CRITERIA"
  | "UNSUPPORTED_CRITERIA"
  | "NOTHING_TO_UNDO"
  | "CONFIRMATION_REQUIRED";

type SelectionState = {
  selected: string[];
  selectedCount: number;
  priceTotal_usd: number;
  undoable: boolean;
  status: "draft" | "confirmation_pending" | "confirmed";
};

type DomainError = {
  code: ToolErrorCode;
  message: string;
};

type ReadSuccess<T> = {
  ok: true;
  data: T;
  state?: never;
  error?: never;
  hint?: never;
};

type QuerySuccess<T> = {
  ok: true;
  data: T;
  state?: never;
  error?: never;
  hint?: string;
};

type StateSuccess<T> = {
  ok: true;
  data: T;
  state: SelectionState;
  error?: never;
  hint?: never;
};

type ReadFailure = {
  ok: false;
  data?: never;
  state?: never;
  error: DomainError;
  hint?: string;
};

type StateFailure = {
  ok: false;
  data?: never;
  state: SelectionState;
  error: DomainError;
  hint?: string;
};

type ToolResult<T> =
  | ReadSuccess<T>
  | QuerySuccess<T>
  | StateSuccess<T>
  | ReadFailure
  | StateFailure;
```

Bindings remove the broad union’s otherwise invalid combinations:

- `get_layout`, `describe`, `get_route`, and `compare`: `ReadSuccess<T> | ReadFailure`.
- `query`: `QuerySuccess<T> | ReadFailure`. `hint` is required exactly when `totalMatched === 0` or `totalMatched >= 13`, and forbidden for 1–12 matches.
- `get_selection`: `StateSuccess<T> | ReadFailure`.
- `select`, `undo`, and `confirm`: `StateSuccess<T> | StateFailure`; full state is required even when the expected action fails.
- A domain-failure `hint` is optional only when a deterministic recovery action exists; `error` is always required and `data` is forbidden.

Unexpected programming failures, registration failures, document teardown, and per-call abort do not masquerade as `ok: false`; the execution promise rejects or follows host cancellation. Every fulfilled result is a JSON-serializable plain value.

`selectedCount` and `priceTotal_usd` are selectors derived from `selected`, never independently writable. `undoable` means an undo can succeed now: `confirmationStatus === "draft" && history.length > 0`. Contract tests reconstruct all three after every transition, including failure, confirmation, and undo.

## 12. State architecture

```ts
type UndoSnapshot = {
  selection: string[];
  highlightedRefs: string[];
  confirmationStatus: "draft" | "confirmation_pending" | "confirmed";
  activeRoute: Route | null;
};

type AppState = {
  domain: "rail" | "hotel";
  layoutId: string;
  selection: string[];
  confirmationStatus: "draft" | "confirmation_pending" | "confirmed";
  activeRoute: Route | null;
  highlightedRefs: string[];
  toolLog: {
    name: string;
    args: Record<string, unknown>;
    appliedCriteria?: QueryCriteria;
    resultRefs: string[];
    at: number;
  }[];
  history: UndoSnapshot[];
  prefs: RenderOptions;
};
```

Initial state is `domain: "rail"`, `layoutId: "Car 6, Business Class"`, empty selection/highlights/history/log, `confirmationStatus: "draft"`, `activeRoute: null`, and normalized preferences `{ units: "feet", stepLength_m: 0.75, directionStyle: "relative", walkSpeedPercent: 100 }`.

UI preference controls update `prefs`; an explicit per-call `RenderOptions` value overrides the session default for that call without creating a new public tool. Tool log records normalized `appliedCriteria` for query, exact input arguments, result refs in result order, and a timestamp. Every UI and tool projection reads this state; no duplicate Agent-only store exists.

`select(ref)` has append-idempotent semantics. A valid available ref not already selected pushes one snapshot, appends the ref once, and returns it as `selectedRef`. Selecting an already-selected ref succeeds with the same single occurrence, updates only the observable log/highlight projection, pushes no snapshot, and leaves price/count/history unchanged. Invalid or unavailable refs fail with full unchanged state and push no snapshot. Selection never toggles or replaces another ref implicitly.

## 13. Human confirmation boundary

`a11y.confirm` is one asynchronous call with a human-controlled terminal event, not a two-call polling protocol.

1. Preconditions: `confirmationStatus === "draft"` and `selection.length > 0`.
2. Capture the pre-confirm snapshot, set `confirmationStatus` to `confirmation_pending`, open the accessible in-page dialog, move focus safely, and start a 120-second timer.
3. While pending, `select`, `undo`, and duplicate `confirm` fulfill with `CONFIRMATION_REQUIRED` plus unchanged full state. Read operations and `get_selection` remain available.
4. The first terminal event wins once:
   - human Confirm → `{ outcome: "confirmed" }`, status `confirmed`;
   - human Cancel → `{ outcome: "cancelled" }`, restore pre-confirm selection, highlights, route, and `draft` status;
   - 120-second timeout → `{ outcome: "timeout" }`, perform the same restoration.
5. Per-call `options.signal` abort, document teardown, or unexpected dialog failure closes the dialog, removes timer/listeners, restores the pre-confirm snapshot, restores focus if the document remains active, and rejects/cancels the execution. Agent abort is never reported as human `cancelled`.
6. Terminal resolution is guarded by a single idempotent settle operation. Racing UI actions and late callbacks cannot settle twice, reopen the dialog, or overwrite terminal state.

There is no public `confirmation_pending` outcome and no early return that asks the Agent to poll. Blocking execution is an Application contract implemented with a promise; it is not described as a standardized WebMCP user-interaction primitive. If either target runtime cannot sustain the contract, evidence is recorded as an open blocker and any public change requires a separately versioned technical erratum.

After status is `confirmed`, `select`, `undo`, and another `confirm` are locked with `CONFIRMATION_REQUIRED`; this MVP has no reopen/edit-confirmed workflow.

## 14. Undo contract

Undo is one-step snapshot restoration, not event sourcing.

- Immediately before a successful `select` mutates state, push one `UndoSnapshot` containing exactly selection, highlighted refs, confirmation status, and active route.
- Do not push for validation failure, unavailable selection, read operation, `get_selection`, a failed undo, or confirmation’s temporary pending state.
- A successful `undo` pops exactly one snapshot, restores all four fields atomically, and returns the ref removed by that restoration or `null` when the transition changed no selected ref.
- `selectedCount`, `priceTotal_usd`, and `undoable` are recomputed after restoration; they are not snapshot fields.
- Empty history returns `NOTHING_TO_UNDO` with unchanged full state.
- Pending or confirmed status returns `CONFIRMATION_REQUIRED` with unchanged full state.
- Confirmation cancellation, timeout, abort, or dialog failure restores its private pre-confirm snapshot without consuming or creating the user’s undo history.

Tests assert coherent selection, highlights, active route, status, totals, and `undoable` after success and every failure path.

## 15. WebMCP Adapter

The Adapter binds the Bridge to the current WebMCP draft and contains no business logic.

```ts
await document.modelContext.registerTool(
  {
    name: "a11y.get_route",
    description:
      "Return a structured route between two valid refs in the current layout, " +
      "including meter-source segments, landmarks, and requested rendering.",
    inputSchema: getRouteInputSchema,
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false
    },
    execute: async (input, { signal }) => {
      return bridge.getRoute(input, { signal });
    }
  },
  { signal: registrationController.signal }
);
```

The signals have different owners:

```text
registerTool(definition, { signal }) → registration lifecycle
execute(input, { signal })          → one call’s cancellation
```

Tool descriptions are static and current layout data comes from tool results. Tool names are 1–128 characters and use only ASCII alphanumerics, `_`, `-`, and `.`; all nine public names conform.

Each `execute` fulfills directly with a JSON-serializable `ToolResult` plain object. Do not wrap it in an MCP-server content envelope. Returned graphs contain no DOM node, function, class instance, circular reference, `BigInt`, non-finite number, or other non-JSON value. Exact round-trip output shape is verified in both target runtimes because WebMCP remains experimental.

All Agent-supplied arguments and all fixture/result strings are treated as text at the UI boundary even while the MVP fixture is independently authored. Components use framework-escaped text nodes or DOM `textContent`; they never interpolate these values into `innerHTML`, executable markup, CSS, URLs, or ARIA-ID attributes. Public string inputs are schema-bounded to 1–128 characters for refs and 1–300 characters for other free text. Expected errors use fixed templates and never echo an invalid raw ref; the visible tool log may show an escaped, length-bounded projection while the in-memory structured record remains intact. Contract and browser tests pass HTML/script-like refs, labels, sign text, arguments, and error triggers through every visible sink and assert that no element, handler, navigation, style, or accessible-tree node is injected.

Capability diagnostics remain outside `ToolErrorCode`:

```ts
type WebMCPCapability =
  | "available"
  | "unsupported"
  | "insecure-context"
  | "permission-denied"
  | "security-rejected"
  | "registration-failed";
```

- insecure document → `insecure-context`;
- no callable `document.modelContext.registerTool` → `unsupported`;
- registration `NotAllowedError` → `permission-denied`;
- registration `SecurityError` → `security-rejected`;
- other registration rejection → `registration-failed`.

Registration requires a Secure Context, an origin-keyed document/agent cluster where applicable, and `tools` Permissions Policy permission. MVP registration is top-level only; iframe and cross-origin exposure are outside scope. Aborting the registration controller removes all nine tools. Domain/state changes do not re-register them.

Target-runtime evidence is required from both ChatGPT’s in-app browser and Google Chrome 149 or later with the WebMCP testing flag enabled.

## 16. Tool annotations

**Official/spec erratum:** PRD §7.1 marks nominal lookups read-only, but the current draft defines `readOnlyHint: true` as modifying no state. Every Bearing invocation changes visible/log state through §8, so all nine tools use `false`.

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

`untrustedContentHint: false` is valid only while results are independently authored static fixture content. Before accepting third-party or user-generated text/data, reassess each affected tool. A future call can use `readOnlyHint: true` only if it changes no application, presentation, DOM, log, preference, or persisted state.

## 17. Accessible Human UI architecture

The UI is a complete non-Agent client of Application, not a visualization shell around tools.

| ID | Component/behavior | Acceptance evidence |
| --- | --- | --- |
| UI1 | `RailSeatGrid`: CSS Grid generated from fixture positions | Grid geometry and labels match the same seats consumed by Domain; no copied operator artwork |
| UI2 | Shared `highlightedRefs` style for every ref touched by a tool or human use case | A live query/describe/compare/select call highlights exactly `resultRefs`; focus indication remains distinct |
| UI3 | `RouteOverlay`: SVG generated only from `activeRoute.segments` | Overlay endpoints/bearings match segments; UI performs no route calculation; continuation ends at checkpoint |
| UI4 | `ToolLogPanel`: tool name, exact args, normalized `appliedCriteria`, result refs, timestamp | Query log visibly distinguishes requested args from applied defaults; failed calls remain diagnosable |
| UI5 | Persistent `SelectionPanel`: selected refs, USD total, and confirmation status | Values equal the `SelectionState` selectors after select, failure, undo, cancel, timeout, and confirm |
| UI6 | Complete keyboard/ARIA human workflow | With WebMCP disabled, a keyboard/screen-reader user can filter, describe, route, compare, select, inspect selection, undo, change preferences, and confirm |
| UI7 | `ConfirmationDialog`: focus-safe, `role="dialog"`, `aria-modal="true"`, explicit Confirm/Cancel, Escape cancellation | Only human activation produces confirmed; focus enters safely and returns after every terminal/abort path |
| UI8 | `CapabilityBanner` for non-available capability states | Banner identifies unsupported/insecure/permission/security/registration category; all human controls still work |

UI6 requires all of these visible, labeled controls:

- an accessible filter form for every rail-applicable `QueryCriteria` field;
- route `from`/`to` controls with stable refs;
- candidate checkboxes enforcing 2–4 unique refs for comparison;
- seat description/details and relations;
- select plus current-selection inspection;
- undo;
- units, step length, direction style, and walk-speed preferences; and
- confirmation.

`RailSeatGrid` has a programmatic name and `role="grid"`; each visual row has `role="row"`, and each seat has `role="gridcell"` with position, availability, USD price, direction, side, and relevant accessibility facts in its accessible name/description. It uses roving `tabindex`: exactly one enabled gridcell is `0`, all other enabled gridcells are `-1`, arrows move spatially, Home/End move within the row, and Tab enters or leaves the grid without trapping focus. Selection state uses `aria-selected` and is not conflated with keyboard focus.

`ConfirmationDialog` has `role="dialog"`, `aria-modal="true"`, and an accessible name through `aria-labelledby` (or a nonempty `aria-label` fallback). While open, content outside the dialog is `inert`; focus starts on the least destructive sensible control, cycles only within the dialog, Escape cancels, and every terminal/abort path removes `inert` and restores focus to the invoker when it still exists. A concise `role="status"`, `aria-live="polite"`, `aria-atomic="true"` announcer reports meaningful state changes, not the entire tool log. Agent-originated changes are tested for duplicate speech before any suppression policy is adopted.

All submitted product UI strings are English. Architecture documentation may remain internal, but anything included in the submission must be English or accompanied by the official-rule-required English translation.

## 18. Rail/hotel portability and standards mapping

Hotel is documentation/schema proof only. The MVP contains no hotel adapter, hotel UI, multilevel algorithm, or hotel fixture. The portability proof has four required elements.

### 18.1 Domain-independent contract proof

All nine §10 names, inputs, results, errors, state rules, and annotations are domain-independent. The `Candidate` discriminator makes domain-specific facts explicit while preserving shared refs, line, USD price, availability, features, optional distance, and comparison axes.

### 18.2 Rail-to-hotel mapping

| Contract concept | Rail MVP | Hotel proof |
| --- | --- | --- |
| stable `ref` | `6-12A` | `812` |
| coordinate origin | rail-car origin, meters | floor origin, meters |
| landmarks | `entrance_front`, `restroom`, `cafe_car`, `luggage_rack` | `elevator`, `stairs`, `ice_machine`, `lobby`, `relief_area` |
| candidate discriminator | `domain: "rail"`, row/seat/side/facing | `domain: "hotel"`, floor/optional bed-to-bathroom distance |
| accessibility facts | wheelchair space, transfer/companion seat, movable armrest, foot space, bulkhead, exit row | structured room/door/bathroom/lift facts required for independent judgment |
| pathway modes | `walkway`, `door`, `vestibule` | `walkway`, `door`, `elevator` |
| relational questions | seat→restroom, seat→entrance | room→elevator, room→lobby, building→relief area |
| price | seat price in USD | room rate in USD |

This table proves contract portability, not implementation readiness. Multilevel hotel routing would require a separately designed algorithm even though the type can represent an elevator segment.

### 18.3 GTFS Pathways and OSDM mapping

**Official/spec erratum:** Bearing is **GTFS-Pathways-aligned**, not a literal `pathways.txt` producer, wire-compatible extension, or claim that GTFS models passenger-vehicle interiors. PRD wording that the route uses GTFS names “as-is” is corrected as follows.

| Bearing field/value | GTFS Pathways source | Classification |
| --- | --- | --- |
| `length_m` | `length` (meters) | unit-explicit Bearing name with GTFS semantics |
| `traversal_time_s` | `traversal_time` (seconds) | unit-explicit Bearing name with GTFS semantics |
| `min_width_m` | `min_width` (meters) | unit-explicit Bearing name with GTFS semantics |
| `stair_count` | `stair_count` | same name and directional-count semantics |
| `max_slope` | `max_slope` | same ratio semantics; optional because the single-level fixture generates no slope |
| `signpostedAs` | `signposted_as` | camel-case Bearing name preserving literal sign text semantics |
| `pathway_mode: "walkway"` | `pathway_mode=1` | human-readable Bearing representation of GTFS mode |
| `pathway_mode: "stairs"` | `pathway_mode=2` | human-readable Bearing representation of GTFS mode |
| `pathway_mode: "elevator"` | `pathway_mode=5` | human-readable representation; type portability only in MVP |
| `pathway_mode: "door"` | no GTFS Pathways value | Bearing extension |
| `pathway_mode: "vestibule"` | no GTFS Pathways value | Bearing extension |

`from`, `requestedTo`, `to`, `bearing`, `countedFeatures`, `landmarksPassed`, `landmarks`, `rendered`, `requiresContinuation`, `checkpoint`, and aggregate totals are Bearing fields, not GTFS wire fields. `walkSpeedPercent` and `additionalTransferTime_s` are OSDM-aligned effort/connection semantics: only `walkSpeedPercent` changes per-segment rail walking time; `additionalTransferTime_s` remains an optional portability fact and is not silently applied.

### 18.4 28 CFR 36.302(e) prose-to-structure mapping

| Prose obligation/concept | Bearing representation |
| --- | --- |
| identify and describe accessibility features | discriminated `Candidate.accessibility` and full `Description.attributes` |
| enough detail for independent assessment | individual facts and measurements, not one `accessible` boolean |
| route from accessible entrance to check-in/essential services/room | stable refs, `Route`, `RouteSegment[]`, and structured landmarks |
| disclose measured constraints such as clear door width | unit-explicit `min_width_m` or an explicitly named room attribute |
| identify features that do not meet a person’s need | explicit values retained in results; unsupported filters rejected rather than implied |

This mapping is a prototype data-model interpretation, not legal advice or a certification of ADA compliance.

### 18.5 Bounded standards-gap statement

Among the major standards reviewed, GTFS Pathways models station circulation but not passenger-vehicle interiors; ITU-T F.921 addresses route guidance while traveling rather than interrogable pre-selection; 28 CFR 36.302(e) requires detailed hotel accessibility information without defining this machine schema; and 14 CFR 382.41 requires requested seat-level information without creating a dataset. This is a bounded research claim, not an exhaustive standards search.

## 19. Error contract

The only expected domain error codes are the nine values in §11.

| Code | Use |
| --- | --- |
| `INVALID_REF` | a required ref does not exist in the loaded layout |
| `NO_ROUTE` | both refs are valid but no modeled path exists |
| `NO_MATCH` | a singular-match use case has no result; ordinary empty query is success |
| `NOT_AVAILABLE` | `select` targets an unavailable seat; compare may still include it |
| `INVALID_SELECTION` | compare cardinality/uniqueness or another selection invariant fails |
| `INVALID_CRITERIA` | criteria are internally invalid, such as distance without `near` |
| `UNSUPPORTED_CRITERIA` | a valid block is inapplicable to the current domain |
| `NOTHING_TO_UNDO` | undo history is empty |
| `CONFIRMATION_REQUIRED` | a mutation is locked by pending/completed confirmation or confirm preconditions fail |

Error messages are concise, safe to read aloud, and actionable without exposing stack traces. Unknown fields are schema failures mapped to `INVALID_CRITERIA`. Capability states are §15 bootstrap diagnostics, never domain errors. Unexpected exceptions and cancellation reject; the Adapter preserves their distinction from expected failures.

The Bridge maps validation failures to fixed, localized message templates; it does not concatenate raw argument values into error text. Logging and rendering follow the safe text-sink contract in §15, including for failed calls.

## 20. Bridge and Agent contract evaluations

Agent evaluation is distinct from deterministic contract tests.

### EVAL-01 — layout and constrained search

Prompt: “In Car 6, find an available forward-facing window seat near the front entrance with at least 280 square inches of foot space.”

Expected sequence: layout inspection when needed, then query with `near`, `availableOnly`, `needs.minFootSpace_in2`, `rail.facing`, and `rail.side`. Verify normalized criteria, deterministic order, stable refs, truthful count, and no invented relaxation.

### EVAL-02 — conversational reference and route

Given ordered refs `6-12A`, `6-14D`, prompt: “How do I get from the second one to the restroom?” The Agent resolves “second” to `6-14D` and requests that route. Bearing does not parse the phrase. Verify lateral movement, meter facts, landmarks, and any checkpoint continuation.

### EVAL-03 — description and comparison

Prompt: “Describe 12A, then compare it with 14D.” Verify structured relations/follow-ups and exactly the two refs in input order on identical axes, even if one is unavailable.

### EVAL-04 — state recovery

Prompt: “What did I select? Undo my last selection.” The Agent inspects current state rather than relying on chat memory. Verify complete state after both calls and derived totals.

### EVAL-05 — confirmation control

Prompt: “Confirm my selection.” Verify that the call stays pending for the accessible human dialog and returns a terminal outcome in that same call; Agent action alone never produces `confirmed`.

Each eval records chosen tool, exact arguments, result refs, omitted or invented criteria, autonomous actions, and user-visible state. Repeated runs must not depend on unstable fixture iteration order.

## 21. Verification architecture

### 21.1 Domain and contract tests

- Route: all eight exact §7 acceptance cases, segment-sum totals, finite values, no zero-distance remnants, and continuation invariants.
- Query: 0, 12, and 13+ matches; repeated deterministic order; full ties resolved by `ref`; truthful `totalMatched`; normalized defaults; narrow/relax hint priorities; and absence of pagination fields.
- Compare: 1/2/4/5 refs, duplicates, invalid refs, unavailable refs included, input-order preservation, and identical axis keys.
- Rendering: all units/direction styles, step warning, render-only changes, and positive finite render inputs.
- Landmark: every category/channel/detectability enum and stable-ref relation.
- Serialization: every successful and failed result round-trips through JSON without field loss.

### 21.2 Application and state tests

- Every use case produces the §8 log/highlight/route effects atomically.
- `selectedCount` and `priceTotal_usd` always re-derive from `selected`.
- Select pushes exactly one complete snapshot; failure pushes none.
- Undo success/failure/lock restores state coherently.
- Preferences use session defaults and per-call override precedence.
- Query log stores requested args plus normalized `appliedCriteria`.

### 21.3 Confirmation tests

Exercise confirm, cancel, 120-second timeout, per-call abort, document teardown, dialog failure, duplicate call, selection/undo lock, racing terminal events, late callbacks, focus restoration, state restoration, and full same-call result. Run the integration suite in both target runtimes; inability to sustain the contract is an evidence-backed blocker, not permission for a silent fallback.

### 21.4 WebMCP Adapter tests

- Register exactly nine tools with exact names, schemas, and §16 annotations.
- Keep registration and execution signals distinct.
- Diagnose unsupported, insecure, permission denial, security rejection, and other registration failure separately.
- Return the plain `ToolResult` shape and verify exact JSON round-trip.
- Abort registration lifecycle without changing domain state.
- Verify Secure Context and Permissions Policy assumptions in the deployed environment.

### 21.5 Accessibility and progressive-enhancement tests

- Complete the whole UI6 journey with WebMCP disabled, keyboard only, and screen reader.
- Inspect the accessibility tree for a named grid with row/gridcell ownership, one roving tab stop, correct `aria-selected`, cell names/descriptions, arrow/Home/End navigation, Tab escape, focus visibility, and live status.
- Verify SVG overlay/state without requiring vision to understand the route.
- Open confirmation from Agent and human controls; inspect its accessible name/modal state and test outside-content `inert`, focus entry/trap, Escape, terminal action, `inert` removal, and restoration.
- Send markup-, script-, URL-, CSS-, and ARIA-ID-shaped values through args, refs, fixture labels/sign text, logs, status messages, and errors; assert text-only rendering and no DOM or accessibility-tree injection.
- Complete a monitor-off engineering walkthrough through confirmation.
- Check Agent speech and live-region speech for harmful duplication.

These are engineering tests, not participant research. Direct blind-user validation has not occurred.

### 21.6 Structural/document checks

- Exactly §§1–27 in order plus this unnumbered preamble.
- Exact field/enum/table comparison, not token presence alone.
- No placeholders, empty sections, broken fences/tables, malformed links, or trailing whitespace.
- Context-aware stale-token and contradiction scans described in the synchronization design.
- `git diff --check` and complete diff review before handoff.

## 22. Project structure

```text
src/
├─ app/
│  ├─ bootstrap.ts
│  └─ app.ts
├─ domain/
│  ├─ spatial/
│  │  ├─ types.ts
│  │  ├─ route-engine.ts
│  │  ├─ query-engine.ts
│  │  ├─ comparison-engine.ts
│  │  └─ rendering.ts
│  └─ rail/
│     ├─ rail-domain.ts
│     └─ rail-types.ts
├─ application/
│  ├─ use-cases.ts
│  ├─ confirmation-coordinator.ts
│  └─ errors.ts
├─ bridge/
│  ├─ contracts.ts
│  ├─ schemas.ts
│  ├─ handlers.ts
│  ├─ presenter.ts
│  └─ state-projector.ts
├─ adapters/webmcp/
│  ├─ register-tools.ts
│  ├─ capability.ts
│  └─ lifecycle.ts
├─ state/
│  ├─ app-store.ts
│  └─ selectors.ts
├─ ui/
│  ├─ rail-seat-grid.ts
│  ├─ controls.ts
│  ├─ route-overlay.ts
│  ├─ panels.ts
│  ├─ confirmation-dialog.ts
│  └─ capability-banner.ts
├─ data/
│  └─ intercity-car-6.json
└─ tests/
   ├─ domain/
   ├─ application/
   ├─ bridge/
   ├─ webmcp/
   ├─ agent-evals/
   └─ accessibility/
```

The Bridge is a logical boundary, not a mandate for one file per tool. Hotel proof belongs in specification documentation, not an unused runtime adapter.

## 23. Implementation dependency order

This is dependency order, not a schedule or cut list. Each gate must retain the complete product contract.

1. **Spatial truth:** independently authored fixture, meter coordinates, seats, landmarks, refs, and validation.
2. **Pure Domain:** query/order/hints, compare, route/continuation, rendering, and all unit tests.
3. **Application/state:** nine use cases, selection selectors, history, confirmation coordinator, log/highlight/route effects.
4. **Bridge:** exact inputs/results/errors and contract tests without WebMCP or DOM.
5. **WebMCP Adapter:** nine registrations, capability/lifecycle/cancellation, annotations, serialization tests.
6. **Accessible Human UI:** UI1–UI8 and the full non-Agent journey.
7. **Target-runtime/evidence validation:** Chrome and ChatGPT in-app browser, accessibility engineering tests, public deployment, and submission evidence.

Hotel remains a specification proof throughout these gates. Adding a runtime hotel domain is a future separately scoped change.

## 24. Architecture Decision Records

**ADR-001 — Domain Core is pure TypeScript.** Spatial truth must be deterministic and testable without DOM/WebMCP.

**ADR-002 — Bearing is a Bridge, not an internal Agent.** Natural-language planning stays external.

**ADR-003 — `a11y.*` is a public accessibility contract.** Stable refs and semantic facts replace DOM/component details.

**ADR-004 — Bridge and WebMCP Adapter are separate boundaries.** Meaning/validation are not platform binding.

**ADR-005 — UI and tools share one authored spatial source and App Store.** Neither calls or scrapes the other.

**ADR-006 — Route segments are source truth; rendering and SVG are derived.** Unit/direction preferences never alter geometry.

**ADR-007 — Distances are authored in meters; step counts are approximate output only.** Every step rendering carries `unitsNote`.

**ADR-008 — List breadth and route sequence have separate limits.** Query returns up to 12 without pagination; compare returns exact 2–4; each route leg returns at most four segments.

**ADR-009 — Query order and hints are deterministic.** Stable refs and explicit `totalMatched` prevent conversational-reference drift.

**ADR-010 — Unsupported criteria are rejected, not ignored.** The Agent cannot claim a filter was applied when it was not.

**ADR-011 — Candidate is domain-discriminated; comparison uses keyed axes.** No bare domain block or index-coupled values.

**ADR-012 — All decision totals are derived.** Selection refs are the only writable source for count and USD total.

**ADR-013 — Final confirmation is human-only and same-call.** No polling fallback or Agent-only terminal action.

**ADR-014 — Undo is one-step snapshot restoration.** It restores selection, highlights, status, and route atomically.

**ADR-015 — Every tool annotation is truthful about visible/log state.** All nine use `readOnlyHint: false` in v0.3.2.

**ADR-016 — WebMCP outputs are plain JSON-serializable values.** Server-style envelopes and non-JSON graphs are excluded.

**ADR-017 — WebMCP evolution is isolated in the Adapter.** Registration signal, execution signal, and host capability remain distinct.

**ADR-018 — GTFS semantics are aligned, not claimed wire-compatible.** Unit-explicit names and Bearing extensions are labeled.

**ADR-019 — Rail is the sole runtime MVP domain.** Hotel demonstrates schema portability only.

**ADR-020 — Agent quality, accessibility behavior, and Domain correctness are separate evidence layers.** Passing one does not imply the others.

## 25. Non-goals, limitations, risks, and open questions

### 25.1 Non-goals

- Actual booking, payment, accounts, login, or multi-user state.
- Scraping, browser extensions, copied operator UI/layouts, OCR, or visual inference.
- An internal LLM, generic `a11y.ask`, autonomous recommendation, or autonomous confirmation.
- Generic geometry/pathfinding, multilevel travel, or multiple rail cars.
- Full locale separation or an implemented hotel domain.
- Authored step counts or claims that an approximate stride is measured fact.
- Real operator integration or certified operational routing.

### 25.2 Disclosed limitations

- One unbranded synthetic single-level rail car; no real reservation inventory.
- Step values are estimates derived from measured meter geometry.
- Hotel is schema/documentation proof only.
- Direct blind-user validation has not occurred. Keyboard, screen-reader, monitor-off, and synthetic-fixture checks are engineering verification, not participant research.
- Bearing is an accessibility prototype informed by cited sources, not certified legal, regulatory, WCAG, safety, routing, or real-world operational compliance.

### 25.3 Evidence-dependent risks/open questions

| Question/risk | Required evidence or response |
| --- | --- |
| Do both target runtimes discover and invoke all exact names/schemas? | Real calls in ChatGPT in-app browser and Chrome 149+; record failures without name fallback |
| Can both hosts sustain a 120-second same-call confirmation with focus-safe page interaction? | Integration tests for confirm/cancel/timeout/abort/duplicate and focus/state restoration; unresolved failure is a blocker |
| Do tool-triggered highlights/log/live regions create duplicate or confusing speech? | Screen-reader evaluation with Agent- and human-originated events |
| Does the synthetic route model match every claimed path? | Eight exact route tests and fixture provenance; do not generalize beyond modeled geometry |
| Has any third-party IP or unlicensed asset entered data/UI/video? | Dependency/asset provenance ledger and manual repository/demo review |
| Are all submitted materials accessible and English? | Live URL audit and English review/translation of video, description, instructions, README, and UI |

## 26. PRD traceability and acceptance evidence

Each row has exactly one disposition: **Preserved**, **Official/spec erratum**, or **Intentionally non-architectural**.

### 26.1 Goals and non-goals

| PRD source | Architecture target | Verification evidence | Disposition |
| --- | --- | --- | --- |
| §3.1 G1 | §§2, 10 | Nine exact schemas and journey eval | Preserved |
| §3.1 G2 | §§7, 18 | Structured route tests and GTFS mapping | Preserved |
| §3.1 G3 | §§5, 9, 20 | refs, relations, follow-ups, evals | Preserved |
| §3.1 G4 | §§5, 18 | five landmark categories/channels | Preserved |
| §3.1 G5 | §§10, 18 | nine contracts plus portability proof | Preserved |
| §3.2 booking/payment | §§3, 25 | no server/payment boundary | Preserved |
| §3.2 login/account/multi-user | §§3, 25 | browser-local state; no auth | Preserved |
| §3.2 scraping/browser extension | §§1, 4, 25 | authored-data boundary | Preserved |
| §3.2 other accessibility areas | §§4, 25 | claim limited to nonvisual spatial decisions; compound attributes are facts, not broader claim | Preserved |
| §3.2 generic pathfinding/geometry | §§4, 7, 25 | bounded aisle-aware algorithm | Preserved |
| §3.2 multilevel/multi-car | §§3, 18, 25 | types portable; runtime excluded | Preserved |
| §3.2 full locale separation | §§17, 25 | English submission/UI contract | Preserved |
| §3.2 hotel implementation | §§18, 22, 25 | documentation proof only | Preserved |

### 26.2 Standards, principles, scope, and contracts

| PRD source | Architecture target | Verification evidence | Disposition |
| --- | --- | --- | --- |
| §4.1 standards gap | §18.5 | bounded four-source statement | Preserved |
| §4.2 GTFS/OSDM relationship | §§7, 18.3 | official mapping table and semantics | Official/spec erratum |
| §5 P1 | §§5, 9, 20 | stable refs, facts, relations, follow-ups | Preserved |
| §5 P2 | §§6, 7, 10 | query ≤12, compare 2–4, route ≤4 | Preserved |
| §5 P3 | §§11–14 | full state and exact undo | Preserved |
| §5 P4 | §13 | human-only same-call terminal event | Preserved |
| §5 P5 | §§8, 17 | highlights, overlay, log, panels | Preserved |
| §5 P6 | §§6–7 | meter/bearing source, derived rendering | Preserved |
| §5 P7 | §§6–7 | no authored steps; warning and landmark counts | Preserved |
| §6 M1 | §§3, 5, 22 | `intercity-car-6.json`, synthetic rail contract | Preserved |
| §6 M2 | §§7, 21 | eight route cases (seven PRD cases plus continuation closure) | Preserved |
| §6 M3 | §§10, 15–16 | nine exact registrations and runtime tests | Preserved |
| §6 M4 | §17 | UI1–UI8 acceptance table | Preserved |
| §6 M5 | §§15, 26.4 | HTTPS unauthenticated live URL evidence | Preserved |
| §6 M6 | §26.4 | live URL, four-part description, video, public repo/license | Preserved |
| §6 E1 | §§10, 18 | nine schemas and four-part portability proof | Preserved |
| §6 E2 | §§10, 12 | no tenth tool; prefs/session/render options | Preserved |
| §6 E3 | §§18, 25 | hotel runtime out; mapping retained | Preserved |
| §7.1 annotation matrix | §16 | all calls mutate visible/log state | Official/spec erratum |
| §§7.2–7.7 tool/result/error/confirm | §§10–16, 19 | exact schemas, results, state, errors, same-call confirmation | Preserved |
| §§8.1–8.6 data models | §§5–6, 12 | exact type-field comparison | Preserved |
| §§9.1–9.6 route model/algorithm/tests | §§7, 18.3, 21 | segment/total/render/continuation invariants | Preserved |

### 26.3 UI, architecture, portability, judging, and operations

| PRD source | Architecture target | Verification evidence | Disposition |
| --- | --- | --- | --- |
| §10 UI1 | §17 | CSS Grid fixture projection test | Preserved |
| §10 UI2 | §§8, 17 | result-ref highlight test | Preserved |
| §10 UI3 | §§7, 17 | segment-derived SVG test | Preserved |
| §10 UI4 | §§8, 12, 17 | args + applied criteria log test | Preserved |
| §10 UI5 | §§11–12, 17 | persistent refs/USD/status selectors | Preserved |
| §10 UI6 | §17 | complete non-Agent controls and keyboard/ARIA journey | Preserved |
| §10 UI7 | §§13, 17 | focus-safe human dialog tests | Preserved |
| §10 UI8 | §§15, 17 | capability banner plus working UI | Preserved |
| §11 architecture and ADRs | §§3–4, 8–9, 24 | dependency review and ADR set | Preserved |
| §12 portability proof | §18 | nine schemas, hotel mapping, GTFS junction, CFR mapping | Preserved |
| §13.0 Stage One | §§2, 26.4 | genuine working WebMCP and theme fit evidence | Preserved |
| §13.1 WebMCP Leverage | §§10, 13, 15–16, 26.4 | complete non-trivial journey and runtime evidence | Preserved |
| §13.2 Execution | §§17, 20–21, 26.4 | coherent Agent and no-Agent workflows | Preserved |
| §13.3 Potential Impact | §§1–2, 18, 25 | bounded sources/limitations and concrete gap | Preserved |
| §13.4 Creativity & Ambition | §§7, 18, 26.4 | structured vehicle route/O&M/rendering proof | Preserved |
| §§14.1–14.5 deployment/submission/IP/language | §26.4 | artifact and provenance checklist | Preserved |
| §15 schedule/order/cut administration | — | deliberately absent; embedded product duties trace through M1–M6/UI1–UI8 | Intentionally non-architectural |
| §§16.1–16.3 platform/capability/wire | §§15–16, 21 | draft-correct adapter and target-runtime tests | Official/spec erratum |
| §17 limitations/communication | §§1, 18.5, 25 | bounded prototype language and disclosures | Preserved |
| §18 risks | §25.3 | non-schedule evidence risks retained | Preserved |
| §19 open questions | §25.3 | resolved facts removed; host/accessibility questions retained | Preserved |
| §21 identity | §§1, 22, 24 | Bearing selected throughout | Preserved |

PRD §20 remains the source/bibliography for product claims and is not misclassified as a product contract.

### 26.4 Challenge and submission acceptance evidence

Architecture requires evidence; it does not assert these items are already complete.

- **Stage One:** a genuine working WebMCP implementation and clear human-Agent open-web fit.
- **Stage Two:** evidence separately addresses the equally weighted WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition criteria.
- **Entrant/team eligibility:** each individual records age-of-majority and eligible-country status; an organization records valid formation in an eligible country and representative authority. Team membership and any employer/school obligations are reviewed against the official rules before submission.
- **Exclusions and conflicts:** retain an attestation that no entrant is an ineligible Promotion Entity employee, agent, immediate-family/household member, judge affiliate, resident of an excluded jurisdiction, or otherwise subject to a stated conflict or prohibition.
- **Financial or preferential support:** retain an attestation and supporting provenance that the project was not developed or derived using Sponsor or Administrator financial/preferential support—including funding, investment, contract work, or a commercial license—within the official rule's restriction.
- **Platforms:** testing instructions and recorded calls cover ChatGPT’s in-app browser and Chrome 149+ with WebMCP testing enabled.
- **Live experience:** accessible HTTPS URL, no account/authentication, free of charge, and unrestricted for judges through judging.
- **Description:** four explicit parts—WebMCP fit, better UX, newly possible human-Agent collaboration, and implementation approach.
- **Repository:** public source/assets plus functional/testing instructions; root MIT license detectable in the repository About area.
- **Video:** public YouTube, under three minutes, clear functioning demo with explanatory audio, complete `query → get_route → compare → select → confirm` journey, unit-rendering proof, hotel mapping proof, English narration/captions, and no background music.
- **Language:** submission, video, description, testing instructions, README, and product UI are English; any exception includes the rule-required English translation.
- **Provenance:** disclose whether any work predates the submission period and distinguish dated prior work from meaningful WebMCP work.
- **IP/assets:** record source, license, and authorization for every dependency, SDK, API, dataset, image, font, audio, and other asset; exclude third-party trademarks and unauthorized material.
- **Synthetic assets:** `intercity-car-6.json` and before/after mockups are independently authored and unbranded; documented operational facts may inform them, but no third-party diagram, screenshot, artwork, or proprietary dataset is reproduced.

## 27. Final recommended structure and success criteria

```text
Person
  ↕ natural language                         ↕ keyboard / ARIA
External Browser Agent                 Accessible Human UI
        ↓                                      ↓
WebMCP Adapter                    Application use cases
        ↓                                      ↑
Spatial Accessibility Bridge ────────────────┘
        ↓
Domain Core ↔ App Store
        ↑
independently authored meter-source rail fixture
```

The architecture is ready for implementation when all of the following are true:

- Exactly one public Bearing contract exists for the nine tools, exact types, errors, annotations, and state behavior.
- Domain/UI/Agent facts derive from the same fixture and App Store.
- Query 0/12/13+ boundaries, deterministic order/hints, and compare 2–4 semantics pass exact tests.
- Routes preserve lateral movement, meter totals, bearings, rendering separation, four-segment continuation, and all eight acceptance cases.
- Selection totals never diverge; undo and same-call human confirmation restore/lock state deterministically.
- UI1–UI8 support the complete no-Agent journey and WebMCP remains progressive enhancement.
- Adapter behavior matches the current draft and passes both target-runtime integrations without confusing registration and execution cancellation.
- GTFS/OSDM/legal mappings are accurately bounded and hotel remains documentation proof.
- Challenge evidence covers Stage One, all four Stage Two criteria, unauthenticated live access, MIT, English materials, provenance/IP, and a no-background-music public demo.
- Limitations and unresolved runtime/accessibility questions remain disclosed; no implementation, certification, participant-validation, deployment, or submission claim is made without evidence.

Bearing bridges a person and the spatial facts already owned by a site. WebMCP is the transport; the durable product is the interrogable, deterministic, human-controlled accessibility contract.
