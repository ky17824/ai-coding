# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-08-10
- Primary product surfaces: 랜딩, 인증·온보딩, 단계별 준비도 진단, Gate 판정, 론칭 대상 정의, AI 시장·경쟁 사전조사, 준비완료 후 실제 판매 가능성 예비검증, AI GTM 공동계획, 대시보드·여정, 계획 보고서, 전문가 서비스
- Evidence reviewed: `app/page.tsx`, `app/globals.css`, `components/site-header.tsx`, `components/assessment-form.tsx`, `components/gtm-assistant.tsx`, `app/api/gtm-assistant/turn/route.ts`, `lib/gtm-assistant.ts`, `app/dashboard/page.tsx`, `app/journey/page.tsx`, `docs/specs/2026-08-04-auth-account-design.md`, `.omx/plans/2026-08-05-ai-gtm-assistant-plan.md`, `.omx/plans/2026-08-10-progressive-gate-ai-assistant.md`
- Observed fact: 기존 UI는 `--ink`, `--green`, `--green-dark`, `--mint`, `--paper` 토큰과 흰색 panel, 12px 내외 radius, 짧은 상태 문구를 공통으로 사용한다.
- Observed fact: 현재 AI GTM 어시스턴트는 목표국가·목표고객·자원·기한·제약만 받고 바로 계획을 만들며, 론칭할 제품·서비스·솔루션과 시장규모·경쟁사 조사 결과를 수집·검토·저장하는 단계가 없다.
- Observed fact: 대시보드의 단계 통과 카드가 `gate_messages`의 공통 접두문 `필수 선결 조건이 남았습니다 —`를 항목마다 그대로 출력해 같은 상태 문장이 반복된다.
- Observed fact: 55문항에는 목표국가와 고객군 관련 질문이 있지만, 진단 시점의 실제 `초기 목표국가(Target Country)`와 `목표 고객군(Target Customer Segment)`을 구조화해 확인·저장하는 값은 없다.
- Product decision: `극초기`와 `준비중`에서는 후속 고객 행동·지불·반복 구매 증거가 아직 충분하지 않으므로 실제 판매 가능성을 판정하지 않는다. `준비완료`까지 55문항을 모두 답한 진단에서만 실제 판매 가능성 예비검증을 제공한다.
- Product decision: 초기 목표국가와 그 국가의 목표 고객군은 극초기에서 정하기 시작하되, 준비중의 단계 통과 기준(Stage Gate) B를 통과해 준비완료로 이동하기 전에는 창업자가 직접 입력하고 확정해야 한다. AI가 질문 답변에서 추정한 값은 확정값으로 인정하지 않는다.
- Design inference: AI 화면도 별도 챗봇 브랜드가 아니라 Borderless 실행 여정의 한 단계로 보여야 한다.

## Brand

- Personality: 차분하고 실무적이며 근거 중심인 한국 스타트업 글로벌 진출 코치
- Trust signals: 결정론적 점수·Gate 불변, 출처, 확인 필요 표시, 승인된 전문가, 명시적 사용자 승인
- Avoid: 과장된 AI 표현, 성공 보장, 네온·유리효과 중심의 AI 전용 미학, 과도한 캐릭터·말풍선, 출처 없는 단정

## Product goals

- Goals: 창업자가 현재 통과 가능한 단계까지만 답하고 즉시 가치를 받도록 하며, 첫 미통과 Gate의 질문별 격차를 계획·실행·증거·재진단으로 닫아 다음 단계로 이동하게 한다. 준비중까지 초기 목표국가와 목표 고객군을 직접 확정하고, 계획을 만들기 전에는 `무엇을·누구에게·어디에서` 론칭하는지 정의하며, 출처가 있는 시장·경쟁 사전조사와 창업자 확인을 거친다. 실제 판매 가능성 예비검증은 준비완료까지 55문항이 모두 응답된 경우에만 제공한다.
- Non-goals: 자유 채팅, AI 재채점, 자동 예약·결제, 법률·세무·규제 확정 판단
- Success signals: 단계별 완료율, 론칭 정의 완료율, 사전조사 검토·보고서 포함률, 준비완료 진단의 실제 판매 가능성 예비검증 확인률, 첫 Gate 판정 후 AI 계획 시작률, 계획 승인·30일 실행률, 재진단 통과율, 보고서 다운로드율, 전문가 brief 확인률

