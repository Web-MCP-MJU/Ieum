# Ieum — 엔진 ↔ UI 경계

UI 담당자와 엔진 담당자가 서로를 기다리지 않고 동시에 작업하기 위한 계약입니다.
이 문서의 시그니처가 바뀌면 PR에 반드시 명시합니다.

> **2026-09-03 갱신.** 리뷰 대응으로 app 계층을 다시 쓰면서 호출 형태가 바뀌었습니다.
> 인자를 감싸던 `opts`가 없어져 **전부 평면 인자 하나**가 되었고, `usecases`는
> 네임스페이스가 아니라 **이름 있는 export**입니다. 이전 판을 보고 쓰신 코드가 있다면
> 아래 "UI가 호출하는 것"부터 확인해 주세요.

## 누가 무엇을 소유하나

| 소유 | 경로 | 비고 |
| --- | --- | --- |
| **엔진** | `src/domain/`, `src/app/`, `src/webmcp/`, `tests/` | DOM을 전혀 모릅니다. `document`, `window` 참조 금지 |
| **UI** | `src/ui/`, `src/main.ts`, `index.html`, CSS | 좌표 계산·거리 계산 금지. 엔진 결과를 그리기만 합니다 |
| 공용 | `src/domain/types.ts` | 타입 정의. 여기만 양쪽이 함께 읽습니다 |

이 경계 덕분에 UI를 붙이지 않은 상태로 엔진 테스트가 통과하고, 엔진이 바뀌어도
UI는 같은 함수만 계속 호출하면 됩니다.

## UI가 호출하는 것

```ts
import { store, selectionState } from "../app/store.ts";
import { usecases } from "../app/usecases.ts";
```

`usecases`는 객체입니다. `import * as usecases`로 가져오면 함수가 한 겹 더 들어가서
`usecases.getLayout`이 `undefined`가 됩니다.

**인자는 전부 평면 하나입니다.** 렌더 옵션(`units`, `stepLength_m`, `directionStyle`,
`walkSpeedPercent`)을 같은 객체에 그냥 같이 넣습니다.

### 조회 (선택 상태를 바꾸지 않음)

```ts
usecases.getLayout({ units? })                          // ReadResult<LayoutSummary>
usecases.query({ near?, priceMax_usd?, needs?, rail?, units? })  // QueryResult<QueryData>
usecases.describe({ ref, units? })                      // ReadResult<Description>
usecases.getRoute({ from, to, units? })                 // ReadResult<Route>
usecases.compare({ refs, units? })                      // ReadResult<Comparison>
usecases.getSelection()                                 // StateSuccess<{ selected }> | ReadFailure
```

### 조작 (선택 상태를 바꿈)

```ts
usecases.select({ ref })                     // StateResult<{ selectedRef }>
usecases.undo()                              // StateResult<{ undone: string | null }>
usecases.confirm({ signal? })                // Promise<StateResult<{ outcome }>>  ← 사람이 누를 때까지 대기
```

`confirm()`만 비동기입니다. 나머지 여덟은 동기입니다.

**`store.select()`·`store.undo()`를 직접 부르지 마세요.** 그 둘은 저장소 내부용이라
판매 여부 검사·툴 로그·하이라이트를 건너뜁니다. 사람이 누른 버튼도 반드시
`usecases.select()`를 지나가야 에이전트가 부른 것과 같은 상태 전이가 일어납니다.

렌더 옵션을 생략하면 세션 기본값(`store.getState().prefs`)이 쓰이고, 그것도 없으면
`feet` + `relative` + 100%입니다.

## 반환 형태

```ts
// 조회: getLayout · describe · getRoute · compare
type ReadResult<T>  = { ok: true; data: T }
                    | { ok: false; error: DomainError; hint?: string };

// query만 성공에도 hint가 붙을 수 있습니다 (아래 참고)
type QueryResult<T> = { ok: true; data: T; hint?: string }
                    | { ok: false; error: DomainError; hint?: string };

// 조작: select · undo · confirm — 성공이든 실패든 state를 항상 포함합니다
type StateResult<T> = { ok: true;  data: T; state: SelectionState }
                    | { ok: false; state: SelectionState; error: DomainError; hint?: string };

type SelectionState = {
  selected: string[];
  selectedCount: number;    // selected에서 파생. 따로 세지 마세요
  priceTotal_usd: number;   // selected에서 파생
  undoable: boolean;        // 지금 undo가 성공할 수 있는가
  status: "draft" | "confirmation_pending" | "confirmed";
};
```

