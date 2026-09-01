# Wayfinder Architecture Draft v0.3.1 — Spatial Accessibility Bridge

**선행 문서:** PRD v0.2.1 (2026-09-01) · Architecture Draft v0.2.1  
**문서 성격:** Verified Bridge Architecture Revision  
**이 문서의 역할:** Wayfinder를 단순 WebMCP 어댑터가 아니라 **시각적으로만 존재하던 공간 정보를 Agent가 질의 가능한 의미 구조로 변환하는 Spatial Accessibility Bridge**로 정의하고, 그 역할을 구현 가능한 레이어·계약·테스트로 고정한다.

---

## 0. v0.3.0 → v0.3.1 재검증 요약

v0.3.0의 중심 결정 — **외부 Agent가 자연어를 해석하고, Wayfinder는 deterministic spatial truth를 `a11y.*` 계약으로 노출한다** — 은 유지한다.

재검증에서는 2026-08-26 WebMCP Community Draft 및 2026-08-20 Chrome Imperative API 문서와 다시 대조하고, Bridge가 실제로 “semantic bridge” 역할을 하는지 코드 경계까지 점검했다.

| 영역 | v0.3.0 | v0.3.1 |
| --- | --- | --- |
| WebMCP execute 취소 | Community Draft와 Chrome의 `{ signal }` 차이를 compatibility point로 둠 | **최신 Community Draft도 `ToolExecuteCallbackOptions.signal`을 명시.** `execute(input, { signal })`을 기준으로 사용하고, 구현체 지연만 Adapter에서 방어 (§13.2, §15.1) |
| 공간 정보의 원천 | “시각 정보를 의미 구조로 변환”이라는 표현이 추출/OCR처럼 읽힐 수 있음 | **하나의 structured spatial model이 UI와 Bridge를 동시에 구동**하는 Single Source of Spatial Truth로 명확화 (§1, §3) |
| Query candidate | Domain이 `{ ref, line }` 생성 | Domain은 **구조화 fact**를 반환하고, Bridge가 Agent용 `line`을 만든다 (§5.2, §9) |
| 적용 조건 | `appliedCriteria`가 입력값과 동일할 수 있음 | 기본값까지 포함한 **normalized applied criteria**를 반환 (§6) |
| Compare | `axes[]` + 인덱스 기반 `values[]` | axis key를 가진 **keyed comparison values**로 변경 (§5.2) |
| Route 동일 행 | 모든 off-aisle 지점을 aisle로 우회 | **같은 row는 직접 횡이동**, 다른 row만 aisle 경유. `4-12A → 4-12B` 과대 계산 방지 (§7.2) |
| Tool 결과 | `ToolResult<T>` 직접 반환 | 유지하되 **JSON-serializable plain value**만 허용. 현재 WebMCP에 `outputSchema`가 없으므로 출력 계약은 TS + contract test로 보증 (§11, §15.2) |
| Confirmation primitive | 플랫폼별 primitive 가능성만 언급 | **현재 2026-08-26 Draft에는 `requestUserInteraction()`이 없음.** 인페이지 접근 가능한 dialog를 baseline으로 하고 플랫폼 전용 API는 feature-detect 시에만 사용 (§13) |
| Capability | secure context / API 존재 / registration 실패 | `SecurityError`, `NotAllowedError`를 구분해 **환경/권한 실패를 더 정확히 진단** (§15.4) |
| Bridge 구현량 | handler 9개 파일을 전제로 보일 수 있음 | Bridge는 논리적 경계이며 MVP에서는 작은 파일로 합쳐도 됨. **레이어 ≠ 마이크로서비스/과도한 파일 분할** (§9, §22) |

---

## 1. 한 문장 아키텍처 정의

> **Wayfinder는 좌석 배치 UI와 동일한 structured spatial model에서 공간 구조·관계·이동 경로·선택 상태를 계산하고, 이를 안정적인 `a11y.*` Tool Contract로 투영하여 외부 Browser Agent가 시각장애 사용자에게 탐색·비교·판단 정보를 전달할 수 있게 하는 Spatial Accessibility Bridge다.**

Wayfinder는 AI 좌석 추천 Agent가 아니다.

Wayfinder 내부에는 자연어를 해석하는 LLM이나 autonomous planner를 두지 않는다.

```text
사용자 자연어
    ↓
External Browser Agent
    ↓ structured tool call
Wayfinder Spatial Accessibility Bridge
    ↓ deterministic use case
Structured Spatial Model / Domain Core
```

자연어 이해와 다단계 tool orchestration은 Browser Agent가 담당한다.  
Wayfinder는 **UI가 보여주는 것과 Tool이 말하는 것이 같은 공간 사실에서 나오도록 보장하고**, 그 사실을 Agent가 소비하기 쉬운 접근성 계약으로 노출하는 것을 책임진다.

중요한 범위 경계:

```text
❌ 화면 픽셀/DOM을 읽어서 공간을 추론
✅ 앱이 이미 가진 structured spatial data로 화면과 Tool을 함께 생성
```

즉 “visual → semantic”은 런타임 OCR/스크래핑 변환이 아니라, **동일한 공간 모델의 Human-facing projection과 Agent-facing projection을 제공한다는 의미**다.

---

## 2. 현재 구조가 Bridge 역할에 충분한가?

### 결론

**기존 v0.2.1의 Domain Core + Application + WebMCP Adapter 구조는 기반으로 충분하다.**

다만 WebMCP Adapter 하나를 “Bridge”라고 부르면 역할이 너무 좁다.

WebMCP Adapter는 브라우저 API binding일 뿐이며, 실제 접근성 Bridge는 다음 세 부분이 함께 만든다.

```text
Spatial Domain Core
        ↓ 공간 사실 계산
Application
        ↓ use case / state transition
Spatial Accessibility Bridge Contract
        ↓ Agent가 이해할 수 있는 의미 계약
WebMCP Adapter
        ↓ 브라우저 Agent에 노출
External Agent
```

따라서 v0.3.1에서는 **Bridge Contract를 독립 경계로 명시**한다.

### Bridge가 해결해야 하는 사용자 불편과 Tool 매핑

| 사용자 불편 | 기존 화면에서 잃는 정보 | Bridge가 제공하는 기능 |
| --- | --- | --- |
| 전체 구조를 파악하기 어렵다 | 출입문/화장실/통로/좌석의 관계 | `a11y.get_layout` |
| 특정 좌석이 어디 있는지 감이 없다 | 주변 기준점과 상대 위치 | `a11y.describe` |
| 조건에 맞는 좌석을 탐색하기 어렵다 | 시각적 필터 결과와 공간 관계 | `a11y.query` |
| 실제 이동 난이도를 알기 어렵다 | 출입문→좌석, 좌석→화장실 동선 | `a11y.get_route` |
| 후보 간 장단점을 비교하기 어렵다 | 거리·방향·위치 차이 | `a11y.compare` |
| 현재 무엇을 골랐는지 놓치기 쉽다 | 화면의 선택 상태 | `a11y.select`, `a11y.get_selection` |
| 실수를 되돌리기 어렵다 | 화면 상태 변화 | `a11y.undo` |
| Agent가 임의로 확정하면 안 된다 | 최종 의사결정 통제권 | `a11y.confirm` + human confirmation |