## Personas and jobs

- Primary personas: 글로벌 진출을 준비하는 한국 스타트업 대표·실무 책임자
- Secondary personas: 승인된 멘토·컨설턴트, Borderless 운영 관리자
- User jobs: 현재 Gate와 질문별 충족 상태 이해, 지금 답할 문항만 완료, 다음 단계 진입 또는 조기 계획 전환, 글로벌 론칭 제품·서비스·솔루션 정의, 초기 목표시장과 고객 명시, 시장규모·동향·경쟁 구도 검토, 준비완료 후 실제 판매 가능성의 근거·공백 확인, 질문과 연결된 실행 책임·기한·완료 증거 합의, 재진단 시점 결정, 현장 전문가가 필요한 시점 식별
- Key contexts of use: 데스크톱 중심 계획 워크숍, 모바일에서 상태 확인·간단 수정, 느린 네트워크 또는 AI 장애 가능

## Information architecture

- Primary navigation: 대시보드 / 준비도 진단 / GTM 여정 / 전문가 서비스 / 계정
- Core routes/screens: `/assessment` 현재 Gate 문항과 준비중 목표시장 확인 → 단계 판정 → `/assistant/[assessmentId]` 론칭 대상 정의 → 시장·경쟁 사전조사 검토 → 준비완료 55문항 완료 시 실제 판매 가능성 예비검증 → 공동계획 또는 다음 Gate → `/dashboard` 목표시장·질문별 실행·증거 현황 → `/assessment/[assessmentId]/recheck` Gate 재확인 → `/journey` 실행 보드 → 계획 보고서 → `/services` 전문가 연결
- Content hierarchy: 현재 단계 문항 → 준비중의 초기 목표국가·목표 고객군 확인 → 결정론적 Gate 판정 → 공통 상태 요약 1회와 개별 보완 항목 → 질문별 충족·근거 상태 → 론칭 대상 정의 → 시장·경쟁 사전조사와 가정 확인 → 준비완료 55문항 완료 여부에 따른 판매 가능성 예비검증 또는 검증 보류 안내 → 허용된 기간 범위의 계획 초안 → 질문과 연결된 실행 → 증거 제출 → Gate 재확인 → 다음 단계 해제 → 다운로드·전문가 handoff
- The assistant is entered from a saved assessment only; it is not a global chat entry in primary navigation.
- Later-stage questions are not visible or navigable until the immediately preceding Gate passes.
- The assistant uses one route with three explicit workspace steps: `1 론칭 정의`, `2 시장·경쟁 사전조사`, `3 실행 계획`. `준비완료`까지 55문항이 모두 응답된 경우에만 2단계 안에 `실제 판매 가능성 예비검증`을 추가한다. Free-form chat does not replace these steps.

## Design principles

