# Web MCP 대회 프로젝트 문서 검토

## Bearing 실제 동작 데모 웹사이트

- [x] 저장소, PRD, Architecture, 최근 커밋을 확인한다.
- [x] 실제 동작형과 프로토타입 중 실제 동작형 범위를 확정한다.
- [x] 단일 제품 화면, 소개+앱, 분리형 하네스 접근을 비교하고 단일 제품 화면을 선택한다.
- [x] 최신 Google Labs `DESIGN.md` 공식 포맷과 규칙을 확인한다.
- [x] 사용자에게 기능·시각 설계를 제시하고 승인을 받는다.
- [x] `feat/bearing-demo` 격리 작업공간을 만든다.
- [x] root `DESIGN.md`와 웹사이트 구현 설계서를 작성한다.
- [x] 디자인 토큰, 대비, 포맷 및 설계서 일관성을 자체 검토한다.
- [x] 사용자가 작성된 설계서를 검토하고 구현 계획 진행을 승인한다.
- [x] canonical `RailFixture` 타입·JSON Schema·무결성 검증 계약을 추가한다.
- [x] confirmation의 두 원자적 전환과 observable tool-call lifecycle을 명시한다.
- [x] 9개 WebMCP 등록 실패의 전체 rollback 계약과 테스트를 명시한다.
- [x] 좌석 그리드 키보드 동작과 겹치는 시각 상태의 우선순위를 확정한다.
- [x] 반응형 breakpoint, 모바일 comparison, 초기 화면 상태의 모호성을 제거한다.
- [x] 필수 컴포넌트·상태·forced-colors 디자인 토큰과 접근성 검증을 보강한다.
- [x] 고정 toolchain, 빌드/배포 산출물, 보안 헤더, 증거 manifest 및 자산 검증을 명시한다.
- [x] `quietCar` breaking contract의 Architecture/schema 버전을 v0.3.3으로 올린다.
- [x] 공식 DESIGN.md 린트·JSON Schema·문서 구조·독립 재검토를 통과한다.
- [x] 승인된 설계에서 상세 구현 계획을 작성한다.

## Bearing 웹사이트 구현

- [x] Task 1: pinned Sites scaffold와 검증 harness를 구성한다.
- [x] Task 2: canonical rail fixture와 교차 필드 validator를 구현한다.
- [ ] Task 3: query/describe/compare/render 순수 도메인을 구현한다.
- [ ] Task 4: route/continuation 엔진을 구현한다.
- [ ] Task 5: Application state, undo, confirmation lifecycle을 구현한다.
- [ ] Task 6: atomic WebMCP 9-tool adapter를 구현한다.
- [ ] Task 7: 전체 접근 가능 working surface를 구현한다.
- [ ] Task 8: E2E, 자산, 빌드, runtime/deployment evidence를 완성한다.

### 구현 Review

- Task 1: Node 24 기반 Vinext/shadcn Site와 Vitest·TypeScript·Oxlint·build 검증 harness를 구성했다.
- Task 2: 60석/47 available synthetic rail fixture, strict Zod boundary, shared-ref·bounds·edge·reachability·continuation 검증, canonical seat ordering과 immutable shipped export를 구현했다.
- Task 2 교차 검토: `6-12A → 6-12B` 직접 이동 edge, 60석/필수 ref 회귀 검사, 성공형 exhaustive continuation, bearing/coordinate 일치 검사, adjacency/cache 기반 bootstrap 탐색을 보강했다.
- 현재 검증: unit/integration 13개, typecheck, lint가 모두 통과한다.

### 설계 교정 Review

- 계약: `RailFixture` v1 schema와 교차 필드 validator, 호출 lifecycle, confirmation open/terminal 전환, 9-position registration rollback을 구현 가능한 수준으로 고정했다.
- UI: 60개 gridcell의 정확한 키보드 규칙, unavailable 처리, 상태 합성 순서, 1216/760 breakpoint, 모바일 comparison/JSON wrapping을 확정했다.
- 디자인/접근성: 19 colors·30 components, control/log 상태 매핑, forced-colors, 200%/400% zoom, 320px reflow, text-spacing, font/icon/license 검증을 명시했다.
- 재현성: Node/npm 및 Sites 버전, clean-install 검증 명령, Vinext 산출물, 보안 헤더, 동일 출처 요청 인벤토리, runtime evidence manifest를 고정했다.
- 검증: 공식 `@google/design.md@0.2.0`은 errors 0/warnings 0, 두 Draft 2020-12 JSON Schema는 AJV compile 통과, Architecture §1–27·fence 균형·`git diff --check`를 확인했다.

## 기본 Git 제외 규칙

- [x] 저장소 구성과 기존 추적 파일을 확인한다.
- [x] 운영체제·에디터·환경변수·Node/빌드·로그·로컬 작업 상태를 `.gitignore`에 추가한다.
- [x] 이미 추적 중인 생성물을 인덱스에서 제외하고 규칙을 검증한다.