이 9개 기능이 정상적으로 동작하면 **별도의 내부 AI Agent 없이도 Wayfinder의 핵심 접근성 문제를 해결할 수 있다.**

---

## 3. 전체 아키텍처

Wayfinder는 **브라우저 로컬 Modular Monolith**로 구성한다.

```text
┌──────────────────────────────────────────────────────────────┐
│                        Screen Reader User                    │
│                                                              │
│        자연어 대화                          키보드/ARIA      │
└──────────────┬──────────────────────────────────┬────────────┘
               │                                  │
               ▼                                  ▼
┌──────────────────────────┐          ┌─────────────────────────┐
│ External Browser Agent   │          │       React UI          │
│ ChatGPT / Agent Client   │          │ Seat Map / Status UI    │
│                          │          │ Route Overlay / Dialog   │
│ 자연어 이해              │          └────────────┬────────────┘
│ tool 선택/조합            │                       │
│ 대화형 ref 해소           │                       │
└─────────────┬────────────┘                       │
              │ WebMCP                             │
              ▼                                    │
┌──────────────────────────┐                       │
│      WebMCP Adapter      │                       │
│ registerTool / lifecycle │                       │
│ capability / compat      │                       │
└─────────────┬────────────┘                       │
              ▼                                    │
┌─────────────────────────────────────┐            │
│ Spatial Accessibility Bridge       │            │
│                                     │            │
│ a11y.* public contract              │            │
│ schema validation                   │            │
│ response shaping (3~5 items)        │            │
│ applied criteria / stable refs      │            │
│ state projection / error mapping    │            │
│ action safety                       │            │
└─────────────┬───────────────────────┘            │
              │                                    │
              └──────────────┬─────────────────────┘
                             ▼
                 ┌───────────────────────┐
                 │   Application Layer   │
                 │ use cases / state     │
                 │ confirmation coord.   │
                 └───────────┬───────────┘
                             │
                 ┌───────────┴────────────┐
                 ▼                        ▼
       ┌──────────────────────┐  ┌──────────────────────┐
       │     Domain Core      │  │      App Store       │
       │ Spatial Layout       │  │ selection            │
       │ Route Engine         │  │ confirmation status  │
       │ Query Engine         │  │ active route         │
       │ Comparison Engine    │  │ highlight / history  │
       └──────────┬───────────┘  └──────────────────────┘
                  │
            ┌─────┴─────┐
            ▼           ▼
      ┌───────────┐ ┌───────────┐
      │ Train Data│ │ Hotel Data│
      │ Adapter   │ │ Adapter   │
      └───────────┘ └───────────┘
```

핵심 의존성:

```text
External Agent
     ↓
WebMCP Adapter
     ↓
Spatial Accessibility Bridge
     ↓
Application
     ↓
Domain Core
```

Human UI는 Bridge를 우회하고 Application을 직접 사용한다.

```text
React UI → Application → Domain / Store
```

따라서 WebMCP가 없어도 기본 접근 가능한 UI는 동작하고, WebMCP가 있으면 **동일한 공간 의미와 상태를 Agent가 사용할 수 있다.**


### 3.1 Single Source of Spatial Truth

UI와 Bridge가 서로 다른 좌석 데이터를 만들지 않는다.

```text
                 Structured Spatial Model
                       /          \
                      /            \
             Human UI projection   Domain/Application
                                         ↓
                                Bridge projection
                                         ↓
                                      Agent
```

- Train fixture / Hotel fixture가 공간 사실의 원천이다.
- SeatMap은 그 모델을 시각적으로 렌더링한다.
- Route/Query/Compare는 같은 모델을 계산한다.
- Bridge는 계산 결과를 Agent-facing DTO로 투영한다.

따라서 “화면에서는 8걸음인데 Agent는 6걸음” 같은 이중 진실을 만들지 않는다.

---

## 4. Agent와 Bridge의 책임 경계

### 4.1 External Agent가 담당하는 것

- 사용자 자연어 이해
- 어떤 `a11y.*` Tool을 호출할지 결정
- 필요한 경우 여러 Tool을 순차 호출
- `"두 번째 거"`, `"그거"`, `"아까 선택한 자리"` 같은 대화형 참조 해소
- Tool 결과를 사용자의 언어로 설명
- 사용자의 추가 질문을 받아 탐색을 계속 진행

### 4.2 Wayfinder Bridge가 담당하는 것

- 실제 공간 구조와 위치 관계를 정확하게 계산
- stable `ref`를 제공
- query 조건을 검증하고 실제 적용 조건을 명시
- 이동 경로를 구조화해 제공
- 결과를 음성 대역폭에 맞게 제한
- 현재 선택과 confirmation 상태를 정확하게 투영
- 화면 UI와 Agent가 동일한 상태를 관찰하도록 보장
- Agent 단독 확정을 차단
- 예상 가능한 오류를 구조화된 코드로 반환

### 4.3 Wayfinder Bridge가 하지 않는 것

- 자연어 intent parsing
- LLM 기반 좌석 추천
- `"가장 좋은 자리"`를 자체 판단
- 사용자를 대신한 autonomous tool planning
- DOM scraping으로 좌석 위치 추측
- 화면 이미지에 대한 vision inference
- Browser Agent를 대체하는 자체 채팅 Agent

특히 다음 형태는 MVP에서 만들지 않는다.

```text
a11y.ask({
  request: "좋은 자리 알아서 골라줘"
})
```

이런 generic Agent Tool은 Wayfinder의 접근성 계약을 다시 불투명한 AI 판단으로 감싸므로 제외한다.

---

## 5. 핵심 Layer — Domain Core

React, DOM, WebMCP, Agent를 전혀 모르는 순수 TypeScript 모듈이다.

```text
domain/
 ├─ spatial/
 │   ├─ types.ts
 │   ├─ calibration.ts
 │   ├─ route-engine.ts
 │   ├─ query-engine.ts
 │   └─ comparison-engine.ts
 ├─ train/
 │   ├─ train-domain.ts
 │   └─ train-types.ts
 └─ hotel/
     ├─ hotel-domain.ts
     └─ hotel-types.ts
```

### 5.1 `SpatialDomain`

```ts
type SpatialRef = string;
type Point = { row: number; col: number };

interface SpatialDomain {
  getLayout(): LayoutSummary;
  query(criteria: QueryCriteria): QueryOutcome;
  describe(ref: SpatialRef): Description;
  route(from: SpatialRef, to: SpatialRef): Route;
  compare(refs: SpatialRef[]): Comparison;
}
```

기차와 호텔이 같은 내부 모델을 완벽하게 공유할 필요는 없다.

**같아야 하는 것은 Agent에게 보이는 contract와 의미다.**

### 5.2 Query Domain Result — 구조화 fact 우선

Domain은 Agent용 문장을 만들지 않고 공간 fact를 반환한다.

