# Ieum — 개발 실행 계획

**작성:** 2026-09-02 11:30 KST
**마감:** 2026-09-03 1:00 PM PDT = **2026-09-04(금) 05:00 KST**
**남은 시간:** 41.5시간 (수면 제외 실질 **~28시간**으로 보수 산정)
**선행 문서:** `docs/PRD v0.3.md` (무엇을·왜) · `docs/Architecture.md` (구조)
**이 문서:** 어떻게·언제·누가. 파일 단위 작업과 차단 체크포인트.

---

## 0. 먼저 확정할 것 (착수 전, 30분)

| # | 항목 | 상태 |
| --- | --- | --- |
| 0-1 | **Devpost 등록 + Join Hackathon** | ⬜ **등록 마감 = 제출 마감 동시각.** 미루면 제출 자체 불가 |
| 0-2 | **프로젝트명 통일** | ⬜ 현재 3개가 혼재: repo `Ieum` / PRD `Bearing` / Architecture `Wayfinder`. **`Ieum`으로 통일** 권장 — repo·org명이고 상표 충돌 없음 |
| 0-3 | Chrome 149+ 설치, `chrome://flags/#enable-webmcp-testing` 활성화 | ⬜ 없으면 개발 자체가 불가 |
| 0-4 | ChatGPT 데스크톱 앱 설치 + WebMCP 접근 권한 확인 | ⬜ 계정에 기능이 없으면 Chrome만으로 데모 |

> 0-2를 미루면 코드·문서·영상에 이름이 섞여 나간다. 지금 정한다.

---

## 1. 스택 (확정)

최소로 간다. 41시간에 학습 비용이 붙는 선택은 하지 않는다.

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 빌드 | **Vite** | TS 번들 + dev 서버 + `build`. 의존성 1개 |
| 언어 | **TypeScript** (strict) | — |
| UI | **vanilla DOM** | 좌석 그리드 + 패널 3개. React는 이 규모에서 코드가 더 늘어난다 |
| 테스트 | **`node --test`** | Node 24가 `.ts`를 그대로 실행. 빌드·프레임워크 0 |
| 배포 | **Netlify drop** 또는 Vercel | `vite build` → `dist/` 업로드 |

`localhost`는 secure context라 `document.modelContext`가 dev 서버에서도 동작한다.

---

## 2. 파일 계획

```
src/
├─ domain/                    ← 순수 TS. DOM·WebMCP 모름. 여기가 진짜 일
│  ├─ types.ts                Seat, Landmark, Route, QueryCriteria, RenderOptions
│  ├─ car-6.ts                fixture (~60석 + 랜드마크 5종). 무브랜드
│  ├─ route-engine.ts         ★ 핵심. 통로 투영 + 세그먼트 + countedFeatures
│  ├─ query-engine.ts         조건 필터 + Q1~Q3 검증
│  ├─ compare-engine.ts       축별 대조
│  └─ render.ts               RenderOptions → 사람이 읽는 문자열
├─ app/
│  └─ usecases.ts             9개 use case + ToolResult 조립 + 에러 매핑
│  └─ store.ts                AppState + undo 스냅샷
├─ webmcp/
│  ├─ capability.ts           secure context / modelContext 가드
│  └─ register.ts             registerTool × 9 + toWire()
├─ ui/
│  ├─ seat-grid.ts            role="grid" + aria-label + 키보드
│  ├─ panels.ts               툴 로그 / 선택 / capability 배너
│  └─ confirm-dialog.ts       aria-modal + 포커스 이동
└─ main.ts                    부트스트랩

tests/
├─ route.test.ts              7케이스 (PRD §9.6)
├─ query.test.ts              조건 조합 + Q1~Q3 에러
└─ render.test.ts             같은 Route → units 3종

public/smoke.html             WebMCP 스모크 테스트 (체크포인트 1용)
```

---

## 3. 일정과 체크포인트

시각은 KST. **체크포인트는 통과 못 하면 다음으로 못 넘어간다.**

### Phase 0 — 9/2 (수) 11:30~12:00 · 30분
- §0의 0-1~0-4 전부

