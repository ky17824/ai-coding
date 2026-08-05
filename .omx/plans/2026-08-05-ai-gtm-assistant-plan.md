# AI GTM 어시스턴트 설계·구현 계획

작성일: 2026-08-05
범위: 준비도 예비진단 이후의 공동 계획 수립, GPT-5.6 Luna 기반 근거 검색, 실행 추적, 전문가 서비스 전환

## 1. 결론과 제품 제안

AI GTM 어시스턴트는 자유 대화형 챗봇이 아니라 **결정론적 예비진단을 실행 가능한 계획으로 바꾸는 제한된 공동 계획 워크숍**으로 설계한다.

1. 기존 55문항 엔진이 단계, Gate, 점수와 우선 액션을 확정한다. AI는 이를 다시 채점하거나 변경하지 않는다 (`lib/readiness.ts:42-134`).
2. AI는 현재 Gate를 통과하기 위해 빠진 실행 정보만 최대 7개까지 질문하고, 창업자와 30·60·90일 계획을 만든다.
3. 계획은 창업자가 수정·승인한 뒤에만 활성화되며 담당자, 기한, 완료 증거, 위험과 다음 결정을 추적한다.
4. AI가 문서·조사·질문 설계를 돕되, 현장 검증·법률·세무·규제·파트너 발굴·대면 실행은 승인된 전문가 서비스로 넘긴다.
5. 전문가 연결은 단순 추천이 아니라 `왜 지금 필요한지 / 무엇을 준비할지 / 어떤 산출물을 받을지`가 포함된 handoff brief를 제공한다.
6. AI 계획 워크숍은 비용 민감·고빈도 작업용 모델인 정확한 모델 ID `gpt-5.6-luna`와 Responses API를 사용한다. 내부 방법론은 Obsidian의 검수된 위키를 먼저 검색하고, 최신 국가별 사실이 부족할 때만 제한적으로 웹검색한다.
7. 모든 계획은 창업자 답변, 내부 위키, 외부 웹자료, AI의 가정을 구분해 보여주며 인용할 수 없는 최신 사실은 `확인 필요`로 남긴다.

이 구조가 가성비가 좋은 이유는 예비진단과 우선순위 계산은 AI 호출 없이 수행하고, AI 비용은 계획을 만드는 짧은 워크숍에만 쓰며, 실제 현장 도움이 필요한 순간에만 유료 전문가로 전환하기 때문이다.

## 2. 현재 구조와 확인된 간극

- 진단 API는 55개 응답을 검증한 뒤 점수, 단계, Gate와 최대 5개 액션을 저장한다 (`app/api/assessments/route.ts:16-35`, `app/api/assessments/route.ts:57-121`).
- 액션은 현재 통과하지 못한 단계의 Critical 여부, 배점과 낮은 응답 순으로 최대 5개가 결정된다 (`lib/readiness.ts:94-118`).
- 액션에는 담당 역할, 완료 증거, 여정 단계, 전문가 서비스 태그가 이미 있다 (`lib/types.ts:27-35`).
- 결과 화면은 단계·점수·액션·전문가 추천을 표시하지만 `여정에 추가` 버튼은 동작이 연결되지 않았다 (`components/assessment-form.tsx:178-345`, 특히 `292-297`).
- 대시보드는 최근 진단과 해당 진단의 액션을 읽고 `service_tag`로 서비스를 추천한다 (`app/dashboard/page.tsx:23-60`, `103-120`).
- `/journey`는 현재 DB 계획이 아니라 고정된 11단계 예시를 표시한다 (`app/journey/page.tsx:7-58`).
- AI API는 4문장 설명만 반환하고 어디에서도 호출되지 않으며, 대화·계획·진행 이력을 저장하지 않는다 (`app/api/ai/explain/route.ts:32-62`).
- AI API가 허용하는 단계 값과 실제 진단 단계 타입이 다르다. API는 `기초 정비/진출 준비/현장 검증/실행 가능`을, 실제 타입은 `극초기/준비중/준비완료/진출 실행 가능`을 사용한다 (`app/api/ai/explain/route.ts:7-20`, `lib/types.ts:3-5`).
- 개인정보처리방침은 AI에 회사명, 계산 점수, 선택 액션과 승인 근거만 전송한다고 명시한다. 새 대화 입력과 보존·삭제 정책을 추가해야 한다 (`app/legal/privacy/page.tsx:33-38`).

## 3. 요구사항 요약

### 3.1 반드시 제공할 기능

