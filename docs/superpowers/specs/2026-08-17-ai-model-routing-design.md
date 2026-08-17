# AI 전문가 서비스 모델 라우팅 — 설계 스펙

- 작성 2026-08-17 · 상태 **승인 대기(구현 전)**
- 대체 대상: `readiness-v5-worktree/ai-model-option.md` (검토: `docs/design/2026-08-17-ai-model-option-review.md`)
- 범위: 유료·베타 **AI 전문가 서비스** 보고서 생성만. GTM 어시스턴트·시장조사·준비도 총평·번역은 제외.

## 0. 결정 요약

| 항목 | 결정 |
|---|---|
| 기본 모델 | 세 단계 모두 **Claude Opus 5** |
| 폴백 | **없음.** 실패하면 그 단계에서 실패 처리 |
| 관리자 선택 | `/admin/ai-models`에서 단계별 풀다운. 서버 허용 목록 안에서만 |
| 허용 목록 | Claude Opus 5 · Claude Sonnet 5 · GPT-5.6 Sol (두 공급자 유지 — sol이 유일한 완주 실적이자 즉시 롤백 수단) |
| 설정 저장 | 버전으로 쌓음. 롤백도 새 버전. 실행은 예약 시점 스냅샷 사용 |
| 아키텍처 | 어댑터 2개 + `provider` 분기 함수. 게이트웨이 추상화 없음 |

이전 문서와 달라진 것: Luna 제거, 폴백 제거, Opus가 주 경로가 되면서 **Anthropic 스키마 변환이
주 작업**이 됨(§3.3), 마이그레이션 번호 022, RPC 시그니처 교체 절차, effort 필수, 사용자에게 작성
모델 표시.

---

## 1. 접근안 비교

| | A. `provider` 분기 + 어댑터 2개 **(채택)** | B. LLM 게이트웨이 추상화 | C. 환경변수 |
|---|---|---|---|
| 라우트 변경 | 단계마다 어댑터 선택 한 줄 | 라우트가 공급자를 모름 | 없음 |
| 새 계층 | 없음. 함수 4개 | 공통 요청/응답 타입 + 변환기 | 없음 |
| 위험 | 어댑터마다 스키마·사용량 매핑 중복 | 두 API의 요청·도구·인용 모양이 달라 추상화가 샘. 장애 지점 추가 | 관리자 페이지 요구 불충족 |
| 결론 | 두 공급자·세 단계에 딱 맞는 크기 | 공급자 4개 이상일 때 재검토 | 배제 |

---

## 2. 데이터

### 2.1 모델 허용 목록 — `lib/ai-models/catalog.ts` (코드 고정)

```ts
type ModelKey = "anthropic:claude-opus-5" | "anthropic:claude-sonnet-5" | "openai:gpt-5.6-sol";
type Effort = "low" | "medium" | "high";
type ModelSpec = {
  key: ModelKey; provider: "anthropic" | "openai"; model: string; label: string;
  structuredOutput: true; webSearch: boolean; fileInput: boolean;
  efforts: Effort[];
  priceUsdPerMTok: { input: number; cacheRead: number; cacheWrite?: number; output: number };
  webSearchUsdPerCall: 0.01;
  deprecatedAt?: string; replacement?: ModelKey;
};
```

| 키 | 표시 | 웹검색 | effort | in / cache-r / cache-w / out |
|---|---|---|---|---|
| `anthropic:claude-opus-5` | Claude Opus 5 | ○ | low·medium·high | 5 / 0.50 / 6.25 / 25 |
| `anthropic:claude-sonnet-5` | Claude Sonnet 5 | ○ | low·medium·high | 2 / 0.20 / 2.50 / 10 |
| `openai:gpt-5.6-sol` | GPT-5.6 Sol | ○ | low·medium·high | 5 / 0.50 / – / 30 |

단가는 2026-08-17 공식 문서 기준. 관리자 UI에서 편집하지 않는다. `calculateSolCostUsd` →
`costOf(modelKey, usage)` 하나로 교체(캐시 쓰기 축 포함).

### 2.2 라우팅 설정 — 마이그레이션 `022_ai_model_routing.sql`

```
ai_model_routing_configs
  id uuid pk · version int unique · status text check in (active, superseded)
  routes jsonb not null · created_by uuid → profiles · created_at · superseded_at
  unique index ... where status = 'active'          -- 활성 1개
```

`routes` (Zod로 저장·읽기 양쪽 검증. **폴백 키 없음**):