```ts
type DomainCandidate = {
  ref: SpatialRef;
  label: string;
  price: number;
  available: boolean;
  features: string[];

  // near 조건이 적용된 경우
  distance?: {
    from: SpatialRef;
    steps: number;
  };

  train?: {
    direction: "forward" | "backward";
    side: "window" | "aisle";
  };

  hotel?: {
    floor: number;
    bedToBathroomSteps?: number;
  };
};

type AppliedQueryCriteria = {
  near?: SpatialRef;
  maxSteps?: number;
  priceMax?: number;
  availableOnly: boolean; // 기본값까지 normalize하여 항상 명시
  train?: QueryCriteria["train"];
  hotel?: QueryCriteria["hotel"];
};

type QueryOutcome =
  | {
      ok: true;
      items: DomainCandidate[];
      total: number;
      appliedCriteria: AppliedQueryCriteria;
    }
  | {
      ok: false;
      code:
        | "UNSUPPORTED_CRITERIA"
        | "INVALID_CRITERIA"
        | "NO_MATCH";
    };
```

Bridge Presenter가 이를 Agent-facing candidate로 투영한다.

```ts
type AgentCandidate = DomainCandidate & {
  line: string; // 스크린리더/대화용 concise summary
};
```

따라서 Agent는 `line`을 다시 파싱하지 않아도 `price`, `direction`, `side`, `distance` 같은 구조화 fact를 직접 사용할 수 있고, 사람에게 읽어줄 때만 `line`을 활용할 수 있다.

`Comparison`도 인덱스 결합을 피한다.

```ts
type Comparison = {
  axes: { key: string; label: string }[];
  rows: {
    ref: SpatialRef;
    values: Record<string, string | number | boolean | null>;
  }[];
};
```

`axes[0]`과 `values[0]`의 순서를 맞춰야 하는 배열 계약보다 keyed value가 Agent와 테스트 모두에서 안전하다.

---

## 6. `QueryCriteria`와 의미 검증

```ts
type QueryCriteria = {
  // 공통
  near?: SpatialRef;
  maxSteps?: number;
  priceMax?: number;
  availableOnly?: boolean;

  // 도메인 고유
  train?: {
    direction?: "forward" | "backward";
    side?: "window" | "aisle";
  };

  hotel?: {
    floorMin?: number;
    floorMax?: number;
    bedToBathroomMaxSteps?: number;
  };
};
```

검증:

| 규칙 | 내용 | 위반 시 |
| --- | --- | --- |
| Q1 | `maxSteps`가 있으면 `near` 필수 | `INVALID_CRITERIA` |
| Q2 | train domain은 `hotel` 블록 거부 | `UNSUPPORTED_CRITERIA` |
| Q3 | hotel domain은 `train` 블록 거부 | `UNSUPPORTED_CRITERIA` |
| Q4 | 지원하지 않는 조건을 silent-ignore하지 않는다 | Q2/Q3 |
| Q5 | 실제 적용된 조건을 **normalized `appliedCriteria`** 로 반환 | — |
| Q6 | `maxSteps`, `priceMax` 등 수치 조건은 finite + 0 이상 | `INVALID_CRITERIA` |

`appliedCriteria`는 입력 echo가 아니다. Domain이 실제 적용한 기본값까지 포함한다.

예를 들어 사용자가 `availableOnly`를 생략해도 MVP 기본값이 `true`라면:

```json
{
  "appliedCriteria": {
    "near": "entrance",
    "availableOnly": true,
    "train": {
      "direction": "forward",
      "side": "window"
    }
  }
}
```

Bridge는 Agent에게 **“실제로 어떤 조건이 적용됐는가”**를 숨기지 않는다. 이 값은 사용자의 판단 근거를 보존하는 provenance다.

---

## 7. Route Engine

Route Engine은 Wayfinder가 단순 action bridge가 아니라 **spatial semantic bridge**가 되게 하는 핵심이다.

### 7.1 Route 타입

```ts
type RouteSegment =
  | {
      kind: "walk";
      from: SpatialRef;
      to: SpatialRef;
      steps: number;
      direction: "forward" | "backward" | "left" | "right";
    }
  | {
      kind: "vertical";
      from: SpatialRef;
      to: SpatialRef;
      floors: number;
      method: "elevator" | "stairs";
    };

type Route = {
  from: SpatialRef;
  to: SpatialRef;
  totalWalkingSteps: number;
  segments: RouteSegment[];
  turns: {
    atStep: number;
    direction: "left" | "right";
  }[];
  landmarks: string[];
  summary: string;
};
```

```text
Route.segments
    ├─ Agent 설명
    ├─ UI RouteOverlay
    └─ Unit Test
```

Agent 설명과 화면 화살표가 서로 다른 경로 로직을 사용하지 않는다.

### 7.2 MVP 알고리즘 — 같은 row는 직접, 다른 row는 aisle 경유

MVP 공간 가정:

- 한 row 안의 횡방향 이동은 직접 가능하다고 모델링한다.
- row 간 이동은 aisle에서만 가능하다.
- 장애물·곡선 통로·좌석별 실제 진입 폭은 모델링하지 않는다.

```text
route(from, to):

1. from / to 실제 grid 위치와 해당 row의 aisle col을 resolve

2. from.row === to.row 이면:
   from → to 직접 횡방향 walk segment
   (0거리면 segment 생략)
   → 6단계로 이동

3. row가 다르면 from이 aisle 밖일 때:
   from → 같은 row의 aisle anchor
   횡방향 walk segment

4. aisle을 따라 to.row까지
   종방향 walk segment

5. to가 aisle 밖이면:
   to row의 aisle anchor → to
   횡방향 walk segment

6. 실제 segment 경로상의 landmark 수집

7. segments로부터 totalWalkingSteps / turns 계산

8. 같은 segments로 summary 생성
```

이 분기가 필요한 이유:

```text
4-12A → 4-12B
```

를 무조건 `A → aisle → B`로 계산하면 같은 좌석열 안의 짧은 이동을 과대 계산한다. 반대로 row가 다른 경우에는 aisle을 통하지 않고 좌석을 가로질러 이동하는 경로를 허용하면 안 된다.

`4-12A → 4-12D`처럼 같은 row에서 통로를 건너는 경우도 MVP에서는 row 횡방향 직선 이동으로 계산한다. 이는 **격자 기반 접근성 추정 모델**이며 실제 객차 장애물 모델은 범위 밖이다.

### 7.3 Calibration

```ts
export const STEP_CALIBRATION = {
  rowPitchSteps: 2,
  colPitchSteps: 1,
};
```

걸음 수는 격자 기반 추정치다.

실측 값처럼 표현하지 않으며 데모·제출 글에 이를 명시한다.

### 7.4 D1 완료 테스트

- `entrance → 4-12A` — 다른 row라면 aisle 경유 + 좌석 진입
- `4-12A → restroom` — 좌석 이탈 비용 포함
- `4-12A → luggage` — landmark 경유
- `4-12A → 4-14D` — 횡 → 종 → 횡
- `4-12A → 4-12D` — 같은 row, 통로 건넘 직접 횡이동
- `4-12A → 4-12B` — **같은 row/같은 쪽 직접 횡이동, aisle 우회 금지**

검증:

- segment별 `steps`
- `direction`
- `totalWalkingSteps`
- `turns`
- `landmarks`
- `summary`
- 0-step segment가 결과에 남지 않음

---

## 8. Application Layer