- 55문항을 저장한 인증 사용자만 AI 계획 워크숍을 시작한다.
- 서버가 `assessmentId`로 진단·액션·조직을 직접 조회한다. 클라이언트가 보낸 점수나 단계는 신뢰하지 않는다.
- AI는 현재 단계의 Gate blocker와 P0/P1 액션을 근거로 필요한 추가 정보만 묻는다.
- 계획은 30일, 60일, 90일 구간으로 구성하며 각 항목에 담당자, 기한, 완료 증거, 선행조건, 위험, 전문가 필요 여부가 있다.
- 창업자가 계획을 수정하고 명시적으로 승인해야 활성화된다.
- 계획 항목은 `진행 전 / 진행 중 / 막힘 / 완료`로 추적한다.
- 재진단하면 기존 계획을 덮어쓰지 않고 새 버전을 만든다.
- 전문가가 필요한 항목은 승인된 서비스 태그와 연결하고 handoff brief를 생성한다.
- AI 오류·키 미설정·사용량 초과 시 기존 결정론적 5개 액션을 정상 표시한다.
- AI 계획 생성 모델은 서버에서 `gpt-5.6-luna`로 고정하고 클라이언트가 모델을 선택하거나 변경하지 못하게 한다.
- 내부 지식은 Obsidian 볼트의 공개·내부용 검수 문서 중 허용 목록만 사용하며 원본 볼트는 읽기 전용 원본으로 유지한다.
- 목표 국가의 규제·세무·관세·지원사업·시장 통계처럼 최신성이 필요한 사실은 내부 지식이 없거나 오래된 경우에만 외부 웹검색으로 보충한다.
- 생성 계획의 항목마다 창업자 답변, Obsidian 문서 또는 웹 URL 중 하나 이상의 근거를 연결한다. 근거가 없는 내용은 사실이 아니라 `AI 제안/가정`으로 표시한다.

### 3.2 AI와 전문가의 책임 경계

AI가 수행하는 일:

- 예비진단 설명과 우선순위 정리
- 목표·자원·일정·담당자·완료 기준에 대한 추가 질문
- 인터뷰 가이드, 조사 질문, 문서·체크리스트 초안
- 30·60·90일 계획과 전문가 전달용 brief 작성
- 진행 중 막힘 원인 정리와 사용자가 요청한 재계획

전문가에게 전환하는 일:

- 목표 국가의 실제 고객 인터뷰와 현장 관찰
- 파트너 발굴, 기관 접촉, 대면 영업·협상
- 법률·세무·규제·인증의 최종 판단
- 계약 검토, 실사, 현지 네트워크 소개
- 한국에서 물리적으로 수행해야 하는 테스트·제작·기관 대응

AI 금지사항:

- 점수, 단계, Gate 또는 원래 진단 답변 변경
- 확인되지 않은 시장 규모·연락처·지원금·비용·규제 사실 생성
- 성공 가능성 보장 또는 법률·세무·규제 적합성 확정
- 사용자 승인 없는 전문가 예약, 결제 또는 자료 공유

## 4. 단계별 사용자 경험

### 4.1 진단 결과

`components/assessment-form.tsx:178-345`의 결과 상단에 저장 성공 후에만 `AI GTM 어시스턴트와 계획 만들기` CTA를 표시한다. 제출 응답에서 `assessmentId`를 읽어 `/assistant/{assessmentId}`로 이동한다. 저장 실패 또는 비로그인 결과에서는 CTA 대신 저장·로그인 안내를 유지한다 (`components/assessment-form.tsx:104-150`).

### 4.2 AI 계획 워크숍

전용 화면 `/assistant/[assessmentId]`를 다음 세 영역으로 구성한다.

- 진단 요약: 현재 단계, Gate blocker, P0/P1 액션. 서버 원본이며 편집 불가.
- 대화: AI가 이미 진단에서 얻은 정보는 다시 묻지 않고 목표 시장, 고객, 가용 인력·예산, 목표 기한, 기존 자료와 제약 중 빠진 것만 최대 7개 질문.
- 계획 초안: 대화가 진행될수록 30·60·90일 계획을 구조화해 표시. 사용자는 제목, 담당자, 기한과 완료 기준을 직접 수정 가능.

자유 대화는 최대 20턴으로 제한한다. 단순 날짜·담당자·상태 수정은 AI를 호출하지 않는다.

### 4.3 단계별 계획 초점

- **극초기:** 진출 목적 합의, 중단 기준, 자원 우선순위, 책임자 지정, 본국 PMF 자료 정리. AI는 합의 문서와 체크리스트를 돕는다.
- **준비중:** 후보시장 비교, 고객 인터뷰 설계, 총 진입비용, 규제 체크리스트, 첫 수요 신호 검증. 실제 인터뷰·규제 판단은 전문가에게 전환한다.
- **준비완료:** GTM 실험, KPI, 파트너 역할·계약, 현지 운영, 의사결정권과 스케일 조건. 실제 파트너 발굴·영업·협상·현지화 실행은 전문가에게 전환한다.

앞 단계 Gate가 막혀 있으면 뒤 단계 계획을 활성화하지 않고 `향후 준비`로만 미리 보여준다. 기존 계산 로직도 현재 단계 액션만 생성한다 (`lib/readiness.ts:80-118`).

### 4.4 계획 승인과 실행

창업자가 `계획 확정`을 누르면 계획이 활성화되고 `/journey`와 `/dashboard`에 표시된다. 완료 체크는 점수를 자동 변경하지 않는다. 완료 증거를 모은 뒤 재진단할 때만 준비도 점수와 Gate를 다시 계산한다.

### 4.5 전문가 서비스 전환

`expert_required=true`인 계획 항목에 다음을 표시한다.

- 전문가가 필요한 이유
- 전문가에게 전달할 회사·진단·계획 요약
- 창업자가 미리 준비할 자료
- 기대 산출물과 완료 기준
- `service_tag`가 일치하는 승인 서비스 최대 3개

