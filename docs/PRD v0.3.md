# PRD 초안

생성자: 이지호
생성 일시: 2026년 8월 29일 오후 5:47
카테고리: 전략 문서
최종 편집자:: 이지호
최종 업데이트 시간: 2026년 9월 1일

# PRD — 공간 선택 접근성을 위한 WebMCP 툴 규약

**프로젝트 코드명:** Bearing *(구 Wayfinder — §21 참조)*
**제출처:** OpenAI WebMCP Challenge (Devpost)
**문서 버전:** v0.3 — 대회 규칙 준수 + 미국 접근성 리서치 반영
**작성일:** 2026-09-01
**마감:** 2026-09-03 **1:00 PM PDT** = **2026-09-04(금) 05:00 KST — 착수 시점 기준 실질 ~36시간 (§15)**

---

## 0. 이 버전에서 바뀐 것 (v0.2.1 → v0.3)

리서치 3건(미국 법·표준 / O&M 구두 길안내 / 스크린리더 실사용)과 Devpost 공식 규칙 대조 결과, **핵심 전제 2개가 뒤집혔다.**

| # | v0.2.1 | v0.3 | 근거 |
| --- | --- | --- | --- |
| 1 | **걸음 수**를 1급 단위로 (`STEP_CALIBRATION`) | **미터로 저장, 출력 시 사용자 단위로 렌더** | 걸음 세기는 O&M에서 권장되지 않는 방법. 보폭은 같은 사람이 같은 보행 중에도 변함 (§5.2) |
| 2 | P2 "음성은 좁은 대역폭 → 3~5개로 자름" | **평평하고 길게, 재질의 최소화.** 깊이가 길이보다 비싸다 | 청각 메뉴에서 broad > deep. 시각장애 숙련자 디코딩 속도는 병목이 아님 (§5.3) |
| 3 | 심사 기준 5개(자체 추정) | **실제 4개**: WebMCP Leverage / Execution / Potential Impact / Creativity & Ambition | 규칙 원문 (§13) |
| 4 | 랜드마크 = 문자열 배열 | **O&M 정식 5분류 + 감각 채널 태그** | TSBVI / Giudice & Long (§8.3) |
| 5 | 방향 표기를 한국어 문자열로 고정 | **참조 프레임만 저장, 표기 스타일은 파라미터** (clock/relative/cardinal) | BlindSquare·Lazarillo가 독립 수렴 (§5.4) |
| 6 | Route 필드 자체 명명 | **GTFS-Pathways 필드명에 정렬** (`length_m`, `traversal_time_s`, `stair_count`) | 이미 Google Maps가 소비하는 채택된 표준 (§4.2) |
| 7 | 한국 기차 / 가상 데이터 | **미국 도시간 철도 일반형 가상 객차**, 49 CFR 38 · 14 CFR 382 근거 속성 | 대회가 미국 기반, 법적 근거 확보. **운영사 상표는 쓰지 않는다** (§14.5) |
| 8 | 5일 일정 (D1~D5) | **~36시간 3블록 + 사전 컷 리스트** | 마감 재확인 (§15) |
| 9 | 오픈소스 라이선스·영상 규격 언급 없음 | **제출 요건으로 명시** | 규칙 원문. 누락 시 실격 위험 (§14) |
| 10 | 프로젝트명 Wayfinder | **Bearing** | "Wayfindr" = ITU-T F.921 표준 보유 실존 조직. 혼동·상표 위험 (§21) |

### 검증 반영 (규칙·API·인용 대조)

초안 작성 후 공식 규칙·Chrome 문서·인용 원문과 대조해 아래를 수정했다. **앞의 4건은 실격 위험이었다.**

| # | 문제 | 수정 |
| --- | --- | --- |
| 11 | 🔴 `Amtrak`·`Acela` 상표가 데이터 모델·파일명·`layoutId`에 박혀 있었음 | 전부 무브랜드로. §14.5 가드레일 신설. **§21에서 Wayfindr를 이유로 개명해 놓고 정작 운영사 상표를 넣은 모순이었다** |
| 12 | 🔴 데모 영상 Before 구간이 **실제 예약 사이트 화면 녹화** | 자체 목업으로 교체. 규칙이 영상 내 타사 상표를 금지. 자체 목업이 오히려 "같은 데이터, 표 vs 툴" 직접 비교가 되어 논거가 깨끗하다 |
| 13 | 🔴 **모든 제출 자료가 영어여야 한다**는 규칙을 놓침 | §14.5에 명시. 설명·영상·README·UI 전부 영어 |
| 14 | 🔴 **Devpost 등록**이 일정에 없었음 (등록 마감 = 제출 마감 동시각) | Block A 순서 0으로 편입 |
| 15 | 🟠 심사 **Stage One pass/fail 관문**을 §13이 건너뜀 | §13.0 신설 |
| 16 | 🟡 WebAIM #10의 71.6%를 **브라우저 점유율로 오인용** (실제로는 "제목으로 탐색" 비율) | 두 통계를 분리. Chrome+Edge는 약 68% |
| 17 | 🔵 툴 이름의 점(`.`)을 불확실 항목으로 남겨둠 | **스펙상 제약 없음 확인** — `name`은 제약 없는 `DOMString`. 호스트 실동작만 확인하면 됨 |
| 18 | 🔵 "description은 정적이다"를 API 보장처럼 서술 | Chrome의 **권고**이자 우리의 **선택**으로 정정 |

---

## 1. 한 줄 정의

좌석·객실 선택 화면이 **공간 구조와 이동 경로를 에이전트가 질의할 수 있는 툴로 노출**하여, 시각장애 사용자가 요약을 받는 대신 **직접 탐색하고 캐묻고 판단**할 수 있게 하는 WebMCP 구현체이자 `a11y.*` 툴 규약 제안.

---

## 2. 문제 정의

### 2.1 표로 바꾸는 것이 곧 실패다 — 실험으로 증명됨

2D 좌석맵을 "접근 가능하게" 만드는 업계 표준 조치는 **표로 변환**하는 것이다. 이 조치가 정확히 필요한 정보를 파괴한다.

Biggs, Toth, Coughlan & Walker (arXiv, 2026-05-08). 정안인 20명 + 시각장애·저시력 20명, 세 가지 표현 형식 비교:

> **지도 기반 표현이 지리 문제에서 표를 유의하게 앞섰다 — 두 참가자 집단 모두에서.** 숫자만 묻는 문제에서는 차이가 미미했다.

저자들의 문제 제기: *"디지털 지도는 흔히 지리 정보가 결여된 표를 사용해 '접근 가능'하게 만들어진다."*

현장 증언도 같다. 시각장애 접근성 분석가 Michael Taylor (UsableNet, 2026-08-11):

> 대부분의 항공사 좌석맵은 스크린리더 사용자에게 접근 불가능하다. 그래픽 좌석 도면은 **의미 없는 문자열**로 읽히고, **표 기반 좌석맵조차 행·열 라벨만 줄 뿐 맥락도 좌석 이용 가능 여부도 주지 않는다.**

즉 접근성 체크박스는 채워지고 공간 정보는 사라진다.

### 2.2 표준 자체가 이 문제를 다루지 않는다 — W3C가 인정

W3C-OGC Maps for the Web 워크숍 (2020), Brandon Biggs (Smith-Kettlewell):

> **"WCAG 표준과 기법은 현재 웹 지도의 그래픽 정보가 갖는 복잡성이나, 그 공간 정보를 비시각 웹 사용자에게 전달하는 방법을 포괄하지 않는다."**

같은 워크숍, Nic Chan & Robert Linder: *"평가한 웹 매핑 프레임워크 중 WCAG 2.1 성공 기준을 모두 충족하는 것은 없었다. 일부 기준은 어떤 프레임워크도 통과하지 못했다."*

WCAG 2.2는 셀과 **헤더의 연결**은 요구하지만, 셀의 **다른 셀에 대한 위치 관계**는 한 번도 요구한 적이 없다. 스프레드시트라면 합당한 범위 결정이다. 좌석맵에서는 **위치가 곧 정보**이므로, WCAG 2.2 AA를 완전히 준수한 좌석맵이 여전히 완전히 사용 불가능할 수 있다.

WCAG 3.0 초안(2026-03-03 WD)에는 비대칭이 남아 있다. 지침 2.1.7은 **공간 음향**이 단독 전달 수단이 되면 안 된다고 요구하면서, **공간 시각 배치**에 대한 대응 요구는 없다.

### 2.3 법은 이미 "경로 설명"을 요구한다 — 다만 자유 텍스트로

`28 CFR 36.302(e)(1)(ii)` — 숙박시설과 **제3자 예약 서비스**에 부과된 의무:

> "예약 서비스를 통해 제공되는 호텔 및 객실의 **접근성 관련 특징을 식별하고 기술**하되, 장애인이 특정 호텔이나 객실이 자신의 접근성 요구를 충족하는지 **독립적으로 판단할 수 있을 만큼 충분히 상세하게** 할 것"

DOJ 해설(28 CFR Part 36, Appendix A)은 구형 호텔에 대해 더 구체적이다:

> "접근 가능한 입구, **체크인 및 필수 서비스까지의 이동 경로**, 그리고 **접근 가능한 객실까지의 접근 경로**에 관한 정보" … 기준 미달 특징도 명시할 것, 예: **"객실 문 유효폭 30인치"**

**경로도, 실측 치수도 이미 법적 의무다. 스키마도 필드도 포맷도 없어서 전부 파싱 불가능한 산문으로 처리될 뿐이다.**

항공은 좌석 단위까지 간다. `14 CFR 382.41`:

> "**팔걸이가 움직이는 좌석의 구체적 위치(즉, 행과 좌석 번호로)**"를 요청 시 제공할 것

미국 교통법에서 접근성 속성을 **개별 좌석 단위로** 공개하도록 요구하는 유일한 조항이다. 그러나 **요청 시 구두 고지** 의무이지, 데이터셋이 아니다.

### 2.4 그런데 업계 데이터는 불린 10개다

Booking.com이 실제 구현한 OTA 객실 편의시설 코드 전체 중 접근성 관련은 **10개**:

`5134 Entire unit wheelchair accessible` · `5147 Toilet with grab rails` · `5148 Adapted bath` · `5149 Roll in shower` · `5150 Walk in shower` · `5151 Higher level toilet` · `5152 Low bathroom sink` · `5153 Bathroom emergency pull cord` · `5154 Shower chair` · `5189 Accessible by lift`

**치수 없음. 경로 없음. 거리 없음.** schema.org에는 물리적 객실 접근성 어휘가 아예 없다(`accessibilityFeature`는 디지털 콘텐츠용). 법이 요구하는 것과 데이터 모델이 제공하는 것 사이의 간극이 이 프로젝트의 자리다.

### 2.5 순진한 AI 접목이 실패하는 지점 — 사용자 육성으로

Alharbi et al., ASSETS '24 (시각장애·저시력 26명 심층 인터뷰):

> **"사람이랑은 주고받기가 되죠… 나는 그 사람이 장악하게 두지 않아요."** (P3)
> **"Seeing AI한테는 질문을 못 해요… 사진 찍으면 그걸로 끝이에요."** (P20)
> **"나는 그 설명을 캐물을 수 있어요… 짙은 파랑인지 옅은 파랑인지 되물을 수 있죠."** (P23)
> **"[AI가] 표 형식이라 엉망이 돼요… 계속 궁금해하고 있어야 해요."** (P4)

Adnin & Das, CHI 2024 (시각장애 16명, 2주 일지 316건): 만족도 평균 **2.76/5**, 신뢰도 평균 **2.44/4**, **316건 중 101건이 "전혀 신뢰하지 않음"**. 가장 흔한 사용 목적(316건 중 128건, 27%)은 **특정 대상의 정확한 식별**이었지 장면 요약이 아니었다.

Chang et al., ASSETS '25 (ChatGPT 라이브 영상, 8명): *"구체적인 걸 물으면 일반론을 준다"* (P4), *"이미 돌아섰다는 걸 이해해야 하는데"* (P3), *"이건 정안인용으로 훈련됐지 시각장애인용이 아니다"* (P7).

**결론: 요약해 주는 것이 문제다. 캐물을 수 있는 인터페이스가 필요하다.**

---

## 3. 목표 / 비목표

### 3.1 목표

- **G1.** 2차원 좌석/객실 정보를 **질의 가능한 툴 집합**으로 노출한다.
- **G2.** 좌석 속성이 아니라 **이동 경로를 1급 데이터**로 제공하되, **GTFS-Pathways 필드 규약을 승강장 너머로 연장**한다.
- **G3.** 사용자가 **캐물을 수 있도록**(interrogable) 반환값과 대화 흐름을 설계한다. 요약하지 않는다.
- **G4.** 공간 서술 어휘를 **O&M 문헌에 근거해** 설계한다 — 임의로 지어내지 않는다.
- **G5.** 위 계약을 `a11y.*` 규약으로 문서화해 재사용 가능한 제안으로 만든다.

### 3.2 비목표

- 실제 예매 백엔드, 결제
- 로그인, 계정, 다중 사용자
- 기존 예약 사이트 스크래핑 또는 브라우저 확장 — **대회 IP 조항이 금지**(§14.3)
- 시각장애 외 접근성 영역
- 일반 목적 pathfinding / 범용 geometry 엔진
- 다층 이동, 다중 객차 (타입 전방 호환만)
- 로케일 분리 (MVP는 영어 — 미국 심사위원 대상)
- **호텔 도메인 구현** — 2일 일정상 불가. 규약 문서(§12)로 대체 증명

---

## 4. 우리가 서 있는 빈틈

### 4.1 세 표준의 경계

```
GTFS-Pathways (MobilityData, Google Maps가 소비)
    역 내부를 통행 그래프로 모델링 → 승차 구역(boarding area)에서 끝

ITU-T F.921 (구 Wayfindr, 세계 유일 국제 표준)
    경로를 걸어가는 중의 턴바이턴 오디오 안내를 규정
    → "아직 걷고 있지 않은, 고르는 중인 사람"은 범위 밖

28 CFR 36.302(e) (DOJ, 법적 강제)
    접근 경로를 기술할 의무 → 스키마 없이 자유 텍스트

14 CFR 382.41 (DOT, 법적 강제)
    좌석 단위 접근성 고지 의무 → 요청 시 구두, 데이터셋 아님
───────────────────────────────────────────────────
Bearing
    선택 중인 사람이 공간을 질의한다.
    GTFS-Pathways 필드 규약을 차량 내부까지 연장한다.
```

**"어떤 표준도 승객 차량 내부를 통행 가능한 그래프로 모델링하지 않는다."** — 이것이 우리 자리다.

### 4.2 GTFS-Pathways 필드 규약 (우리가 연장할 대상)

`pathways.txt` — Google Maps·Transit 앱이 실제로 소비 중:

| 필드 | 의미 |
| --- | --- |
| `pathway_mode` | 1 walkway / 2 stairs / 3 moving sidewalk / 4 escalator / 5 elevator / 6 fare gate / 7 exit gate |
| `length` | 미터 |
| `traversal_time` | 초 |
| `stair_count` | 계단 수 (양수 상행, 음수 하행) |
| `max_slope` | 경사비 (미국 수동휠체어 기준 0.083) |
| `min_width` | 미터 |
| `signposted_as` | **실제 표지판 문구 그대로** |

**우리 `Route`는 이 이름을 그대로 쓴다.** 자체 명명보다 "채택된 표준의 연장"이 규약 제안으로 훨씬 강하다.

OSDM(UIC 철도 유통 표준)에서 가져올 것: `walkSpeed`(평균 대비 %), `additionalTransferTime`. **표준에 존재하는 유일한 "노력(effort)" 파라미터**다.

---

## 5. 설계 원칙 (전면 개정)

### P1. 서술이 아니라 **심문**

`describe_page()` 하나는 비싼 alt text다. 사용자가 캐물을 수 있어야 한다. **모든 조회 툴은 후속 질문을 받을 수 있는 참조(ref)를 반환한다.** ASSETS '24 P23의 *"나는 그 설명을 캐물을 수 있어요"*가 목표 상태다.

### P2. 대역폭이 아니라 **작업기억과 재질의 비용**을 아낀다 ⚠️ 개정

이전 원칙("음성은 좁으니 3~5개로 자른다")은 최적화 변수를 잘못 잡았다.

- 훈련된 시각장애 청자는 **초당 22음절**까지 이해한다 (비훈련 정안인 ~8음절/초) — Dietrich et al., *BMC Neuroscience* 2013
- 청각 메뉴에서 **넓고 얕은 구조가 좁고 깊은 구조를 이긴다.** 작업기억 용량이 낮을수록 격차가 커진다 — Commarford et al., *Human Factors* 50(1), 2008. 저자들이 "통념과 배치된다"고 명시

**따라서 두 규칙을 분리한다:**

| 반환 종류 | 규칙 | 근거 |
| --- | --- | --- |
| **목록형 결과** (query, compare) | **평평하게, 최대 12개.** 중첩·페이징 금지. 각 항목 한 줄 | broad > deep. 디코딩은 싸고 재질의는 비싸다 |
| **순차 경로 지시** (get_route) | **4세그먼트 이내.** 초과 시 중간 확인 지점 삽입 | 구두 경로 지시의 작업기억 한계 ~4 |