조작 함수가 **실패해도** `state`가 들어옵니다. 실패 후 화면을 다시 그리려고 `getSelection()`을
한 번 더 부를 필요가 없습니다.

`query`의 `hint`는 **결과가 0건이거나 13건 이상일 때만** 나옵니다. 1~12건에서는 나오지
않습니다. 매번 같은 문장을 읽어주지 않기 위한 계약이라, 있으면 보여주고 없으면 그 자리를
비워 두시면 됩니다.

`ok === false`일 때 `error.message`는 고정 템플릿이라 그대로 화면에 띄워도 안전합니다.
사용자가 입력한 ref를 되돌려주지 않으므로, 그대로 `textContent`에 넣으세요
(`innerHTML` 금지 — Architecture 16절).

## 상태 구독

```ts
const unsubscribe = store.subscribe((state: AppState) => {
  // 좌석 하이라이트, 툴 로그, 선택 패널을 다시 그립니다
});
```

`subscribe`는 해지 함수를 돌려줍니다. 컴포넌트를 버릴 때 부르세요.

`AppState`에서 UI가 읽는 필드:

| 필드 | 용도 |
| --- | --- |
| `selection: string[]` | 선택된 좌석 표시 |
| `highlightedRefs: string[]` | 툴이 방금 참조한 좌석 강조 (UI2) |
| `activeRoute: Route \| null` | 경로 표시. **`segments`를 읽어서 그립니다.** 좌표 계산을 UI에서 하지 않습니다 |
| `confirmationStatus` | `"draft"` \| `"confirmation_pending"` \| `"confirmed"` — 이 셋뿐입니다 |
| `toolLog: ToolLogEntry[]` | 최근 호출 10건 (UI4). 아래 표 참고 |
| `prefs: RenderOptions` | 세션 기본 렌더 옵션 (UI6의 환경설정 컨트롤이 여기를 씁니다) |
| `layoutId`, `domain` | 화면 제목용 |

`history`도 있지만 undo 내부용입니다. UI는 `SelectionState.undoable`만 보면 됩니다.

### `ToolLogEntry` (UI4)

```ts
{ name: string;                    // "a11y.query"
  args: Record<string, unknown>;   // 호출자가 실제로 준 인자
  appliedCriteria?: QueryCriteria; // query만. 기본값까지 채워진 것
  resultRefs: string[];            // 결과 ref, 결과 순서 그대로
  at: number }                     // Date.now()
```

`args`와 `appliedCriteria`가 **따로** 있는 이유는 UI4가 "요청한 조건"과 "실제로 적용된
기본값"을 구분해서 보여줘야 하기 때문입니다. 사용자가 `availableOnly`를 입력한 적이 없어도
`appliedCriteria.availableOnly`는 `true`로 찍힙니다. 그 차이가 보이는 게 요구사항입니다.

실패한 호출도 로그에는 남습니다(상태 전이는 일어나지 않습니다). 진단 가능해야 하기 때문입니다.

### 선택 상태 직접 계산하기

구독 콜백에서 `SelectionState`가 필요하면 셀렉터를 쓰세요. 저장하지 말고 매번 파생하세요.

```ts
import { car6 } from "../domain/car-6.ts";
const s = selectionState(store.getState(), car6);   // selectedCount, priceTotal_usd, undoable, status
```

### 환경설정 (UI6)

```ts
store.setPrefs({ units: "steps", directionStyle: "clock", walkSpeedPercent: 70 });
```

병합됩니다. 이후 호출에서 렌더 옵션을 생략하면 이 값이 쓰이고, 개별 호출에 넣은 값이
그 호출에 한해 우선합니다.

## 확인 다이얼로그 (UI7)

`usecases.confirm()`은 **사용자가 클릭할 때까지 반환하지 않습니다.**
UI는 `confirmationStatus === "confirmation_pending"`을 보고 다이얼로그를 띄우고,
사용자가 누르면 아래를 호출합니다.

```ts
store.resolveConfirmation("confirmed");   // 또는 "cancelled"
```

에이전트의 `confirm()` 호출만으로는 확정되지 않습니다. 이 순서가 계약입니다.

> **이 다이얼로그가 없으면 제품이 성립하지 않습니다.** `a11y.confirm`은 사람이 누르기
> 전까지 절대 `confirmed`가 되지 않고, 120초 뒤 `{ outcome: "timeout" }`만 냅니다.
> 즉 UI7이 붙기 전에는 에이전트 데모를 끝까지 돌릴 수 없습니다.

