# Ieum — 엔진 ↔ UI 경계

UI 담당자와 엔진 담당자가 서로를 기다리지 않고 동시에 작업하기 위한 계약입니다.
이 문서의 시그니처가 바뀌면 PR에 반드시 명시합니다.

## 누가 무엇을 소유하나

| 소유 | 경로 | 비고 |
| --- | --- | --- |
| **엔진** | `src/domain/`, `src/app/`, `src/webmcp/`, `tests/` | DOM을 전혀 모릅니다. `document`, `window` 참조 금지 |
| **UI** | `src/ui/`, `index.html`, CSS | 좌표 계산·거리 계산 금지. 엔진 결과를 그리기만 합니다 |
| 공용 | `src/domain/types.ts` | 타입 정의. 여기만 양쪽이 함께 읽습니다 |

이 경계 덕분에 UI를 붙이지 않은 상태로 엔진 테스트가 통과하고, 엔진이 바뀌어도
UI는 같은 함수만 계속 호출하면 됩니다.

## UI가 호출하는 것

```ts
import { store } from "../app/store.ts";
import * as usecases from "../app/usecases.ts";
```

### 조회 (상태를 바꾸지 않음)

```ts
usecases.getLayout(opts?)                 // ToolResult<LayoutSummary>
usecases.query(criteria, opts?)           // ToolResult<{ items, appliedCriteria, totalMatched }>
usecases.describe({ ref }, opts?)         // ToolResult<Description>
usecases.getRoute({ from, to }, opts?)    // ToolResult<Route>
usecases.compare({ refs }, opts?)         // ToolResult<Comparison>
usecases.getSelection()                   // ToolResult<{ selected }>
```

### 조작 (상태를 바꿈)

```ts
usecases.select({ ref })                  // ToolResult<{ selectedRef }>
usecases.undo()                           // ToolResult<{ undone }>
usecases.confirm()                        // ToolResult<{ outcome }>  ← 사용자 클릭까지 대기
```

`opts`는 `RenderOptions`입니다: `{ units, stepLength_m, directionStyle, walkSpeedPercent }`.
전부 선택 사항이고, 생략하면 `feet` + `relative` + 100%입니다.

## 반환 형태

모든 함수가 같은 봉투를 씁니다.

```ts
// 조회: get_layout · query · describe · get_route · compare
type ReadResult<T>  = { ok: true; data: T } | { ok: false; error: DomainError; hint?: string };
// 조작: select · undo · confirm — 성공이든 실패든 state를 항상 포함합니다
type StateResult<T> =
  | { ok: true;  data: T; state: SelectionState }
  | { ok: false; state: SelectionState; error: DomainError; hint?: string };

type SelectionState = {
  selected: string[];
  selectedCount: number;    // selected에서 파생. 직접 쓰지 마세요
  priceTotal_usd: number;   // selected에서 파생
  undoable: boolean;        // 지금 undo가 성공할 수 있는가
  status: "draft" | "confirmation_pending" | "confirmed";
};
```

조작 함수가 **실패해도** `state`가 들어옵니다. 실패 후 화면을 다시 그리려고 `getSelection()`을
한 번 더 부를 필요가 없습니다.

`ok === false`일 때 `error.message`는 고정 템플릿이라 그대로 화면에 띄워도 안전합니다.
사용자가 입력한 ref를 되돌려주지 않으므로, 그대로 `textContent`에 넣으세요
(`innerHTML` 금지 — Architecture 16절).

## 상태 구독

```ts
store.subscribe((state: AppState) => {
  // 좌석 하이라이트, 툴 로그, 선택 패널을 다시 그립니다
});
```

`AppState`에서 UI가 읽는 필드:

| 필드 | 용도 |
| --- | --- |
| `selection: string[]` | 선택된 좌석 표시 |
| `highlightedRefs: string[]` | 툴이 방금 참조한 좌석 강조 |
| `activeRoute: Route \| null` | 경로 표시. **`segments`를 읽어서 그립니다.** 좌표 계산을 UI에서 하지 않습니다 |
| `confirmationStatus` | `"draft"` \| `"confirmation_pending"` \| `"confirmed"` — 이 셋뿐입니다 |
| `toolLog` | 최근 호출 목록 (툴 이름 + 인자) |

## 확인 다이얼로그

`usecases.confirm()`은 **사용자가 클릭할 때까지 반환하지 않습니다.**
UI는 `confirmationStatus === "confirmation_pending"`을 보고 다이얼로그를 띄우고,
사용자가 누르면 아래를 호출합니다.

```ts
store.resolveConfirmation("confirmed");   // 또는 "cancelled"
```

에이전트의 `confirm()` 호출만으로는 확정되지 않습니다. 이 순서가 계약입니다.

## 좌표계

`Route.segments[].length_m`는 미터입니다. 화면에 그릴 때는 좌석 좌표를 씁니다.

```ts
import { car6 } from "../domain/car-6.ts";
car6.seats      // 각 좌석의 position_m: { x, y }
car6.aisleY_m   // 통로 중심선 y
car6.bounds_m   // { length, width } — 뷰박스 스케일 기준
car6.axisLabels // 축 방향을 부르는 말. 렌더에 하드코딩하지 않습니다
```

x는 객차 앞(0)에서 뒤로, y는 폭 방향입니다. A·B가 y 작은 쪽, C·D가 큰 쪽입니다.
좌석 ref는 객차 번호를 포함합니다: `6-12A`.

세그먼트의 방향은 **각도**로 들어옵니다.

```ts
segment.bearing  // { frame: "egocentric" | "car_axis"; degrees: number }  0 이상 360 미만
```

`car_axis`는 0이 객차 앞쪽, `egocentric`은 0이 진행 직전 진행방향이고, 둘 다 시계방향으로
증가합니다. **"왼쪽"·"오른쪽"은 데이터에 없습니다** — 사람이 어느 쪽을 보고 있느냐에 따라
달라지므로 렌더 시점에만 나옵니다. UI가 화살표를 그릴 때는 `car_axis`로 환산해서 쓰세요.
경로 위 각 구간의 끝점 ref(`row_12_aisle`, `restroom_aisle`)도 `segments`에 들어 있어
좌표 계산 없이 선을 그을 수 있습니다.

## 접근성 요구사항 (UI 필수)

에이전트 없이도 완주 가능해야 합니다. 이게 깨지면 프로젝트 논지가 무너집니다.

- 좌석 그리드는 `role="grid"`, 각 셀에 위치와 속성이 담긴 `aria-label`
- 화살표 키로 좌석 간 이동
- 확인 다이얼로그는 `aria-modal` + 포커스 이동
- 툴 실행 결과는 `aria-live="polite"` 영역에 반영

## 아직 없는 것

`src/app/store.ts`와 `src/app/usecases.ts`는 PR #2에서 올라갑니다.
그 전까지 UI는 `src/domain/car-6.ts`(좌석 좌표)와 `src/domain/types.ts`(타입)만으로
그리드 렌더링과 키보드 이동을 먼저 만들 수 있습니다.