### P3. 상태 확인과 되돌리기는 핵심 기능

모든 조작 툴은 실행 후 전체 상태를 반환한다.

### P4. 비가역 동작은 사람이 확정한다

`a11y.confirm`은 확인 UI를 띄우고 **사용자가 확인/취소할 때까지 툴 실행을 완료하지 않는다.** 결과(`confirmed`/`cancelled`)는 같은 호출의 반환값이다.

### P5. 화면은 툴 실행을 눈에 보이게 만든다

심사위원 대부분이 정안인이다. 툴 이름·적용 필터·하이라이트·경로 오버레이를 실시간 렌더한다.

### P6. **표현을 데이터에 굽지 않는다** ⚠️ 신설

거리는 **미터**로, 방위는 **참조 프레임과 함께** 저장한다. 걸음/피트/미터, 시계방향/상대/방위 — 전부 **출력 시점 변환**이다.

근거: 시각장애 참가자 7명 중 걸음 3 / 피트 3 / 미터 1로 선호가 갈렸다. BlindSquare와 Lazarillo가 독립적으로 **3안 사용자 설정**(clock / relative / cardinal)에 수렴했다.

### P7. **걸음 수를 데이터로 저작하지 않는다** ⚠️ 신설

Vanderbilt IRIS Center: *"목적지 간 걸음 수를 자주 세는 것은 공간 방향정위를 기르는 효율적 방법이 아니다"* — 통념과 달리 시각장애인은 일반적으로 걸음을 세지 않는다.

실증: 38m 복도에서 사전 측정한 보폭이 실제 보행보다 항상 **길었다**. 불확실한 공간에서 보폭이 짧아지기 때문이다. **정확도가 가장 필요한 상황에서 가장 틀린다.**

**대신 쓸 것 — 셀 수 있는 이산 지형지물.** DOJ 숙박시설 가이드의 모범 문장:

> *"화재 시 객실을 나와 **왼쪽으로**. 비상계단은 **오른쪽 다섯 번째 문**입니다."*

걸음도 피트도 없다. 방향 + 셀 수 있는 지형지물 + 방위.

---

## 6. 범위 (2일)

### 6.1 MVP — 필수

| ID | 항목 | 완료 기준 |
| --- | --- | --- |
| M1 | 미국 도시간 철도 일반형 객차 1량 fixture (~60석) — **무브랜드** | `data/intercity-car-6.json` 로드 |
| M2 | **경로 엔진** — 좌석↔좌석, 좌석↔랜드마크 | `node --test` 통과 (§9.6) |
| M3 | `a11y.*` 툴 **9종** 등록 (`document.modelContext`) | ChatGPT 인앱 브라우저에서 9종 호출 성공 |
| M4 | 시각화 UI — 좌석 그리드 + 하이라이트 + 툴 로그 + 경로 오버레이 + 선택 패널 + 확인 다이얼로그 | 심사위원이 화면에서 툴 실행을 봄 |
| M5 | HTTPS 배포 | 공개 URL, `document.modelContext` 정의됨 |
| M6 | **제출 4종** — Live URL / 설명 4항목 / 영상 / 저장소+LICENSE | §14 체크리스트 전항 통과 |

### 6.2 여유 시

| ID | 항목 |
| --- | --- |
| E1 | `a11y.*` 규약 명세 문서 (호텔 매핑 포함) — **논지 완성에 중요, 저비용** |
| E2 | `a11y.set_preferences` 툴 (단위·방향표기·보행속도 지속) |
| E3 | 호텔 어댑터 실제 구현 — **2일 내 비현실적** |

---

## 7. 툴 계약

### 7.1 툴 목록

| 툴 | 종류 | `readOnlyHint` | 목적 |
| --- | --- | --- | --- |
| `a11y.get_layout` | 조회 | `true` | 공간 개요 + 기준점 목록 |
| `a11y.query` | 조회 | `true` | 조건 검색 (§8.2) |
| `a11y.describe` | 조회 | `true` | 한 대상 + 주변 관계 + 랜드마크 |
| `a11y.get_route` | 조회 | `true` | 두 지점 간 경로 (§9) |
| `a11y.compare` | 조회 | `true` | 후보 2~4개 축별 대조 |
| `a11y.select` | 조작 | `false` | 선택 + 하이라이트 |
| `a11y.get_selection` | 조회 | `true` | 현재 선택 확인 |
| `a11y.undo` | 조작 | `false` | 마지막 조작 되돌리기 |
| `a11y.confirm` | 조작 | `false` | 확정 — 사람이 최종 클릭 |

> **툴 이름의 점(`.`):** W3C WebMCP 스펙은 `ModelContextTool.name`을 제약 없는 `DOMString`으로 정의한다 — 문자 패턴 제한이 문서화돼 있지 않다. Chrome 문서도 **길이 30자 권장**만 말하고 허용 문자는 언급하지 않는다. 따라서 `a11y.get_route`는 스펙상 문제없다.
>
> 다만 호스트 구현(ChatGPT 인앱 브라우저)이 자체 제약을 걸 가능성은 남으므로 **Block A 순서 1에서 실제 호출로 확인**한다. 거부되면 `a11y_get_route`로 폴백 — 논지는 "접두사 규약"이므로 구분자가 바뀌어도 유지된다.

`annotations`는 실제 WebMCP 필드다. Chrome 보안 가이드: *"상태를 변경하지 않는 툴에는 `readOnlyHint`를 사용하라. 에이전트가 사용자 확인을 언제 요청할지 더 나은 판단을 하게 된다."*

### 7.2 공통 반환 계약

```ts
type ToolResult<T> = {
  ok: boolean;
  data?: T;
  state?: SelectionState;     // 조작 툴은 항상
  hint?: string;              // 다음 좁히기 축 제안
  error?: { code: ToolErrorCode; message: string };
};

type SelectionState = {
  selected: string[];
  selectedCount: number;
  priceTotal_usd: number;
  undoable: boolean;
  status: "draft" | "confirmation_pending" | "confirmed";
};
```

**`more` 필드는 삭제한다.** P2 개정에 따라 목록을 자르지 않고 평평하게 반환하므로 "더 있음" 신호가 필요 없다. 결과가 12개를 넘으면 자르는 대신 `hint`로 좁히는 축을 제안한다.

### 7.3 렌더링 파라미터 (P6 구현)

모든 공간 서술 툴(`describe`, `get_route`, `get_layout`)이 받는다:

```ts
type RenderOptions = {
  units?: "meters" | "feet" | "steps";        // 기본 "feet" (미국)
  stepLength_m?: number;                       // units==="steps"일 때만. 기본 0.75
  directionStyle?: "relative" | "clock" | "cardinal";  // 기본 "relative"
  walkSpeedPercent?: number;                   // OSDM 규약. 100 = 평균. traversal_time 스케일
};
```

`units: "steps"`를 선택하면 반환에 경고를 동반한다:

```json
{ "unitsNote": "Step counts are converted from measured distance using an assumed 0.75 m stride and are approximate. Landmark counts (e.g. 'third row') are exact." }
```

**이것이 P7의 실행이다** — 걸음 수를 제공하되, 그것이 파생값이며 근사임을 에이전트가 사용자에게 전달할 수 있게 한다.

### 7.4 툴별 입출력

| 툴 | input | `data` |
| --- | --- | --- |
| `get_layout` | `RenderOptions` | `LayoutSummary` (§8.4) |
| `query` | `QueryCriteria & RenderOptions` | `{ items: Candidate[], appliedCriteria, totalMatched }` |
| `describe` | `{ ref } & RenderOptions` | `Description` (§8.5) |
| `get_route` | `{ from, to } & RenderOptions` | `Route` (§9.2) |
| `compare` | `{ refs: string[] } & RenderOptions` | `Comparison` |
| `select` | `{ ref }` | `{ selectedRef }` + `state` |
| `get_selection` | `{}` | `{ selected: string[] }` + `state` |
| `undo` | `{}` | `{ undone: string \| null }` + `state` |
| `confirm` | `{}` | `{ outcome: "confirmed" \| "cancelled" \| "timeout" }` + `state` |

### 7.5 `a11y.get_route` — 프로젝트의 심장

description을 **정적으로 유지하기로 선택한다.** Chrome best practices가 *"대부분의 애플리케이션에서 정적 등록을 기본으로 하라"*고 권장하기 때문이다 — API 제약이 아니라 복잡도 절감 권고다. WebMCP는 등록 해제 후 재등록으로 description을 바꿀 수 있지만, 우리는 그 경로를 쓰지 않는다.

