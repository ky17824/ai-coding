# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-08-17
- Primary product surfaces: 랜딩, 인증·온보딩, 단계별 준비도 진단, Gate 판정, 론칭 대상 정의, AI 시장·경쟁 사전조사, 준비 3단계 후 실제 판매 가능성 예비검증, AI GTM 공동계획, 대시보드·여정, 계획 보고서, 유료 AI 전문가 서비스
- Evidence reviewed: live `https://global-gtm.vercel.app/en/dashboard`, `app/page.tsx`, `app/globals.css`, `public/fonts/PretendardVariable.woff2`, `components/site-header.tsx`, `components/assessment-form.tsx`, `components/gtm-assistant.tsx`, `components/google-button.tsx`, `components/signin-form.tsx`, `components/signup-form.tsx`, `app/auth/callback/route.ts`, `app/account/actions.ts`, `app/api/gtm-assistant/turn/route.ts`, `app/api/gtm-plans/[id]/export/route.ts`, `lib/gtm-assistant.ts`, `app/dashboard/page.tsx`, `app/journey/page.tsx`, `supabase/migrations/005_ai_gtm_assistant.sql`, `scripts/build-questionnaire-docx.js`, `docs/survey/*.docx`, `docs/specs/2026-08-04-auth-account-design.md`, `.omx/plans/2026-08-05-ai-gtm-assistant-plan.md`, `.omx/plans/2026-08-10-progressive-gate-ai-assistant.md`, `.omx/plans/2026-08-11-kakao-login-integration.md`, `.omx/plans/2026-08-11-full-english-localization.md`, external reference `DESIGN-starbucks.md`
- Observed fact: 기존 UI는 `--ink`, `--green`, `--green-dark`, `--mint`, `--paper` 토큰과 흰색 panel, 12px 내외 radius, 짧은 상태 문구를 공통으로 사용한다.
- Observed fact: 현재 AI GTM 어시스턴트는 목표국가·목표고객·자원·기한·제약만 받고 바로 계획을 만들며, 론칭할 제품·서비스·솔루션과 시장규모·경쟁사 조사 결과를 수집·검토·저장하는 단계가 없다.
- Observed fact: 대시보드의 단계 통과 카드가 `gate_messages`의 공통 접두문 `필수 선결 조건이 남았습니다 —`를 항목마다 그대로 출력해 같은 상태 문장이 반복된다.
- Observed fact: v4.0의 55문항은 과거 결과 재현을 위해 동결하고, 신규 v5.0은 46개 질문은행과 진출 방식·목표국가·답변 상태에 따른 적용성 판정을 사용한다.
- Observed fact: Google 로그인은 Supabase `signInWithOAuth`와 공통 `/auth/callback`을 사용하므로 Kakao도 같은 인증 경로를 재사용할 수 있다.
- Observed fact: `profiles.email`은 필수지만 OAuth 콜백은 이메일이 없는 사용자를 조직 생성 전에 차단하지 않고, 로그인 화면은 콜백 오류 query를 사용자 문장으로 표시하지 않는다.
- Observed fact: 현재 계정 탈퇴는 Supabase 계정만 익명화·삭제하고 외부 OAuth provider 연결 해제는 수행하지 않는다.
- Product decision: 실제 판매 가능성 예비검증은 준비 3단계 도달, 현재 필수 문항 완료, 보류 문항 0개, 모든 Critical 충족을 함께 만족할 때만 제공한다. 문항 개수만으로 판정하지 않는다.
- Product decision: 초기 목표국가와 그 국가의 목표 고객군은 준비 1단계에서 정하기 시작하되, 준비 2단계 통과 기준(Stage Gate) B를 통과해 준비 3단계로 이동하기 전에는 창업자가 직접 입력하고 확정해야 한다. AI가 질문 답변에서 추정한 값은 확정값으로 인정하지 않는다.
- Product decision: 국내 유료 판매 경험이 없으면 준비 1·2단계를 즉시 차단하지 않고 초기 목표국가의 유료 실증시험(PoC) 또는 파일럿 검증을 90일 이월 과제로 둔다. AI GTM 어시스턴트는 30·60·90일 계획을 모두 제공하고, 준비 3단계 종료 전 계약·발주·결제 또는 고객의 비용·시간 투입 증거가 확인되어야 단계 통과 기준(Stage Gate) C를 통과한다. 다른 준비 1단계 Critical 문항과 80% 가중점수 기준은 그대로 유지한다.
- Product decision: 카카오 로그인은 Supabase의 기본 Kakao provider와 기존 PKCE callback을 재사용한다. 첫 버전은 `account_email`을 제공한 계정만 허용하며 신규 OAuth 사용자는 기존 회사 정보·연락처·필수 동의 온보딩을 완료한다. 기존 계정 이력은 Supabase가 동일 identity로 실제 연결한 경우에만 이어진다.
- Design inference: AI 화면도 별도 챗봇 브랜드가 아니라 Borderless 실행 여정의 한 단계로 보여야 한다.

## Brand

- Personality: 차분하고 실무적이며 근거 중심인 한국 스타트업 글로벌 진출 코치
- Trust signals: 결정론적 점수·Gate 불변, 출처, 확인 필요 표시, 승인된 전문가, 명시적 사용자 승인
- Avoid: 과장된 AI 표현, 성공 보장, 네온·유리효과 중심의 AI 전용 미학, 과도한 캐릭터·말풍선, 출처 없는 단정

## Product goals

- Goals: 창업자가 이메일·Google·카카오 중 익숙한 인증 수단으로 같은 진단·계획 이력에 안전하게 접근하고, 현재 필수 문항만 답해 즉시 가치를 받도록 한다. 첫 미통과 Gate의 질문별 격차를 계획·실행·증거·재진단으로 닫아 다음 단계로 이동하게 한다. 준비 2단계까지 초기 목표국가와 목표 고객군을 직접 확정하고, 계획을 만들기 전에는 `무엇을·누구에게·어디에서` 론칭하는지 정의하며, 출처가 있는 시장·경쟁 사전조사와 창업자 확인을 거친다. 실제 판매 가능성 예비검증은 현재 필수 문항·보류·Critical 조건으로 판정한다. 사용자는 진단 문항과 연결된 AI 전문가 또는 패키지를 결제한 뒤, 부족한 정보를 보완하고 GPT-5.6 Sol의 조사·분석·실행계획을 주문별 작업공간에서 받는다.
- Non-goals: 자유 채팅, AI 재채점, 실제 인터뷰 수행, 파트너 확보 보장, 법률·세무·규제·계약 효력 확정 판단
- Success signals: 단계별 완료율, 론칭 정의 완료율, 사전조사 검토·보고서 포함률, 준비 3단계 진단의 실제 판매 가능성 예비검증 확인률, 첫 Gate 판정 후 AI 계획 시작률, 계획 승인·30일 실행률, 재진단 통과율, 보고서 다운로드율, 전문가 brief 확인률

## Personas and jobs

- Primary personas: 글로벌 진출을 준비하는 한국 스타트업 대표·실무 책임자
- Secondary personas: 승인된 멘토·컨설턴트, Borderless 운영 관리자
- User jobs: 현재 Gate와 질문별 충족 상태 이해, 지금 답할 문항만 완료, 다음 단계 진입 또는 조기 계획 전환, 글로벌 론칭 제품·서비스·솔루션 정의, 초기 목표시장과 고객 명시, 시장규모·동향·경쟁 구도 검토, 준비 3단계 후 실제 판매 가능성의 근거·공백 확인, 질문과 연결된 실행 책임·기한·완료 증거 합의, 재진단 시점 결정, 현장 전문가가 필요한 시점 식별
- Key contexts of use: 데스크톱 중심 계획 워크숍, 모바일에서 상태 확인·간단 수정, 느린 네트워크 또는 AI 장애 가능