세 가지 종료가 있고 전부 `ok: true`입니다: `"confirmed"` · `"cancelled"` · `"timeout"`.
`cancelled`와 `timeout`은 확인 직전 상태로 되돌리고 `status`를 `"draft"`로 되돌립니다.
이때 사용자의 undo 히스토리는 **소비하지 않습니다** — 확인을 취소한 것은 사용자가 한 단계를
되돌린 것이 아니기 때문입니다.

`confirm({ signal })`에 `AbortSignal`을 주면 취소할 수 있는데, 이 경우 promise가
**reject**됩니다. 사람이 거절한 것과 구분하기 위해서입니다. UI에서는 보통 필요 없습니다.

## WebMCP capability 배너 (UI8)

```ts
import { detectCapability } from "../webmcp/capability.ts";
import { registerAllTools } from "../webmcp/register.ts";

const capability = detectCapability();
if (capability === "available") {
  await registerAllTools();   // 9개 도구 등록. 등록 수명용 AbortController를 돌려줍니다
}
```

`detectCapability()`가 돌려주는 값은 여섯 가지입니다.

| 값 | 뜻 |
| --- | --- |
| `"available"` | 등록 가능 |
| `"unsupported"` | `document.modelContext.registerTool`이 없음 (플래그 미활성 등) |
| `"insecure-context"` | HTTPS가 아님 |
| `"permission-denied"` | 등록이 `NotAllowedError`로 거부됨 |
| `"security-rejected"` | 등록이 `SecurityError`로 거부됨 |
| `"registration-failed"` | 그 외 등록 실패 |

**capability가 없어도 사람 컨트롤은 전부 동작해야 합니다.** 배너는 어느 범주인지 알려줄
뿐이고, 그리드·필터·선택·확인은 그대로 쓸 수 있어야 합니다. 이게 UI6과 UI8의 접점입니다.

이 값들은 `ToolErrorCode`가 **아닙니다.** 부트스트랩 진단이라 도구 오류와 섞지 마세요.

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

경로가 길면 `requiresContinuation: true`와 `checkpoint`가 붙습니다. 이때 `segments`는
`checkpoint`까지만이고, 이어지는 구간은 `{ from: checkpoint.ref, to: requestedTo }`로
다시 물어야 합니다. 오버레이는 `checkpoint`에서 끊어 그리면 됩니다.

## 접근성 요구사항 (UI 필수)

에이전트 없이도 완주 가능해야 합니다. 이게 깨지면 프로젝트 논지가 무너집니다.
전체 수용 기준은 `docs/Architecture.md` 17절의 **UI1~UI8** 표에 있습니다. 요약하면:

- 좌석 그리드는 `role="grid"`, 각 셀은 `role="gridcell"` + 위치·가격·판매 여부·방향이
  담긴 접근 가능한 이름. roving `tabindex`(활성 셀만 `0`), 화살표·Home·End 이동,
  Tab으로 그리드 진입·이탈. 선택은 `aria-selected`이고 포커스와 혼동하지 않습니다
- 확인 다이얼로그는 `role="dialog"` + `aria-modal="true"`, 바깥은 `inert`, Escape 취소,
  종료 시 포커스 복귀
- 상태 변화는 `role="status"` + `aria-live="polite"` 영역에 **요약만** 반영 (툴 로그 전체를
  읽어주지 않습니다)
- UI6이 요구하는 컨트롤: 조건 필터 폼, 경로 from/to, 비교 체크박스(2~4개 고유 ref),
  좌석 상세, 선택·선택 조회, undo, 환경설정(단위·보폭·방향 표기·보행속도), 확인

제출물의 UI 문자열은 **영어**여야 합니다 (대회 언어 요건). 이 문서와 코드 주석은 무관합니다.

## 아직 없는 것

`src/ui/`는 비어 있고 `index.html`과 `src/main.ts`도 아직 없습니다. 엔진 쪽은 전부 올라가
있으므로(`src/domain`, `src/app`, `src/webmcp`, 테스트 93개) 위 계약대로 바로 부르시면 됩니다.

## 빌드와 배포

- `npm run dev` → `http://localhost:5173`. 스모크 페이지는 `/smoke.html`입니다
  (`public/`이 아니라 저장소 루트에 있습니다 — `public/`은 변환 없이 그대로 배포에 복사되어
  `/src/*.ts` import가 프로덕션에서 404가 되기 때문입니다)
- `npm run build`는 **지금 실패합니다.** vite가 루트 `index.html`을 엔트리로 찾는데 아직
  없기 때문입니다(`Could not resolve entry module "index.html"`). 그 파일이 올라오면 해소됩니다
- 배포는 Netlify이고 `netlify.toml`이 이미 있습니다 (`npm run build` → `dist`)