현재 열린 배치도 같은 동적 정보는 `a11y.get_layout` 결과로 전달한다.

```js
document.modelContext.registerTool({
  name: "a11y.get_route",
  description:
    "Return the walking route between two points in the currently loaded seating layout: " +
    "distance, direction, turns, and the landmarks passed along the way. " +
    "from/to accept a seat ref (e.g. '6-12A') or a landmark key " +
    "('entrance_front', 'restroom', 'cafe_car', 'luggage_rack'). " +
    "Distances are measured; step counts, if requested, are approximate conversions.",
  inputSchema: {
    type: "object",
    properties: {
      from: { type: "string", description: "Seat ref or landmark key" },
      to:   { type: "string", description: "Seat ref or landmark key" },
      units: { type: "string", enum: ["meters", "feet", "steps"] },
      directionStyle: { type: "string", enum: ["relative", "clock", "cardinal"] },
      walkSpeedPercent: { type: "number", description: "100 = average walking speed" }
    },
    required: ["from", "to"]
  },
  annotations: { readOnlyHint: true },
  execute: async (input) => toWire(application.getRoute(input)),
}, { signal: controller.signal });
```

### 7.6 확정 잠금 (P4) — blocking

```
a11y.confirm()
  ├─ 선행: status === "draft" && selected.length > 0
  ├─ status = "confirmation_pending"  (이후 select/undo → CONFIRMATION_REQUIRED)
  ├─ UI: ConfirmationDialog (키보드 포커스 이동 + ARIA live)
  └─ 다음 중 먼저 오는 것까지 await:
       ├─ 사용자 "확인" → outcome "confirmed",  status = "confirmed"
       ├─ 사용자 "취소" → outcome "cancelled",  status = "draft"
       └─ 120초 timeout → outcome "timeout",    status = "draft"
  → { ok: true, data: { outcome }, state }
```

Agent 호출만으로는 확정되지 않는다. 실제 결제는 하지 않으므로 `confirmed` 전환까지 데모.

### 7.7 에러 코드

```ts
type ToolErrorCode =
  | "INVALID_REF"           // 존재하지 않는 ref
  | "NO_ROUTE"              // 경로 계산 불가
  | "NO_MATCH"              // 조건에 맞는 결과 0개
  | "NOT_AVAILABLE"         // 이미 예약된 좌석 select
  | "INVALID_SELECTION"     // compare 대상 개수 오류 등
  | "INVALID_CRITERIA"      // maxDistance without near 등
  | "UNSUPPORTED_CRITERIA"  // 현재 도메인이 지원하지 않는 조건
  | "NOTHING_TO_UNDO"
  | "CONFIRMATION_REQUIRED"
```

`WEBMCP_UNAVAILABLE`은 없다 — WebMCP 부재 시 툴 자체가 호출되지 않는다. 부트스트랩 capability(§16.1)로 관리.

---

## 8. 데이터 모델

### 8.1 좌석 — 미국 규정 근거 속성

```ts
type Seat = {
  ref: string;                    // "6-12A"
  row: number;
  seatLetter: string;             // "A" | "B" | "C" | "D"
  position_m: { x: number; y: number };   // 객차 원점 기준 미터
  side: "window" | "aisle";
  facing: "forward" | "backward";
  price_usd: number;
  available: boolean;

  // 49 CFR 38.125(d) — intercity rail
  wheelchairSpace: boolean;       // (d)(2) 최소 48in × 30in 유효 바닥면적
  transferSeat: boolean;          // (d)(1) 휠체어에서 옮겨 앉는 좌석
  companionSeat: boolean;

  // 14 CFR 382.61 준용 (좌석 단위 공개 관행)
  movableArmrest: boolean;

  // 안내견 핸들러 결정 정보
  footSpace_in2: number;          // 발밑 유효 면적
  bulkhead: boolean;              // 앞이 격벽 (요청 대상, 자동 배정 아님)
  exitRow: boolean;               // true면 안내견 동반 착석 불가

  features: string[];             // ["power_outlet", "table", "quiet_car"]
};
```

**설계 의도:** `accessible: true` 같은 불린 하나가 아니라, 사용자가 자기 요구에 비추어 **독립적으로 판단**할 수 있는 개별 사실들이다. 이것이 `28 CFR 36.302(e)(1)(ii)`의 취지("assess independently")를 좌석 단위로 옮긴 것이다.

### 8.2 `QueryCriteria`

```ts
type QueryCriteria = {
  // 공통 — 모든 도메인이 해석
  near?: string;                  // 기준 랜드마크 키
  maxDistance_m?: number;         // near 로부터. near 없이 쓰면 INVALID_CRITERIA
  priceMax_usd?: number;
  availableOnly?: boolean;        // 기본 true

  // 접근성 요구 (도메인 공통)
  needs?: {
    wheelchairSpace?: boolean;
    transferSeat?: boolean;
    movableArmrest?: boolean;
    minFootSpace_in2?: number;    // 안내견
    excludeExitRow?: boolean;     // 안내견 동반 시 자동 true 권장
  };

  // 도메인 고유 — 다른 도메인이면 UNSUPPORTED_CRITERIA
  rail?: { facing?: "forward" | "backward"; side?: "window" | "aisle"; quietCar?: boolean };
  hotel?: { floorMin?: number; floorMax?: number; bedToBathroomMax_m?: number };
};
```

**검증 규칙:**

| 규칙 | 내용 | 위반 시 |
| --- | --- | --- |
| Q1 | `maxDistance_m`는 `near`와 함께만 유효 | `INVALID_CRITERIA` |
| Q2 | 현재 도메인이 아닌 블록은 **무시하지 않고 거부** | `UNSUPPORTED_CRITERIA` |
| Q3 | 실제 적용된 조건을 `appliedCriteria`로 반환 | — |

Q2가 중요한 이유: 미적용 필터를 적용된 것처럼 결과를 주면 **에이전트가 사용자에게 거짓 근거를 준다.** ASSETS '25가 기록한 "sycophantic responses creating false confidence" 실패 모드다.

### 8.3 랜드마크 — O&M 정식 분류 채택

O&M 문헌은 랜드마크와 단서를 엄격히 구분한다 (TSBVI):

> "단서(clue)는 **일시적** 정보다. 랜드마크는 **영구적이거나 항상 존재**한다. 둘 다 가용한 모든 감각 정보(청각·촉각·후각·시각)를 포괄한다."

Giudice & Long의 3단 분류를 그대로 데이터 모델로 쓴다:

```ts
type LandmarkType =
  | "primary"                  // 영구적 + 경로 위에 있어 놓칠 수 없음
  | "secondary"                // 영구적·고유하나 경로 옆이라 탐지 확률 낮음
  | "clue"                     // 일시적 (소리, 냄새)
  | "information_point"        // 단독으론 고유하지 않으나 조합으로 식별
  | "environmental_regularity";// 사전 지식 (객차 끝엔 대개 출입문)

type SensoryChannel = "tactile" | "auditory" | "olfactory" | "thermal" | "airflow" | "visual";

type Landmark = {
  key: string;                 // "restroom" | "cafe_car" | "entrance_front"
  label: string;               // "Restroom (rear of car)"
  position_m: { x: number; y: number };
  landmarkType: LandmarkType;
  sensoryChannels: SensoryChannel[];
  detectability: {             // 이동 보조 수단별로 다름 — 문헌이 명시
    caneUser: "high" | "medium" | "low";
    dogGuide:  "high" | "medium" | "low";
  };
  signpostedAs?: string;       // GTFS-Pathways 규약: 실제 표지판 문구 그대로
};
```

`detectability`가 보조 수단별로 나뉘는 이유: 같은 물체라도 흰지팡이 사용자는 반대쪽을 짚고 지나칠 수 있고, 안내견 핸들러는 손을 뻗거나 반사음으로 확인해야 한다 — Giudice & Long이 명시한 사실이다.

### 8.4 `LayoutSummary`

```ts
type LayoutSummary = {
  domain: "rail" | "hotel";
  layoutId: string;                    // "Car 6, Business Class" — 무브랜드 (§14.5)
  bounds_m: { length: number; width: number };
  seatCount: { total: number; available: number };
  accessibleCount: {                   // 49 CFR 38.125(d) 대비 실제 수
    wheelchairSpaces: number;
    transferSeats: number;
    movableArmrestSeats: number;
  };
  landmarks: Landmark[];
  referencePoints: string[];           // 경로 기준으로 삼기 좋은 랜드마크 키
  summary: string;                     // 한 문단 개요
};
```

### 8.5 `Description` — 캐물을 수 있게 (P1)

