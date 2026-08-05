# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-08-05
- Primary product surfaces: 랜딩, 인증·온보딩, 55문항 준비도 진단, AI GTM 공동계획, 대시보드·여정, 전문가 서비스
- Evidence reviewed: `app/page.tsx`, `app/globals.css`, `components/site-header.tsx`, `components/assessment-form.tsx`, `app/dashboard/page.tsx`, `app/journey/page.tsx`, `docs/specs/2026-08-04-auth-account-design.md`, `.omx/plans/2026-08-05-ai-gtm-assistant-plan.md`
- Observed fact: 기존 UI는 `--ink`, `--green`, `--green-dark`, `--mint`, `--paper` 토큰과 흰색 panel, 12px 내외 radius, 짧은 상태 문구를 공통으로 사용한다.
- Design inference: AI 화면도 별도 챗봇 브랜드가 아니라 Borderless 실행 여정의 한 단계로 보여야 한다.

## Brand

- Personality: 차분하고 실무적이며 근거 중심인 한국 스타트업 해외진출 코치
- Trust signals: 결정론적 점수·Gate 불변, 출처, 확인 필요 표시, 승인된 전문가, 명시적 사용자 승인
- Avoid: 과장된 AI 표현, 성공 보장, 네온·유리효과 중심의 AI 전용 미학, 과도한 캐릭터·말풍선, 출처 없는 단정

## Product goals

- Goals: 55문항 결과를 창업자가 승인할 수 있는 30·60·90일 계획으로 전환하고 실행과 전문가 handoff까지 연결한다.
- Non-goals: 자유 채팅, AI 재채점, 자동 예약·결제, 법률·세무·규제 확정 판단
- Success signals: 계획 시작·승인·30일 실행률, 근거 표시율, fallback 성공률, 전문가 brief 확인률

## Personas and jobs

- Primary personas: 해외진출을 준비하는 한국 스타트업 대표·실무 책임자
- Secondary personas: 승인된 멘토·컨설턴트, Borderless 운영 관리자
- User jobs: 현재 단계 이해, 가장 먼저 할 일 결정, 실행 책임·기한·완료 증거 합의, 최신 국가 정보 확인, 현장 전문가가 필요한 시점 식별
- Key contexts of use: 데스크톱 중심 계획 워크숍, 모바일에서 상태 확인·간단 수정, 느린 네트워크 또는 AI 장애 가능

## Information architecture

- Primary navigation: 대시보드 / 준비도 진단 / GTM 여정 / 전문가 서비스 / 계정
- Core routes/screens: `/assessment` 결과 → `/assistant/[assessmentId]` 공동계획 → `/dashboard` 요약 → `/journey` 실행 보드 → `/services` 전문가 연결
- Content hierarchy: 서버 진단 원본 → 추가 질문 → 계획 초안 → 출처·가정 → 승인 → 실행 상태 → 전문가 handoff
- The assistant is entered from a saved assessment only; it is not a global chat entry in primary navigation.

## Design principles

- 근거가 대화보다 먼저다: 단계·Gate·우선 액션을 고정 영역에 먼저 보여준다.
- 한 번에 한 결정: 질문은 한 개씩, 계획 승인은 전체 초안을 검토한 뒤 한 번만 요구한다.
- AI와 사람의 경계를 보인다: 내부 근거, 외부 사실, AI 가정, 전문가 확인을 라벨로 구분한다.
- 실패해도 진단은 남는다: AI·검색 장애 시 결정론적 액션을 사용할 수 있어야 한다.
- Tradeoffs: 화려한 채팅 경험보다 긴 계획의 가독성, 속도보다 출처와 사용자 승인, 자동화보다 통제 가능성을 우선한다.

## Visual language

- Color: 기존 CSS 변수만 사용한다. primary action은 `--green`, 고신뢰/헤더는 `--ink`·`--green-dark`, 선택·보조는 `--mint`, 위험은 기존 P0 색을 재사용한다.
- Typography: 기존 Pretendard/Noto Sans KR/system stack. 제목은 굵고 짧게, 본문은 14~16px, 메타·출처는 11~13px.
- Spacing/layout rhythm: `app-container` 폭과 16/24/32px 간격을 재사용한다. 데스크톱 assistant는 요약 280~320px + 본문 1fr의 2열, 모바일은 1열.
- Shape/radius/elevation: 기존 `.panel`, `.button`, 12~18px radius와 `--shadow`를 재사용한다.
- Motion: 응답 스트리밍보다 명확한 로딩 상태를 우선한다. 160ms 기존 transition만 사용하고 `prefers-reduced-motion`을 존중한다.
- Imagery/iconography: 새로운 AI 일러스트나 아이콘 라이브러리를 추가하지 않는다.

## Components

- Existing components to reuse: `SiteHeader`, `.panel`, `.button` variants, `.notice-banner`, `.hold-banner`, `.priority`, `.meter`, 서비스 카드
- New/changed components: `GtmAssistant`, `PlanItemEditor`, `SourceList`; 진단 결과 CTA와 대시보드 active plan 요약
- Variants and states: 질문/계획, draft/active/superseded/completed, not_started/in_progress/blocked/completed, founder/vault/web/deterministic source
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
- Empty: 저장된 진단이 없으면 진단 CTA, 계획이 없으면 AI 계획 시작 CTA
- Error: 오류 원인과 재시도 또는 결정론적 계획 계속 사용을 함께 제공
- Success: 계획 초안 생성, 승인, 항목 상태 변경을 각각 짧은 `role=status`로 확인
- Disabled: 미완료 진단, 한도 초과, 처리 중, 권한 없음은 비활성 이유를 인접 문구로 표시
- Offline/slow network: 사용자 입력은 전송 완료 전 유지하고 네트워크 실패 시 다시 시도할 수 있게 한다.

## Content voice

- Tone: 존댓말, 짧고 실행 중심, 불확실성을 숨기지 않는 코치형 문장
- Terminology: `AI GTM 어시스턴트`, `예비진단`, `계획 초안`, `확인 필요`, `전문가 확인`, `완료 증거`
- Microcopy rules: AI가 했다고 말하기보다 사용자가 결정할 행동을 말한다. `추천`보다 `초안`, `정답`보다 `확인`, `완료`보다 증거 기준을 사용한다.

## Implementation constraints

- Framework/styling system: Next.js App Router, React 19, 단일 `app/globals.css`, 서버 컴포넌트 우선
- Design-token constraints: `:root` 기존 변수와 현재 버튼/panel 패턴만 확장
- Performance constraints: 최초 페이지 렌더에 AI 호출 금지, 상태 변경에 AI 호출 금지, 클라이언트 번들에 OpenAI/Supabase service key 코드 금지
- Compatibility constraints: 한국어 장문, 55문항 진단 타입과 Supabase RLS, 비로그인 진단 후 인증 복귀 흐름 유지
- Test/screenshot expectations: typecheck/build와 assistant 상태별 수동 브라우저 확인; 새 E2E 의존성은 추가하지 않는다.

## Open questions

- [ ] 베타 5개 조직에서 Luna `low`와 `medium`의 계획 품질 차이 / 제품 운영 / 전체 공개 전
- [ ] Obsidian 허용 문서의 저작권·기밀 최종 승인 / 콘텐츠 운영 / 첫 vector store 게시 전
- [ ] 전문가 handoff brief의 실제 주문 연결 필드 / 서비스 운영 / 전문가 전환 UI 공개 전