## Information architecture

- Primary navigation: 대시보드 / 준비도 진단 / GTM 여정 / AI 전문가 서비스 / 계정
- Core routes/screens: `/signin`·`/signup` 이메일·Google·카카오 인증 → `/auth/callback` 공통 OAuth 처리 → `/account/onboarding` 신규 OAuth 사용자 정보·동의 보완 → `/assessment` 현재 필수 문항과 목표시장·진출 방식 확인 → 단계 판정 → `/assistant/[assessmentId]` 론칭 대상 정의 → 시장·경쟁 사전조사 검토 → `/api/gtm-plans/[id]/export?view=1` 종합 시장보고서 → 판매 가능성 예비검증 또는 사전조사 → 공동계획 또는 다음 Gate → `/dashboard` 목표시장·질문별 실행·증거 현황 → `/assessment/[assessmentId]/recheck` Gate 재확인 → `/journey` 실행 보드 → 계획 보고서 → `/services` AI 전문가·패키지 선택 → `/services/[id]` 범위·가격 확인 → 결제 → `/orders/[id]` 입력·보완질문·가정 확인·보고서
- Content hierarchy: 현재 필수 문항과 보류·해당 없음 요약 → 초기 목표국가·목표고객·진출 방식 확인 → 결정론적 Gate 판정 → 공통 상태 요약 1회와 개별 보완 항목 → 질문별 충족·근거 상태 → 론칭 대상 정의 → 시장·경쟁 사전조사와 가정 확인 → 판매 가능성 예비검증 또는 검증 보류 안내 → 허용된 기간 범위의 계획 초안 → 질문과 연결된 실행 → 증거 제출 → Gate 재확인 → 다음 단계 해제 → 다운로드·전문가 handoff
- The assistant is entered from a saved assessment only; it is not a global chat entry in primary navigation.
- Later-stage questions are not visible or navigable until the immediately preceding Gate passes.
- The assistant uses one route with three explicit workspace steps: `1 론칭 정의`, `2 시장·경쟁 사전조사`, `3 실행 계획`. 준비 3단계·보류 0·Critical 충족·현재 필수 문항 완료 시에만 2단계 안에 `실제 판매 가능성 예비검증`을 추가한다. Free-form chat does not replace these steps.

## Design principles

- 근거가 대화보다 먼저다: 단계·Gate·우선 액션을 고정 영역에 먼저 보여준다.
- 론칭 대상이 계획보다 먼저다: 제품·서비스·솔루션, 해결 문제, 핵심 가치, 목표 고객과 국가가 없으면 시장·경쟁 사전조사와 실행계획을 시작하지 않는다.
- 조사와 검증을 혼동하지 않는다: 시장규모·동향·경쟁사 자료는 기회에 대한 사전조사이며 판매 가능성의 증거가 아니다. 실제 판매 가능성 예비검증은 준비 3단계와 적용 가능한 고객 행동·지불·반복 증거를 함께 확인할 때만 표시한다.
- 조사와 계획을 분리한다: 창업자가 시장규모·동향·경쟁사·가정을 확인한 뒤에만 그 결과를 실행계획의 근거로 사용한다.
- 한 번에 한 결정: 질문은 한 개씩, 계획 승인은 전체 초안을 검토한 뒤 한 번만 요구한다.
- 첫 가치까지 짧게: 첫 미통과 Gate에서 진단을 끝내고 바로 계획으로 전환하며, 통과하지 못한 뒤 단계의 문항 수와 점수를 보여주지 않는다.
- 질문이 진행률의 기준이다: 대시보드는 계획 개수보다 `충족 / 근거 보완 / 보완 필요 / 잠김` 문항 수를 먼저 보여주고 각 계획이 어떤 질문을 보완하는지 연결한다.
- 추천은 실행 맥락 안에 둔다: 대시보드는 준비도와 답변 진단에 집중하고, 현재 액션과 연결된 AI 전문가 추천은 GTM 여정의 실행 보드가 끝난 뒤 충분한 여백을 둔 독립 섹션에서 제공한다.
- AI 전문가 목록은 업무와 묶음 상품을 구분한다: 7개 전문가는 필요한 업무만 고르게 하고 4개 패키지는 여러 업무를 묶어 보여준다. 목록 카드에는 반복 제공자 정보 대신 주요 결과물 2개와 부가세 경계를 먼저 표시한다.
- 점수와 응답 분포를 분리한다: 큰 막대는 `3·4단계 응답 문항의 배점 합 / 단계 최대점수`와 80% 기준선을 보여주고, 얇은 막대는 1~4단계 응답 구성만 보여준다. 항목별 점수와 단계 합계가 같은 산식으로 검산되어야 한다.
- 상태는 한 번, 행동은 항목마다 말한다: `선결 조건이 남았습니다` 같은 공통 문장은 카드 제목에서 한 번만 표시하고 각 행에는 고유한 조건, 현재 상태, 다음 행동만 보여준다.
- 긴 조사 결과도 영역을 침범하지 않는다: 보고서 본문은 검증된 출처를 `[1]`, `[2]` 인용번호로 표시하고, 전체 URL과 서지정보는 마지막 참고문헌에 모은다. 같은 출처는 같은 번호를 재사용하며 카드와 표에는 원시 URL을 노출하지 않는다.
- 시장 정의는 추정하지 않는다: 목표국가와 목표 고객군은 창업자가 명시적으로 확인한 구조화 값만 Gate B와 AI 조사 입력에 사용한다.
- AI와 사람의 경계를 보인다: 내부 근거, 외부 사실, AI 가정, 전문가 확인을 라벨로 구분한다.
- 결제 후에도 통제권은 사용자에게 있다: AI 전문가는 저장된 답변을 재사용하고 결과를 바꾸는 누락정보만 최대 2회 질문한다. `모름`은 중단이 아니라 유사사례 가정으로 전환하며, 사용자가 가정을 확인한 뒤에만 최종 보고서를 만든다.
- 인증 수단이 달라도 계정은 하나다: 확인 이메일이 같은 OAuth identity는 같은 사용자 이력으로 연결하고 provider별로 별도 제품 경험을 만들지 않는다.
- 인증 실패는 복구 행동을 말한다: callback 코드나 provider 오류를 노출하지 않고 재시도·이메일 로그인의 다음 행동을 안내한다.
- 실패해도 진단은 남는다: AI·검색 장애 시 결정론적 액션을 사용할 수 있어야 한다.
- 무료 조사 한도는 막다른 오류가 아니다: 3회를 사용한 뒤에는 재시도를 숨기고 마지막 종합 시장보고서를 기본 선택으로 제공한다. 저장된 결과가 있을 때만 더 깊은 조사를 위한 AI 시장정보·시장규모 전문가를 보조 선택으로 안내한다.
- Tradeoffs: v4.0 결과의 재현성과 v5.0 고정 질문은행의 비교 가능성을 보존하되, 모든 문항 상시 노출보다 조건부 완주와 조기 가치를 우선한다.

## Visual language