```ts
type Description = {
  ref: string;
  line: string;                        // 한 줄 요약
  attributes: Record<string, unknown>; // Seat의 결정 관련 필드 전개
  relations: {                         // 관계형 사실 — 시각장애 여행자가 실제로 묻는 것
    to: string;                        // 랜드마크 키 또는 좌석 ref
    distance_m: number;
    rendered: string;                  // "18 ft toward the front, on your left"
    landmarksPassed: string[];
  }[];
  followUps: string[];                 // 다음에 물을 수 있는 것 — 심문 가능성 명시
};
```

`followUps`는 P1의 실행이다. 에이전트가 대화를 끝내는 대신 **다음 질문을 제시**한다.

### 8.6 상태 모델

```ts
type AppState = {
  domain: "rail" | "hotel";
  layoutId: string;
  selection: string[];
  confirmationStatus: "draft" | "confirmation_pending" | "confirmed";
  activeRoute: Route | null;
  highlightedRefs: string[];
  toolLog: { name: string; args: object; at: number }[];
  history: { selection: string[]; highlightedRefs: string[] }[];
  prefs: RenderOptions;                // 세션 기본값
};
```

**도메인 전환은 tool 재등록이 아니다.** 툴 이름·스키마·정적 description이 도메인 간 동일하므로 `domain`만 바꾸면 된다.

---

## 9. 경로 엔진

### 9.1 위치

가장 먼저 만드는 독립 모듈. React·WebMCP를 모르는 순수 TypeScript. **여기가 밀리면 전부 밀린다.**

### 9.2 `Route` — GTFS-Pathways 필드 규약 연장

```ts
type RouteSegment = {
  pathway_mode: "walkway" | "stairs" | "elevator" | "door" | "vestibule";  // GTFS 어휘
  from: string;
  to: string;
  length_m: number;                    // GTFS: length
  traversal_time_s: number;            // GTFS: traversal_time (walkSpeedPercent 반영)
  stair_count?: number;                // GTFS: stair_count
  min_width_m?: number;                // GTFS: min_width — 49 CFR 38.125(d)(1) 32in 통로
  bearing: {                           // 참조 프레임만 저장 (P6)
    frame: "egocentric" | "car_axis";
    degrees: number;                   // 0 = 진행 방향
  };
  countedFeatures?: {                  // P7 — 셀 수 있는 이산 지형지물
    feature: string;                   // "row" | "door" | "vestibule"
    count: number;                     // "세 번째 문"의 3
  };
  landmarksPassed: string[];
};

type Route = {
  from: string;
  to: string;
  totalLength_m: number;
  totalTraversalTime_s: number;
  segments: RouteSegment[];            // 4개 이내 (P2). 초과 시 확인 지점 삽입
  landmarks: Landmark[];
  rendered: {                          // 요청된 RenderOptions로 렌더한 결과
    units: "meters" | "feet" | "steps";
    directionStyle: "relative" | "clock" | "cardinal";
    instructions: string[];            // 세그먼트당 한 문장
    summary: string;
    unitsNote?: string;                // units==="steps"일 때 근사 경고
  };
};
```

**핵심:** `segments`가 진실이고 `rendered`는 파생이다. UI 오버레이·에이전트 설명·테스트가 모두 `segments`에서 나온다. 렌더링 옵션이 바뀌어도 기하는 그대로다.

### 9.3 알고리즘

```
route(from, to, opts):
  1. from, to 의 실제 좌표(미터)를 resolve.
  2. from 이 통로 밖이면:
       from → 같은 행의 통로 지점까지 walkway 세그먼트.
  3. 통로를 따라 to 의 행까지 walkway 세그먼트.
       - 지나치는 행 수를 countedFeatures.row 로 기록
       - 경로상 랜드마크 수집
  4. to 가 통로 밖이면:
       통로 지점 → to 까지 walkway 세그먼트.
  5. 각 세그먼트 traversal_time_s = length_m / (1.2 * walkSpeedPercent/100)
       (1.2 m/s = 성인 평균 보행속도)
  6. 세그먼트 4개 초과 시 병합 또는 확인 지점 삽입.
  7. RenderOptions 로 rendered 생성.
```

2·4단계를 명시적으로 두는 것이 핵심이다. 양 끝을 통로로 미리 투영하면 `route("6-12A", "6-12D")`(같은 행, 통로 건넘)가 0으로 계산된다.

### 9.4 렌더링 예시 — 같은 Route, 다른 옵션

`get_route({ from: "entrance_front", to: "6-12A" })`

| 옵션 | `rendered.summary` |
| --- | --- |
| `feet` + `relative` (기본) | "From the front door, walk 24 feet back along the aisle, passing 6 rows. Seat 12A is the window seat on your left." |
| `steps` + `relative` | "…about 32 steps back along the aisle, passing 6 rows…" + `unitsNote` |
| `feet` + `clock` | "…the seat is at your 10 o'clock." |
| `meters` + `cardinal` | "…7.3 meters toward the rear of the car…" |

**데이터는 하나다.** 이것이 P6이고, 동시에 규약 제안의 핵심 논거다 — 표현을 데이터에 굽지 않으면 같은 데이터가 모든 사용자를 섬긴다.

### 9.5 이식성

| | 철도(MVP) | 호텔(규약 문서) | 다층(범위 밖) |
| --- | --- | --- | --- |
| `Route` 타입 | ✅ | ✅ 그대로 | ✅ 그대로 |
| 알고리즘 | ✅ | ✅ 단일 층 복도 이동 | ❌ `elevator` 세그먼트 필요 |

`pathway_mode`에 `elevator`가 이미 있으므로 타입은 다층을 담을 수 있다. MVP는 생성하지 않는다.

### 9.6 완료 기준 (D1)

`node --test` 로 UI 없이 통과:

| 케이스 | 검증 |
| --- | --- |
| `entrance_front → 6-12A` | 종이동 + 통로→좌석 횡이동, `countedFeatures.row = 6` |
| `6-12A → restroom` | **좌석→통로 횡이동 포함**, 랜드마크 수집 |
| `6-12A → 6-14D` | 횡→종→횡 3세그먼트 |
| `6-12A → 6-12D` | 같은 행, 통로 건넘 — `totalLength_m > 0` |
| `6-12A → 6-12B` | 같은 행, 같은 쪽, 통로 안 건넘 |
| 같은 route, `units` 3종 | `segments` 동일, `rendered`만 다름 |
| `walkSpeedPercent: 50` | `traversal_time_s` 2배, `length_m` 불변 |

---

## 10. 화면 요구사항

| ID | 요구사항 |
| --- | --- |
| UI1 | 좌석 배치도 (CSS Grid) |
| UI2 | 툴이 참조한 좌석 실시간 하이라이트 |
| UI3 | `get_route` 시 `segments`를 SVG 화살표로 오버레이 (UI는 계산 안 함) |
| UI4 | 툴 로그 패널 — 툴 이름 + 인자 + `appliedCriteria` |
| UI5 | 선택 패널 — 좌석·금액·`confirmationStatus` 상시 |
| UI6 | **에이전트 없이도 완전 동작** — 키보드 탐색 + ARIA. 좌석 그리드는 `role="grid"` + 각 셀에 위치·속성이 담긴 `aria-label` |
| UI7 | 확인 다이얼로그 — 포커스 이동, `aria-modal`, 사용자 클릭으로만 confirmed |
| UI8 | WebMCP 미지원 시 안내 배너. 좌석 탐색은 정상 동작 |

**UI6이 중요한 이유:** 심사 기준 Execution("완결된 제품 경험")과, 우리 자신의 논지 양쪽에 걸린다. WebMCP 없이 깨지면 "AI 없으면 못 쓰는 접근성 앱"이 된다.

---

## 11. 아키텍처

> **WebMCP 어댑터와 UI는 서로를 호출하지 않고, 둘 다 Application을 호출한다. Application이 Domain을 호출한다.**

```
Screen Reader User          ChatGPT in-app browser
        │                            │
        ▼                            ▼
     Web UI ──────┐   ┌────── WebMCP Adapter (document.modelContext)
                  ▼   ▼
           Application Layer   (a11y.* 1개 = use case 1개)
                  │
                  ▼
             Domain Core   (순수 TS: Route / Query / Compare)
                  │
          ┌───────┴────────┐
          ▼                ▼
    Rail Adapter    (Hotel Adapter — 규약 문서로만)
```

만들지 않는 의존성: `Domain → DOM`, `Domain → WebMCP`, `Application → DOM`, `Tool → SVG`, `UI → 경로 계산`.

**ADR:**