```json
{
  "classification":  { "model": "anthropic:claude-opus-5", "effort": "low" },
  "public_research": { "model": "anthropic:claude-opus-5", "effort": "medium" },
  "final_report":    { "model": "anthropic:claude-opus-5", "effort": "medium" }
}
```

패키지 상품의 `final_report`는 라우트가 `high`로 승격한다(현행 동작 유지).

**시드 v1은 세 단계 모두 `openai:gpt-5.6-sol`.** 배포 직후 동작이 바뀌지 않게 하고, 전환은
관리자 페이지에서 한다(§7).

### 2.3 실행 기록 — `ai_agent_runs`

```
model_route_snapshot jsonb not null default '{}'   -- reserve 시점 고정
model_attempts       jsonb not null default '[]'   -- [{stage, model, ok, errorClass?, usage, costUsd, ms}]
```

`reserve_ai_agent_generation`이 활성 설정을 읽어 스냅샷을 쓴다. 활성 설정이 없으면 예약을 거절한다
(`no_active_model_config`).

`complete_ai_agent_generation` · `fail_ai_agent_generation`은 `p_model_attempts jsonb`를 받도록
**옛 시그니처를 `drop function`한 뒤** 재생성하고 `revoke`/`grant`를 다시 건다. 오버로드가 남으면
라우트가 조용히 옛 것을 부른다. 테스트가 `pg_proc`에 옛 시그니처가 없음을 단언한다.

---

## 3. 실행 경로

### 3.1 흐름

```
결제/베타 주문 → reserve(설정 스냅샷 고정)
  → [context]  classify   ← snapshot.classification.model
  → [research] research   ← snapshot.public_research.model  (검색 → 정리, 두 호출)
  → [verify]   출처 허용목록 대조 (공급자 무관)
  → [report]   writeReport ← snapshot.final_report.model
  → [finalize] 스키마·의미·출처 검증 → complete
실패: 그 자리에서 fail (폴백 없음). 각 호출 전 남은 예산 검사, 부족하면 budget_exhausted로 fail.
```

### 3.2 어댑터 — `lib/ai-models/openai.ts`, `lib/ai-models/anthropic.ts`

각각 `classify` · `research` · `writeReport`. 공통 반환:

```ts
{ parsed: T; usage: { input, cachedInput, cacheWriteInput, output, webSearchCalls }; allowedUrls?: Set<string> }
```

| | OpenAI | Anthropic |
|---|---|---|
| 호출 | 현재 라우트 코드를 그대로 이동 | `messages.parse` + `output_config.format` |
| 스키마 | `zodTextFormat` (uri 없는 현재 스키마) | `toModelSchema()` 통과본(§3.3) |
| effort | `reasoning.effort` | **`output_config.effort`** — 항상 명시(기본 high) |
| 사용자 식별 | `safety_identifier` | `metadata.user_id` (같은 SHA-256) |
| 재시도 | `maxRetries: 0` | `maxRetries: 0` |
| 파일 | `input_file` + 서명 URL | `document`/`image` 블록 `source: {type: "url"}` — 서명 URL 15분으로 충분한지 스파이크 확인, 아니면 base64 |
| 웹검색 | `web_search`, `max_tool_calls: 8` | `web_search_20250305`, `allowed_callers: ["direct"]`, `pause_turn` 루프 ≤5회 + 예산 검사 |
| 검색 상한 | `max_tool_calls: 8` — 스테이지 전체에 적용 | `max_uses`는 **요청당** 상한이라 재개마다 초기화된다. 재개 요청마다 남은 할당량(`8 − 지금까지 사용`)으로 줄여 스테이지 전체를 8회로 묶는다 |
| 허용 URL | `web_search_call.action` + `url_citation` | `web_search_tool_result.content[].url` + `citations[].url` |

`collectAllowedResearchUrls`(`lib/research-sources.ts`)에는 Anthropic 모양을 **추가만** 한다.
GTM 어시스턴트가 같은 함수를 쓴다.

Anthropic 조사 단계는 **검색(구조화 출력 없음) → 정리(구조화 출력, 도구 없음)** 두 호출이다.
구조화 출력과 server tool 병용은 문서로 확인되지 않았고, 분리하면 문서로 확인된 기능만 쓴다.

### 3.3 모델용 스키마 변환 — `lib/ai-models/schema.ts`