- Color: Starbucks의 색상값이나 상표 표현을 복제하지 않고 역할 기반 운영 원칙만 Borderless 팔레트로 번역한다. `brand`는 제목·수치·선택, `action`은 주요 행동, `deep`은 헤더·핵심 밴드, `uplift`는 hover·보조 강조, `tint`는 완료·선택 배경에만 사용한다. 페이지는 따뜻한 cream canvas → white content surface → deep-green feature band의 단색 리듬을 사용한다. warning·danger 색은 상태 의미에만 쓰며 장식용으로 사용하지 않는다.
- Typography: 자체 호스팅한 `Pretendard Variable` 하나를 웹 화면과 HTML 보고서에 사용한다. Display 48px, Page title 36px, Section title 24px, Body 16px, Label/metadata 13~14px의 다섯 단계가 기본이며 화면 폭에 따라 `clamp()`로만 축소한다. 제목은 700~850, 본문은 400~500, 메타·출처는 500~650을 사용하고 영문도 같은 semantic scale을 공유한다. SoDoSans·serif·script 글꼴과 `html { font-size: 62.5% }` 방식은 도입하지 않는다.
- Typography principle (2026-08-18): 한 페이지에서 Page title 크기(36~40px)는 `h1` 하나만 쓴다. 카드·패널 안의 헤드라인(진단 총평, 요약 카드 등)은 Section title 24px 이하로 두어 페이지 헤더와 위계가 겹치지 않게 한다. 판정과 이유가 콜론으로 이어지는 헤드라인은 “판정:” / “이유” 두 줄로 나눠 표시한다.
- Spacing/layout rhythm: 4/8/16/24/32/48/64px 간격만 기본 scale로 사용한다. 모바일 outer gutter 16px, 태블릿 24px, 데스크톱 40px을 사용하며 콘텐츠 최대 폭은 기존 1180px을 유지한다. 데스크톱 assistant는 요약 280~320px + 본문 1fr의 2열, 900px 이하에서는 1열이다. 섹션 구분은 선보다 여백과 surface 전환을 우선한다.
- Shape/radius/elevation: 기본 panel·card radius는 12px, 큰 feature band는 16px, button·status chip은 full-pill, icon·avatar는 원형으로 제한한다. 카드 표면은 저농도 2단 shadow만 사용하고 강한 3D edge는 기본 버튼에서 제거한다. 짙은 배경의 핵심 전환 CTA에는 white inverted surface와 한 단계 더 분명한 shadow를 허용하되 geometry·focus·motion은 공통 버튼과 같다.
- Buttons (2026-08-19, 정돈·규격·통일): 변형은 `primary`(짙은 녹, 주요 행동) · `soft`(연녹 `--mint`, 흰 카드 위 보기·이동·다운로드·재시도) · `ghost`(흰, 되돌리기·취소·이전과 크림 캔버스 위 보조) · `light`(흰 inverted, 짙은 밴드) 넷뿐이며 `--small`(42px, 카드·표·헤더 안)과 `--full`만 조합한다. 배경 × 행동 매트릭스 — 흰 카드: primary/soft/ghost, 크림 캔버스: primary/ghost/ghost, 짙은 밴드: light/light/없음. 한 카드에 버튼 3개 이하·primary 1개 이하. 색·높이·그림자·모션은 `.button` 블록 한 곳에서만 정하고 페이지 CSS는 여백·폭·grid 배치만 건드린다(`lib/button-rules.test.ts`가 지킨다). 이동 버튼의 화살표는 문구 안 “→” 대신 `<span aria-hidden="true">→</span>`로 두어 hover 모션을 공유한다. 빨간 버튼은 두지 않는다.
- Motion: 공통 버튼은 180ms 이내 색상·shadow 전환과 active `scale(0.97)`만 사용한다. hover에서 레이아웃 위치를 이동하지 않는다. 랜딩의 설명 애니메이션은 정보 이해를 돕는 경우에만 유지하고 사용자가 상호작용하면 정지할 수 있어야 한다. `prefers-reduced-motion`에서는 이동·scale·자동 스크롤·transition을 제거한다.
- Imagery/iconography: 새로운 AI 일러스트·stock photography·아이콘 라이브러리를 추가하지 않는다. 제품의 실제 증거를 설명하는 데이터 미리보기와 단순 선형 아이콘만 사용하며 구조적 gradient·glassmorphism·과도한 blur를 사용하지 않는다.
- Page rhythm: 공개 랜딩은 cream hero → white explanation → deep-green conversion band, 인증은 cream canvas 위 white card, 앱은 cream canvas 위 white panels, 보고서는 deep-green cover → metadata → executive summary·decision → market evidence → bibliography 순서로 같은 토큰을 사용하고 인쇄 시 shadow·고정 toolbar를 제거한다.

## Components

- Existing components to reuse: `SiteHeader`, 역할 기반 표면과 full-pill geometry를 공유하는 `.button` variants, `.panel`, `.notice-banner`, `.hold-banner`, `.priority`, `.meter`, `.offering-picker`, 서비스 카드, 기존 PortOne `CheckoutButton`, 주문 상세 화면
- New/changed components: provider별 설정을 받는 `SocialLoginButton`, 허용된 callback 오류를 설명하는 `AuthErrorNotice`, 단계 잠금형 `AssessmentForm`, `TargetMarketConfirmation`, `GateDecision`, 중복 접두문을 제거한 `GatePrerequisiteSummary`, 통과 인정점수와 응답 분포를 분리한 `GateScoreChart`, 3단계 작업영역을 갖는 `GtmAssistant`, `LaunchDefinitionForm`, `MarketResearchBrief`, `ResearchCoverageSummary`, `MarketSizingTable`, `MarketTrendSection`, `CompetitorTable`, `SourceList`, `ComprehensiveMarketReport`, 준비 3단계 전 `ValidationDeferredNotice`, 준비 3단계 후 `OfferingValidationSummary`, `GateProgressSummary`, `QuestionProgressList`, `GateRecheck`, 계획 보고서 다운로드, AI 상품 카드·상세, 결제 후 `AiAgentWorkspace`, AI 결과 보고서
- Variants and states: Gate locked/active/passed/stopped, target market missing/partial/confirmed, question satisfied/evidence_needed/improvement_needed/locked, assistant context_draft/researching/review_required/confirmed/plan_draft/active, market source/assumption/estimate/confirmation_needed, offering validation deferred/preliminary_reviewed, plan draft/active/superseded/completed, item not_started/in_progress/blocked/completed, founder/vault/web/deterministic source
- Research quota state: `research_limit`은 danger alert가 아니라 neutral decision state다. 저장된 보고서 활용을 첫 CTA로, AI 전문가 상세를 두 번째 CTA로 제공하며 저장된 결과가 없으면 유료 전환을 노출하지 않는다.
- Token/component ownership: 전역 토큰과 공통 상태는 `app/globals.css`; assistant 전용 레이아웃도 같은 파일의 기존 토큰을 사용한다.
- Do not add a component library, Tailwind layer, icon package, font package, or 별도 design-token abstraction. `:root`의 작은 semantic token 집합과 기존 class를 단일 source로 사용한다.
- 소셜 로그인은 공급자 이름과 로고가 보이는 접근 가능한 이름을 유지하면서 공통 버튼 규격을 따른다. 삭제·환불처럼 되돌리기 어려운 행동은 위험 의미를 색 이외의 문구로도 명확히 표시한다.

### 카카오 로그인