1. Domain Core는 DOM/WebMCP에 의존하지 않는다.
2. `a11y.*` 이름과 반환 contract를 public interface로 취급한다.
3. Human UI와 Agent Tool은 하나의 App Store를 공유한다.
4. Route는 문자열이 아니라 structured object다. `rendered`는 `segments`의 파생이다.
5. WebMCP API는 Adapter Layer에서만 사용한다.
6. 확정은 Agent 단독으로 완료할 수 없다.
7. **거리는 미터로 저장하고 출력 시 변환한다. 걸음 수를 저작하지 않는다.**
8. **Tool metadata는 정적이다.** 도메인 전환은 상태 변경이지 재등록이 아니다.
9. **Route 필드는 GTFS-Pathways 어휘를 따른다.** 자체 명명하지 않는다.

---

## 12. 규약 논지 — `a11y.*` 명세 (E1)

2일 안에 호텔을 구현할 수 없으므로, **규약 문서가 G5의 증거**가 된다. 문서는 다음을 보인다:

1. **툴 9종의 이름·입출력 스키마** — 도메인 무관
2. **호텔 매핑 표** — 같은 스키마를 호텔이 어떻게 채우는가

| 필드 | 철도 | 호텔 |
| --- | --- | --- |
| `ref` | `"6-12A"` | `"812"` |
| `position_m` | 객차 원점 기준 | 층 원점 기준 |
| 랜드마크 키 | `entrance_front`, `restroom`, `cafe_car`, `luggage_rack` | `elevator`, `stairs`, `ice_machine`, `lobby`, `relief_area` |
| `wheelchairSpace` | 49 CFR 38.125(d)(2) | ADA 2010 Std. §806 (roll-in shower 등) |
| `pathway_mode` | `walkway`, `door`, `vestibule` | `walkway`, `door`, `elevator` |
| 관계형 질의 | 좌석→화장실, 좌석→출입문 | 객실→엘리베이터, 객실→로비, 건물→안내견 배변구역 |

3. **GTFS-Pathways와의 접합점** — 우리 `Route`가 `pathways.txt`의 어떤 필드를 그대로 쓰고 무엇을 추가하는가
4. **28 CFR 36.302(e) 대응표** — DOJ가 산문으로 요구하는 항목이 어느 필드에 대응하는가

**호텔 랜드마크 키 목록의 근거:** 시각장애 여행자가 예약 전 실제로 묻는 질문 — 객실이 엘리베이터 근처인지, 로비에서 얼마나 먼지, 안내견 배변구역이 실용적인지 (BlindTravels 등 1인칭 기록). 전부 **관계형** 사실이고, 현재 어떤 예약 시스템도 제공하지 않는다.

---

## 13. 심사 기준 대응

심사는 **2단계**다.

### 13.0 Stage One — Pass/Fail 관문

> *"프로젝트가 주제에 합당하게 부합하고, 대회가 지정한 API/SDK를 합당하게 적용했는지"*를 pass/fail로 판정한다. 통과한 제출물만 Stage Two의 4개 기준으로 채점된다.

여기서 떨어지면 나머지가 전부 무의미하므로, **Block A 순서 1(WebMCP 등록·호출 실증)이 일정 최우선**인 이유가 이것이다. 통과 조건을 명시적으로 만족시킨다:

- 주제 부합 — *"사람과 에이전트가 상호작용·협업·창작하는 열린 웹의 미래"*: 좌석 선택이라는 구체적 과제에서 사람이 판단권을 쥐고 에이전트와 협업한다
- API 적용 — `document.modelContext.registerTool`로 툴 9종. 형식적 1~2개가 아니다
- 저장소에 `registerTool` 호출 코드가 실제로 있고, 배포 URL에서 실제로 등록된다

### Stage Two — 공식 기준 4개, **동등 가중치**

동점 시 아래 순서대로 tiebreaker. **WebMCP Leverage가 사실상 1순위다.**

### 13.1 WebMCP Leverage — *"철저하고 능숙한 사용, non-trivial 구현"*

| 우리가 보이는 것 |
| --- |
| 툴 **9종**, 조회/조작 분리, 전부 `document.modelContext.registerTool` |
| `annotations.readOnlyHint`를 조회/조작에 정확히 부여 — 에이전트의 확인 요청 판단을 돕는 실제 필드 |
| `AbortController` 기반 lifecycle. `unregisterTool` 미의존 |
| **정적 description을 선택** — Chrome이 권장하는 기본값. 동적 정보는 `get_layout`으로 분리 |
| blocking `confirm` — 툴 실행 중 사람의 확정을 기다리는 human-in-the-loop |
| capability guard — WebMCP 없어도 페이지가 온전히 동작 (progressive enhancement) |
| **툴이 얇지 않다** — `get_route`는 실제 기하 계산 + 렌더링 협상을 수행 |

### 13.2 Execution — *"기술 PoC가 아니라 완결되고 일관된 제품 경험"*

| 우리가 보이는 것 |
| --- |
| query → route → compare → select → confirm **전 구간 완주** |
| 에이전트 없이도 키보드+ARIA로 **동일 작업 완주 가능** (UI6) |
| 에러가 구조화되어 있고 사용자에게 읽어줄 문장을 포함 |
| 단위·방향표기를 사용자가 바꿔도 일관되게 동작 |

### 13.3 Potential Impact — *"실제 사용자의 실제 문제에 대한 구체적·신뢰할 만한 논거"*

| 근거 | 출처 |
| --- | --- |
| 표로 바꾸면 공간 정보가 파괴됨 — 40명 실험 | Biggs et al., arXiv 2026-05 |
| 항공사 좌석맵은 표 버전조차 실패 — 1인칭 | Taylor, UsableNet 2026-08 |
| WCAG가 공간 관계를 다루지 않음 — 표준 기구 자인 | W3C Maps for the Web, 2020 |
| 법은 경로 설명을 요구하나 스키마가 없음 | 28 CFR 36.302(e) + DOJ 해설 |
| 업계 데이터는 불린 10개 | Booking.com OTA 코드 |
| 사용자는 요약이 아니라 심문을 원함 | ASSETS '24 (n=26), CHI '24 (n=16) |
| 스크린리더 사용자의 **71.6%가 긴 페이지에서 제목(구조)으로 먼저 탐색** — 2D 격자는 구조 핸들이 없다 | WebAIM #10 (n=1,539) |
| Chrome·Edge 조합이 데스크톱 스크린리더 사용의 **약 68%** — WebMCP가 닿는 범위 | WebAIM #10 브라우저 조합 표 합산 |

### 13.4 Creativity & Ambition — *"기존 개념과 다른가"*

| |
| --- |
| **어떤 표준도 차량 내부를 통행 그래프로 모델링하지 않는다.** GTFS-Pathways는 승강장에서, ITU-T F.921은 "걷는 중"에서 끝난다 |
| 경로를 문자열이 아니라 **1급 구조 데이터**로 취급 |
| **O&M 문헌의 랜드마크 온톨로지를 채택** — 어휘를 지어내지 않았다 |
| **걸음 수를 1급 단위로 쓰지 않기로 한 결정** — 통념과 반대이고, 문헌 근거가 있다 |
| 표현을 데이터에 굽지 않아 같은 데이터가 clock/relative/cardinal 사용자를 모두 섬김 |

---

## 14. 제출물 (규칙 준수)

### 14.1 Live URL

- HTTPS 배포 (Netlify / Vercel / Cloudflare)
- **ChatGPT 데스크톱 인앱 브라우저**와 **Chrome 149+ (`chrome://flags/#enable-webmcp-testing`)** 양쪽에서 확인
- 인증 걸지 않음 (심사 마찰 최소화)

### 14.2 텍스트 설명 — 규칙이 지정한 4항목

1. **왜 WebMCP에 잘 맞는가** — 2D 공간 선택은 DOM 스크래핑으로 풀리지 않는다. 좌석 격자는 스크린리더에게도 에이전트에게도 구조가 없다. 사이트가 기하를 알고 있으므로, 사이트가 툴로 노출하는 것이 유일하게 정확한 경로다.
2. **어떻게 더 나은 UX인가** — 요약 대신 심문. 사용자가 필터를 바꾸고, 경로를 확인하고, 후보를 비교하고, 되돌리고, 마지막에 직접 확정한다. 단위와 방향 표기를 사용자가 고른다.
3. **사람+에이전트가 새로 할 수 있게 된 것** — 이전에는 좌석표를 표로 변환해 행·열 라벨만 읽는 것이 최선이었다. 이제 "화장실에서 가깝고 안내견 발밑 공간이 있는 순방향 창측"을 묻고, 그 좌석까지의 경로를 걸음 수가 아니라 **지나칠 행 수와 랜드마크**로 받고, 두 후보를 같은 축으로 비교하고, 확정 전 화면 다이얼로그에서 직접 승인할 수 있다.
4. **어떻게 구현했나** — 순수 TS 도메인 코어(경로/질의/비교 엔진) 위에 Application use case 9개, 그 위에 `document.modelContext.registerTool` 어댑터. `AbortController` lifecycle, `readOnlyHint` annotation, 정적 description. UI와 에이전트가 같은 App Store를 공유해 상태가 어긋나지 않는다.