Application은 **무엇을 수행할지**와 **상태가 어떻게 변할지**를 책임진다.

```text
application/
 ├─ get-layout.ts
 ├─ query.ts
 ├─ describe.ts
 ├─ get-route.ts
 ├─ compare.ts
 ├─ select.ts
 ├─ get-selection.ts
 ├─ undo.ts
 └─ confirm.ts
```

### 8.1 담당

- 현재 Domain 라우팅
- Domain Core 호출
- App Store 상태 전이
- 선택/undo/confirmation orchestration
- Route 결과를 `activeRoute`에 반영
- highlight 대상 갱신
- confirmation UI coordinator 호출
- Domain error를 typed Application error로 유지

### 8.2 담당하지 않음

- WebMCP API 호출
- React component 접근
- SVG 조작
- Agent의 자연어 해석
- 결과 리스트를 5개로 자르는 Agent-facing 규율
- Browser Agent용 `hint` 생성

마지막 두 항목은 Bridge의 책임이다.

---

## 9. Spatial Accessibility Bridge Contract

이 레이어가 Wayfinder의 **제품 차별점이 실제 코드 경계로 나타나는 곳**이다.

```text
bridge/
 ├─ tool-catalog.ts
 ├─ contracts.ts
 ├─ response-presenter.ts
 ├─ error-mapper.ts
 ├─ state-projector.ts
 └─ handlers/
     ├─ get-layout.ts
     ├─ query.ts
     ├─ describe.ts
     ├─ get-route.ts
     ├─ compare.ts
     ├─ select.ts
     ├─ get-selection.ts
     ├─ undo.ts
     └─ confirm.ts
```

이것은 별도 서버나 microservice가 아니다.

같은 브라우저 bundle 안의 **작은 boundary module**이다.

### 9.1 Bridge의 5가지 책임

#### B1. Semantic Exposure

DOM 좌표나 컴포넌트 이름이 아니라 **공유 spatial model에서 계산된 공간 fact**를 노출한다.

```text
❌ button#seat-12A 클릭 가능

✅ 4-12A
   - window
   - forward
   - entrance 8 steps
   - restroom relation
```

#### B2. Voice-bandwidth Shaping

Agent에게 무제한 결과를 보내지 않는다.

```ts
const MAX_AGENT_ITEMS = 5;
```

Bridge Presenter가:

- DomainCandidate의 구조화 fact 보존
- 결과 최대 5개
- `more`
- 짧은 `line`
- 다음 탐색 축 `hint`

를 만든다. `line`은 편의 표현이며 Agent가 의미를 얻기 위해 다시 파싱해야 하는 유일한 정보원이 아니다.

#### B3. State Projection

조작 이후 Agent가 별도 화면 추측 없이 상태를 알 수 있어야 한다.

```ts
type SelectionState = {
  selected: string[];
  selectedCount: number;
  priceTotal: number;
  undoable: boolean;
  status: "draft" | "confirmation_pending" | "confirmed";
};
```

#### B4. Action Safety

- 조회와 조작 Tool을 구분
- `readOnlyHint`
- unavailable seat 방지
- confirmation pending 중 변경 차단
- 최종 확정은 사람의 UI action 필요

#### B5. Observability

하나의 Bridge call에서:

```text
Agent Tool Result
UI Highlight
Tool Log
Selection State
```

가 같은 use case 실행 결과를 공유한다.

---

## 10. `a11y.*` Public Tool Contract

| Tool | 목적 | Bridge가 추가로 보장하는 것 |
| --- | --- | --- |
| `a11y.get_layout` | 공간 개요 | 전체 좌석 나열 금지, landmark 중심 요약 + 현재 context |
| `a11y.query` | 조건 탐색 | structured candidate facts + normalized appliedCriteria + 최대 5개 + more + hint |
| `a11y.describe` | 대상 상세 | stable ref + 주변 관계 |
| `a11y.get_route` | 이동 경로 | 동일 RoutePlan에서 파생한 structured route + summary |
| `a11y.compare` | 후보 비교 | keyed axis/value로 축 의미 보존 |
| `a11y.select` | 선택 | 전체 SelectionState 반환 |
| `a11y.get_selection` | 상태 확인 | 화면과 동일 state |
| `a11y.undo` | 마지막 조작 복원 | 복원 후 전체 state |
| `a11y.confirm` | 확정 요청 | Agent 단독 확정 금지 |

### 10.1 Tool naming

`a11y.get_route`처럼 `.`을 포함한 이름을 그대로 사용한다.

현재 WebMCP Community Draft의 tool name 규칙은 ASCII 영숫자와 `_`, `-`, `.`을 허용한다.

따라서 `a11y_get_route` fallback은 두지 않는다.

### 10.2 Tool metadata

Tool metadata는 기능 의미만 포함한다.

```ts
{
  name: "a11y.get_route",
  title: "이동 경로 확인",
  description:
    "현재 열린 공간에서 두 지점 사이의 이동 경로와 방향을 반환한다.",
  annotations: {
    readOnlyHint: true,
    untrustedContentHint: false
  }
}
```

현재 호차나 현재 선택처럼 변하는 데이터는 description에 넣지 않는다.

동적 상태는 Tool Result로 노출한다.

---

## 11. Tool Response Contract

모든 Bridge 결과는 **JSON-serializable plain value**여야 한다. DOM node, 함수, `Error` 객체, class instance를 반환 계약에 넣지 않는다.

```ts
type BridgeContext = {
  domain: "train" | "hotel";
  layoutId: string;
};

type ToolResult<T> = {
  ok: boolean;
  context: BridgeContext;

  data?: T;
  state?: SelectionState;

  more?: number;
  hint?: string;

  error?: {
    code: ToolErrorCode;
    message: string;
  };
};
```

`context`를 항상 포함해 Agent가 현재 Tool 결과가 어느 공간에 대한 것인지 화면을 추측하지 않아도 되게 한다.

### 11.1 Query

Domain:

```text
40개 조건 일치
```

Bridge:

```json
{
  "ok": true,
  "context": {
    "domain": "train",
    "layoutId": "4"
  },
  "data": {
    "items": [
      {
        "ref": "4-12A",
        "label": "12열 A",
        "price": 47000,
        "available": true,
        "distance": { "from": "entrance", "steps": 8 },
        "train": { "direction": "forward", "side": "window" },
        "features": [],
        "line": "12열 A, 창측, 순방향, 출입문에서 8걸음"
      }
    ],
    "appliedCriteria": {
      "near": "entrance",
      "availableOnly": true,
      "train": {
        "direction": "forward",
        "side": "window"
      }
    }
  },
  "more": 39,
  "hint": "화장실 거리로 더 좁힐 수 있습니다."
}
```

`line`은 음성/대화 편의를 위한 파생 표현이다. Agent는 핵심 판단을 `train.direction`, `train.side`, `distance.steps`, `price` 같은 구조화 필드로도 수행할 수 있다.

### 11.2 조작 결과

```json
{
  "ok": true,
  "context": { "domain": "train", "layoutId": "4" },
  "data": {
    "selectedRef": "4-12A"
  },
  "state": {
    "selected": ["4-12A"],
    "selectedCount": 1,
    "priceTotal": 47000,
    "undoable": true,
    "status": "draft"
  }
}
```