현재 태그 기반 추천 로직과 실제 공개 서비스 조회를 재사용한다 (`lib/service-data.ts:128-135`, `lib/services.ts:56-69`). 사용자가 명시적으로 `전문가에게 공유`를 누르기 전에는 대화·증거를 전문가에게 공개하지 않는다.

## 5. 권장 데이터 모델

새 마이그레이션 `supabase/migrations/005_ai_gtm_assistant.sql`에 두 테이블만 추가한다.

### `gtm_plans`

- `id`, `organization_id`, `assessment_id`, `created_by`
- `version`, `status(draft/active/superseded/completed)`
- `founder_context jsonb`: 목표시장·고객·자원·기한·제약의 구조화 답변
- `recent_messages jsonb`: 현재 워크숍 표시용 최근 최대 20개 메시지
- `conversation_summary text`: 다음 AI 호출에 전달할 요약
- `turn_count`, `generation_count`, `input_tokens`, `output_tokens`, `reasoning_tokens`, `model`
- `prompt_version`, `knowledge_version`, `generation_trace jsonb`: 검색 파일 ID·웹 URL·도구 호출 수·지연·fallback 사유
- `approved_at`, `created_at`, `updated_at`

재진단 또는 재계획 시 새 행과 증가한 `version`을 생성하고 이전 활성 계획은 `superseded`로 보존한다.

### `gtm_plan_items`

- `plan_id`, `source_action_item_id`
- `horizon(30/60/90)`, `sort_order`, `priority(P0/P1)`
- `title`, `rationale`, `owner_label`, `due_date`
- `completion_evidence`, `dependencies jsonb`, `risk_note`
- `status(not_started/in_progress/blocked/completed)`, `completed_at`
- `expert_required`, `expert_reason`, `service_tag`
- `handoff_brief jsonb`
- `sources jsonb`: `founder/vault/web/deterministic` 근거와 제목·위치·URL·관할·검수 상태

기존 `action_items`는 결정론적 예비진단 원본으로 보존하고 AI 계획 항목이 `source_action_item_id`로 참조한다 (`supabase/migrations/001_initial.sql:75-88`). 대화 전문을 별도 테이블에 무제한 저장하지 않는다. 지식 검색은 검수된 위키 전용 OpenAI vector store 하나만 사용하고 자체 벡터 DB나 범용 RAG 플랫폼은 추가하지 않는다.

두 테이블은 RLS를 활성화하고 같은 조직 구성원과 관리자만 조회·수정하게 한다. 현재 조직 권한 함수와 정책 패턴을 재사용한다 (`supabase/migrations/001_initial.sql:253-261`, `288-313`).

## 6. AI 입력·출력 계약

### 6.1 서버 입력 컨텍스트

`lib/gtm-assistant.ts`에 서버 전용 context builder를 둔다.

- DB에서 조회한 assessment ID, 단계, 점수, Gate 메시지
- DB에 저장된 해당 assessment의 최대 5개 결정론적 액션
- 그 액션과 관련된 문항 ID, 사용자의 단계 응답과 사용자가 명시적으로 포함한 서술 요약
- 창업자 워크숍의 구조화 답변
- 승인되고 만료되지 않은 `content_sources`만 근거로 포함 (`supabase/migrations/001_initial.sql:222-238`, `417-423`)
- OpenAI `file_search`가 반환한 Obsidian 검수 문서 최대 8개. 검색 순서는 내부 위키가 항상 먼저다.
- 최신 국가별 사실이 꼭 필요한 경우에만 OpenAI `web_search` 결과 최대 3회와 해당 URL·접근 시각

연락처, 결제·정산 정보, 증빙 파일 원문과 다른 단계의 55문항 전체는 보내지 않는다.

### 6.2 구조화 출력

Zod 스키마로 두 종류만 허용한다.

1. `next_question`: 질문 키, 질문, 필요한 이유, 선택지 또는 입력 유형
2. `plan_draft`: 요약, 명시적 가정, 30·60·90일 계획 항목, 전문가 전환 정보

모든 계획 항목은 원래 `source_action_item_id` 또는 `question_id`를 가져야 한다. 입력에 없는 점수·Gate·시장 사실·규제 판단이 나오면 저장하지 않고 재생성 또는 fallback한다.

### 6.3 근거와 출처 계약

계획 항목의 `sources[]`는 다음 최소 필드를 가진다.

- `source_type`: `founder | vault | web | deterministic`
- `title`, `claim`, `locator` 또는 `url`
- `knowledge_version` 또는 `accessed_at`
- `source_status`: `current | needs_review | expired | unknown`
- `jurisdiction`, `requires_expert`

화면에서는 `창업자 제공 사실 / 내부 방법론 근거 / 최신 외부 사실 / AI 제안·가정`을 시각적으로 구분한다. 규제·법률·세무·관세 사실은 출처가 있어도 `requires_expert=true`이며 전문가의 최종 확인 전에는 확정 표현을 쓰지 않는다.

## 7. 비용·사용량 통제