- 근거가 대화보다 먼저다: 단계·Gate·우선 액션을 고정 영역에 먼저 보여준다.
- 론칭 대상이 계획보다 먼저다: 제품·서비스·솔루션, 해결 문제, 핵심 가치, 목표 고객과 국가가 없으면 시장·경쟁 사전조사와 실행계획을 시작하지 않는다.
- 조사와 검증을 혼동하지 않는다: 시장규모·동향·경쟁사 자료는 기회에 대한 사전조사이며 판매 가능성의 증거가 아니다. 실제 판매 가능성 예비검증은 준비완료 55문항의 고객 행동·지불·반복 증거를 함께 확인할 때만 표시한다.
- 조사와 계획을 분리한다: 창업자가 시장규모·동향·경쟁사·가정을 확인한 뒤에만 그 결과를 실행계획의 근거로 사용한다.
- 한 번에 한 결정: 질문은 한 개씩, 계획 승인은 전체 초안을 검토한 뒤 한 번만 요구한다.
- 첫 가치까지 짧게: 첫 미통과 Gate에서 진단을 끝내고 바로 계획으로 전환하며, 통과하지 못한 뒤 단계의 문항 수와 점수를 보여주지 않는다.
- 질문이 진행률의 기준이다: 대시보드는 계획 개수보다 `충족 / 근거 보완 / 보완 필요 / 잠김` 문항 수를 먼저 보여주고 각 계획이 어떤 질문을 보완하는지 연결한다.
- 상태는 한 번, 행동은 항목마다 말한다: `선결 조건이 남았습니다` 같은 공통 문장은 카드 제목에서 한 번만 표시하고 각 행에는 고유한 조건, 현재 상태, 다음 행동만 보여준다.
- 긴 조사 결과도 영역을 침범하지 않는다: 시장동향과 주요 경쟁사는 각각 경계가 있는 카드로 구분하고, 긴 출처·URL은 카드 안에서 줄바꿈한다.
- 시장 정의는 추정하지 않는다: 목표국가와 목표 고객군은 창업자가 명시적으로 확인한 구조화 값만 Gate B와 AI 조사 입력에 사용한다.
- AI와 사람의 경계를 보인다: 내부 근거, 외부 사실, AI 가정, 전문가 확인을 라벨로 구분한다.
- 실패해도 진단은 남는다: AI·검색 장애 시 결정론적 액션을 사용할 수 있어야 한다.
- Tradeoffs: 전체 55문항 비교 가능성보다 단계별 완주와 조기 가치, 화려한 채팅 경험보다 긴 계획의 가독성, 자동화보다 통제 가능성을 우선한다.

## Visual language

- Color: 기존 CSS 변수만 사용한다. primary action은 `--green`, 고신뢰/헤더는 `--ink`·`--green-dark`, 선택·보조는 `--mint`, 위험은 기존 P0 색을 재사용한다.
- Typography: 기존 Pretendard/Noto Sans KR/system stack. 제목은 굵고 짧게, 본문은 14~16px, 메타·출처는 11~13px.
- Spacing/layout rhythm: `app-container` 폭과 16/24/32px 간격을 재사용한다. 데스크톱 assistant는 요약 280~320px + 본문 1fr의 2열, 모바일은 1열.
- Shape/radius/elevation: 기존 `.panel`, `.button`, 12~18px radius와 `--shadow`를 재사용한다.
- Motion: 응답 스트리밍보다 명확한 로딩 상태를 우선한다. 160ms 기존 transition만 사용하고 `prefers-reduced-motion`을 존중한다.
- Imagery/iconography: 새로운 AI 일러스트나 아이콘 라이브러리를 추가하지 않는다.

## Components

- Existing components to reuse: `SiteHeader`, `.panel`, `.button` variants, `.notice-banner`, `.hold-banner`, `.priority`, `.meter`, `.offering-picker`, 서비스 카드
- New/changed components: 단계 잠금형 `AssessmentForm`, `TargetMarketConfirmation`, `GateDecision`, 중복 접두문을 제거한 `GatePrerequisiteSummary`, 3단계 작업영역을 갖는 `GtmAssistant`, `LaunchDefinitionForm`, `MarketResearchBrief`, `MarketSizingTable`, `CompetitorTable`, `SourceList`, 준비완료 전 `ValidationDeferredNotice`, 준비완료 후 `OfferingValidationSummary`, `GateProgressSummary`, `QuestionProgressList`, `GateRecheck`, 계획 보고서 다운로드
- Variants and states: Gate locked/active/passed/stopped, target market missing/partial/confirmed, question satisfied/evidence_needed/improvement_needed/locked, assistant context_draft/researching/review_required/confirmed/plan_draft/active, market source/assumption/estimate/confirmation_needed, offering validation deferred/preliminary_reviewed, plan draft/active/superseded/completed, item not_started/in_progress/blocked/completed, founder/vault/web/deterministic source
- Token/component ownership: 전역 토큰과 공통 상태는 `app/globals.css`; assistant 전용 레이아웃도 같은 파일의 기존 토큰을 사용한다.
- Do not add a component library, Tailwind layer, icon package, or design-token abstraction.