Anthropic 구조화 출력은 `minLength`·`maxLength`·`pattern`·`maxItems`·`minimum`·`maximum`을 400으로 거절한다.
현재 `aiAgentReportSchema`에는 `.max(`가 36곳 있다.

`toModelSchema(zod)`: JSON Schema로 변환 후 위 키워드 제거(`minItems`는 0/1만 유지), `additionalProperties: false`·`required` 유지.
응답 검증은 원래 Zod로 하고, 길이 초과는 기존 `parseTruncatingStrings`가 자른다.
원칙: **모델에 보내는 스키마와 검증 스키마는 분리한다.** OpenAI의 `format: uri` 거절과 같은 계열이다.

### 3.4 사용자 노출

보고서 헤더 "프론티어 모델" → **"작성 모델: Claude Opus 5"** (`ai_agent_runs.model`을 표시 이름으로 매핑).
같은 상품을 산 두 사용자가 다른 모델의 보고서를 받을 수 있으므로 알려야 한다
(`docs/design/progress-indicator-honesty.md`와 같은 원칙).

---

## 4. 관리자 UI/UX — `/admin/ai-models`

### 4.1 원칙

- 기존 관리자 화면의 부품만 쓴다: `AdminNav`(`.admin-subnav`), `.admin-section`, `.admin-metrics`, `.panel`, `.admin-chip`, `.provider-form`, `.notice-banner`, `.button`. 새 컴포넌트 라이브러리·디자인 토큰 없음.
- 상태는 **색 + 텍스트**로. 색만으로 구분하지 않는다.
- 저장은 서버 액션(`app/admin/actions.ts`에 `changeModelRouting`·`rollbackModelRouting` 추가, `changeUserRole`과 같은 `useActionState` 패턴). 별도 API 라우트 없음.
- 관리자 권한·삭제 계정 차단은 `/admin/users`와 같은 검사 재사용.
- ko/en 동일 기능.

### 4.2 정보 구조

```
운영 관리 메뉴:  운영 개요 | 사용자 관리 | AI 모델          ← AdminNav 세 번째 항목

AI 모델
AI 전문가 서비스가 단계별로 어떤 모델을 쓰는지 정합니다. 바꾸면 새 실행부터 적용됩니다.

┌ 상태 ──────────────────────────────────────────────────────────────┐
│ [OpenAI 키 · 설정됨 ✓] [Anthropic 키 · 미설정 ✕] [활성 설정 v3] [최근 변경 · 관리자 · 08-17 14:02] │
└────────────────────────────────────────────────────────────────────┘

┌ 최근 24시간 ───────────────────────────────────────────────────────┐
│ 실행 12건 · Claude Opus 5 10건 · GPT-5.6 Sol 2건 · 진행 중 1건        │
└────────────────────────────────────────────────────────────────────┘

┌ 단계별 모델 ───────────────────────────────────────────────────────┐
│ 1  입력 정리                                                        │
│    모델 [Claude Opus 5      ▾]   추론 강도 [낮음 ▾]                  │
│    제출 정보와 준비도 진단을 분류하고 조사 범위를 정합니다.            │
│                                                                    │
│ 2  공개 자료 조사                                                    │
│    모델 [Claude Opus 5      ▾]   추론 강도 [보통 ▾]                  │
│    웹검색으로 근거를 모읍니다. 웹검색이 없는 모델은 고를 수 없습니다.  │
│                                                                    │
│ 3  보고서 작성                                                       │
│    모델 [Claude Opus 5      ▾]   추론 강도 [보통 ▾]                  │
│    패키지 상품은 자동으로 '높음'으로 실행됩니다.                       │
└────────────────────────────────────────────────────────────────────┘

┌ 변경 영향 ─────────────────────────────────────────────────────────┐
│ • 새 실행부터 적용됩니다. 진행 중 1건은 지금 설정으로 끝납니다.        │
│ • 바뀌는 단계: 보고서 작성  GPT-5.6 Sol → Claude Opus 5               │
└────────────────────────────────────────────────────────────────────┘

변경 사유 [                                     ]  (감사 이력에 남습니다)
[변경 취소]                                             [새 설정 적용]

이전 설정
v2 · 08-16 09:10 · 관리자 · 세 단계 GPT-5.6 Sol           [이 설정으로 되돌리기]
v1 · 08-15 18:00 · 시스템 · 세 단계 GPT-5.6 Sol           [이 설정으로 되돌리기]
```