### Phase 1 — 9/2 12:00~16:00 · 4시간
| 작업 | 산출물 |
| --- | --- |
| `public/smoke.html` — 툴 1개 등록 + 결과를 화면에 출력 | 스모크 페이지 |
| Chrome 149 플래그 환경에서 실행 | — |
| 확인 항목: ① `document.modelContext` 존재 ② `registerTool(def,{signal})` 동작 ③ **점(`.`) 이름 실동작** ④ `execute`가 per-call signal 받는지 ⑤ 반환 shape | 확인 결과 기록 |
| `domain/types.ts` + `domain/car-6.ts` | 타입 + fixture |

> ### 🔴 체크포인트 1 — 9/2 **15:00**
> **Chrome에서 `a11y.get_route` 이름의 툴 1개가 실제로 등록되고 호출된다.**
> 실패 시 여기서 멈추고 원인부터 판단한다. 다른 작업을 먼저 진행하지 않는다.
> 점 이름이 거부되면 즉시 `a11y_*`로 전환하고 PRD §7.1·§14.2 표기를 함께 수정.

### Phase 2 — 9/2 16:00~22:00 · 6시간 (★ 최대 배분)
| 작업 | 검증 |
| --- | --- |
| `route-engine.ts` — 좌표 resolve → 통로 투영 → 세그먼트 생성 → countedFeatures → landmarks | — |
| `tests/route.test.ts` 7케이스 (PRD §9.6) | `npm test` 전부 통과 |
| `render.ts` — units(m/ft/steps) × directionStyle(relative/clock/cardinal) | `render.test.ts`: 같은 Route, 다른 문자열 |

> ### 🔴 체크포인트 2 — 9/2 **22:00**
> **`npm test` 전부 통과.** 특히 `6-12A → 6-12D`(같은 행, 통로 건넘)가 0이 아닐 것.
> 미달 시 Phase 3의 `compare`를 잘라 시간을 확보한다.

### Phase 3 — 9/3 (목) 09:00~13:00 · 4시간
| 작업 | 검증 |
| --- | --- |
| `query-engine.ts` + Q1~Q3 검증 | `query.test.ts` |
| `compare-engine.ts` | — |
| `app/store.ts` — AppState + undo 스냅샷 | — |
| `app/usecases.ts` — 9개 + `ToolResult` + 에러 매핑 | — |

### Phase 4 — 9/3 13:00~16:00 · 3시간
| 작업 | 검증 |
| --- | --- |
| `webmcp/capability.ts` + `webmcp/register.ts` — 9종 등록 | Chrome에서 9종 전부 호출 |
| blocking `confirm` (120초 timeout + abort) | 대기 → 클릭 → confirmed |

### Phase 5 — 9/3 16:00~20:00 · 4시간
| 작업 | 검증 |
| --- | --- |
| `ui/seat-grid.ts` — `role="grid"`, `aria-label`, 화살표 키 이동 | **에이전트 없이 키보드만으로 완주** |
| `ui/panels.ts` — 툴 로그 / 선택 / capability 배너 | 화면에서 툴 실행이 보임 |
| `ui/confirm-dialog.ts` | 포커스 이동 + `aria-modal` |
| `vite build` → 배포 | 공개 HTTPS URL |

> ### 🔴 체크포인트 3 — 9/3 **20:00**
> **배포된 URL을 ChatGPT 인앱 브라우저로 열어 대화로 query→route→select→confirm 완주.**
> 미달 시 Phase 6을 줄이고 여기에 시간을 쓴다. 이게 안 되면 제출물이 성립하지 않는다.

### Phase 6 — 9/3 20:00~23:00 · 3시간
| 작업 | 검증 |
| --- | --- |
| **모니터 끄고 완주 테스트** | confirm까지 도달 |
| 발견된 friction 수정 — 참조 해소("두 번째 거"), 문구, 반환 크기 | — |
| `Before` 목업 페이지 (표 기반 좌석표) — 영상용 | 스크린리더로 읽어봤을 때 실패가 드러남 |

