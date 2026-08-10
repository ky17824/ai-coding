# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-08-10
- Primary product surfaces: 랜딩, 인증·온보딩, 단계별 준비도 진단, Gate 판정, AI GTM 공동계획, 대시보드·여정, 계획 보고서, 전문가 서비스
- Evidence reviewed: `app/page.tsx`, `app/globals.css`, `components/site-header.tsx`, `components/assessment-form.tsx`, `app/dashboard/page.tsx`, `app/journey/page.tsx`, `docs/specs/2026-08-04-auth-account-design.md`, `.omx/plans/2026-08-05-ai-gtm-assistant-plan.md`, `.omx/plans/2026-08-10-progressive-gate-ai-assistant.md`
- Observed fact: 기존 UI는 `--ink`, `--green`, `--green-dark`, `--mint`, `--paper` 토큰과 흰색 panel, 12px 내외 radius, 짧은 상태 문구를 공통으로 사용한다.
- Design inference: AI 화면도 별도 챗봇 브랜드가 아니라 Borderless 실행 여정의 한 단계로 보여야 한다.

## Brand

- Personality: 차분하고 실무적이며 근거 중심인 한국 스타트업 해외진출 코치
- Trust signals: 결정론적 점수·Gate 불변, 출처, 확인 필요 표시, 승인된 전문가, 명시적 사용자 승인
- Avoid: 과장된 AI 표현, 성공 보장, 네온·유리효과 중심의 AI 전용 미학, 과도한 캐릭터·말풍선, 출처 없는 단정

## Product goals

- Goals: 창업자가 현재 통과 가능한 단계까지만 답하고 즉시 가치를 받도록 하며, 첫 미통과 Gate의 질문별 격차를 계획·실행·증거·재진단으로 닫아 다음 단계로 이동하게 한다.
- Non-goals: 자유 채팅, AI 재채점, 자동 예약·결제, 법률·세무·규제 확정 판단
- Success signals: 단계별 완료율, 첫 Gate 판정 후 AI 계획 시작률, 계획 승인·30일 실행률, 재진단 통과율, 보고서 다운로드율, 전문가 brief 확인률

## Personas and jobs

- Primary personas: 해외진출을 준비하는 한국 스타트업 대표·실무 책임자
- Secondary personas: 승인된 멘토·컨설턴트, Borderless 운영 관리자
- User jobs: 현재 Gate와 질문별 충족 상태 이해, 지금 답할 문항만 완료, 다음 단계 진입 또는 조기 계획 전환, 질문과 연결된 실행 책임·기한·완료 증거 합의, 재진단 시점 결정, 현장 전문가가 필요한 시점 식별
- Key contexts of use: 데스크톱 중심 계획 워크숍, 모바일에서 상태 확인·간단 수정, 느린 네트워크 또는 AI 장애 가능

## Information architecture

- Primary navigation: 대시보드 / 준비도 진단 / GTM 여정 / 전문가 서비스 / 계정
- Core routes/screens: `/assessment` 현재 Gate 문항 → 단계 판정 → `/assistant/[assessmentId]` 공동계획 또는 다음 Gate → `/dashboard` 질문별 실행·증거 현황 → `/assessment/[assessmentId]/recheck` Gate 재확인 → `/journey` 실행 보드 → 계획 보고서 → `/services` 전문가 연결
- Content hierarchy: 현재 단계 문항 → 결정론적 Gate 판정 → 질문별 충족·근거 상태 → 허용된 기간 범위의 계획 초안 → 질문과 연결된 실행 → 증거 제출 → Gate 재확인 → 다음 단계 해제 → 다운로드·전문가 handoff
- The assistant is entered from a saved assessment only; it is not a global chat entry in primary navigation.
- Later-stage questions are not visible or navigable until the immediately preceding Gate passes.

## Design principles

- 근거가 대화보다 먼저다: 단계·Gate·우선 액션을 고정 영역에 먼저 보여준다.
- 한 번에 한 결정: 질문은 한 개씩, 계획 승인은 전체 초안을 검토한 뒤 한 번만 요구한다.
- 첫 가치까지 짧게: 첫 미통과 Gate에서 진단을 끝내고 바로 계획으로 전환하며, 통과하지 못한 뒤 단계의 문항 수와 점수를 보여주지 않는다.
- 질문이 진행률의 기준이다: 대시보드는 계획 개수보다 `충족 / 근거 보완 / 보완 필요 / 잠김` 문항 수를 먼저 보여주고 각 계획이 어떤 질문을 보완하는지 연결한다.
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

- Existing components to reuse: `SiteHeader`, `.panel`, `.button` variants, `.notice-banner`, `.hold-banner`, `.priority`, `.meter`, 서비스 카드
- New/changed components: 단계 잠금형 `AssessmentForm`, `GateDecision`, 기간 범위가 표시되는 `GtmAssistant`, `GateProgressSummary`, `QuestionProgressList`, `GateRecheck`, 계획 보고서 다운로드
- Variants and states: Gate locked/active/passed/stopped, question satisfied/evidence_needed/improvement_needed/locked, 질문/판정/계획/재확인, draft/active/superseded/completed, not_started/in_progress/blocked/completed, founder/vault/web/deterministic source
- Token/component ownership: 전역 토큰과 공통 상태는 `app/globals.css`; assistant 전용 레이아웃도 같은 파일의 기존 토큰을 사용한다.
- Do not add a component library, Tailwind layer, icon package, or design-token abstraction.