- 사용자 클릭 전에는 AI를 호출하지 않는다.
- 서버가 blocker와 우선순위를 먼저 계산하고 AI에는 관련 액션과 요약만 전달한다.
- 한 assessment당 추가 질문 최대 7개, 전체 대화 최대 20턴, 계획 생성 최대 3회.
- 다음 호출에는 전체 대화 대신 구조화 founder context, conversation summary와 최근 4개 메시지만 전달한다.
- 모델의 입력·출력 토큰, 호출 횟수와 지연을 `gtm_plans`에 누적 기록한다.
- 다음 질문은 `reasoning.effort=low`, 최종 계획과 재계획은 `reasoning.effort=medium`을 기본값으로 한다. 베타에서 품질 차이가 없으면 모두 `low`로 낮춘다.
- 파일 검색 결과는 최대 8개, 외부 웹검색은 계획 생성당 최대 3회로 제한한다.
- 진행 상태·담당자·기한 수정과 전문가 서비스 필터링은 AI 없이 처리한다.
- API 키 미설정, 모델 오류, JSON 검증 실패 또는 한도 초과 시 기존 `action_items`를 30일 계획으로 보여준다. 현재 AI endpoint의 deterministic fallback 패턴을 재사용한다 (`app/api/ai/explain/route.ts:44-48`).

## 8. 구현 단계

### 1단계 — 설계 계약과 선행 오류 정리

- `docs/specs/2026-08-05-ai-gtm-assistant-design.md`에 AI/전문가 책임, 데이터 최소화, plan JSON 계약과 상태 전이를 확정한다.
- `app/api/ai/explain/route.ts:7-20`의 단계 enum을 `lib/types.ts:5`와 일치시키거나 새 assistant endpoint로 대체한다.
- `lib/types.ts`에 `GtmPlan`, `GtmPlanItem`, `AssistantQuestion`, `AssistantPlanDraft` 타입을 추가한다.

검증: 실제 네 단계 값이 모두 Zod 검증을 통과하며 다른 값은 거부된다.

### 2단계 — 저장·권한 기반

- `supabase/migrations/005_ai_gtm_assistant.sql`에 `gtm_plans`, `gtm_plan_items`, 인덱스, 상태 제약, RLS와 조직 정책을 추가한다.
- assessment별 활성 계획 하나만 허용하는 partial unique index를 둔다.
- 탈퇴·조직 삭제·assessment 삭제 시 보존/삭제 관계를 명시한다.

검증: 같은 조직은 CRUD 가능, 다른 조직은 0행 또는 권한 오류, 관리자는 조회 가능, 재계획 시 이전 버전은 남는다.

### 3단계 — 결정론적 컨텍스트와 AI 계약

- `lib/gtm-assistant.ts`에 server context builder, 입력 최소화, expert boundary 분류, fallback 계획 생성기를 구현한다.
- `lib/gtm-assistant.test.ts`에 점수 불변성, 현재 Gate 우선, PII 제외, 최대 질문/턴, 전문가 분류와 fallback 검사를 추가한다.
- 모델 출력은 Zod로 검증하고 알 수 없는 필드·사실·원본 없는 계획 항목을 거부한다.

검증: 테스트 fixture의 AI 입력에 email·phone·payment·raw file URL이 없고, fallback 결과가 기존 P0/P1 액션과 일치한다.

### 3A단계 — Obsidian 지식 게시와 검색

- Obsidian 원본 경로 `/Users/kyuhwangyeon/Library/Mobile Documents/com~apple~CloudDocs/Obsidian Vault/GlobalGoToMarket`는 로컬 읽기 전용 source of truth로 둔다. Vercel 런타임은 이 로컬/iCloud 경로에 직접 접근하지 않는다.
- 설치된 `openai` 패키지와 Node 표준 라이브러리만 사용하는 `scripts/sync-gtm-knowledge.mjs`를 만든다. 기본은 변경 내역만 출력하는 dry-run이고 `--apply`를 명시할 때만 vector store를 변경한다.
- 초기 허용 목록은 `methodology/**`, `templates/**`, `checklists/**`, `industries/**`, `SCHEMA.md`, `GTM Resource Index.md`의 Markdown 문서로 제한한다.
- `_archive/**`, `.omc/**`, `raw/**`, `Startups/**`, `Assessments/**`, `Cases/**`, `Action Plans/**`, `log.md`, `.DS_Store`, PDF·DOCX와 frontmatter의 `confidentiality: confidential` 문서는 업로드하지 않는다.
- 각 파일의 SHA-256과 `relative_path`, `knowledge_version`, `source_status`, `confidentiality`, `jurisdiction`을 속성으로 기록한다. 같은 해시의 파일은 다시 올리지 않고 변경된 파일만 교체하며 이전 파일은 vector store에서 제거한다.
- 앱은 `OPENAI_GTM_VECTOR_STORE_ID`가 있을 때만 `file_search`를 사용한다. 없거나 검색이 실패하면 승인된 `content_sources`와 결정론적 액션으로 계속 동작한다.

검증: 연속 두 번의 sync에서 두 번째 업로드는 0건이고, 제외 경로·기밀 문서는 0건이며, 수정한 문서 하나는 새 파일 1건과 이전 파일 제거 1건만 만든다.

### 4단계 — 계획 워크숍 API