### 대시보드 단계 통과 선결 조건

- 카드 상단에는 `단계 통과 기준(Stage Gate) B`, `준비완료로 넘어가기 전 확인할 항목`, `3개 남음`처럼 현재 Gate와 전체 남은 수를 한 번만 표시한다.
- 준비중에는 첫 묶음으로 `초기 목표시장 정의 0/2`를 표시하고 `초기 목표국가(Target Country)`와 `목표 고객군(Target Customer Segment)`을 각각 `미확정 / 확정` 상태로 보여준다. 둘 중 하나라도 미확정이면 Gate B는 통과하지 않는다.
- 그 아래에는 질문 기반 Critical blocker를 별도 목록으로 표시한다. 각 행은 반복 접두문 없이 `총 진입비용을 항목별로 계산해 주세요`, `글로벌 진출 책임자와 고정 투입시간을 정해 주세요`처럼 고유한 요구만 담는다.
- 각 행은 `분류`, `조건`, `현재 상태`, `다음 행동` 순서로 읽히게 하고 CTA는 시장 정의에는 `초기 목표시장 정하기`, 질문에는 `답변 보완` 하나만 제공한다.
- 극초기 Gate A에는 아직 목표시장 확정을 강제하지 않고 질문 blocker만 표시한다. 목표시장 확정은 준비중 진입 후 언제든 할 수 있지만 준비완료 진입 전에는 반드시 완료해야 한다.
- 확정된 목표국가 또는 고객군을 바꾸면 기존 시장·경쟁 사전조사는 `다시 확인 필요` 상태가 되며, 새 값으로 다시 확인하기 전에는 계획 근거로 확정하지 않는다.

```text
단계 통과 기준(Stage Gate) B                         3개 남음
준비완료로 넘어가기 전 확인할 항목

초기 목표시장 정의                                      0/2
○ 초기 목표국가                    미확정
○ 목표 고객군                      미확정      [초기 목표시장 정하기]

진단 답변                                               1개
! 총 진입비용을 항목별로 계산해 주세요    보완 필요      [답변 보완]
```

### AI GTM 어시스턴트 작업영역