단계 이름·설명은 생성 화면 플로우차트(`components/ai-generation-flow.tsx`)와 **같은 문구**를 쓴다.
관리자가 보는 단계와 사용자가 보는 단계가 같은 것임을 알 수 있게.

### 4.3 컴포넌트

| 요소 | 구현 | 상태·규칙 |
|---|---|---|
| 상태 카드 4장 | `.admin-metrics` 안 `.admin-chip` | 키 설정됨 = `.admin-chip--admin`+✓ 텍스트, 미설정 = `.admin-chip--warning`+✕ 텍스트. 키 값은 절대 표시 안 함 |
| 24시간 요약 | 텍스트 한 줄 | `model_attempts` 집계 + `status='generating'` 카운트 |
| 단계 카드 | `.admin-section > .panel` 3장, 번호는 플로우차트 마커와 같은 스타일 | 세로 배치, 순서 고정 |
| 모델 `<select>` | 네이티브 `<select>` | 옵션 = 허용 목록. **키 미설정 공급자의 옵션은 `disabled`** + 옵션 텍스트에 "(키 미설정)". 조사 단계는 `webSearch: false` 옵션 `disabled` + "(웹검색 없음)". `deprecatedAt` 지난 옵션은 목록에서 숨기되 현재 값이면 "(지원 종료)" 표시 |
| 추론 강도 `<select>` | 네이티브 `<select>` | 옵션 = 그 모델의 `efforts`. 모델을 바꾸면 허용값 밖이면 `medium`으로 리셋 |
| 변경 영향 | `.notice-banner` | 바뀐 단계만 "이전 → 이후". 바뀐 게 없으면 버튼 비활성 + `.admin-role-form__hint` "바뀐 값이 없습니다" (사용자 관리 폼과 같은 패턴) |
| 변경 사유 | `<textarea minLength=10 required>` | 감사 이력. `changeUserRole`과 동일 |
| 적용 버튼 | `.button--primary` | pending 중 "적용 중…". 성공 시 `role="status"` "새 설정 v4를 적용했습니다. 새 실행부터 사용됩니다." |
| 이전 설정 | `.admin-table` | 각 행 요약("세 단계 GPT-5.6 Sol" / "조사 Sol, 나머지 Opus 5") + 되돌리기 버튼. 활성 행은 버튼 대신 "현재" 칩 |
| 되돌리기 | `<details>` 안 확인 블록 | 현재값 ↔ 복구값 표 + 사유 입력 + 확인 버튼. 새 버전으로 기록 |

### 4.4 서버 검증 (클라이언트와 동일 규칙을 다시)

- 관리자 역할, 삭제 계정 아님
- 세 단계 모두 존재, 모델 키가 허용 목록에 있음
- 단계가 요구하는 기능을 모델이 지원(조사 → `webSearch`)
- effort가 그 모델의 `efforts` 안
- 필요한 공급자 키가 환경변수에 있음
- 활성 설정과 다른 값이 하나 이상
- 사유 10자 이상
- 폴백 키가 오면 거부(400)

### 4.5 반응형·접근성

- 상태 카드: 데스크톱 4열 → 태블릿 2열 → 모바일 1열(`.admin-metrics` 기존 규칙)
- 단계 카드: 항상 1열. 모델·강도 select는 데스크톱 가로 2개, 480px 이하 세로
- 320px 가로 스크롤 없음
- 모든 입력·버튼 최소 높이 42px, 기존 3px 포커스 링
- `<label for>` 연결, 도움말은 `aria-describedby`
- 저장 결과·검증 오류는 `role="status"`/`role="alert"`
- 키보드만으로 선택·저장·되돌리기 가능

### 4.6 빈 상태·오류

| 상황 | 표시 |
|---|---|
| 활성 설정 없음(마이그레이션 직후 시드 실패) | 상단 `.notice-banner--error` "활성 설정이 없어 새 실행이 거절됩니다. 아래에서 저장하세요." 폼은 시드 기본값으로 채움 |
| Anthropic 키 미설정 | 카드 ✕ + Anthropic 옵션 전부 disabled + 카드 아래 "Vercel 환경변수 `ANTHROPIC_API_KEY`를 등록하면 선택할 수 있습니다" |
| 저장 경합(다른 관리자가 먼저 저장) | 유니크 위반 → "다른 관리자가 방금 v4를 적용했습니다. 새로고침 후 다시 확인해 주세요." |
| 진행 중 실행 있음 | 변경 영향에 건수 표시. 저장을 막지 않음(스냅샷이 보호) |