- `app/api/gtm-assistant/turn/route.ts`를 추가한다.
- 요청은 `assessmentId`, `planId`, 사용자 메시지만 받고 진단 컨텍스트는 서버가 구성한다.
- 시작/다음 질문/계획 초안 생성을 하나의 endpoint로 처리하며 idempotency key로 중복 생성·과금을 막는다.
- endpoint는 먼저 `file_search`로 내부 근거를 찾고, 최신 국가 사실이 필요한데 current 근거가 없을 때만 `web_search`를 활성화한다.
- 웹검색 질의에는 회사명·창업자명·이메일·전화·고객명·대화 원문을 넣지 않고 `목표 국가 + 산업 + 확인할 사실`만 사용한다.
- `app/api/gtm-plans/[id]/route.ts`에서 계획 수정, 승인, 상태 변경과 재계획을 처리한다.
- 승인·전문가 공유는 별도 명시적 action이며 AI 응답만으로 실행하지 않는다.

검증: 비로그인 401, 타 조직 403/404, 미완료 진단 409, 한도 초과 429, 유효한 session은 구조화 응답을 반환한다.

### 5단계 — 결과 CTA와 공동 계획 UI

- `components/assessment-form.tsx:104-150`에서 성공 응답의 `assessmentId`를 저장한다.
- `components/assessment-form.tsx:178-345`에 저장 성공 후 assistant CTA를 추가하고 동작 없는 `여정에 추가` 버튼을 실제 계획 흐름으로 교체한다.
- `app/assistant/[assessmentId]/page.tsx`와 `components/gtm-assistant.tsx`를 추가한다.
- 질문 진행, 계획 초안 편집, 가정·불확실성, 전문가 필요 표시, 계획 승인과 오류 fallback UI를 제공한다.

검증: 키보드만으로 전 과정이 가능하고, 로딩·재시도·fallback·한도 초과 상태가 `role=status/alert`로 전달된다.

### 6단계 — 대시보드·여정·전문가 연결

- `app/dashboard/page.tsx:48-120`에서 최신 active plan과 진행률, 다음 3개 항목, 막힌 항목을 보여준다.
- `app/journey/page.tsx:7-58`의 고정 예시를 active plan 기반 30·60·90일 보드로 교체하고 계획이 없으면 시작 CTA를 표시한다.
- `service_tag`와 공개 서비스 태그를 재사용해 전문가 필요 항목 아래에 서비스 최대 3개를 보여준다 (`lib/services.ts:56-69`).
- handoff brief를 사용자가 확인·수정·명시적으로 공유한 뒤에만 서비스 주문 흐름으로 넘긴다.

검증: 계획 진행률과 항목 상태가 dashboard/journey에서 동일하고, AI 자체 해결 항목에는 전문가 추천이 나오지 않는다.

### 7단계 — 개인정보·안전·운영 관측

- `app/legal/privacy/page.tsx:33-38`에 계획 대화 입력, AI 전송 범위, 보존·삭제, 전문가 공유 동의를 추가한다.
- 프롬프트에 업로드/URL 내용을 명령이 아니라 비신뢰 데이터로 처리하도록 명시한다.
- 웹 문서의 지시문은 실행하지 않고 사실 후보로만 취급한다. 정부·규제기관·공식 통계 등 1차 출처를 우선하고 찾지 못하면 `unknown`과 전문가 확인 필요를 반환한다.
- 요청별 model, latency, token usage, fallback reason을 구조화 로그로 남기되 대화 원문과 PII는 로그에 남기지 않는다.
- 사용자에게 계획 대화와 draft 삭제 기능을 제공한다.

검증: 로그 샘플에 이메일·전화·증빙 원문이 없고, 삭제 후 plan/session은 RLS 조회 결과에서 사라진다.

### 8단계 — 배포 순서

1. 마이그레이션과 RLS를 staging에 적용한다.
2. 로컬 지식 sync를 dry-run한 뒤 허용 파일·제외 파일·변경 건수를 검토하고 `--apply`한다.
3. Vercel에 `AI_GTM_ASSISTANT_ENABLED=false`, `AI_GTM_ASSISTANT_MODEL=gpt-5.6-luna`, `OPENAI_GTM_VECTOR_STORE_ID`를 설정해 배포한다. `GTM_VAULT_PATH`는 로컬 sync에만 사용하고 Vercel에는 넣지 않는다.
4. 내부 계정으로 극초기·준비중·준비완료 fixture를 각각 1회 검증한다.
5. 베타 사용자 5개 조직에만 활성화하고 plan 시작률, 승인률, 인용률, 완료율, fallback률과 전문가 전환률을 2주 측정한다.
6. 오류율과 비용 한도를 만족하면 전체 베타에 공개한다.

## 9. 수용 기준