### 11.3 Domain error와 runtime error 분리

예상 가능한 사용자/도메인 오류도 가능하면 현재 `context`와 recovery hint를 보존한다.

```json
{
  "ok": false,
  "context": { "domain": "train", "layoutId": "4" },
  "error": {
    "code": "INVALID_CRITERIA",
    "message": "거리 조건을 사용하려면 기준 위치를 함께 지정해야 합니다."
  }
}
```

WebMCP 등록 실패, 프로그래밍 오류, 예상하지 못한 exception은 `ToolResult`의 domain error처럼 위장하지 않는다. Adapter/bootstrap에서 따로 처리한다.

### 11.4 현재 WebMCP에는 output schema가 없다

2026-08-26 `ModelContextTool`은 `inputSchema`는 제공하지만 `outputSchema` 필드는 정의하지 않는다.

따라서 Wayfinder의 `ToolResult<T>`는:

```text
TypeScript type
+ Bridge contract test
+ Agent eval
```

으로 보증한다. 향후 WebMCP에 output schema가 추가되면 Adapter에서 이 contract를 그대로 노출한다.

---

## 12. State Architecture

```ts
type AppState = {
  domain: "train" | "hotel";
  layoutId: string;

  selection: string[];
  confirmationStatus:
    | "draft"
    | "confirmation_pending"
    | "confirmed";

  activeRoute: Route | null;
  highlightedRefs: string[];

  toolLog: {
    name: string;
    args: Record<string, unknown>;
    at: number;
  }[];

  history: {
    selection: string[];
    highlightedRefs: string[];
  }[];
};
```

```text
              App Store
             /         \
        React UI      Application
                          ↑
                   Accessibility Bridge
                          ↑
                      WebMCP
```

Agent가 직접 Store를 읽지 않는다.

Bridge가 필요한 상태만 `SelectionState`로 projection한다.

### 12.1 도메인 전환

Tool 이름과 schema가 Train/Hotel에서 같으므로 domain 전환 시 tool 재등록은 필요 없다.

```text
store.domain = "hotel"
        ↓
같은 a11y.query
        ↓
Application이 hotelDomain으로 라우팅
```

---

## 13. `a11y.confirm` — Human Control Boundary

제품 invariant:

> **Agent의 `a11y.confirm` 호출만으로 `confirmed`가 될 수 없다.**

필수 조건은 다음이다.

```text
Agent confirm request
        ↓
사용자에게 접근 가능한 Confirmation UI
        ↓
사용자 직접 확인/취소
        ↓
최종 상태가 Agent에게 관찰 가능
```

### 13.1 Baseline — 인페이지 접근 가능한 confirmation

2026-08-26 Community Draft에는 `requestUserInteraction()`이 현재 API로 정의되어 있지 않다. 따라서 MVP의 baseline은 **Wayfinder 페이지가 직접 제공하는 접근 가능한 ConfirmationDialog**다.

오래된 proposal/일부 문서에 남아 있는 `requestUserInteraction()`을 필수 전제로 두지 않는다. 실제 target runtime이 별도 user-interaction primitive를 제공하고 동작이 검증된 경우에만 Adapter-level enhancement로 사용한다.

### 13.2 1순위 구현 — blocking execution + execution signal

최신 Community Draft는 `ToolExecuteCallbackOptions.signal`을 명시하며 Chrome Imperative API도 `execute(input, { signal })` 형태를 문서화한다.

```text
a11y.confirm()
  ↓
status = confirmation_pending
  ↓
ConfirmationDialog
  ↓
await user action / signal / timeout
  ├─ confirm → confirmed
  ├─ cancel  → draft
  ├─ abort   → draft + execution aborted
  └─ timeout → draft
  ↓
Tool result
```

```ts
type ConfirmOutcome =
  | "confirmed"
  | "cancelled"
  | "timeout";
```

Adapter:

```ts
execute: async (input, { signal }) => {
  return bridge.confirm(input, { signal });
};
```

Application의 ConfirmationCoordinator는 `AbortSignal`과 자체 timeout을 모두 받아야 한다. 취소/timeout 시 `confirmationStatus`를 반드시 `draft`로 복원한다.

### 13.3 구현체 지연 fallback

WebMCP는 아직 draft이고 target runtime이 최신 callback options를 구현하지 않았을 가능성은 Adapter에서 방어한다.

```ts
execute: async (input, options) => {
  return bridge.confirm(input, {
    signal: options?.signal
  });
};
```

또한 실제 ChatGPT/Chrome 통합에서 장시간 blocking execution 자체가 불안정하면 제품 원칙을 바꾸지 않고 다음으로 fallback할 수 있다.

```text
a11y.confirm
  → status = confirmation_pending 반환

사용자 UI confirm
  → status = confirmed

Agent
  → a11y.get_selection
  → confirmed 관찰
```

즉 **blocking은 구현 전략이고, human confirmation + 최종 상태 관찰 가능성은 제품 계약**이다.

---

## 14. Undo

전체 event sourcing은 사용하지 않는다.

```text
select 직전
  ↓
history.push(snapshot)
  ↓
selection 변경
```

```text
undo
  ↓
history.pop()
  ↓
selection / highlight 복원
  ↓
전체 SelectionState 반환
```

`confirmation_pending` 중에는:

```text
select
undo
```

모두 `CONFIRMATION_REQUIRED`로 차단한다.

---

## 15. WebMCP Adapter

이 계층은 **WebMCP 플랫폼 바인딩만** 담당한다.

```text
adapters/webmcp/
 ├─ model-context.ts
 ├─ register-tools.ts
 ├─ execution-context.ts
 ├─ capability.ts
 └─ schemas/
```

### 15.1 등록 및 execution signal

```ts
await document.modelContext.registerTool(
  {
    name: "a11y.get_route",
    title: "이동 경로 확인",
    description:
      "현재 열린 공간에서 두 지점 사이의 이동 경로와 방향을 반환한다.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string" },
        to: { type: "string" }
      },
      required: ["from", "to"]
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false
    },
    execute: async (input, { signal }) => {
      return bridge.getRoute(input, { signal });
    }
  },
  {
    signal: registrationController.signal
  }
);
```

두 signal의 의미를 섞지 않는다.

```text
registrationController.signal
→ Tool 등록 lifecycle / unregister

execute(..., { signal })
→ 개별 Tool execution cancellation
```

### 15.2 반환 형식과 serialization

MCP 서버 스타일의 아래 envelope를 만들지 않는다.

```text
{ content: [...], isError: ... }
```

WebMCP `execute`는 asynchronous value를 반환할 수 있으므로 Bridge의 `ToolResult<T>` plain object를 직접 반환한다.

단, 현재 execution plumbing은 결과를 serialize하여 Agent 쪽에 전달하므로 반환값은 JSON-serializable해야 한다.

```ts
execute: async (input, { signal }) => {
  return bridge.query(input, { signal });
};
```

현재 `ModelContextTool`에는 `outputSchema`가 없으므로 반환 스키마는 Bridge contract test로 강제한다 (§11.4).

### 15.3 Tool lifecycle