- 1단계 `론칭 정의`: 기존 진단 요약 sidebar를 유지하고 본문 첫 카드에서 론칭 유형 `제품 / 서비스 / 솔루션 / 복합`, 론칭명, 한 문장 설명, 고객 문제, 핵심 가치, 고객의 현재 대안, 차별점, 제공 방식, 수익 방식, 현재 검증 근거를 받는다. 론칭 유형·론칭명·한 문장 설명·고객 문제·핵심 가치·목표국가·목표고객은 필수다.
- 2단계 `시장·경쟁 사전조사`: 조사 범위, 기준연도, 통화, 추정 단위와 가정을 먼저 보여준다. 결과는 시장동향, 전체시장(Total Addressable Market), 유효시장(Serviceable Available Market), 수익가능시장(Serviceable Obtainable Market), 초기 공략 가능 시장(Launchable Addressable Market), 직접·인접·대체 경쟁사, 확인이 필요한 공백 순서로 표시한다.
- 시장동향과 주요 경쟁사는 데스크톱에서 2개의 독립 카드로 나란히 배치하고, 모바일에서는 충분한 간격을 둔 1열 카드로 쌓는다. 각 카드의 긴 문장과 출처 URL은 다른 카드로 넘치지 않아야 한다.
- 초기 공략 가능 시장(Launchable Addressable Market)은 이 제품에서 `12개월 안에 현재 자원·채널·가격·규제 조건으로 실제 접촉하고 수주할 수 있는 시장`으로 정의한다. 수익가능시장(Serviceable Obtainable Market)을 넘을 수 없다.
- 시장규모는 단일 숫자 대신 `낮음 / 기준 / 높음` 범위, 산식, 입력값, 기준연도·통화, 출처, 신뢰도와 제한을 함께 표시한다. 상향식 계산이 없으면 `확인 필요`로 남긴다.
- 경쟁사는 최소 직접·인접·대체 유형을 구분하고 기업명, 대상 고객, 제공 가치, 가격·판매 방식, 강점, 차별화 기회, 출처·확인일을 표 또는 모바일 카드로 보여준다. 근거가 부족하면 개수를 채우기 위해 이름을 만들지 않는다.
- 창업자는 `가정 수정`, `조사 다시 실행`, `이 조사로 계획 만들기` 가운데 하나를 선택한다. 명시적으로 확인하기 전에는 조사 결과를 계획 근거로 확정하지 않는다.
- `극초기`와 `준비중`에서는 `판매 가능성은 아직 판단하지 않습니다` 안내와 함께 조사 결과, 검증 가설, 다음에 모을 증거를 보고서에 넣는다. 뒤 단계의 미응답 문항은 실패나 0점으로 계산하지 않는다.
- `준비완료`까지 55문항이 모두 응답되면 2단계 하단에 `실제 판매 가능성 예비검증`을 표시한다. 결과는 `고객 문제 적합성 / 차별 가치 / 현지 적합성 / 지불 의사 / 증거 강도`별로 `확인 / 보완 필요 / 근거 부족` 상태와 근거 문항·증거를 보여준다. 하나의 성공확률 점수나 판매 보장은 표시하지 않는다.
- 실제 판매 가능성 예비검증의 근거 단계는 `가설 / 관심 / 행동 / 유료 / 반복`으로 표시한다. `유료`와 `반복`은 해당 55문항 답변과 증거가 있을 때만 부여하며, AI 추론만으로 승격하지 않는다.
- 3단계 `실행 계획`: 확인된 론칭 정의와 시장·경쟁 사전조사, 결정론적 진단 액션을 함께 사용해 서버가 허용한 30·60·90일 범위만 생성한다. 계획 항목은 관련 조사 근거와 질문 ID를 계속 표시한다.

## Accessibility

- Target standard: WCAG 2.1 AA 수준의 핵심 흐름
- Keyboard/focus behavior: 질문, 편집, 승인, 상태 변경 전부 Tab/Enter/Space로 가능하고 기존 `:focus-visible`을 유지한다.
- Contrast/readability: muted text도 흰 panel에서 읽히는 기존 대비 이상을 유지하고, 출처 유형을 색만으로 구분하지 않는다.
- Screen-reader semantics: 진행상황은 `role=status`, 오류는 `role=alert`, 질문 묶음은 heading/fieldset, 출처는 list, 비동기 버튼은 `disabled`와 상태 문구를 제공한다.
- Gate prerequisite semantics: 남은 수는 제목과 연결하고, 시장 정의와 질문 blocker는 각각 제목이 있는 목록으로 구분한다. 상태 아이콘에는 `미확정`, `확정`, `보완 필요` 텍스트를 병기한다.
- Market research semantics: 시장규모는 시각적 막대만 사용하지 않고 실제 `<table>` 또는 정의목록으로 동일 정보를 제공한다. 작업 단계에는 `aria-current="step"`, 조사 진행에는 `aria-busy`, 경쟁사 표에는 caption을 제공한다. 판매 가능성 차원은 색만 있는 방사형 그래프 대신 제목·상태·근거가 있는 목록과 `role="meter"` 막대를 함께 제공한다.
- Reduced motion and sensory considerations: `prefers-reduced-motion`에서는 새 애니메이션을 끈다. 로딩은 회전 애니메이션 없이 텍스트로도 전달한다.

## Responsive behavior