1. 55개 유효 응답과 저장된 assessment가 없으면 assistant를 시작할 수 없다.
2. assistant 화면의 단계, Gate, 점수와 P0/P1은 같은 assessment의 `calculateReadiness` 결과와 정확히 일치한다.
3. AI가 점수·단계·Gate를 변경하려는 출력은 저장되지 않는다.
4. 현재 단계의 blocker와 상위 액션 외 정보는 사용자에게 필요한 이유를 설명하고 질문을 통해서만 보충한다.
5. 추가 질문은 최대 7개이며 같은 진단 답변을 반복해서 묻지 않는다.
6. 생성 계획은 30·60·90일 구간과 담당자, 기한, 완료 증거, 선행조건, 위험을 모두 포함한다.
7. 사용자가 승인하기 전 plan은 `draft`, 승인 후에만 `active`가 된다.
8. 재진단·재계획 후 기존 plan은 `superseded`로 보존되고 새 version이 활성화된다.
9. 법률·세무·규제·현장·파트너 활동은 `expert_required=true`, 이유와 handoff brief를 가진다.
10. 전문가에게는 사용자가 명시적으로 공유한 brief만 전달되고 진단 원문·대화·증빙은 전달되지 않는다.
11. 다른 조직 사용자는 plan, item과 대화 요약을 조회·수정할 수 없다.
12. 키 미설정·AI 오류·JSON 검증 실패·한도 초과 시 결정론적 액션 fallback이 표시되고 진단 결과는 유실되지 않는다.
13. assessment당 대화 20턴, 계획 생성 3회 한도가 서버에서 강제된다.
14. 계획 항목 상태 변경은 AI 호출 없이 저장되고 dashboard와 journey에 1회 새로고침 이내 반영된다.
15. `npm test`, `npm run typecheck`, `npm run build`가 통과한다.
16. 모든 assistant 계획의 `model`은 정확히 `gpt-5.6-luna`이며 `prompt_version`, `knowledge_version`과 검색 근거가 저장된다.
17. 지식 sync는 허용 목록의 Markdown만 게시하고 raw·archive·사용자별 자료·기밀 문서는 게시하지 않는다.
18. 동일한 볼트 상태에서 sync를 두 번 실행하면 두 번째 실행의 업로드·삭제가 모두 0건이다.
19. 극초기·준비중·준비완료와 국가·산업을 섞은 검색 fixture 12개 중 10개 이상에서 기대 위키 문서가 상위 8개 안에 포함된다.
20. 정적 방법론 질문은 웹검색을 호출하지 않고, 오래되었거나 비어 있는 국가별 동적 사실에만 웹검색을 호출한다.
21. 한 계획 생성의 웹검색은 최대 3회이며 검색 질의와 로그에 이메일·전화·회사·고객 식별자가 없다.
22. 최신 사실을 단정하는 계획 항목에는 현재 상태의 내부 출처 또는 접근 시각이 있는 외부 URL이 있다.
23. 만료·검토 필요 출처만 존재하거나 웹검색이 실패하면 사실을 만들지 않고 `확인 필요`와 `expert_required`를 표시한다.
24. 웹페이지에 포함된 프롬프트·도구 실행 지시를 무시하는 prompt-injection fixture가 통과한다.
25. vector store나 웹검색 장애가 진단·결정론적 fallback·기존 계획 조회를 중단시키지 않는다.

## 10. 위험과 완화

| 위험 | 완화 |
|---|---|
| AI가 진단을 재해석하거나 사실을 창작 | 서버 원본 컨텍스트, 구조화 출력, source action 참조 강제, 저장 전 검증 |
| 자유 대화가 길어져 비용 급증 | 7개 질문·20턴·3회 생성 한도, 요약+최근 4개 메시지만 전달 |
| AI가 전문가 영역을 침범 | expert boundary 규칙, 고위험 태그 강제 전환, 사용자 화면에 한계 표시 |
| 민감한 회사·고객정보 전송 | 명시적 안내, 입력 최소화·마스킹, raw 파일 제외, 삭제 기능 |
| 재진단이 기존 실행계획을 덮어씀 | assessment 연결과 versioned plan, active partial unique index |
| 계획은 생성되지만 실행되지 않음 | 담당자·기한·완료 증거 필수, dashboard/journey 진행 추적, 막힘 상태와 전문가 CTA |
| 전문가 추천이 무관하거나 공급이 없음 | 기존 service tag 재사용, 결과 0건 fallback, 운영자에게 공급 공백 지표 제공 |
| 로컬 Obsidian과 운영 검색 지식이 달라짐 | SHA-256 증분 sync, `knowledge_version` 저장, 배포 체크리스트에서 sync 시각 확인 |
| 위키의 내부·기밀 자료가 외부 서비스로 업로드됨 | 경로 allowlist, confidentiality 차단, dry-run 기본, 변경 목록 사람 검토 후 `--apply` |
| 오래된 국가 사실을 현재 사실로 사용 | `source_status`, `review_due`, 관할 필터, 필요 시 공식 웹검색, 근거 없으면 unknown |
| 웹자료가 틀리거나 프롬프트를 주입 | 공식 1차 출처 우선, 웹내용은 비신뢰 데이터, 출처 표시, 고위험 사실 전문가 확인 |
| Luna의 추론·검색 비용이 누적됨 | 요청 시에만 호출, low/medium effort 분리, 파일 8개·웹 3회·생성 3회 상한과 비용 로그 |
| Luna가 복잡한 최종 계획에서 품질 기준을 못 맞춤 | 대표 fixture로 low/medium을 비교하고 prompt·검색 컨텍스트를 먼저 개선한다. 모델 변경은 별도 승인 범위로 둔다. |

## 11. 검증 계획

### 단위