- 로그인·가입 화면은 `카카오로 계속하기`, `Google로 계속하기`, 단일 `또는` 구분선, 이메일 인증 순으로 표시한다. 활성화된 provider가 없으면 소셜 영역과 구분선을 모두 숨긴다.
- 카카오 버튼은 Kakao Developers가 제공한 공식 300×45·600×90 wide PNG를 locale별 width `srcSet`으로 사용한다. 원본 20:3 비율, 심볼·문구·색상·12px radius를 변형하지 않고 큰 원본을 기본값으로 사용해 글자 선명도와 accessible name, 공통 focus-visible·disabled 상태를 유지한다.
- 버튼을 누르면 `카카오로 이동 중…`으로 바꾸고 중복 제출을 막는다. 시작 실패, 동의 취소, callback 실패, 이메일 미제공, 설정 누락은 각각 재시도 또는 이메일 로그인으로 복구할 수 있는 한국어 문장으로 표시한다.
- 카카오 인증 뒤에는 기존 `/auth/callback`에서 session을 교환한다. 이메일이 없으면 조직·프로필을 만들기 전에 로그아웃하고 `카카오 계정에서 이메일 제공에 동의한 뒤 다시 시도하거나 이메일로 가입해 주세요.`를 표시한다.
- 신규 사용자는 기존 온보딩에서 회사명·직위·휴대전화·필수 동의를 입력한다. 기존 이력 연결은 `account_email`이 제공되고 Supabase identities에 기존 provider와 Kakao가 같은 사용자 UUID로 연결된 경우에만 허용한다. 이메일 문자열만으로 직접 계정을 합치지 않는다.
- callback에 OAuth 오류 query가 있으면 기존 session fallback보다 먼저 취소·실패로 처리한다. 이미 로그인된 사용자가 카카오 동의를 취소해도 성공한 것처럼 보이지 않아야 한다.
- 서비스 탈퇴 시 카카오 identity가 있으면 `identity_data.sub`의 숫자형 Kakao Service user ID를 검증해 서버에서 먼저 카카오 unlink를 완료하고 그 뒤에만 프로필 익명화와 Supabase 계정 삭제를 진행한다. Supabase identity UUID는 카카오 API에 보내지 않는다.
- unlink 성공 후 로컬 삭제가 실패한 재시도에서는 Kakao 관리자 사용자 조회를 사용한다. 조회 `200`은 아직 연결된 상태이므로 unlink를 다시 호출하고, HTTP `400`과 Kakao 오류 코드 `-101`만 이미 연결 해제됨으로 인정한다. `-401`·기타 4xx·timeout·5xx는 로컬 삭제를 중단한다.
- 현재 Supabase soft delete 뒤에도 복구 가능한 카카오 식별자가 남는지는 스테이징에서 확인해야 한다. 잔존 여부가 불명확하거나 정책에 맞지 않으면 카카오 운영 flag를 켜지 않는다.

```text
카카오로 계속하기
Google로 계속하기
──────── 또는 ────────
이메일
비밀번호
로그인
```

### 대시보드 단계 통과 선결 조건

- 카드 상단에는 `단계 통과 기준(Stage Gate) B`, `준비 3단계로 넘어가기 전 확인할 항목`, `3개 남음`처럼 현재 Gate와 전체 남은 수를 한 번만 표시한다.
- 준비 2단계에는 첫 묶음으로 `초기 목표시장 정의 0/2`를 표시하고 `초기 목표국가(Target Country)`와 `목표 고객군(Target Customer Segment)`을 각각 `미확정 / 확정` 상태로 보여준다. 둘 중 하나라도 미확정이면 Gate B는 통과하지 않는다.
- 그 아래에는 질문 기반 Critical blocker를 별도 목록으로 표시한다. 각 행은 반복 접두문 없이 `총 진입비용을 항목별로 계산해 주세요`, `글로벌 진출 책임자와 고정 투입시간을 정해 주세요`처럼 고유한 요구만 담는다.
- 각 행은 `분류`, `조건`, `현재 상태`, `다음 행동` 순서로 읽히게 하고 CTA는 시장 정의에는 `초기 목표시장 정하기`, 질문에는 `답변 보완` 하나만 제공한다.
- 준비 1단계 Gate A에는 아직 목표시장 확정을 강제하지 않고 질문 blocker만 표시한다. 목표시장 확정은 준비 2단계 진입 후 언제든 할 수 있지만 준비 3단계 진입 전에는 반드시 완료해야 한다.
- 확정된 목표국가 또는 고객군을 바꾸면 기존 시장·경쟁 사전조사는 `다시 확인 필요` 상태가 되며, 새 값으로 다시 확인하기 전에는 계획 근거로 확정하지 않는다.

```text
단계 통과 기준(Stage Gate) B                         3개 남음
준비 3단계로 넘어가기 전 확인할 항목

초기 목표시장 정의                                      0/2
○ 초기 목표국가                    미확정
○ 목표 고객군                      미확정      [초기 목표시장 정하기]

진단 답변                                               1개
! 총 진입비용을 항목별로 계산해 주세요    보완 필요      [답변 보완]
```

### AI GTM 어시스턴트 작업영역

- 1단계 `론칭 정의`: 기존 진단 요약 sidebar를 유지하고 본문 첫 카드에서 론칭 유형 `제품 / 서비스 / 솔루션 / 복합`, 론칭명, 한 문장 설명, 고객 문제, 핵심 가치, 고객의 현재 대안, 차별점, 제공 방식, 수익 방식, 현재 검증 근거를 받는다. 론칭 유형·론칭명·한 문장 설명·고객 문제·핵심 가치·목표국가·목표고객은 필수다.
- 2단계 `시장·경쟁 사전조사`: 조사 범위, 기준연도, 통화, 추정 단위와 가정을 먼저 보여준다. 결과는 시장동향, 전체시장(Total Addressable Market), 유효시장(Serviceable Available Market), 수익가능시장(Serviceable Obtainable Market), 교두보 시장(Beachhead Market), 직접·인접·대체 경쟁사, 확인이 필요한 공백 순서로 표시한다.
- 시장동향과 경쟁 구도는 각각 전체 폭의 독립 섹션으로 배치하고, 섹션 내부 항목만 데스크톱에서 다열·모바일에서 1열로 전환한다. 각 카드의 긴 문장과 출처 URL은 다른 카드로 넘치지 않아야 한다.
- 교두보 시장(Beachhead Market)은 유사 제품을 사고, 판매주기가 비슷하며, 입소문이 가능한 최초의 응집 고객군으로 정의한다. 직접 접근 가능한 고객 수와 연간 고객당 매출로 계산하고 인접시장 확장 경로를 함께 제시한다.
- 시장규모는 단일 숫자 대신 `낮음 / 기준 / 높음` 범위, 산식, 입력값, 기준연도·통화, 출처, 신뢰도와 제한을 함께 표시한다. 상향식 입력이 없으면 최근 공개자료의 독립적인 하향식 경로 2개 이상을 교차검증해 보수적으로 추정하고 대리 가정을 명시한다.
- 경쟁사는 최소 직접·인접·대체 유형을 구분하고 기업명, 대상 고객, 제공 가치, 가격·판매 방식, 강점, 차별화 기회, 출처·확인일을 표 또는 모바일 카드로 보여준다. 근거가 부족하면 개수를 채우기 위해 이름을 만들지 않는다.
- 조사는 `수요·성장`, `고객 행동`, `유통·채널`, `규제`, `제품·문화`, `직접 경쟁`, `인접 경쟁`, `대체재`의 8개 영역으로 나누어 수집한 뒤 하나의 결과로 합친다. 동일 URL과 동일 경쟁사는 서버에서 중복 제거하고, 정부·규제기관, 산업자료, 현지 유통·커머스, 기업 공식자료, 소비자·리뷰 자료의 구성과 고유 도메인 수를 함께 표시한다.
- 시장동향은 최대 10개, 경쟁 후보는 직접·현지·글로벌·인접·대체 유형을 합쳐 최대 12개까지 표시한다. 각 항목은 여러 출처와 시사점을 담을 수 있으며, 서로 충돌하는 자료는 숨기지 않고 `상충 근거`로 별도 표시한다.
- 조사 결과 상단에는 `조사영역 / 고유 출처 / 경쟁 후보` 요약을 제공하고, 핵심 인사이트와 핵심 경쟁 후보를 먼저 보여준 뒤 전체 결과를 펼쳐 볼 수 있게 한다. 같은 목표국가·제품 범주의 7일 이내 종합 조사 결과는 재사용하되, 입력이 바뀌면 새 조사 세대로 무효화한다.
- 조사 카드 하단의 `종합 시장보고서 보기`는 인증·조직 범위를 유지한 웹페이지 보고서로 이동한다. 보고서는 경영진 요약, 시장 정의와 규모, 영역별 동향, 경쟁 구도, 상충 근거, 다음 검증 과제, 전체 출처와 한계를 동일한 언어로 한 화면에 제공하고 인쇄 가능한 구조를 사용한다.
- 짙은 녹색 종합 시장보고서 CTA 안의 보기·다운로드 버튼은 동일 너비의 흰색 3D 표면과 짙은 녹색 글자를 사용하고, 높이·radius·hover·active·focus는 공통 `.button` 규격을 유지한다.
- 창업자는 `가정 수정`, `조사 다시 실행`, `이 조사로 계획 만들기` 가운데 하나를 선택한다. 명시적으로 확인하기 전에는 조사 결과를 계획 근거로 확정하지 않는다.
- `준비 1단계`와 `준비 2단계`에서는 `판매 가능성은 아직 판단하지 않습니다` 안내와 함께 조사 결과, 검증 가설, 다음에 모을 증거를 보고서에 넣는다. 뒤 단계의 미응답 문항은 실패나 0점으로 계산하지 않는다.
- 준비 3단계·보류 0·Critical 충족·현재 필수 문항 완료 시 2단계 하단에 `실제 판매 가능성 예비검증`을 표시한다. 결과는 `고객 문제 적합성 / 차별 가치 / 현지 적합성 / 지불 의사 / 증거 강도`별로 `확인 / 보완 필요 / 근거 부족` 상태와 근거 문항·증거를 보여준다. 하나의 성공확률 점수나 판매 보장은 표시하지 않는다.
- 실제 판매 가능성 예비검증의 근거 단계는 `가설 / 관심 / 행동 / 유료 / 반복`으로 표시한다. `유료`와 `반복`은 현재 적용 문항의 답변과 증거가 있을 때만 부여하며, AI 추론만으로 승격하지 않는다.
- 3단계 `실행 계획`: 확인된 론칭 정의와 시장·경쟁 사전조사, 결정론적 진단 액션을 함께 사용해 서버가 허용한 30·60·90일 범위만 생성한다. 계획 항목은 관련 조사 근거와 질문 ID를 계속 표시한다.