---

## 5. 예산·시간

- `maxDuration = 300`, 데드라인 285초 유지
- 각 어댑터 호출 전 `remaining` 검사. 부족하면 호출하지 않고 `budget_exhausted`로 실패 RPC
- Anthropic 조사 `pause_turn` 루프는 횟수 상한(5)과 예산을 **둘 다** 검사
- Opus 5는 sol보다 느릴 수 있다. 전환 후 첫 완주의 단계별 시간(`generation_stage` 갱신 시각)을 기록해 기본 effort를 조정한다

---

## 6. 테스트

| 층 | 내용 |
|---|---|
| catalog | 모든 키에 단가·`efforts`·기능 존재. `costOf` 세 모델 + 캐시 쓰기 축. 조사 단계에 `webSearch:false` 모델 거부 |
| schema | 3개 스키마 `toModelSchema` 결과 순회 → Anthropic 미지원 키워드 0개, `required`·`additionalProperties:false` 보존, 같은 유효 객체가 변환 전후 스키마 모두 통과 |
| research-sources | Anthropic 픽스처(`web_search_tool_result`, `citations`) 수집 확인. **기존 OpenAI 픽스처 테스트 무수정 통과** |
| routes Zod | 허용 목록 밖 모델·미지원 effort·폴백 키·단계 누락 거부 |
| 022 마이그레이션 | 활성 1개 부분 인덱스 존재, 옛 RPC 시그니처 `pg_proc`에 없음, `reserve`가 활성 설정 없으면 null 반환 |
| 라우트 | 스냅샷의 provider로 어댑터 선택. 실패 시 폴백 호출 없이 `fail` 1회. `model_attempts`에 단계별 기록. 예산 부족 시 호출 없이 `budget_exhausted` |
| 관리자 | 비관리자 403 · 키 미설정 공급자 저장 거부 · 바뀐 값 없으면 거부 · 롤백은 새 버전 · 활성 행 되돌리기 없음 |
| 실측 스파이크 | Anthropic classify/research(2)/report 실제 API 200 + 스키마 통과. 로컬 `ANTHROPIC_API_KEY` 필요 |
| 시각 | 관리자 페이지 320px 가로 스크롤 없음, 키보드 순회 |

---

## 7. 배포 순서

1. 022 적용 (`supabase db push`) — 시드 v1 = 세 단계 sol
2. 코드 배포 — 동작 변화 없음(스냅샷이 sol)
3. Vercel에 `ANTHROPIC_API_KEY` 등록 → 관리자 페이지 상태 카드가 ✓로 바뀌는지 확인
4. 관리자 페이지에서 세 단계 Opus 5로 저장(v2)
5. 관리자 베타로 실제 보고서 1건 완주. `model_attempts`·비용·단계별 시간 확인
6. 문제 시 v1 되돌리기 — 코드 배포 없이 풀다운으로 복귀

---

## 8. 영향 파일

```
lib/ai-models/catalog.ts            신규
lib/ai-models/schema.ts             신규
lib/ai-models/openai.ts             신규 (라우트에서 이동)
lib/ai-models/anthropic.ts          신규
lib/ai-models/routing.ts            신규 (routes Zod, 활성 설정 읽기)
lib/research-sources.ts             Anthropic 모양 추가만
lib/ai-agent-report.ts              calculateSolCostUsd → costOf 대체
app/api/ai-agent-runs/[orderId]/route.ts   어댑터 호출로 축소
app/admin/ai-models/page.tsx        신규
app/admin/actions.ts                changeModelRouting · rollbackModelRouting 추가
components/admin-nav.tsx            항목 추가
components/admin-model-routing-form.tsx    신규
components/ai-agent-workspace.tsx   작성 모델 표시
app/globals.css                     단계 카드·select 2열 소량
supabase/migrations/022_ai_model_routing.sql (+ .test.ts)
package.json                        @anthropic-ai/sdk
```

## 9. 범위 밖

폴백 · GTM 어시스턴트 전환 · 상품별 라우팅 · A/B 분배 · 단가 UI 편집 · 임의 모델 문자열 · Claude Files API · 동적 필터 웹검색(`web_search_20260209+`)

## 10. 열린 질문 (구현 중 스파이크로 닫는다)

- Anthropic `document` URL 소스가 Supabase 서명 URL을 15분 안에 읽는가 → 아니면 base64
- Opus 5 조사 단계 실제 소요 시간 → effort 기본값 조정 근거