### 14.3 데모 영상 — 3분 미만, 공개 YouTube, **오디오 필수**, **영어**

| 구간 | 내용 |
| --- | --- |
| 0:00–0:35 | **Before** — **우리가 만든 표 기반 좌석 선택 화면**을 스크린리더로. 행·열 라벨만 읽히고 맥락도 이용 가능 여부도 없음. 이것이 업계 표준 "접근성 대응"의 결과다 |
| 0:35–2:15 | **After** — ChatGPT 인앱 브라우저에서 대화. query → route → compare → select → confirm. 화면에 툴 로그·하이라이트·경로가 실시간으로 뜬다 |
| 2:15–2:40 | 단위를 steps로 바꿔 같은 경로를 다시 — **데이터는 하나, 표현만 협상됨** |
| 2:40–2:55 | 같은 스키마가 호텔을 어떻게 담는가 |

**Before 구간을 반드시 자체 제작 목업으로 찍는다.** 실제 항공사·철도 예약 사이트를 화면 녹화하면 그 회사의 상표와 UI가 무단으로 영상에 들어간다 — 규칙이 금지한다(§14.5). 자체 목업은 오히려 논거가 더 깨끗하다: 같은 데이터를 표로 노출한 것과 툴로 노출한 것의 **직접 비교**가 되기 때문이다.

나레이션·자막은 **영어**. 고지 포함: *"Distances are measured; step counts are approximate conversions."*

배경음악을 넣지 않는다 — 저작권 확인 비용이 이득보다 크다.

### 14.4 공개 저장소

- GitHub **공개**
- 루트에 **`LICENSE` (MIT)** — GitHub About 섹션에 "MIT"가 실제로 뜨는지 눈으로 확인
- `README.md` — **영어**. 실행 지침, WebMCP 테스트 방법(Chrome 149+ 플래그 / ChatGPT 인앱 브라우저), 데이터 출처 고지, 호텔 매핑 표(§12 축약)
- `document.modelContext.registerTool({...})` 코드 포함

### 14.5 IP·언어 가드레일 (규칙 §8 및 제출 요건)

**상표를 제품에 넣지 않는다.** 규칙은 제출물이 *"저작권, 상표, 특허, 계약, 프라이버시 권리를 침해하지 않을 것"*을 요구한다. 따라서:

| 대상 | 처리 |
| --- | --- |
| 운영사명 (Amtrak, Acela, 항공사명 등) | **코드·데이터·UI 문자열·문서·영상 어디에도 넣지 않는다.** `layoutId`는 `"Car 6, Business Class"`, 파일명은 `intercity-car-6.json` |
| 실제 객차 배치 | **사실 정보로만 참고.** 좌석 배열 규칙(2+2, 통로 위치, 화장실 위치)은 사실이라 저작권 대상이 아니다 |
| 로고·UI 스크린샷 | 사용 안 함. Before 목업도 자체 제작 (§14.3) |
| 법조문 인용 | 미국 연방 규정은 public domain |
| 배경음악 | 사용 안 함 |

> 이 프로젝트는 §21에서 "Wayfindr"와의 명칭 충돌을 이유로 개명을 결정했다. **같은 기준을 운영사 상표에도 적용한다.**

**모든 제출 자료는 영어로 작성한다.** 규칙: *"All Submission materials must be in English or, if not in English, the Entrant must provide an English translation of the demonstration video, text description, and testing instructions as well as all other materials submitted."*

- 텍스트 설명 (§14.2) — 영어
- 영상 나레이션·자막 (§14.3) — 영어
- README·실행 지침 (§14.4) — 영어
- 제품 UI 문자열 — 영어
- **이 PRD는 내부 문서라 번역 불필요** (제출물이 아님)

---

## 15. 일정 (실질 ~1.5일)

**현재: 2026-09-02 (KST) · 마감: 2026-09-03 1:00 PM PDT = 2026-09-04(금) 05:00 KST**
**등록 마감도 동일 시각** — Devpost Join Hackathon을 먼저 해둔다 (Block A 순서 0)

착수 시점 기준 남은 시간은 **약 36시간**이고 코드는 아직 0줄이다. §6.1 MVP를 그대로 다 하기에는 부족하므로, 아래 3블록으로 압축하고 **사전에 자를 것을 정해 둔다.**

### Block A — 엔진과 툴 (9/2 중)

| 순서 | 작업 | 완료 신호 |
| --- | --- | --- |
| 0 | **Devpost 계정 생성 + Join Hackathon** | 등록 확인. 등록 마감이 제출 마감과 **동시각**(9/3 1:00 PM PDT)이므로 지금 해둔다 |
| 1 | **WebMCP 시그니처 확인** — `document.modelContext`, `registerTool` 옵션, `execute` 반환 형식, 툴 이름 점 문자 실동작 | 빈 HTML + 툴 1개를 Chrome 149 플래그 환경에서 등록·호출 성공 |
| 2 | 무브랜드 객차 fixture (~60석) + 랜드마크 5종 | JSON 로드 |
| 3 | **경로 엔진** + `node --test` 7케이스 | 전부 통과 (§9.6) |
| 4 | Query / Compare 엔진 | 조건 조합 테스트 통과 |
| 5 | Application 9개 + `ToolResult` + 에러 매핑 | — |
| 6 | WebMCP 어댑터 9종 등록 + capability guard | Chrome에서 9종 호출 |

> 순서 1이 막히면 **여기서 즉시 방향을 재검토한다.** 다른 순서를 먼저 진행하지 않는다.

### Block B — 최소 UI와 배포 (9/3 낮)

| 순서 | 작업 | 완료 신호 |
| --- | --- | --- |
| 7 | 좌석 그리드 + ARIA + 키보드 (UI6) | 에이전트 없이 완주 |
| 8 | 하이라이트 + 툴 로그 + 선택 패널 + 확인 다이얼로그 | 화면에서 툴 실행이 보임 |
| 9 | HTTPS 배포 (Netlify drop) | 공개 URL |
| 10 | **ChatGPT 인앱 브라우저 실전 테스트 + 눈 감고 완주** → friction 수정 | 모니터 끄고 confirm까지 완주 |

### Block C — 제출 (9/3 밤 ~ 9/4 새벽, 규칙상 필수)

| 순서 | 작업 | 완료 신호 |
| --- | --- | --- |
| 11 | **영상 녹화** (3분 미만, 오디오 포함) + YouTube **공개** | URL |
| 12 | 저장소 공개 + `LICENSE`(MIT) + README | GitHub About에 MIT 표시 |
| 13 | 텍스트 설명 4항목 (§14.2 초안 사용) | — |
| 14 | Devpost 제출 | 확인 메일 |

### 자르는 순서 (미리 정함)

시간이 부족할 때 위에서부터 자른다. **Block C는 어떤 경우에도 자르지 않는다** — 규칙상 필수이고 누락 시 실격이다.

1. **규약 문서 `SPEC.md` (§12)** — 논지 완성에 좋지만 제출 요건 아님. 대신 README에 호텔 매핑 표만 축약해 넣는다
2. **경로 SVG 오버레이 (UI3)** — 화살표 대신 경로상 좌석 셀을 하이라이트하는 것으로 대체
3. **`compare` 툴** — 8종으로 줄이고 §13.1·§14.2의 "9종" 표기를 함께 수정
4. **`RenderOptions`의 `clock`/`cardinal`** — `relative`만 남기고 `units`(feet/steps)만 유지. 단 §9.4 데모(같은 데이터, 다른 표현)가 Creativity 논거이므로 **최후에 자른다**

### 자르지 않는 것

- **순서 10의 눈 감고 완주 테스트.** 여기서 나오는 발견이 제출 글의 서사이고 Execution 점수를 좌우한다
- **UI6 (에이전트 없이 동작).** 이게 깨지면 "AI 없으면 못 쓰는 접근성 앱"이 되어 논지 자체가 무너진다
- **`units: "steps"`의 근사 경고(`unitsNote`).** P7의 실행이고, 우리가 문헌을 읽었다는 증거다

---

## 16. 기술 스택 & 플랫폼