### GTM 여정 전문가 연결

- 계획 항목의 주 행동은 실행과 증거 제출이며, 외부 판단·현지 실행 역량이 필요한 항목에만 `전문가 연결`을 보조 버튼으로 표시한다. 텍스트 링크로 두지 않는다.
- 연결 후보는 저장된 `expert_required`를 우선하고 법률·세무·규제·계약·인증 판단, 유료 실증시험(PoC), 첫 주문, 현지 고객·파트너 검증 패턴을 보완 규칙으로 사용한다. 일반 내부 문서 작성에는 자동 노출하지 않는다.
- 버튼은 기존 `service_tag`를 승인·게시된 `service_offerings.tags`와 맞춰 관련 멘토·컨설턴트만 우선 표시한다. `legal`·`regulatory`는 `compliance`, `pilot`·`sales`는 `gtm`, `market`은 `market-validation`으로 정규화한다.
- 여정 카드의 `전문가 연결` 버튼은 짙은 갈색 배경과 흰색 문구로 일반 실행 버튼과 구분한다. 호버 시 버튼이 떠오르고 화살표만 4px 이동하며, 문구·레이아웃은 흔들리지 않는다.
- 일치하는 서비스가 없을 때는 빈 결과 대신 전체 승인 서비스를 보여주고 `현재 정확히 일치하는 전문가가 없어 전체 서비스를 안내합니다.`라고 설명한다.
- 계획 카드에서는 제목 아래에 작은 보조 버튼을 배치하며 카드 전체를 클릭 영역으로 만들지 않는다. 버튼의 accessible name에는 계획 제목을 포함한다.
- 전문가 연결은 추천이며 자동 주문·예약이 아니다. 서비스 상세에서 범위·가격·제공자와 산출물을 확인한 뒤 사용자가 결제한다.

## Accessibility

- Target standard: WCAG 2.1 AA 수준의 핵심 흐름
- Keyboard/focus behavior: 질문, 편집, 승인, 상태 변경 전부 Tab/Enter/Space로 가능하고 기존 `:focus-visible`을 유지한다.
- Contrast/readability: muted text도 흰 panel에서 읽히는 기존 대비 이상을 유지하고, 출처 유형을 색만으로 구분하지 않는다.
- Screen-reader semantics: 진행상황은 `role=status`, 오류는 `role=alert`, 질문 묶음은 heading/fieldset, 출처는 list, 비동기 버튼은 `disabled`와 상태 문구를 제공한다.
- Auth semantics: 소셜 버튼의 accessible name에 provider 이름을 포함하고, 처리 중에는 `disabled`와 화면에 보이는 상태 문구를 함께 제공한다. OAuth 오류는 `role=alert`로 한 번만 알린다.
- Gate prerequisite semantics: 남은 수는 제목과 연결하고, 시장 정의와 질문 blocker는 각각 제목이 있는 목록으로 구분한다. 상태 아이콘에는 `미확정`, `확정`, `보완 필요` 텍스트를 병기한다.
- Market research semantics: 시장규모는 시각적 막대만 사용하지 않고 실제 `<table>` 또는 정의목록으로 동일 정보를 제공한다. 작업 단계에는 `aria-current="step"`, 조사 진행에는 `aria-busy`, 경쟁사 표에는 caption을 제공한다. 판매 가능성 차원은 색만 있는 방사형 그래프 대신 제목·상태·근거가 있는 목록과 `role="meter"` 막대를 함께 제공한다.
- Reduced motion and sensory considerations: `prefers-reduced-motion`에서는 버튼의 3D 이동을 포함한 새 애니메이션을 끈다. 로딩은 회전 애니메이션 없이 텍스트로도 전달한다.

## Responsive behavior

- Supported breakpoints/devices: 기존 1080/900/620px 규칙과 최신 Chrome·Safari 모바일/데스크톱
- Layout adaptations: 900px 이하에서 요약 sidebar는 본문 위로 이동, 론칭 정의와 계획 편집 grid는 1열, 시장규모 표는 카드형 정의목록, 경쟁사 행은 세로 카드, source 메타는 줄바꿈한다.
- Touch/hover differences: 최소 42px 제어 높이, hover가 없어도 상태와 행동을 이해할 수 있어야 한다.

## Interaction states

- Loading: `시장 자료를 확인하고 있습니다` 또는 `계획을 준비하고 있습니다`와 현재 단계 표시, 중복 제출 방지. 조사 중 기존 입력과 직전 조사 결과는 유지한다.
- Auth loading: 카카오 또는 Google 인증을 시작한 버튼만 비활성화하고 `카카오로 이동 중…`, `Google로 이동 중…`을 표시한다.
- Empty: 저장된 진단이 없으면 준비 1단계 진단 CTA, 계획이 없으면 현재 Gate에 맞는 AI 계획 시작 CTA
- Error: 오류 원인과 재시도 또는 결정론적 계획 계속 사용을 함께 제공. 웹 조사가 실패하면 시장 수치·경쟁사를 만들지 않고 `조사 자료를 확인하지 못했습니다`를 표시한다. 준비 3단계 전에는 증거 부족을 오류로 표시하지 않고 `검증 보류` 상태로 설명한다.
- Auth error: provider callback 원문을 노출하지 않는다. 카카오 인증 미완료에는 재시도·이메일 로그인을, 이메일 미제공에는 카카오 동의항목 확인·이메일 가입을 안내한다. OAuth 취소 query가 있으면 기존 session이 있어도 성공 callback으로 진행하지 않는다.
- Success: 론칭 정의 저장, 시장·경쟁 사전조사 완료·창업자 확인, 준비 3단계 시 판매 가능성 예비검증 확인, 실행 항목 완료·증거 저장·Gate 재확인·다음 단계 해제, 계획 초안 생성·승인·다운로드를 각각 짧은 `role=status`로 확인
- Disabled: 뒤 단계는 잠금 아이콘과 `앞 단계를 통과하면 열립니다` 문구를 제공하고 클릭할 수 없게 한다. 처리 중·권한 없음도 비활성 이유를 인접 문구로 표시한다.
- Gate B blocked: 점수와 질문 Critical blocker를 모두 충족했어도 목표국가 또는 목표 고객군이 미확정이면 `준비 3단계` CTA를 비활성화하고 `초기 목표시장 2개 항목을 먼저 확정해 주세요`를 표시한다.
- Offline/slow network: 사용자 입력은 전송 완료 전 유지하고 네트워크 실패 시 다시 시도할 수 있게 한다.