```text
App mount
  ↓
registration AbortController 생성
  ↓
9개 Tool 등록

App unmount
  ↓
registrationController.abort()
```

domain 전환은 tool lifecycle이 아니다.

### 15.4 Capability / environment errors

```ts
type WebMCPCapability =
  | "available"
  | "unsupported"
  | "insecure-context"
  | "permission-denied"
  | "security-rejected"
  | "registration-failed";
```

```text
!window.isSecureContext
→ insecure-context

registerTool 없음
→ unsupported

registerTool reject NotAllowedError
→ permission-denied

registerTool reject SecurityError
→ security-rejected
  (origin isolation / permissions-policy / origin 환경을 함께 점검)

그 외 registration reject
→ registration-failed

성공
→ available
```

WebMCP는 Secure Context 외에도 origin/Permissions Policy 조건의 영향을 받으므로 `isSecureContext` 하나만으로 지원 여부를 단정하지 않는다.

WebMCP가 unavailable해도 React 접근성 UI는 정상 동작한다.

### 15.5 Target runtime

개발/검증 환경을 구분한다.

```text
WebMCP-enabled Chrome + inspector
→ schema / registration / manual tool call / Agent eval 개발

ChatGPT Desktop built-in browser Site Tools
→ 최종 실제 Agent 통합 검증
```

ChatGPT Site Tools는 현재 데스크톱 앱의 built-in browser에서 WebMCP 페이지 도구를 발견해 사용하는 경로이므로 최종 데모는 이 환경을 기준으로 검증한다.

---

## 16. Tool annotations

조회 6종:

```text
a11y.get_layout
a11y.query
a11y.describe
a11y.get_route
a11y.compare
a11y.get_selection
```

```ts
readOnlyHint: true
```

조작 3종:

```text
a11y.select
a11y.undo
a11y.confirm
```

```ts
readOnlyHint: false
```

현재 MVP 데이터는 프로젝트가 직접 관리하는 정적 공간 데이터이므로:

```ts
untrustedContentHint: false
```

향후 외부 사용자 리뷰나 제3자 텍스트를 반환하게 되면 해당 Tool은 별도로 `true`를 검토한다.

`readOnlyHint: true`인 조회 Tool은 selection/confirmation 같은 **의사결정 상태를 변경하지 않는다.** Route overlay, highlight, tool log 같은 observability UI는 파생 presentation state로 취급한다. D2에서 target agent가 이 힌트를 엄격하게 해석해 문제가 생기면 힌트를 과장하지 말고 해당 Tool annotation을 조정한다.

---

## 17. UI Architecture

```text
ui/
 ├─ layout/
 │   ├─ TrainSeatMap.tsx
 │   └─ HotelFloorMap.tsx
 ├─ overlay/
 │   └─ RouteOverlay.tsx
 ├─ panels/
 │   ├─ ToolLogPanel.tsx
 │   └─ SelectionPanel.tsx
 ├─ confirmation/
 │   └─ ConfirmationDialog.tsx
 ├─ accessibility/
 │   └─ StatusAnnouncer.tsx
 └─ capability/
     └─ CapabilityBanner.tsx
```

### SeatMap

- layout 렌더링
- 키보드 탐색
- ARIA label
- 선택 표시
- Tool 참조 대상 highlight

### RouteOverlay

`Domain RoutePlan`의 segments를 시각적으로 표현한다. Bridge의 Agent-facing route와 동일한 RoutePlan에서 파생되며, UI가 경로를 다시 계산하지 않는다.

### ToolLogPanel

심사자와 동반 사용자를 위한 시각적 observability다.

Tool log 전체를 screen reader live region으로 읽게 하지는 않는다.

### SelectionPanel

현재 선택, 금액, confirmation 상태를 항상 보여준다.

### StatusAnnouncer

스크린리더에 필요한 **상태 변화만** concise하게 알린다.

기본 구현은 `role="status"`, `aria-live="polite"`, `aria-atomic="true"`를 사용하고 Tool 실행 로그 전체를 live region으로 읽지 않는다.

예:

```text
12열 A 선택됨. 현재 1석, 47,000원.
```

```text
확정 대기 중입니다.
```

단, Agent가 이미 같은 상태 변화를 대화로 읽어주는 환경에서는 이중 음성 출력이 생길 수 있다. 상태 변경 이벤트에 source를 남겨 D4에서 정책을 검증한다.

```ts
type StateChangeSource = "human-ui" | "agent-tool";
```

권장 정책:

- `human-ui` 변경: StatusAnnouncer가 즉시 알림
- `agent-tool` 변경: 화면 상태는 갱신하되, Agent 응답과 중복되는 live announcement는 D4 결과에 따라 축소/비활성

### ConfirmationDialog

- `role="dialog"` + `aria-modal="true"`
- 열릴 때 첫 확인 가능한 컨트롤로 focus 이동
- focus trap
- 명확한 confirm / cancel
- Escape 취소
- 닫힐 때 가능한 경우 이전 page focus 복원
- 사용자 직접 action만 confirmed

**통합 게이트:** Agent가 `a11y.confirm`을 호출했을 때 ChatGPT Desktop built-in browser에서 실제 키보드/스크린리더 focus가 dialog로 접근 가능한지 D2/D4에서 반드시 검증한다. 자동 focus 이동이 target runtime에서 안정적으로 동작하지 않으면 blocking 방식만 고집하지 않고 §13.3 pending fallback을 사용한다.

---

## 18. Train / Hotel 재사용

공유:

```text
SpatialDomain
QueryCriteria
LayoutSummary
Route
Application use cases
Bridge contracts
Tool names
Tool schema
SelectionState
WebMCP Adapter
```

도메인별:

| Train | Hotel |
| --- | --- |
| Seat rendering | Room rendering |
| seat attributes | room attributes |
| entrance/restroom/luggage | elevator/stairs/ice_machine |

**동일 UI가 아니라 동일 Agent Contract를 증명하는 것이 목표다.**

---