- Supported breakpoints/devices: 기존 1080/900/620px 규칙과 최신 Chrome·Safari 모바일/데스크톱
- Layout adaptations: 900px 이하에서 요약 sidebar는 본문 위로 이동, 론칭 정의와 계획 편집 grid는 1열, 시장규모 표는 카드형 정의목록, 경쟁사 행은 세로 카드, source 메타는 줄바꿈한다.
- Touch/hover differences: 최소 42px 제어 높이, hover가 없어도 상태와 행동을 이해할 수 있어야 한다.

## Interaction states

- Loading: `시장 자료를 확인하고 있습니다` 또는 `계획을 준비하고 있습니다`와 현재 단계 표시, 중복 제출 방지. 조사 중 기존 입력과 직전 조사 결과는 유지한다.
- Empty: 저장된 진단이 없으면 극초기 진단 CTA, 계획이 없으면 현재 Gate에 맞는 AI 계획 시작 CTA
- Error: 오류 원인과 재시도 또는 결정론적 계획 계속 사용을 함께 제공. 웹 조사가 실패하면 시장 수치·경쟁사를 만들지 않고 `조사 자료를 확인하지 못했습니다`를 표시한다. 준비완료 전에는 증거 부족을 오류로 표시하지 않고 `검증 보류` 상태로 설명한다.
- Success: 론칭 정의 저장, 시장·경쟁 사전조사 완료·창업자 확인, 준비완료 시 판매 가능성 예비검증 확인, 실행 항목 완료·증거 저장·Gate 재확인·다음 단계 해제, 계획 초안 생성·승인·다운로드를 각각 짧은 `role=status`로 확인
- Disabled: 뒤 단계는 잠금 아이콘과 `앞 단계를 통과하면 열립니다` 문구를 제공하고 클릭할 수 없게 한다. 처리 중·권한 없음도 비활성 이유를 인접 문구로 표시한다.
- Gate B blocked: 점수와 질문 Critical blocker를 모두 충족했어도 목표국가 또는 목표 고객군이 미확정이면 `준비완료` CTA를 비활성화하고 `초기 목표시장 2개 항목을 먼저 확정해 주세요`를 표시한다.
- Offline/slow network: 사용자 입력은 전송 완료 전 유지하고 네트워크 실패 시 다시 시도할 수 있게 한다.

## Content voice

- Tone: 존댓말, 짧고 실행 중심, 불확실성을 숨기지 않는 코치형 문장
- Terminology: `AI GTM 어시스턴트`, `론칭 대상`, `예비진단`, `시장·경쟁 사전조사`, `실제 판매 가능성 예비검증`, `검증 보류`, `AI 추정`, `창업자 입력`, `고객 행동 증거`, `지불 증거`, `외부 자료`, `계획 초안`, `확인 필요`, `전문가 확인`, `완료 증거`
- Microcopy rules: AI가 했다고 말하기보다 사용자가 결정할 행동을 말한다. `추천`보다 `초안`, `정답`보다 `확인`, `완료`보다 증거 기준을 사용한다.
- Market research microcopy: 약어만 단독으로 쓰지 않고 한글(영문 정식명칭)으로 표시한다. 시장 수치는 `확정`이 아니라 `추정 범위`, 경쟁사는 `전체 목록`이 아니라 `확인된 주요 후보`라고 쓴다.
- Offering validation microcopy: 준비완료 전에는 `판매 가능성은 아직 판단하지 않습니다. 현재 단계에서는 시장·경쟁 사전조사와 검증 가설을 제공합니다.`라고 쓴다. 준비완료 후에도 `판매 가능성 확정`이나 `성공 확률` 대신 `실제 판매 가능성 예비검증`과 근거 상태를 사용한다.
- Gate microcopy: `실패` 대신 `이번에는 여기서 준비합니다`, `탈락` 대신 `다음 단계보다 먼저 보완할 항목`을 사용한다.
- Prerequisite microcopy: `필수 선결 조건이 남았습니다`는 목록 항목마다 반복하지 않는다. 카드 제목에서 `준비완료로 넘어가기 전 확인할 항목`으로 한 번만 설명하고, 목록에는 조건 자체만 쓴다.
- Question status microcopy: `통과 질문`, `실패 질문` 대신 `충족`, `근거 보완`, `보완 필요`, `잠김`을 사용한다.