| 항목 | 선택 | 비고 |
| --- | --- | --- |
| 스택 | Vite + TypeScript (프레임워크 최소) | 2일 일정. React는 선택 |
| 툴 등록 | `document.modelContext.registerTool(def, { signal })` | 규칙 원문에 명시된 API |
| 해제 | `AbortController` | 앱 unmount 시 abort |
| Tool metadata | **정적** | 동적 정보는 `get_layout`으로 |
| 상태 | 로컬 App Store만 | 서버·DB 없음 |
| 배포 | Netlify / Vercel / Cloudflare | HTTPS 필수 |
| 테스트 | ① Chrome 149+ (`chrome://flags/#enable-webmcp-testing`) ② ChatGPT Desktop 인앱 브라우저 | 규칙이 명시한 심사 환경 |
| 단위 테스트 | `node --test` | 프레임워크 없이 |

### 16.1 부트스트랩 capability

```ts
type WebMCPCapability = "available" | "unsupported" | "insecure-context" | "registration-failed";
```

```
window.isSecureContext === false                          → "insecure-context"
typeof document.modelContext?.registerTool !== "function" → "unsupported"
registerTool 가 throw (NotAllowedError 등)                → "registration-failed"
그 외                                                     → "available"
```

`available`이 아니면 UI8 배너. 좌석 탐색은 정상 동작.

### 16.2 어댑터 wire 매핑

```
{ ok:true,  ... } → { content: [{ type:"text", text: JSON.stringify(payload) }] }
{ ok:false, ... } → { content: [{ type:"text", text: JSON.stringify(payload) }], isError: true }
```

`execute` 안에 비즈니스 로직 없음 — `application.*` 호출 + `toWire()`만.

### 16.3 기타

- **MVP는 top-level document에서만 등록.** same-origin iframe은 `tools` Permissions Policy상 동작하나 범위 밖
- 데이터가 로컬 fixture이므로 `untrustedContentHint` 미사용

---

## 17. 커뮤니케이션 원칙

**과장 금지.** "시각장애인이 이제 웹을 쓸 수 있다" 류는 역효과다.

톤: *"공간 선택이라는 특정 실패 지점에 대해, 재사용 가능한 툴 규약 하나를 제안한다."*

**명시할 한계:**
- 당사자 테스트 부족 — 저자의 눈 감고 테스트가 전부다
- 단일 객차 범위, 가상 fixture (실제 배치를 참고했으나 실제 데이터 아님)
- 걸음 수는 측정 거리로부터의 근사 변환
- 실제 예매 미연동
- 호텔은 구현이 아니라 규약 문서로만 증명

**다음 단계:** 실측 보정, 실제 운영사 데이터 연동, `a11y.*`를 W3C 커뮤니티 그룹 이슈로 제출, GTFS-Pathways 확장 제안.

정직한 범위 설정이 Potential Impact 점수에 유리하다 — 심사 기준이 "시연된 내용에 근거해" 판단하기 때문이다.

---

## 18. 리스크

| 리스크 | 영향 | 대응 |
| --- | --- | --- |
| **착수 시점 잔여 ~36시간, 코드 0줄** | **최상** | 호텔 구현 포기. UI 최소화. **자르는 순서를 §15에 사전 확정** — 판단이 필요한 시점에 판단하지 않기 위해 |
| ChatGPT 인앱 브라우저에서 툴이 안 잡힘 | 높음 | D1 순서 1에서 최우선 확인. Chrome 플래그 환경을 백업 데모로 |
| 툴 이름 점(`.`) 거부 | 중 | `a11y_*` 폴백. 규약 논지는 접두사 규칙이므로 유지 |
| 경로 엔진이 예상보다 복잡 | 중 | 단일 통로·단일 층만. `elevator` 세그먼트 생성 안 함 |
| blocking `confirm`이 에이전트 턴을 붙잡음 | 중 | 120초 timeout + status 복원 |
| 당사자 검증 부재 | 높음 | 눈 감고 테스트를 자르지 않음. 제출 글에 한계 명시 |
| 영상 오디오 누락 / LICENSE 미인식 | **실격** | §14 체크리스트를 제출 직전 재확인 |
| **제출물에 타사 상표 혼입** — 운영사명, 실제 사이트 화면 녹화, 배경음악 | **실격** | §14.5 가드레일. Before 목업 자체 제작, `layoutId` 무브랜드, BGM 없음 |
| **제출 자료가 영어가 아님** | **실격** | 규칙이 영어 또는 영어 번역을 요구. 설명·영상·README·UI 전부 영어 (§14.5) |
| **Devpost 등록 누락** | **실격** | 등록 마감 = 제출 마감 동시각. Block A 순서 0에서 선행 |
| WebAIM #11 결과 발표(9월) | 낮음 | #10 인용 시 판번호·조사 시점 명시 |

---

## 19. 열린 질문

| # | 질문 | 상태 |
| --- | --- | --- |
| 1 | 툴 이름 점(`.`) 허용 여부 | **스펙상 제약 없음 확인** (§7.1). 호스트 실동작만 Block A 순서 1에서 확인 |
| 2 | `execute`가 per-call `AbortSignal`을 받는지 | Block A 순서 1에서 확인 (confirm timeout 구현 방식 결정) |
| 3 | 보폭 기본값 0.75m의 근거 | 성인 평균 추정치. `unitsNote`로 근사임을 고지하므로 허용 |
| 4 | 프로젝트명 | §21 — **결정 필요** |
| 5 | 리서치 출처 중 재확인 필요 항목 | §20 |

---

## 20. 출처

**법·표준**
- 28 CFR 36.302(e) 및 DOJ 해설 (28 CFR Part 36, App. A) — 호텔 예약 접근성 정보 의무
- 49 CFR 38.111 / 38.123 / 38.125(d) / 38.127 — 도시간 철도차량 접근성
- 14 CFR 382.41 / 382.61 / 382.81 — ACAA 좌석 단위 고지·이동 팔걸이
- 2010 ADA Standards §224.2, §224.5, §806 — 접근 가능 객실
- GTFS-Pathways `pathways.txt` / `levels.txt` — MobilityData
- OSDM (UIC IRS 90918-10) PRM 챕터 — `walkSpeed`, `additionalTransferTime`
- ITU-T F.921 (구 Wayfindr Open Standard)

**시각장애 사용자 연구**
- Biggs, Toth, Coughlan & Walker, arXiv 2605.07849 (2026-05) — 지도 vs 표, n=40
- Alharbi et al., "Misfitting With AI", ASSETS '24 — n=26
- Adnin & Das, CHI 2024 — n=16, 일지 316건
- Chang et al., ASSETS '25 — ChatGPT 라이브 영상, n=8
- Stangl et al., ASSETS '21 — 맥락 의존적 설명 요구, n=28
- WebAIM Screen Reader User Survey #10 (2023-12~2024-01, n=1,539)
- Dietrich, Hertrich & Ackermann, *BMC Neuroscience* 14:74 (2013) — 초고속 음성 이해
- Commarford et al., *Human Factors* 50(1) 2008 — 청각 메뉴 broad vs deep
- W3C-OGC Maps for the Web 워크숍 보고서 (2020)
- Taylor, UsableNet (2026-08-11) — 항공사 좌석맵 1인칭
- TSBVI, "Using Landmarks in O&M"; Giudice & Long, *Foundations of O&M* 3rd ed. Ch.2
- Vanderbilt IRIS Center — 걸음 세기에 관한 O&M 입장

**재확인 필요 (검색 인덱스 경유, 원문 미확보):**
- Wayfindr Open Standard 세부 (wayfindr.net DNS 장애)
- ACM DL 일부 논문 원문 (403)
- AFB 2025 설문 전체 PDF
- NFB 결의안 2024-08 원문

---

## 21. 프로젝트명

**"Wayfinder"는 쓰지 않는 것을 권한다.**

**Wayfindr**는 실존 조직이며, 그들의 Open Standard가 **ITU-T F.921**로 채택됐다 — 접근성 오디오 내비게이션 분야의 세계 유일 국제 표준이다. 한 글자 차이이고 같은 분야다. 심사위원이 혼동하거나, 최악의 경우 상표 문제가 된다. 대회 IP 조항은 상표권 침해를 명시적으로 금지한다.

대안:

| 이름 | 근거 |
| --- | --- |
| **Bearing** | O&M 용어(방위). 짧고, 도메인 정확, 충돌 없음 |
| **Reckoning** | dead reckoning — 시각장애 보행의 실제 인지 기제 |
| **Aisle** | 구체적·기억하기 쉬움. 다만 호텔 확장 시 어색 |
| **PriorSpace** | "가기 전에 아는 공간" — 우리 빈틈을 직접 지칭 |

이 문서는 잠정적으로 **Bearing**을 사용한다.
