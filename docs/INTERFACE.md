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
type ToolResult<T> = {
  ok: boolean;
  data?: T;
  state?: SelectionState;   // 조작 함수는 항상 포함
  hint?: string;
  error?: { code: ToolErrorCode; message: string };  // message는 사용자에게 그대로 읽어줘도 되는 한 문장
};
```

`ok === false`일 때 `error.message`를 그대로 화면에 띄우면 됩니다. 별도 번역이 필요 없습니다.

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
| `confirmationStatus` | `"draft"` \| `"confirmation_pending"` \| `"confirmed"` |
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
car6.seats      // 각 좌석의 position: { x_m, y_m }
car6.aisleY_m   // 통로 중심선 y
car6.bounds_m   // { length, width } — 뷰박스 스케일 기준
```

x는 객차 앞(0)에서 뒤로, y는 폭 방향입니다. A·B가 y 작은 쪽, C·D가 큰 쪽입니다.

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