## Implementation constraints

- Framework/styling system: Next.js App Router, React 19, 단일 `app/globals.css`, 서버 컴포넌트 우선
- Design-token constraints: `:root` 기존 변수와 현재 버튼/panel 패턴만 확장
- Performance constraints: 최초 페이지 렌더에 AI 호출 금지, 상태 변경에 AI 호출 금지, 클라이언트 번들에 OpenAI/Supabase service key 코드 금지
- Research constraints: 기존 Responses API의 `file_search`와 `web_search`만 사용하고 새 검색 SDK를 추가하지 않는다. 공개 웹 검색에는 고객명·연락처·계약서·기밀 수치를 보내지 않는다. 공식 통계·규제기관·기업 공식 자료를 우선하고 모든 외부 사실에 URL·게시자·확인일을 저장한다.
- Compatibility constraints: 55문항의 문구·배점·Critical 규칙은 유지하되 한 진단 세션에서 통과한 단계까지만 저장하며, Supabase RLS와 비로그인 진단 후 인증 복귀 흐름을 유지한다. 초기 목표국가·목표 고객군은 질문 답변에서 추론하지 않고 assessment의 구조화된 확정값으로 저장하며 Gate B에만 추가 선결 조건으로 사용한다. 미응답·잠김 문항을 판매 가능성의 부정 근거로 사용하지 않으며 `readiness_answers` 55개가 모두 있을 때만 실제 판매 가능성 예비검증을 계산한다.
- Test/screenshot expectations: 단계별 미통과·통과·최종 부분통과 화면, 반복 접두문이 없는 선결 조건 카드, Gate A에서 목표시장 미확정 허용, Gate B에서 목표국가·목표 고객군 중 0/1/2개 확정 상태와 준비완료 잠금, 확정값의 AI 어시스턴트 재사용, 목표시장 변경 후 조사 재확인 상태, 극초기·준비중의 검증 보류와 사전조사 보고서, 준비완료 55문항 완료 후 판매 가능성 예비검증, 론칭 정의 필수값, 조사 로딩·성공·근거부족·실패, 시장규모 산식과 출처, 경쟁사 카드·표, 창업자 확인 전 계획 차단, 질문 상태 필터, 계획-질문 연결, 증거 제출, Gate 재확인, 잠금 해제, AI 기간 범위, HTML 다운로드를 typecheck/build와 수동 브라우저로 확인한다. 새 UI·검색·PDF 의존성은 추가하지 않는다.

## Open questions

- [ ] 베타 5개 조직에서 Luna `low`와 `medium`의 계획 품질 차이 / 제품 운영 / 전체 공개 전
- [ ] Obsidian 허용 문서의 저작권·기밀 최종 승인 / 콘텐츠 운영 / 첫 vector store 게시 전
- [ ] 전문가 handoff brief의 실제 주문 연결 필드 / 서비스 운영 / 전문가 전환 UI 공개 전
- [ ] 준비완료 `부분 통과`의 운영 기준을 60%로 시작할지 / 제품 운영 / 구현 전
- [ ] 비로그인 사용자가 첫 Gate 통과 후 가입하기 전 다음 Gate를 계속할지 / 제품 운영 / 구현 전
- [ ] 초기 공략 가능 시장(Launchable Addressable Market)의 기본 기간을 12개월로 고정할지 조직별로 6·12·24개월 중 선택하게 할지 / 제품 운영 / 베타 조사 전
- [ ] 시장규모가 금액보다 고객 수가 더 적절한 업종의 기본 단위를 어떻게 제시할지 / 제품·콘텐츠 운영 / 베타 조사 전