## 19. Error Contract

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
```

`WEBMCP_UNAVAILABLE`은 ToolError가 아니다.

WebMCP가 unavailable하면 Tool 자체를 호출할 수 없으므로 Bootstrap capability 상태로 처리한다.

Bridge error message는:

- 짧고
- 그대로 읽어도 이해되고
- 다음 행동을 방해하지 않아야 한다.

내부 stack trace는 노출하지 않는다.

---

## 20. Bridge Contract Eval

Domain unit test만 통과해서는 **실제 Bridge가 사용자 불편을 해결하는지 증명되지 않는다.**

Agent가 contract를 제대로 이해하는지를 별도 eval로 검증한다.

### EVAL-01 탐색

사용자:

```text
4호차에 순방향 창측이면서 출입문 가까운 자리 있어?
```

기대:

```text
a11y.query({
  near: "entrance",
  train: {
    direction: "forward",
    side: "window"
  }
})
```

검증:

- 적절한 Tool 선택
- 조건 누락 없음
- 5개 이하 결과
- appliedCriteria 정확

### EVAL-02 대화형 참조

직전 query:

```text
1. 4-12A
2. 4-14C
3. 4-9A
```

사용자:

```text
두 번째 거 화장실까지 얼마나 걸려?
```

기대:

```text
a11y.get_route({
  from: "4-14C",
  to: "restroom"
})
```

Wayfinder가 `"두 번째 거"`를 자연어로 해석하지 않는다.

**stable result order와 ref를 제공하여 외부 Agent가 해소할 수 있게 한다.**

### EVAL-03 비교

사용자:

```text
그거랑 12A 비교해줘
```

기대:

```text
a11y.compare({
  refs: ["4-14C", "4-12A"]
})
```

### EVAL-04 상태 복구

사용자:

```text
내가 지금 뭐 골랐지?
```

기대:

```text
a11y.get_selection()
```

화면을 추측하거나 이전 대화를 근거로 답하지 않고 Tool state를 확인해야 한다.

### EVAL-05 확정 통제

사용자:

```text
확정해줘
```

기대:

```text
a11y.confirm()
```

검증:

- Agent 호출만으로 confirmed가 되지 않음
- 사용자 확인 UI 노출
- 최종 confirmed/cancelled 상태가 Agent에 관찰됨

---

## 21. Testing Architecture

### 21.1 Domain Unit Test

#### Route

§7.4 6개 케이스.

#### Query

- near
- maxSteps
- priceMax
- train 조건
- availableOnly
- Q1/Q2/Q3 violation
- appliedCriteria

#### Compare

2~3개 후보에 동일 비교축.

### 21.2 Application State Test

```text
select
→ selection update
→ history 생성
→ highlight update

undo
→ snapshot restore

confirm pending
→ select / undo 차단

cancel
→ draft

confirm
→ confirmed
```

### 21.3 Bridge Contract Test

Domain stub을 두고 Bridge만 검증한다.

```text
Domain returns 20 candidates
→ Bridge returns 5 + more=15
```

```text
Domain error INVALID_CRITERIA
→ ToolResult ok:false
```

```text
select success
→ state가 항상 포함
```

```text
query
→ appliedCriteria 보존
```

Bridge가 DOM이나 WebMCP API 없이 테스트 가능해야 한다.

### 21.4 WebMCP Adapter Test

- 9개 tool 등록
- tool name `a11y.*`
- input schema parsing
- readOnlyHint
- registration AbortController
- `ToolResult` 직접 반환
- capability guard
- Chrome per-call cancellation compatibility

### 21.5 Agent Tool-selection Eval

§20의 prompt set을 WebMCP inspector / 실제 Browser Agent에서 반복 실행한다.

검증 축:

- 올바른 Tool 선택
- parameter extraction
- 불필요한 autonomous action 여부
- ref 보존
- query → route → compare 흐름
- confirm 전 human gate

### 21.6 Accessibility E2E

- keyboard-only seat navigation
- screen reader label
- StatusAnnouncer
- Agent를 통한 query → route → compare → select → confirm
- Agent가 confirm을 호출했을 때 ConfirmationDialog로 키보드/스크린리더 focus 접근 가능
- confirm/cancel 후 focus 및 상태가 정상 복원
- Agent 응답과 StatusAnnouncer 사이에 과도한 중복 음성이 없는지 확인
- 모니터를 끈 상태에서 confirmation까지 완료
- 모든 결과가 음성으로 지나치게 길지 않은지 확인

---

## 22. 프로젝트 구조

```text
src/
├─ app/
│   ├─ App.tsx
│   └─ bootstrap.ts
│
├─ domain/
│   ├─ spatial/
│   │   ├─ types.ts
│   │   ├─ calibration.ts
│   │   ├─ route-engine.ts
│   │   ├─ query-engine.ts
│   │   └─ comparison-engine.ts
│   ├─ train/
│   │   ├─ train-domain.ts
│   │   └─ train-types.ts
│   └─ hotel/
│       ├─ hotel-domain.ts
│       └─ hotel-types.ts
│
├─ application/
│   ├─ get-layout.ts
│   ├─ query.ts
│   ├─ describe.ts
│   ├─ get-route.ts
│   ├─ compare.ts
│   ├─ select.ts
│   ├─ get-selection.ts
│   ├─ undo.ts
│   └─ confirm.ts
│
├─ bridge/
│   ├─ tool-catalog.ts
│   ├─ contracts.ts
│   ├─ response-presenter.ts
│   ├─ state-projector.ts
│   ├─ error-mapper.ts
│   └─ handlers/          # MVP에서는 handlers.ts 하나로 합쳐도 됨
│
├─ adapters/
│   └─ webmcp/
│       ├─ model-context.ts
│       ├─ register-tools.ts
│       ├─ execution-context.ts
│       ├─ capability.ts
│       └─ schemas/
│
├─ state/
│   ├─ app-store.ts
│   ├─ commands.ts
│   └─ selectors.ts
│
├─ ui/
│   ├─ layout/
│   ├─ overlay/
│   ├─ panels/
│   ├─ confirmation/
│   ├─ accessibility/
│   └─ capability/
│
├─ data/
│   ├─ train-4.json
│   └─ hotel.json
│
└─ tests/
    ├─ domain/
    ├─ application/
    ├─ bridge/
    ├─ webmcp/
    ├─ agent-evals/
    └─ accessibility/
```

> **MVP 구현 메모:** Bridge는 논리적 architecture boundary다. 9개 handler를 반드시 9개 파일로 나눌 필요는 없다. `contracts.ts + presenter.ts + handlers.ts` 정도로 시작하고 파일이 커질 때만 분리한다.

---

## 23. 구현 순서

### Phase 1 — Spatial Truth

```text
Train fixture
→ Spatial types
→ STEP_CALIBRATION
→ Route Engine (same-row direct / cross-row aisle)
→ 6 Route tests
```

완료 기준:

> UI·WebMCP·Agent 없이 공간 경로가 정확하다.

### Phase 2 — Domain Use Cases

```text
query
describe
compare
select
getSelection
undo
confirm state
```

완료 기준:

> Application API만으로 메인 좌석 선택 흐름을 실행할 수 있다.

### Phase 3 — Spatial Accessibility Bridge

```text
a11y.* contracts
→ structured Agent DTO + response shaping
→ state projection
→ error mapping
→ Bridge contract tests
```

완료 기준:

> WebMCP 없이 Bridge handler를 직접 호출해 9개 contract가 검증된다.

### Phase 4 — WebMCP Adapter

```text
document.modelContext
→ 9 tools register
→ annotations
→ capability
→ lifecycle
→ execution compatibility
```

완료 기준:

> WebMCP-enabled Chrome에서 9개 Tool을 수동 호출할 수 있다.

### Phase 5 — UI

```text
SeatMap
→ highlight
→ RouteOverlay
→ SelectionPanel
→ StatusAnnouncer
→ ConfirmationDialog
```

### Phase 6 — Agent Eval / Blind Flow

```text
natural language
→ Agent tool selection
→ Bridge
→ state
→ human confirmation
```

§20 시나리오 통과.

### Phase 7 — Hotel Contract Proof 또는 E3

Hotel 구현을 추가할 때:

```text
수정 허용:
data/
domain/hotel/
ui/layout/

