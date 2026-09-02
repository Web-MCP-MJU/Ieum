# Web MCP 대회 프로젝트 문서 검토

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
- [ ] Architecture의 명칭·도메인·공간·Query·Landmark 계약을 교정한다.
- [ ] WebMCP·상태·확정·UI 계약을 PRD 기준으로 교정한다.
- [ ] 테스트·구조·구현 순서·ADR·성공 기준을 새 계약과 동기화한다.
- [ ] 구형 토큰 제거와 필수 토큰 존재를 자동 검색으로 검증한다.
- [ ] 독립 리뷰 결과를 반영하고 전체 diff를 검증한다.

### Review

- 구현 완료 후 변경 요약과 검증 결과를 기록한다.