## Content voice

- Tone: 존댓말, 짧고 실행 중심, 불확실성을 숨기지 않는 코치형 문장
- Korean standard: 사용자에게 보이는 한글은 표준어와 한글 맞춤법을 따르고, 완전한 문장은 `합니다`, `해 주세요`, `하셔야 합니다` 계열의 합쇼체로 통일한다. 버튼·상태칩처럼 문장이 아닌 짧은 제어 문구는 명사형 또는 행동형으로 쓸 수 있다.
- Spacing: 전문 용어라도 국어 문장에서는 `필요 정보`, `유사 사례`, `시장 규모`, `사업 모델`, `실행 계획`, `추가 질문`, `첨부 파일`, `카드 정보`, `결제 창`처럼 의미 단위로 띄어 쓴다. 제품명·법정 용어·고유 명칭은 공식 표기를 우선한다.
- Natural Korean: 번역투와 불필요한 AI 전문 용어를 피한다. `자금이 버티는 기간`, `이 나라에 들어갈 만한지`, `프론티어 모델`처럼 구어적이거나 사용자의 결정에 필요하지 않은 표현은 각각 `가용 자금으로 운영할 수 있는 기간`, `해당 국가에 진출할 가치가 있는지`, `AI 모델`처럼 직접적이고 전문적인 한국어로 바꾼다.
- Punctuation: 보충 설명을 넣는 괄호 앞에는 공백을 두지 않고, 정의·열거는 콜론을 사용한다. 문장 중간의 장식적 긴 줄표보다 완전한 서술문을 우선한다.
- Review rule: 같은 의미의 공통 문구는 catalog 등 기존 단일 출처에서 관리하고, 새 한국어 문구는 맞춤법·띄어쓰기·경어법·화면 내 문체 일관성을 검토한 뒤 반영한다.
- Terminology: `AI GTM 어시스턴트`, `론칭 대상`, `예비진단`, `시장·경쟁 사전조사`, `실제 판매 가능성 예비검증`, `검증 보류`, `AI 추정`, `창업자 입력`, `고객 행동 증거`, `지불 증거`, `외부 자료`, `계획 초안`, `확인 필요`, `전문가 확인`, `완료 증거`
- Microcopy rules: AI가 했다고 말하기보다 사용자가 결정할 행동을 말한다. `추천`보다 `초안`, `정답`보다 `확인`, `완료`보다 증거 기준을 사용한다.
- Market research microcopy: 약어만 단독으로 쓰지 않고 한글(영문 정식명칭)으로 표시한다. 시장 수치는 `확정`이 아니라 `추정 범위`, 경쟁사는 `전체 목록`이 아니라 `확인된 주요 후보`라고 쓴다.
- Offering validation microcopy: 준비 3단계 전에는 `판매 가능성은 아직 판단하지 않습니다. 현재 단계에서는 시장·경쟁 사전조사와 검증 가설을 제공합니다.`라고 쓴다. 준비 3단계 후에도 `판매 가능성 확정`이나 `성공 확률` 대신 `실제 판매 가능성 예비검증`과 근거 상태를 사용한다.
- Gate microcopy: `실패` 대신 `이번에는 여기서 준비합니다`, `탈락` 대신 `다음 단계보다 먼저 보완할 항목`을 사용한다.
- Prerequisite microcopy: `필수 선결 조건이 남았습니다`는 목록 항목마다 반복하지 않는다. 카드 제목에서 `준비 3단계로 넘어가기 전 확인할 항목`으로 한 번만 설명하고, 목록에는 조건 자체만 쓴다.
- Question status microcopy: `통과 질문`, `실패 질문` 대신 `충족`, `근거 보완`, `보완 필요`, `잠김`을 사용한다.
- Auth microcopy: `카카오 로그인`보다 동작이 분명한 `카카오로 계속하기`를 사용한다. `계정 오류` 대신 `카카오 인증이 완료되지 않았습니다`처럼 현재 상태와 다음 행동을 함께 쓴다.

## Implementation constraints