검증: 루트와 `docs/`의 `.DS_Store`는 로컬에 유지한 채 Git 추적에서 제거했고, 두 경로와 `.env`, `node_modules`, `dist`, 로컬 SDD 상태가 각각 기대한 규칙으로 무시되는지 확인한다.

- [x] `docs/PRD v0.3.md`에서 문제, 대상 사용자, 핵심 경험, 성공 기준을 추출한다.
- [x] `docs/Architecture.md`에서 시스템 구성, MCP의 역할, 데이터 흐름, 구현 범위를 추출한다.
- [x] 두 문서를 교차 검증해 일치점, 누락, 모호한 결정, 대회 제출물의 핵심을 정리한다.
- [x] 사용자에게 “무엇을 만들려는지”를 한 문장과 구체적인 사용자 흐름으로 설명한다.

## Review

- 제품 정의: 시각장애 사용자가 좌석맵의 공간 구조·관계·이동 경로를 외부 Browser Agent에 질문하고, 후보를 비교·선택·되돌린 뒤 직접 확정할 수 있게 하는 WebMCP 기반 Spatial Accessibility Bridge.
- 핵심 흐름: `get_layout → query → describe/get_route → compare → select/get_selection/undo → confirm`.
- WebMCP의 역할: DOM을 추측하거나 화면을 OCR하는 대신, UI와 동일한 structured spatial model을 `a11y.*` 9개 도구 계약으로 노출한다. 내부 LLM이나 별도 MCP 서버는 두지 않는다.
- MVP 범위: 무브랜드 가상 도시간 철도 객차 1량, 순수 TypeScript 공간 엔진, 브라우저 로컬 상태, 접근 가능한 UI, HTTPS 배포 및 대회 제출물. 실제 예약·결제·계정·스크래핑·호텔 구현은 제외한다.
- 문서 상태: 설계와 검증 계획이며 구현 완료 증거는 없다. Architecture의 성공 기준 체크박스도 미완료다.
- 우선 동기화 필요: PRD는 `Bearing`, 미터 원본/걸음 파생, 목록 최대 12개·`more` 삭제, WebMCP 반환 형식 재확인 상태다. Architecture는 `Wayfinder`, `STEP_CALIBRATION`, 최대 5개+`more`, plain object 직접 반환을 사용한다.

## Architecture v0.3.2 전면 교정

- [x] PRD v0.3을 기준 문서로 확정하고 동기화 설계를 승인받는다.
- [x] 공식 대회 규정과 현행 WebMCP 명세를 대조한다.
- [x] 일정·기능 축소 판단을 제외하고 규정·주제·명세 부합성 기준으로 동기화 설계를 개정한다.
- [x] 동기화 설계서를 작성하고 자체 검토한다.
- [x] 재검증에서 확인된 confirmation·query/compare·GTFS·추적성·규정 공백을 동기화 설계서에 반영한다.
- [x] 상세 구현 계획을 작성하고 자체 검토한다.
- [x] Architecture의 명칭·도메인·공간·Query·Landmark 계약을 교정한다.
- [x] WebMCP·상태·확정·UI 계약을 PRD 기준으로 교정한다.
- [x] 테스트·구조·구현 순서·ADR·성공 기준을 새 계약과 동기화한다.
- [x] 구형 토큰 제거와 필수 토큰 존재를 자동 검색으로 검증한다.
- [x] 독립 리뷰 결과를 반영하고 전체 diff를 검증한다.

### Review

- 변경 파일: `docs/Architecture.md`, `docs/contracts/bearing-output.schema.json`, 동기화 계획 및 이 작업 기록. `docs/PRD v0.3.md`는 변경하지 않았다.
- 기준 우선순위: 공식 대회 규정·현행 WebMCP/GTFS 명세(규정/API 사실) → PRD v0.3(제품 의도·전체 범위) → 구 Architecture(충돌하지 않는 구현 상세).
- 계약 결과: Bearing 명칭, 철도 MVP, 9개 `a11y.*` 도구, 미터 원본/파생 렌더링, Query 0/12/13+, Compare 2–4, 4-segment Route continuation, append-idempotent select, 1-step undo, same-call human confirmation, UI1–UI8, GTFS/호텔 portability, 대회 적격성·제출 증빙을 하나의 계약으로 동기화했다.
- 검증 결과: 1–27 섹션 순서, 40개 fence 균형, 9개 도구 계약/예시/annotation과 UI1–UI8 행 수, 모든 JSON 코드·9개 예시 JSON 문법, 출력 스키마 `$ref` 해소, obsolete/placeholder 검색, `git diff --check`, PRD 무변경을 확인했다. 도메인과 WebMCP/UI/규정 영역의 독립 재검토는 모두 PASS였다.
- 판정: 문서 계약 기준으로 구현 가능하고 대회 주제·필수 제출/적격성 규정에 부합한다. 다만 실제 ChatGPT/Chrome 호출, 120초 same-call confirmation, 접근성 실행 시험, 배포·참가자 개별 적격성·제출 완료는 구현 후 별도 증거가 필요한 상태이며 문서도 이를 완료로 주장하지 않는다.