- 단계별 context builder 결과
- AI 출력 Zod 검증과 불변 필드 보호
- expert boundary 분류
- fallback 계획, 질문·턴·생성 한도
- handoff brief 데이터 최소화
- Obsidian allowlist·frontmatter·SHA-256 증분 sync
- `gpt-5.6-luna` 모델 고정, 검색 도구 선택, 출처 정규화와 prompt-injection 차단

### API/권한

- 인증·조직 소유권·미완료 진단·중복 요청·rate limit
- plan 승인과 version 전이
- 타 조직 접근 및 전문가 미동의 공유 차단

### 사용자 시나리오

- 극초기: 목적 합의와 자원 계획을 생성하고 AI 지원 항목을 완료 처리
- 준비중: 시장 인터뷰 계획을 만들고 현장 인터뷰를 전문가로 전환
- 준비완료: GTM 실험과 파트너 계획을 만들고 협상 업무를 전문가로 전환
- AI 장애: 결정론적 액션으로 계속 이용
- 재진단: 이전 계획 보존과 새 계획 생성
- 내부 근거 충분: 웹검색 없이 위키 인용 계획 생성
- 최신 국가 사실 필요: 공식 웹자료를 인용하고 규제·세무 항목을 전문가 확인으로 전환
- 검색 장애·근거 없음: 사실을 만들지 않고 확인 필요 항목으로 계속 진행

현재 프로젝트에는 Playwright가 없으므로 새 E2E 의존성은 추가하지 않는다 (`package.json`). Vitest 단위/API 테스트와 배포 전 브라우저 시나리오 체크리스트로 검증하고, 베타 이용량이 커져 회귀 비용이 실제로 발생할 때 E2E 도구를 추가한다.

## 12. MVP에서 제외

- 범용 자유 채팅
- 자체 운영 벡터 DB와 범용 RAG 플랫폼
- 멀티에이전트 자동 실행
- 외부 시장 데이터 자동 구매·수집
- 전문가 자동 예약·결제·자료 공유
- AI가 작업을 자동 완료하거나 준비도 점수를 갱신하는 기능

이 기능들은 AI 계획 승인률, 30일 내 항목 완료율, 전문가 전환률이 확인된 뒤 추가한다.

## 13. 성공 지표

- 진단 완료 조직 중 assistant 시작률 ≥ 40%
- 시작 조직 중 계획 승인률 ≥ 60%
- 승인 계획의 30일 내 1개 이상 항목 완료율 ≥ 50%
- 계획 세션당 평균 질문 수 ≤ 7, 계획 생성 호출 ≤ 3
- AI fallback률 < 5%, 저장/권한 오류율 < 1%
- `expert_required` 항목 중 handoff brief 확인률 ≥ 30%
- 전문가 서비스 전환은 품질 지표로 관찰하되 초기 2주에는 강제 목표를 두지 않는다.

## 14. 권장 실행 순서

먼저 1~5단계로 **진단 결과 → 공동 계획 초안 → 사용자 승인**의 핵심 가치를 검증한다. 그 다음 6단계의 실제 여정 추적과 전문가 handoff를 연결한다. 운영 데이터 없이 범용 챗봇, RAG 또는 자동 예약을 먼저 만들지 않는다.

## 15. GPT-5.6 Luna·Obsidian·국가 웹검색 확장 설계

### 15.1 최소 아키텍처

```text
55문항 결정론적 진단
  → 서버 context builder
  → Obsidian 검수 위키 file_search (항상 먼저, 최대 8개)
  → 최신 국가 사실이 비어 있거나 오래된가?
      ├─ 아니오: gpt-5.6-luna 계획 생성
      └─ 예: 비식별 web_search (최대 3회) → gpt-5.6-luna 계획 생성
  → Zod 검증·불변값 보호
  → 출처가 붙은 draft
  → 창업자 수정·승인
  → 실행 추적 또는 전문가 handoff
```

MVP에는 별도 크롤러, 자체 임베딩 파이프라인, 검색 서버, 멀티에이전트를 만들지 않는다. OpenAI Responses API가 이미 지원하는 `file_search`, `web_search`, structured outputs와 현재 설치된 `openai` 패키지를 사용한다.

### 15.2 모델 실행 정책

- 모델 ID는 alias가 아닌 `gpt-5.6-luna`를 저장하고 요청에도 그대로 사용한다. `gpt-5.6` alias는 Sol로 연결되므로 사용하지 않는다.
- Responses API, `store:false`, 안정적인 해시 `safety_identifier`, `reasoning.context="current_turn"`을 사용한다.
- 앱이 보관하는 `conversation_summary + recent_messages 4개`만 매 요청에 다시 전달해 숨은 추론 상태 재생과 장기 대화 저장을 피한다.
- 다음 질문은 `low`, 최종 계획·재계획은 `medium` reasoning effort를 사용한다. 베타 fixture에서 `low`가 같은 품질을 보이면 최종 계획도 `low`로 낮춘다. `high/xhigh/max`, pro mode, Priority Processing, 멀티에이전트는 MVP에서 사용하지 않는다.
- 출력은 `next_question` 또는 `plan_draft` Zod schema만 허용한다. 유효성 검사 실패는 1회 재생성 후 결정론적 fallback으로 끝낸다.

### 15.3 Obsidian 지식 게시 방법