- Framework/styling system: Next.js App Router, React 19, 단일 `app/globals.css`, 서버 컴포넌트 우선
- Design-token constraints: `:root`의 기존 변수를 semantic role로 정리하고 버튼·panel·header·HTML 보고서가 같은 값과 geometry를 사용한다. 페이지별 one-off green·cream·radius·shadow 추가를 금지한다. 전역 글꼴은 `--font-sans` 하나로 관리하고 화면별 `font-family` 재정의를 추가하지 않는다.
- Design-token discipline (2026-08-19, 전수조사 A단계): `:root` 밖 리터럴 hex 0곳(경고 `--warning-bg/ink/muted/line`·`--amber`, 오류 `--danger-ink/bg`, 트랙 `--track`, `--ink-soft` 추가; kakao/google 버튼만 브랜드 규격 예외). 모서리는 `--radius-card/band/field/pill/small`, 자간은 `--tracking-display(-0.04em)/title(-0.02em)/label(0.04em)/kicker(0.1em)`, 글자 크기는 12/13/14/16/20/24/30/36/48의 9단계 px만 쓴다(문장·목록은 14px 이상, 13px는 라벨·메타). `lib/design-tokens.test.ts`가 지킨다.
- Kicker·marker discipline (2026-08-19, B단계): 영문 대문자 `page-kicker`는 페이지 h1 위 1개만 쓴다. 카드·섹션 안 소제목은 한글(en 화면은 영문). 순서 마커는 “채운 원 + 숫자” 한 스타일(대시보드 우선 행동·랜딩 4단계)만 쓰고 이탤릭 숫자는 쓰지 않는다. 짙은 녹 밴드(cta-band·research-report-cta·journey 헤더)는 padding 24px 28px·`--radius-band`·mint kicker로 같은 표면.
- Screen fixes (2026-08-19, D단계): 랜딩 히어로 미리보기는 제품과 같은 “준비 1·2·3단계 막대 + 통과 기준선 + 판정 두 줄”을 보여 준다(도메인 막대 차트 아님). 통과 기준선이 있는 막대는 `.meter--gate`(10px, `--gate` 위치 세로선) 하나로 대시보드·랜딩이 공유. 서비스 카드 CTA는 아이콘 원형 대신 텍스트 soft small(“자세히 보기”). 서비스 상세 본문 블록은 2열 그리드. 여정 30·60·90 카드 제목은 “N일 계획”, 빈 구간은 점선 빈 상태 문구. 어시스턴트 상충 근거의 마크다운 링크는 실제 링크로 렌더. 보고서 요약 폭 680px.
- Screen fixes (2026-08-19, E단계): 랜딩 밴드 CTA는 히어로와 다른 문구(“내 단계 확인하기”). 계층 배지는 눌리는 필터 칩과 구분되도록 `--radius-small` 태그. 서비스 목록의 AI 범위 안내는 카드 그리드 제목 아래. AI 상품 상세에는 아바타를 두지 않는다. 관리자 전용 안내(베타·운영 모드)는 `notice-banner--warning`/`admin-mode-note`의 sand 톤. 대시보드 0 집계 타일은 흐리게, 해당 없음 사유는 13px muted. 헤더 진행 pill의 “+N”은 “외 N건”. 여정 승인 계획 요약은 16px/500. 결제 후 입력 화면은 이미 채워진 칸을 읽기 전용 요약+“수정”으로 접고 ‘모름’ 토글 문구를 짧게, 첨부 안내는 두 줄. 보고서 접이식 섹션은 건수 0이면 숨김. HTML 다운로드는 웹과 같은 글꼴·색 값. 관리자 사용자 표는 6열(인증·용도는 상세로). 탈퇴 카드는 테두리만.
- Performance constraints: 최초 페이지 렌더에 AI 호출 금지, 상태 변경에 AI 호출 금지, 클라이언트 번들에 OpenAI/Supabase service key 코드 금지
- Research constraints: 기존 Responses API의 `file_search`와 `web_search`만 사용하고 새 검색 SDK를 추가하지 않는다. 공개 웹 검색에는 고객명·연락처·계약서·기밀 수치를 보내지 않는다. 예상 가격·구매 빈도·초기 접근 고객 수·3년 판매·공급 범위·현재 검증 근거·제약은 선택 입력이며, 누락을 조사 중단이나 부정적 증거로 해석하지 않는다. 시장동향·경쟁구도·시장규모·최종 종합은 `gpt-5.6-sol`로 실행하고, 사용자가 제공한 사실·정제된 업로드 자료·준비도 진단·승인된 내부 자료와 공개 웹 근거만 사용한다. 쿼리 계획 뒤 영역별 조사를 병렬 실행하고, 공식 통계·규제기관·산업자료·현지 유통·기업 공식자료·소비자 자료를 교차검증한다. 일반 시장·경쟁 조사는 최대 10회, 시장규모 조사는 최대 8회의 웹 검색 지침을 사용하며 모든 외부 사실에 URL·게시자·자료 유형·확인일을 저장한다.
- Compatibility constraints: v4.0의 55문항 문구·배점·Critical 규칙과 저장된 결과는 읽을 때 다시 계산하지 않는다. v5.0은 46개 질문은행, `survey_version`, `sales_motion`, 공통 적용성 판정기를 사용한다. `required`는 완료·점수·Gate에 포함하고, `deferred_unmet`은 완료 분모에서 제외하되 점수 0과 Gate 보류로 처리하며, `structural_not_applicable`은 완료·점수·Gate·액션에서 제외한다. 초기 목표국가·목표고객은 구조화 값으로 저장하며, 유료 AI 주문은 결제 당시 진단 ID·버전·적용 문항을 변경 불가능한 스냅샷으로 고정한다.
- Auth constraints: Supabase Kakao provider와 기존 PKCE callback을 재사용하고 Kakao JavaScript SDK·별도 callback·신규 인증 dependency는 추가하지 않는다. 첫 버전은 확인 이메일을 필수로 하며 `Allow users without an email`을 켜지 않는다. Kakao REST key와 Client Secret은 Supabase에, 탈퇴용 Admin Key는 Vercel server-only 변수에만 저장한다. 카카오 unlink의 `target_id`는 스테이징에서 확인된 숫자형 `identity_data.sub`만 사용한다. 동일 이메일 계정 연결, unlink 재시도, soft delete 뒤 식별자 잔존, 개인정보 처리방침 검토가 끝나기 전에는 공개 feature flag를 활성화하지 않는다. 제한 베타를 넘어 공개 운영할 때는 카카오 외부 unlink callback도 처리한다.
- Test/screenshot expectations: v4.0과 v5.0 결과, direct·partner·hybrid·unknown 분기, 목표국가 미입력 보류, 현지 시험·유료 증거 조건, 작성 진행률과 준비도 점수의 다른 분모, 반복 접두문이 없는 선결 조건 카드, 확정값의 AI 어시스턴트 재사용, 목표시장 변경 후 조사 재확인 상태, 판매 가능성 예비검증, 결제 시점 유료 AI 스냅샷, 론칭 정의 필수값, 조사 로딩·성공·근거부족·실패, 시장규모 산식과 출처, 경쟁사 카드·표, 질문 상태 필터, 계획-질문 연결, 증거 제출, Gate 재확인, 잠금 해제, AI 기간 범위, HTML 다운로드를 typecheck/build와 수동 브라우저로 확인한다. 새 UI·검색·PDF 의존성은 추가하지 않는다.
- Auth test expectations: Kakao·Google·이메일·magic link의 조건부 표시와 회귀, 신규 카카오 사용자 온보딩, 동일 확인 이메일 로그인 뒤 identities·사용자 UUID·기존 이력 유지, 기존 session이 있는 상태의 동의 취소, callback 실패·이메일 없음 안내, `next` 복귀, 키보드·모바일, 숫자형 Kakao Service user ID 사용, unlink 성공·실패, unlink 성공 후 로컬 삭제 실패 재시도에서 관리자 사용자 조회 `-101`·`200`·`-401`·timeout·5xx 분기, soft delete 뒤 카카오 식별자 잔존 여부를 기존 Vitest 순수 로직 테스트와 수동 브라우저 검증으로 확인한다. 저장소에 없는 lint·DOM 테스트 도구나 새 의존성을 전제로 하지 않는다.

## Open questions

- [ ] 베타 5개 조직에서 Luna `low`와 `medium`의 계획 품질 차이 / 제품 운영 / 전체 공개 전
- [ ] Obsidian 허용 문서의 저작권·기밀 최종 승인 / 콘텐츠 운영 / 첫 vector store 게시 전
- [ ] 전문가 handoff brief의 실제 주문 연결 필드 / 서비스 운영 / 전문가 전환 UI 공개 전
- [ ] 준비 3단계 `부분 통과`의 운영 기준을 60%로 시작할지 / 제품 운영 / 구현 전
- [ ] 비로그인 사용자가 첫 Gate 통과 후 가입하기 전 다음 Gate를 계속할지 / 제품 운영 / 구현 전
- [ ] 교두보 시장(Beachhead Market)의 직접 접근 가능 고객 범위와 인접시장 확장 경로를 업종별로 어떻게 안내할지 / 제품 운영 / 베타 조사 전
- [ ] 시장규모가 금액보다 고객 수가 더 적절한 업종의 기본 단위를 어떻게 제시할지 / 제품·콘텐츠 운영 / 베타 조사 전
- [ ] 공개 운영용 카카오 외부 연결 해제 callback에서 incoming Service user ID를 내부 사용자와 최소 정보로 연결하는 방식을 확정 / 인증·개인정보 / 공개 출시 전
- [ ] 개인정보 처리방침의 카카오 제공·Supabase 국외 처리 문구에 대한 법률 검토 / 운영·법무 / 카카오 feature flag 활성화 전

## English localization