## Accessibility

- Target standard: WCAG 2.1 AA 수준의 핵심 흐름
- Keyboard/focus behavior: 질문, 편집, 승인, 상태 변경 전부 Tab/Enter/Space로 가능하고 기존 `:focus-visible`을 유지한다.
- Contrast/readability: muted text도 흰 panel에서 읽히는 기존 대비 이상을 유지하고, 출처 유형을 색만으로 구분하지 않는다.
- Screen-reader semantics: 진행상황은 `role=status`, 오류는 `role=alert`, 질문 묶음은 heading/fieldset, 출처는 list, 비동기 버튼은 `disabled`와 상태 문구를 제공한다.
- Reduced motion and sensory considerations: `prefers-reduced-motion`에서는 새 애니메이션을 끈다. 로딩은 회전 애니메이션 없이 텍스트로도 전달한다.

## Responsive behavior

- Supported breakpoints/devices: 기존 1080/900/620px 규칙과 최신 Chrome·Safari 모바일/데스크톱
- Layout adaptations: 900px 이하에서 요약 sidebar는 본문 위로 이동, 계획 항목 편집 grid는 1열, source 메타는 줄바꿈한다.
- Touch/hover differences: 최소 42px 제어 높이, hover가 없어도 상태와 행동을 이해할 수 있어야 한다.

## Interaction states

- Loading: `계획을 준비하고 있습니다`와 현재 단계 표시, 중복 제출 방지
- Empty: 저장된 진단이 없으면 극초기 진단 CTA, 계획이 없으면 현재 Gate에 맞는 AI 계획 시작 CTA
- Error: 오류 원인과 재시도 또는 결정론적 계획 계속 사용을 함께 제공
- Success: 실행 항목 완료·증거 저장·Gate 재확인·다음 단계 해제, 계획 초안 생성·승인·다운로드를 각각 짧은 `role=status`로 확인
- Disabled: 뒤 단계는 잠금 아이콘과 `앞 단계를 통과하면 열립니다` 문구를 제공하고 클릭할 수 없게 한다. 처리 중·권한 없음도 비활성 이유를 인접 문구로 표시한다.
- Offline/slow network: 사용자 입력은 전송 완료 전 유지하고 네트워크 실패 시 다시 시도할 수 있게 한다.

## Content voice

- Tone: 존댓말, 짧고 실행 중심, 불확실성을 숨기지 않는 코치형 문장
- Terminology: `AI GTM 어시스턴트`, `예비진단`, `계획 초안`, `확인 필요`, `전문가 확인`, `완료 증거`
- Microcopy rules: AI가 했다고 말하기보다 사용자가 결정할 행동을 말한다. `추천`보다 `초안`, `정답`보다 `확인`, `완료`보다 증거 기준을 사용한다.
- Gate microcopy: `실패` 대신 `이번에는 여기서 준비합니다`, `탈락` 대신 `다음 단계보다 먼저 보완할 항목`을 사용한다.
- Question status microcopy: `통과 질문`, `실패 질문` 대신 `충족`, `근거 보완`, `보완 필요`, `잠김`을 사용한다.

## Implementation constraints

- Framework/styling system: Next.js App Router, React 19, 단일 `app/globals.css`, 서버 컴포넌트 우선
- Design-token constraints: `:root` 기존 변수와 현재 버튼/panel 패턴만 확장
- Performance constraints: 최초 페이지 렌더에 AI 호출 금지, 상태 변경에 AI 호출 금지, 클라이언트 번들에 OpenAI/Supabase service key 코드 금지
- Compatibility constraints: 55문항의 문구·배점·Critical 규칙은 유지하되 한 진단 세션에서 통과한 단계까지만 저장하며, Supabase RLS와 비로그인 진단 후 인증 복귀 흐름을 유지한다.
- Test/screenshot expectations: 단계별 미통과·통과·최종 부분통과 화면, 질문 상태 필터, 계획-질문 연결, 증거 제출, Gate 재확인, 잠금 해제, AI 기간 범위, HTML 다운로드를 typecheck/build와 수동 브라우저로 확인한다. 새 UI·PDF 의존성은 추가하지 않는다.

## Open questions

- [ ] 베타 5개 조직에서 Luna `low`와 `medium`의 계획 품질 차이 / 제품 운영 / 전체 공개 전
- [ ] Obsidian 허용 문서의 저작권·기밀 최종 승인 / 콘텐츠 운영 / 첫 vector store 게시 전
- [ ] 전문가 handoff brief의 실제 주문 연결 필드 / 서비스 운영 / 전문가 전환 UI 공개 전
- [ ] 준비완료 `부분 통과`의 운영 기준을 60%로 시작할지 / 제품 운영 / 구현 전
- [ ] 비로그인 사용자가 첫 Gate 통과 후 가입하기 전 다음 Gate를 계속할지 / 제품 운영 / 구현 전