### Phase 7 — 9/3 23:00~9/4 04:00 · 5시간
| 작업 | 검증 |
| --- | --- |
| 영상 녹화 (3분 미만, **영어 나레이션**, BGM 없음) | — |
| YouTube **공개** 업로드 | URL |
| `README.md` **영어** — 실행 지침, WebMCP 테스트법, 데이터 고지, 호텔 매핑 표 | — |
| `LICENSE` (MIT) | GitHub About에 "MIT" 표시 확인 |
| Devpost 제출 — 텍스트 4항목 (PRD §14.2 초안 사용, **영어**) | 확인 메일 |

> ### 🔴 체크포인트 4 — 9/4 **04:00**
> **제출 완료.** 마감 1시간 전. 버퍼를 쓰지 말고 끝낸다.

---

## 4. 자르는 순서 (미리 확정)

시간이 부족하면 **위에서부터** 자른다. 판단이 필요한 시점에 판단하지 않기 위해 미리 정해 둔다.

1. `docs/SPEC.md` (규약 명세 문서) → README에 호텔 매핑 표만 축약
2. 경로 SVG 화살표 오버레이 → 경로상 좌석 셀 하이라이트로 대체
3. `a11y.compare` 툴 → 8종으로. PRD §13.1·§14.2의 "9종" 표기도 함께 수정
4. `directionStyle`의 `clock`/`cardinal` → `relative`만. **`units`는 남긴다** (같은 데이터 다른 표현이 Creativity 논거의 핵심이라 최후에 자른다)

### 절대 자르지 않는 것

- **Phase 6의 눈 감고 완주 테스트** — 여기서 나온 발견이 제출 글의 서사이고 Execution 점수를 좌우한다
- **UI6 (에이전트 없이 키보드로 동작)** — 깨지면 "AI 없으면 못 쓰는 접근성 앱"이 되어 논지가 무너진다
- **Phase 7 전체** — 규칙상 필수. 누락 시 실격
- **`units:"steps"`의 `unitsNote` 근사 경고** — 우리가 O&M 문헌을 읽었다는 증거

---

## 5. 실격 방지 체크리스트 (제출 직전 재확인)

| ⬜ | 항목 | 근거 |
| --- | --- | --- |
| ⬜ | Devpost 등록 완료 | 등록 마감 = 제출 마감 |
| ⬜ | Live URL이 ChatGPT 인앱 브라우저 **와** Chrome 149 양쪽에서 동작 | 심사위원이 둘 중 하나로 접속 |
| ⬜ | 저장소 **공개** | — |
| ⬜ | 루트 `LICENSE`(MIT)가 GitHub About에 **표시됨** | 파일명·형식 틀리면 GitHub가 인식 못 함 |
| ⬜ | 저장소에 `document.modelContext.registerTool({...})` 코드 존재 | 규칙 명시 |
| ⬜ | 영상 3분 미만 / **공개** YouTube / **오디오 포함** | — |
| ⬜ | 영상에 **타사 상표·UI·BGM 없음** — Before 목업은 자체 제작 | 규칙 §8 |
| ⬜ | 코드·데이터·UI·문서에 운영사명(Amtrak/Acela 등) 없음 | 규칙 §8 |
| ⬜ | 제출물 전부 **영어** — 설명·영상·README·UI | 규칙 언어 요건 |
| ⬜ | 텍스트 설명 4항목 전부 | 규칙 명시 |

---

## 6. 지금 상태

- ✅ 브랜치 `feat/webmcp-core`
- ✅ 스캐폴딩 (`package.json`, `tsconfig.json`, `.gitignore`, 디렉터리)
- ✅ Node 24가 `.ts` 직접 실행 확인 — 테스트에 빌드 도구 불필요
- ⬜ **다음: `public/smoke.html` → 체크포인트 1**

## 7. 알려진 환경 이슈

- 이 셸에서 `ls`가 멈춘다(별칭 추정). 파일 목록은 `find` 또는 글롭을 쓸 것
- `~`(홈 디렉터리)가 git 저장소로 초기화돼 있고 추적 파일 0개다. `Ieum` 저장소와 커밋 해시가 겹친다. 홈에서 `git add -A`를 실행하지 말 것