- Product model: 영어판은 별도 제품이나 별도 데이터가 아니다. 한국어 무접두 경로와 영어 `/en/*` 경로가 같은 페이지·권한·레코드·점수 로직을 사용한다.
- Route behavior: 영어 화면의 내부 링크와 인증 복귀는 `/en/*`를 유지한다. 언어 전환은 가능한 한 현재 화면과 record ID를 보존하며, 존재하지 않는 공개 경로만 locale 홈으로 돌아간다.
- Language metadata: 각 화면은 실제 표시 언어와 일치하는 `<html lang>`·metadata·accessible name을 제공한다. 언어 전환은 로그인 전후 모든 header에서 보여야 한다.
- Voice: 미국 스타트업 창업자에게 직접 말하는 간결하고 evidence-led한 문장을 사용한다. 한국어 존댓말을 직역하지 않고 행동, 근거, 제약, 다음 결정을 먼저 쓴다.
- Terminology: 한국어 `준비 1단계·2단계·3단계`는 `Readiness Stage 1·2·3`으로 표시한다. GTM, TAM, SAM, SOM은 통용 약어를 유지하고, 초기 진입 세그먼트는 `교두보 시장(Beachhead Market)`으로 표시한다.
- Content invariants: 질문 ID, 점수, Critical 여부, 단계 통과 기준, 서비스·주문 ID, source ID는 번역하지 않는다. locale별 표시 문구만 달라진다.
- Platform-owned copy: 버튼, 제목, 상태, 오류, 단계명, 담당 역할, 질문, 액션 안내, 완료 근거 안내는 typed locale catalog 또는 안정적인 ID에서 렌더링한다. DB에 저장된 한국어 표시 문장을 `/en`에서 그대로 출력하지 않는다.
- Generated content: AI 질문·조사·계획·보고서는 요청 locale로 생성하고 산출 언어를 저장한다. 기존 AI 산출물은 화면 locale에 맞춰 자동 번역하고 원문을 덮어쓰지 않은 채 같은 계획의 locale별 표시본으로 캐시한다. 번역이 실패하면 원문과 재시도 안내를 함께 표시한다.
- Assessment actions: `action_items.question_id`가 있는 진단 액션은 저장된 `title`, `owner_label`, `completion_evidence`보다 질문 catalog의 locale별 문구를 우선한다. 운영자나 사용자가 수정한 자유 액션만 원문 콘텐츠로 취급한다.
- Plan localization: 계획의 상태·기간·우선순위는 구조화 값으로 번역하고, AI가 만든 요약·시장조사·계획 항목의 문장만 locale별 표시본으로 관리한다. 진행 상태와 완료 증거는 언어 전환으로 복제하거나 초기화하지 않는다.
- User-authored content: 한국어로 입력한 회사·제품·서비스·솔루션 설명, 목표시장, 목표고객, 제약, 실행 메모는 원문을 보존하면서 영어 화면용 자연스러운 번역본을 자동 생성한다. 사람 이름, 법인명, 브랜드명, 제품명은 기본적으로 원문을 유지하고 설명 문장만 번역한다.
- Legal content: 영어 약관·개인정보·환불 문서는 별도 본문으로 제공하고 법률 검토 전에는 한국어 원문 우선 고지를 포함한다.
- Downloadable documents: HTML/PDF 보고서와 버전별 준비도 진단 DOCX는 화면 locale이 아니라 문서 locale과 설문 버전을 명시적으로 받는다. 영문 문서는 제목·본문·표·상태·날짜·접근성 텍스트까지 영어여야 하며, 한국어 문서의 파일명이나 본문을 재사용하지 않는다.
- Internal documentation: 사용자에게 제공되는 설문, 보고서, 안내서는 한국어와 영어 산출물을 따로 유지한다. 개발 계획·변경 이력 같은 비노출 내부 문서는 번역 대상에서 제외하되, 영문 사용자 문서의 source와 version을 명시한다.
- Formatting: 영어의 긴 단어·URL·표 제목이 panel 밖으로 넘치지 않도록 wrapping을 허용한다. 날짜·숫자·통화는 선택 locale과 조사 기준 통화를 명시한다.
- Fallback behavior: 번역본이 없을 때 한국어를 조용히 노출하지 않는다. 영어 안내와 `Generate English version` 또는 `View original` 선택을 제공하며, 핵심 행동 버튼과 진행 상태는 계속 사용할 수 있어야 한다.
- QA: `/en`에서 가입·로그인, 버전별 진단과 조건부 문항, Gate 중단, 대시보드, AI 조사·계획, 여정, 서비스·주문, 운영, 보고서 다운로드까지 플랫폼 소유 한글 잔존과 무접두 경로 이탈이 없어야 한다. 영문 DOM 잔존 검사에서는 사용자 원문·회사명·사람 이름·브랜드명을 명시적으로 제외한다.

### English content provenance

| 콘텐츠 출처 | 영어 화면 표시 규칙 | 저장 원칙 |
| --- | --- | --- |
| 정적 UI·오류·상태 | 항상 locale catalog에서 영어 표시 | 표시 문구를 DB에 저장하지 않음 |
| 버전별 문항·단계·진단 액션 | survey version과 question/stage ID로 영어 catalog 조회 | 버전·ID·점수·응답·근거만 공통 저장 |
| AI 요약·조사·계획 항목 | 같은 plan의 영문 표시본만 노출 | 원문과 locale별 표시본을 분리 저장 |
| 사용자 입력 설명·목표시장·목표고객 | 영어 표시본을 자동 생성해 우선 노출 | 원문과 source hash에 연결된 영어 번역본을 분리 저장 |
| 회사·법인·상품·브랜드·사람 이름 | 기본적으로 원문 표기, 사용자가 영문명을 등록하면 교체 | 공식 영문명과 자동 번역을 구분해 저장 |
| 서비스 catalog | 관리자가 승인한 영어 필드 우선 | 한국어·영어 필드를 명시적으로 관리 |
| 보고서·설문 DOCX | 선택 문서 locale로 전체 생성 | locale·source version을 문서 metadata에 기록 |

### English release gates

1. `/en/dashboard`는 저장된 한국어 `plan.summary`, `plan_items.title`, `action_items.title`, `owner_label`, `completion_evidence`를 직접 렌더링하지 않는다.
2. `/en/assistant/:id`, `/en/journey`, `/en/admin`, `/en/orders/:id`, `/en/provider`에도 동일한 provenance 규칙을 적용한다.
3. 기존 계획에 화면 locale 표시본이 없으면 자동 번역해 캐시하고, 번역 실패 시에만 원문과 재시도 안내를 표시한다.
4. 영문 보고서 다운로드는 화면의 영어 표시본과 동일한 내용을 사용하며 한국어 계획 항목을 포함하지 않는다.
5. 영어 버전별 DOCX를 별도 생성하고 질문 ID·배점·Critical·순서가 한국어 원본과 일치하는지 자동 비교한다.

### Automatic English display for Korean user content

1. 한국어 입력값은 원본 필드를 수정하거나 덮어쓰지 않는다.
2. 저장 직후 번역 작업을 시도하고, 기존 데이터는 `/en` 최초 조회 시 필요한 필드만 일괄 번역한다.
3. 번역본은 `entity_type`, `entity_id`, `field_name`, `target_locale`, `source_hash`를 키로 캐시한다. 원문이 바뀌면 hash가 달라져 이전 번역을 자동으로 사용하지 않는다.
4. 영어 화면은 번역본이 있으면 즉시 표시하고, 생성 중이면 영어 skeleton과 `Preparing English version…`을 보여준다. 번역 실패 시 원문을 조용히 섞지 않고 `View original`을 제공한다.
5. 번역 프롬프트는 미국 창업자와 시장 전문가가 읽기 자연스러운 영어를 사용하되 숫자, 통화, 날짜, URL, 고유명사, 법적 명칭과 사실관계를 변경하거나 보강하지 않는다.
6. 한 화면에서 필요한 입력값을 한 요청으로 묶어 번역하고 결과를 캐시한다. 화면 필드마다 별도 AI 요청을 보내지 않는다.
7. 사용자는 자동 번역본을 수정하고 `Official English version`으로 저장할 수 있다. 공식 영문본은 원문이 바뀌기 전까지 자동 번역보다 우선한다.
8. 대시보드, AI 어시스턴트, GTM 여정, 서비스·주문, 관리자 화면, HTML/PDF/DOCX 보고서가 같은 번역본을 재사용한다.