1. 로컬 sync가 `GTM_VAULT_PATH` 아래 허용 목록을 읽는다.
2. YAML frontmatter와 `SCHEMA.md` 규칙에서 상태·관할·기밀성·버전을 읽고, 허용되지 않은 파일을 제외한다.
3. 본문과 상대경로의 SHA-256을 계산해 이전 manifest와 비교한다.
4. dry-run 보고서에 `추가/변경/삭제/제외 사유`만 출력한다.
5. 운영자가 확인한 뒤 `--apply`하면 변경 파일만 전용 OpenAI vector store에 반영한다.
6. 성공 후 로컬 manifest에 file ID와 해시를 기록하고 앱이 저장할 `knowledge_version`을 갱신한다.

볼트의 `GTM Resource Index.md`가 구분하는 검수 위키와 원천자료를 그대로 존중한다. 초기에는 약 90개 전체 문서가 아니라 방법론·템플릿·체크리스트·산업 문서만 게시한다. 검색 누락이 실제로 관찰될 때 허용 경로를 한 폴더씩 늘린다.

### 15.4 국가별 외부 웹검색 발동 규칙

다음 중 하나일 때만 서버가 웹검색을 허용한다.

1. 목표 국가의 법령·세금·관세·인증·지원사업처럼 최신성이 핵심이다.
2. 내부 위키에 해당 국가·산업의 current 출처가 없다.
3. 내부 출처의 `review_due`가 지났거나 `needs_review/expired` 상태다.
4. 최신 정부 통계나 공식 기관 연락 경로를 확인해야 한다.

검색 우선순위는 `해당 국가 정부·규제기관·공식 통계 → 국제기구 → 신뢰할 수 있는 2차 자료`다. 2차 자료만 있으면 계획의 확정 근거가 아니라 검증할 가설로 표시한다. 검색 결과가 없거나 충돌하면 AI가 하나를 임의로 선택하지 않고 `unknown`, 충돌 출처, 다음 확인 행동을 반환한다.

### 15.5 개인정보·저작권·보안 경계

- 웹검색 질의는 목표 국가·산업·확인할 사실만 포함한다. founder context나 고객 데이터는 넣지 않는다.
- vector store는 로컬 볼트 자체가 아니라 허용된 문서 사본을 보관하므로 업로드 전 기밀성·권리를 검토하고 언제든 삭제할 수 있어야 한다.
- PDF·DOCX와 raw 원문은 라이선스와 개인정보가 개별 검토되기 전에는 게시하지 않는다.
- 검색 문서는 명령이 아니라 참고 데이터다. 문서가 시스템 프롬프트 무시, 비밀 공개, 도구 실행을 요구해도 따르지 않는다.
- 법률·세무·규제·관세 결론은 출처가 있어도 참고 정보이며 최종 판단을 전문가에게 넘긴다.

### 15.6 환경변수와 운영 책임

| 변수 | 위치 | 용도 |
|---|---|---|
| `OPENAI_API_KEY` | Vercel + 로컬 sync | Responses, file/web search, 지식 게시 |
| `AI_GTM_ASSISTANT_MODEL=gpt-5.6-luna` | Vercel | 비용 민감·고빈도 운영 모델을 명시하고 로그·검증에 사용 |
| `OPENAI_GTM_VECTOR_STORE_ID` | Vercel + 로컬 sync | 검수 위키 전용 vector store |
| `GTM_VAULT_PATH` | 로컬만 | Obsidian source of truth 경로 |
| `AI_GTM_ASSISTANT_ENABLED` | Vercel | 조직별 베타 기능 제어 |

지식 갱신은 MVP에서 자동 스케줄링하지 않는다. 위키 릴리스 또는 주요 국가자료 검수 후 운영자가 dry-run과 변경 목록을 확인해 수동 게시한다. 월 1회 이상 `review_due`, sync 시각과 검색 실패율을 점검하고, 갱신 지연이 실제 운영 부담이 될 때만 CI 자동화를 추가한다.

### 15.7 구현 파일 영향 범위

- 신규: `scripts/sync-gtm-knowledge.mjs`, 로컬 manifest, 최소 sync self-check
- 신규: `lib/gtm-knowledge.ts`의 도구 선택·출처 정규화 함수와 단위 테스트
- 수정: `lib/gtm-assistant.ts`, `app/api/gtm-assistant/turn/route.ts`, `gtm_plans/gtm_plan_items` 마이그레이션
- 수정: assistant UI의 출처·확인 필요·전문가 경계 표시
- 미수정: 55문항 계산, 점수, 단계, Gate와 원본 Obsidian 문서

### 15.8 공식 기술 근거

- [GPT-5.6 Luna 모델](https://developers.openai.com/api/docs/models/gpt-5.6-luna): 비용 민감·고빈도 작업용 모델이며 Responses API, structured outputs, web search와 file search 지원
- [GPT-5.6 사용 가이드](https://developers.openai.com/api/docs/guides/latest-model): `gpt-5.6-luna`의 효율적 대량 작업 역할, Responses API, reasoning effort, safety identifier 지침
- [File search 가이드](https://platform.openai.com/docs/guides/tools-file-search): OpenAI 관리형 파일 검색과 vector store 사용법
- [Web search 가이드](https://platform.openai.com/docs/guides/tools-web-search): Responses API 웹검색과 출처 처리