수정이 최소여야 함:
bridge/
application/
adapters/webmcp/
```

Bridge contract나 WebMCP tool을 대폭 고쳐야 하면 abstraction이 잘못된 신호다.

---

## 24. Architecture Decision Records

**ADR-001 — Domain Core는 Agent/WebMCP/React를 모른다.**  
공간 사실은 deterministic하게 계산한다.

**ADR-002 — Wayfinder는 내부 AI Agent가 아니라 Spatial Accessibility Bridge다.**  
자연어 해석과 orchestration은 외부 Browser Agent가 담당한다.

**ADR-003 — `a11y.*`는 public accessibility contract다.**  
DOM 구조나 UI 컴포넌트 이름을 노출하지 않는다.

**ADR-004 — WebMCP Adapter와 Accessibility Bridge를 구분한다.**  
Adapter는 플랫폼 binding, Bridge는 접근성 의미 계약을 담당한다.

**ADR-005 — Route는 structured spatial truth다.**  
Agent 설명·UI overlay·test가 동일 `Route.segments`에서 파생된다.

**ADR-006 — Voice bandwidth는 Bridge의 책임이다.**  
리스트 최대 5, `more`, `hint`, concise line을 적용한다.

**ADR-007 — 상태는 화면과 Agent 양쪽에 동일하게 투영한다.**  
조작 Tool은 전체 SelectionState를 반환한다.

**ADR-008 — 지원하지 않는 조건을 silent-ignore하지 않는다.**  
잘못 적용된 조건으로 사용자가 판단하지 않게 한다.

**ADR-009 — 최종 확정은 사람만 할 수 있다.**  
blocking/pending은 구현 전략이며 human confirmation은 불변 조건이다.

**ADR-010 — WebMCP API 변화는 Adapter에 격리한다.**  
현재 Draft의 execution `signal`을 사용하되 구현체 버전 차이가 Domain/Application/Bridge contract에 전파되지 않게 한다.

**ADR-011 — Tool 결과는 WebMCP execute의 JSON-serializable value로 직접 반환한다.**  
MCP server용 `{content,isError}` envelope에 종속되지 않는다. 현재 WebMCP에 `outputSchema`가 없으므로 TS/contract test로 출력 계약을 보증한다.

**ADR-012 — Agent 품질은 별도 eval로 검증한다.**  
Domain unit test와 Agent tool-selection correctness는 다른 문제다.

**ADR-013 — UI와 Agent는 하나의 structured spatial truth를 공유한다.**  
Bridge가 화면을 OCR/DOM scraping해 의미를 추론하지 않는다. 같은 fixture/model에서 Human UI와 Agent DTO를 각각 projection한다.

**ADR-014 — Domain은 fact를, Bridge는 presentation을 만든다.**  
Query candidate의 구조화 속성은 Domain이 계산하고 concise `line`, `more`, `hint`는 Bridge Presenter가 만든다.

**ADR-015 — 같은 row와 다른 row의 이동 규칙을 구분한다.**  
같은 row는 직접 횡이동, 다른 row는 aisle 경유로 계산하여 aisle 강제 우회에 의한 과대 계산을 막는다.

---

## 25. 의도적으로 하지 않을 것

- Wayfinder 내부 LLM
- generic `a11y.ask`
- 자동 좌석 추천/랭킹 Agent
- 사용자를 대신한 autonomous confirm
- DOM scraping
- vision 기반 좌석 구조 추정
- 서버 / DB / 인증 / 실제 결제
- 범용 graph/pathfinding
- 범용 geometry engine
- 과도한 event sourcing
- iframe / cross-origin tool exposure
- 다중 호차 / 다층 이동
- 로케일 다국어화

---

## 26. Bridge 성공 기준

Wayfinder가 Spatial Accessibility Bridge 역할을 충분히 수행했다고 판단하려면 아래를 모두 만족해야 한다.

### 공간 의미

- [ ] 사용자가 화면을 보지 않고 전체 layout의 주요 기준점을 알 수 있다.
- [ ] 좌석→출입문/화장실 경로를 구조화된 Route로 얻을 수 있다.
- [ ] 후보 간 공간적 차이를 비교할 수 있다.

### Agent contract

- [ ] Agent가 DOM을 추측하지 않고 `a11y.*`만으로 핵심 시나리오를 수행한다.
- [ ] query 결과는 5개 이하이고 `more`/`hint`가 있다.
- [ ] candidate는 `line`뿐 아니라 가격/거리/방향/side 등 구조화 fact를 제공한다.
- [ ] 모든 대상에 stable ref가 있다.
- [ ] 모든 ToolResult에 현재 `domain`/`layoutId` context가 있다.
- [ ] 실제 적용 query 조건이 **기본값까지 normalize되어** 반환된다.
- [ ] 조작 후 state가 반환된다.

### 사용자 통제

- [ ] 현재 선택을 언제든 다시 확인할 수 있다.
- [ ] undo가 가능하다.
- [ ] Agent 단독으로 confirmed가 될 수 없다.
- [ ] 사용자 확인 이후 최종 상태를 Agent가 관찰할 수 있다.

### 접근성

- [ ] WebMCP가 없어도 keyboard/ARIA UI가 동작한다.
- [ ] screen reader 사용 시 상태 변화가 concise하게 전달된다.
- [ ] Agent 호출로 열린 ConfirmationDialog에 키보드/스크린리더 focus로 접근할 수 있다.
- [ ] Agent 응답과 StatusAnnouncer가 같은 내용을 과도하게 중복해서 읽지 않는다.
- [ ] Tool log 때문에 불필요한 음성 출력이 발생하지 않는다.
- [ ] 모니터 없이 query → route → compare → select → confirm 흐름을 완료할 수 있다.

### Agent 품질

- [ ] `"두 번째 거"`를 직전 결과의 stable ref로 올바르게 연결한다.
- [ ] `"지금 뭐 골랐지?"`에 대화 기억이 아니라 `get_selection`을 사용한다.
- [ ] `"확정"` 요청에 human confirmation gate를 거친다.
- [ ] Agent가 사용자를 대신해 임의의 최종 선택을 하지 않는다.

---

## 27. 최종 권장 구조

```text
Screen Reader User
        ↕
External Browser Agent
        ↕ natural language / tool call
WebMCP Adapter
        ↓
Spatial Accessibility Bridge
        ↓
Application
        ↓
Domain Core
        ↕
      App Store
        ↑
    React UI
```

이 구조의 핵심은 WebMCP 자체가 아니다.

WebMCP는 Agent와 사이트를 연결하는 transport다.

Wayfinder의 차별점은 그 transport 위에 다음을 안정적인 계약으로 제공한다는 데 있다.

```text
Structured Spatial Model
          ↙       ↘
   Visual UI   Deterministic Spatial Domain
                     ↓
          Accessible Semantic Contract
          ↓
External Agent
          ↓
Screen Reader User
```

> **Wayfinder가 브릿지하는 것은 “Agent와 DOM”이 아니라, “시각 UI와 동일한 공간 사실을 사용하는 접근 가능한 의미 계약과 사용자의 대화 인터페이스”다.**

이 경계를 유지하면 별도의 내부 AI Agent 없이도 시각장애 사용자의 좌석 탐색·경로 이해·비교·상태 확인·최종 통제라는 핵심 문제를 WebMCP로 충분히 해결할 수 있다.
