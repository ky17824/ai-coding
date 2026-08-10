# 구현 계획 — 회원가입·로그인·마이페이지·관리자 대시보드

- 작성일: 2026-08-04
- 설계 문서: [2026-08-04-auth-account-design.md](../specs/2026-08-04-auth-account-design.md)
- 기준 커밋: `1037950`
- 브랜치: `feat/auth-account-admin`

## Goal

비로그인 사용자가 55문항을 끝까지 풀고, 결과를 보는 시점에 가입하면 답변을 잃지 않고 결과를 받는다. 가입 시 이름·회사명·직위·전화번호를 받고 전화번호는 암호화한다. 마이페이지에서 프로필과 계정을 관리한다. 관리자는 기업별 진단·액션·주문 진행을 한 화면에서 본다.

## 구현 전 준비

1. 현재 `main`과 기준 커밋 `1037950`을 보존하고 이 문서부터 추적한다.
2. 마이그레이션과 환경변수 파일은 코드로 작성하되 외부 환경에는 적용하지 않는다.
3. T1~T14의 코드·자동 테스트·프로덕션 빌드를 먼저 완료한다.

## 운영 반영 — 코드 완료 후 별도 진행

1. Supabase 스테이징에서 마이그레이션과 가입·재설정 메일을 검증한다.
2. Supabase Site URL·Redirect URL·Secure password change·Google Provider·운영 SMTP를 설정한다.
3. Vercel에 `PII_ENCRYPTION_KEY`, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`를 등록한다.
4. 스테이징 검증이 끝난 마이그레이션을 운영 DB에 적용한다.
5. 실제 결제 개시 전 이용약관·개인정보 수집 문구를 국내 전문가가 검토한다.

## Architecture

```text
랜딩 [무료 준비도 진단]
   → /assessment (공개)  ── 서버 컴포넌트가 isSignedIn 주입
        ↓ 55문항 응답 후 [결과 보기]
   비로그인이면 sessionStorage 저장 → /signup?next=/assessment
        ↓
   /signup ── 구글 | 이메일+비밀번호 + 이름·회사·직위·전화 + 동의 3종
        ↓ signUp → 인증메일 → /auth/callback?next=...
   /auth/callback ── 조직·프로필 생성, 전화번호 암호화 저장, next 복귀
        ↓
   /assessment ── sessionStorage 읽어 저장 성공 시 삭제 → 결과

/account          프로필·비밀번호·수신동의·탈퇴
/admin            할일 · 퍼널 · 기업목록 · 상세 · 전문가수급 · 지표
```

## Tech Stack

기존 스택을 그대로 쓴다. 새 의존성은 추가하지 않는다.

- Next.js 15 App Router, React 19, TypeScript
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — 인증·DB
- `zod` — 서버 액션 입력 검증
- `node:crypto` — AES-256-GCM (내장 모듈)
- `vitest` — 순수 로직 테스트

## 전역 제약

1. **TDD는 순수 로직에만 적용한다.** `lib/pii.ts`, `lib/pending-assessment.ts`는 실패하는 테스트를 먼저 쓴다. 서버 액션과 화면은 Supabase 없이는 단위 테스트가 무의미하므로 `tsc --noEmit` + `npm run build` + 브라우저 확인으로 검증하고, 그 사실을 완료 보고에 명시한다.
2. **평문 전화번호는 서버 밖으로 나가지 않는다.** 관리자의 명시적 열람 액션을 제외하고 서버 액션 반환값·로그·에러 메시지에는 마스킹된 값만 싣는다.
3. **`role`, `organization_id`는 서비스 역할로만 쓴다.** 클라이언트에서 오는 FormData에 이 필드가 있어도 무시한다.
4. **Supabase 미설정 환경에서 빌드가 깨지지 않는다.** 기존 코드처럼 `createSupabaseServerClient()`가 `null`을 반환할 수 있음을 전제로 분기한다.
5. 태스크마다 커밋한다. 커밋 전 `npx tsc --noEmit && npx vitest run`이 통과해야 한다.
6. 기존 16개 테스트는 계속 통과해야 한다.

---

## T1. 마이그레이션 004

**파일:** `supabase/migrations/004_account_pii.sql` (신규)

설계 §9의 SQL을 작성한다. `profiles`에 계정·동의 컬럼을 추가하고, `pii_access_log` 테이블과 RLS를 만든다. 기존 테이블 단위 권한을 먼저 회수한 뒤 안전한 컬럼만 다시 허용하며, 사용하지 않는 `current_profile()` RPC 실행 권한도 회수한다.

**검증:** 파일만 만들고 이 시점에 적용하지 않는다. T14에서 사용자가 Supabase SQL Editor로 적용한다. 로컬 검증은 없다.

**커밋:** `Add migration for account fields and PII access log`

---

## T2. PII 암복호화 모듈 (TDD)

**파일:** `lib/pii.ts` (신규), `lib/pii.test.ts` (신규)

먼저 `lib/pii.test.ts`를 쓴다.

```ts
export function normalizePhone(raw: string): string;
// "010-1234-5678" → "+821012345678", "+82 10 1234 5678" → "+821012345678"
// 숫자·+ 외 제거, 0으로 시작하면 +82로 치환. 형식 불일치는 throw.

export function encryptPhone(raw: string): string;
// "v1:<iv b64>:<tag b64>:<ct b64>" 형식. 매 호출 IV가 달라 결과가 다르다.

export function decryptPhone(value: string): string;
// v1 복호화. 변조되면 throw (GCM 인증 태그).

export function maskPhone(raw: string): string;
// "+821012345678" → "010-****-5678"
```

테스트 케이스:

1. `normalizePhone`이 하이픈·공백·국가번호 표기 4종을 같은 값으로 만든다.
2. `normalizePhone("123")`이 throw 한다.
3. `encryptPhone`을 같은 번호로 두 번 호출하면 서로 다른 문자열이 나온다.
4. `decryptPhone(encryptPhone(x)) === normalizePhone(x)`.
5. 암호문 한 글자를 바꾸면 `decryptPhone`이 throw 한다.
6. `maskPhone`은 가운데 4자리를 가린다.
7. 키가 없으면 `encryptPhone`이 명확한 메시지로 throw 한다.

테스트에서 키는 `beforeAll`에서 `process.env.PII_ENCRYPTION_KEY`에 고정 base64 값을 넣어 준다.

**명령·기대 출력**

```bash
npx vitest run lib/pii.test.ts
# Tests  7 passed (7)
```

**커밋:** `Encrypt phone numbers with AES-256-GCM`

---

## T3. 진단 응답 임시 보관 모듈 (TDD)

**파일:** `lib/pending-assessment.ts` (신규), `lib/pending-assessment.test.ts` (신규)

```ts
export const PENDING_KEY = "pending-assessment";

export function savePending(answers: ReadinessAnswer[]): void;
export function loadPending(): ReadinessAnswer[] | null;
// 55개가 아니거나, 알 수 없는 questionId가 있거나, level이 1~4 밖이면 null 을 준다.
export function clearPending(): void;
```

`loadPending`은 `INTAKE_QUESTIONS`의 id 집합과 대조해 정확히 55개가 중복 없이 한 번씩 존재하는지 검증한다. 손상된 값으로 서버에 400을 유발하지 않는다. `sessionStorage`가 없는 환경(SSR)에서는 조용히 `null`을 준다.

테스트: 왕복 저장·복원, 55개 미만이면 null, 모르는 id가 섞이면 null, level 0이면 null, 잘못된 JSON이면 null, `clearPending` 후 null. `globalThis.sessionStorage`를 Map 기반 스텁으로 주입한다.

```bash
npx vitest run lib/pending-assessment.test.ts
# Tests  6 passed (6)
```

**커밋:** `Hold assessment answers across the sign-up redirect`

---

## T4. 미들웨어 경로 조정

**파일:** `middleware.ts` (수정)

`protectedPrefixes`에서 `/assessment` 제거, `/account` 추가. `config.matcher`도 같은 목록으로 맞춘다.

**검증:** `npm run build` 후 dev 서버에서

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/assessment
# 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/account
# 307 http://localhost:3000/signin?returnTo=%2Faccount
```

**커밋:** `Open the assessment and protect the account page`

---

## T5. 진단 폼의 인증 게이트

**파일:** `app/assessment/page.tsx` (수정), `components/assessment-form.tsx` (수정)

`page.tsx`는 서버 컴포넌트에서 `requireUser()`로 세션을 읽어 `<AssessmentForm isSignedIn={Boolean(user)} />`로 넘긴다.

`assessment-form.tsx`의 `submit()`을 바꾼다.

```ts
// 모든 문항 응답 + 검증 통과 후
if (!isSignedIn) {
  savePending(submittedAnswers);
  window.location.href = "/signup?next=/assessment?resume=1";
  return;
}
```

마운트 시 `useEffect`로 복귀를 처리한다. `isSignedIn && loadPending()`이면 상태 갱신을 기다리지 않고 공용 `submitAnswers(pending)` 함수에 복원값을 직접 전달한다. `clearPending()`은 API 저장이 성공한 뒤에만 호출한다. 실패하면 응답을 유지하고 재시도 안내를 보여준다.

`sessionStorage`가 비었는데 `?next=/assessment`로 돌아온 경우에는 «진단 응답을 찾지 못했습니다. 다시 진단해 주세요» 배너를 띄우고 빈 결과를 저장하지 않는다.

**검증:** dev 서버 · 모바일 프리셋에서 비로그인으로 55문항을 채우고 결과 버튼을 눌러 `/signup?next=/assessment`로 이동하는지, `sessionStorage`에 키가 남는지 브라우저 도구로 확인한다.

**커밋:** `Ask for sign-up at the result, not at the first question`

---

## T6. 가입 서버 액션

**파일:** `app/signup/actions.ts` (신규)

```ts
export interface SignUpState { ok: boolean; message: string; fieldErrors?: Record<string, string> }

export async function signUpWithPassword(
  _state: SignUpState,
  formData: FormData
): Promise<SignUpState>;
```

zod 스키마:

| 필드 | 규칙 |
|---|---|
| `email` | `z.string().email()` |
| `password` | `z.string().min(10).max(72)` |
| `passwordConfirm` | `password`와 일치 |
| `displayName` | `1..40` |
| `companyName` | `1..120` |
| `jobTitle` | `1..60` |
| `phone` | `normalizePhone`이 throw 하지 않을 것 |
| `agreeTerms` | `"on"` 필수 |
| `agreePrivacy` | `"on"` 필수 |
| `marketingOptIn` | 선택 |

`supabase.auth.signUp({ email, password, options: { emailRedirectTo: ${origin}/auth/callback?next=..., data: { display_name, company_name, job_title, phone_enc, marketing_opt_in, terms_agreed_at, privacy_agreed_at } } })`

전화번호는 **여기서 암호화해** `user_metadata`에 암호문만 담는다. 평문은 Supabase에 넘기지 않는다.

이미 가입된 이메일이어도 항상 같은 메시지를 준다: «입력하신 주소로 메일을 보냈습니다. 메일함을 확인해 주세요.»

**커밋:** `Add password sign-up with company details`

---

## T7. 가입 화면

**파일:** `app/signup/page.tsx` (신규), `components/signup-form.tsx` (신규), `components/google-button.tsx` (신규)

`google-button.tsx`는 클라이언트 컴포넌트로 `supabase.auth.signInWithOAuth`를 호출한다. `process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true"`면 아무것도 렌더링하지 않는다.

`signup-form.tsx`는 `useActionState(signUpWithPassword, ...)`를 쓴다. 필드 순서: 이메일 → 비밀번호 → 비밀번호 확인 → 이름 → 회사명 → 직위 → 휴대전화 → 동의 3종.

`?next=` 쿼리를 hidden input으로 실어 보내고, `sessionStorage`에 진단 응답이 있으면 상단에 «진단 응답 55개를 보관 중입니다» 안내를 띄운다.

CSS는 기존 `.signin-panel`, `.signin-form`, `.field-error`, `.form-success`를 재사용한다. 새 클래스는 동의 체크박스용 `.consent-list` 하나만 추가한다.

**검증:** dev 서버에서 화면 렌더 확인 + `npm run build` 통과.

**커밋:** `Add the sign-up screen`

---

## T8. 로그인 화면 개편

**파일:** `app/signin/actions.ts` (수정), `app/signin/page.tsx` (수정), `components/signin-form.tsx` (수정)

`actions.ts`에 추가:

```ts
export async function signInWithPassword(
  _state: SignInState,
  formData: FormData
): Promise<SignInState>;
```

실패 시 «이메일 또는 비밀번호가 올바르지 않습니다.» 하나로 통일한다(계정 존재 여부 비노출). 성공하면 `redirect(next ?? dashboardPathForRole(role))`.

`requestMagicLink`는 그대로 두고 화면에서 `<details>`로 접는다.

화면 순서: 구글 버튼 → 구분선 → 이메일·비밀번호 폼 → 「비밀번호 찾기」 → `<details>` 매직링크 → 「가입하기」.

**커밋:** `Let people sign in with a password or Google`

---

## T9. 콜백·확인 라우트

**파일:** `app/auth/confirm/route.ts` (수정), `app/auth/callback/route.ts` (수정)

기존 PKCE `code` 교환을 담당하는 `callback/route.ts`를 가입·구글·매직링크·재설정에서 공통으로 재사용한다. `confirm/route.ts`는 기존 `token_hash` 링크 호환만 유지한다. `next`는 같은 origin의 내부 경로만 허용한다.

`callback/route.ts`: 프로필 최초 생성 시 `user_metadata`에서 값을 꺼내 저장한다.

```ts
const meta = user.user_metadata;
await admin.from("organizations").insert({ name: meta.company_name ?? fallback })
await admin.from("profiles").insert({
  id: user.id,
  organization_id: organization.id,
  email: user.email,
  display_name: meta.display_name ?? user.email,
  job_title: meta.job_title ?? null,
  phone_enc: meta.phone_enc ?? null,
  marketing_opt_in: meta.marketing_opt_in === true,
  terms_agreed_at: meta.terms_agreed_at ?? new Date().toISOString(),
  privacy_agreed_at: meta.privacy_agreed_at ?? new Date().toISOString(),
  role: "startup"
});
```

리다이렉트 대상은 `next` 파라미터가 있으면 그쪽, 없으면 `dashboardPathForRole(role)`. `next`는 `/`로 시작하는 내부 경로만 허용한다(오픈 리다이렉트 차단).

구글 가입자는 `job_title`·`phone_enc`가 없으므로 `/account/onboarding`으로 보낸다.

**커밋:** `Carry sign-up details through the auth callback`

---

## T10. 비밀번호 재설정

**파일:** `app/reset-password/page.tsx`, `app/reset-password/actions.ts`, `app/reset-password/update/page.tsx` (모두 신규)

```ts
export async function requestPasswordReset(_s: State, fd: FormData): Promise<State>;
// supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/auth/callback?next=/reset-password/update })

export async function updatePassword(_s: State, fd: FormData): Promise<State>;
// supabase.auth.updateUser({ password })
```

요청 결과 메시지는 계정 존재 여부와 무관하게 동일하게 한다.

**커밋:** `Add password reset`

---

## T11. 마이페이지

**파일:** `app/account/page.tsx`, `app/account/actions.ts`, `components/account-profile-form.tsx`, `components/account-danger-zone.tsx` (모두 신규)

```ts
export async function updateProfile(_s: State, fd: FormData): Promise<State>;
// displayName, jobTitle, companyName, phone(선택), marketingOptIn
// phone 이 오면 암호화해 admin 클라이언트로 저장

export async function changePassword(_s: State, fd: FormData): Promise<State>;
// Supabase Secure password change 정책이 재인증을 요구하면 재설정 흐름을 안내한다.

export async function deleteAccount(_s: State, fd: FormData): Promise<State>;
// fd.email 이 본인 이메일과 다르면 거부
// 설계 §7.1의 익명화 후 deleteUser(id, true)로 soft delete하고 signOut한다.
```

`page.tsx`는 서버 컴포넌트에서 프로필을 읽어 전화번호를 `maskPhone`으로 바꾼 뒤 폼에 넘긴다. 평문은 넘기지 않는다.

**커밋:** `Add the account page`

---

## T12. 온보딩 보완 화면

**파일:** `app/account/onboarding/page.tsx` (신규)

회사명·직위·전화번호만 받는 축약 폼. `updateProfile`을 재사용한다. 완료하면 `next` 또는 `/dashboard`로 보낸다. 건너뛰기를 허용하되 대시보드 배너로 남긴다.

**파일:** `app/dashboard/page.tsx` (수정) — 고정 `demoAnswers`와 샘플 일정을 제거하고 로그인 조직의 최신 진단·액션을 조회한다. 필수 정보가 비어 있으면 상단에 보완 배너를 띄운다.

**커밋:** `Collect missing company details after Google sign-up`

---

## T13. 관리자 대시보드

**파일:** `lib/admin-metrics.ts` (신규), `lib/admin-metrics.test.ts` (신규), `app/admin/page.tsx` (수정), `app/admin/companies/[id]/page.tsx` (신규), `app/admin/actions.ts` (신규)

`lib/admin-metrics.ts`는 **DB에서 읽어온 행을 받아 집계만 하는 순수 함수**로 만든다. 그래야 테스트할 수 있다.

```ts
export interface CompanyRow {
  organizationId: string; companyName: string;
  contactName: string | null; jobTitle: string | null;
  latestAssessment: { completedAt: string; statusLabel: string; overallScore: number; gateMessages: string[] } | null;
  actions: { completedAt: string | null }[];
  orders: { status: OrderStatus; providerName: string; createdAt: string }[];
}

export function buildWorklist(rows: CompanyRow[], now: Date): WorklistItem[];
// 진단 후 7일 무주문 / Gate 차단 / 결제 후 미시작 세 종류를 만든다

export function buildFunnel(rows: CompanyRow[]): FunnelStep[];
// 가입 → 진단완료 → 준비 1단계 → 준비 2단계 → 준비 3단계

export function buildExpertDemand(
  rows: CompanyRow[], approvedByTag: Record<string, number>
): { tag: string; demand: number; supply: number }[];
```

테스트: 7일 경계(6일째는 안 잡히고 8일째는 잡힌다), Gate 차단 판정, 퍼널 단계 누적이 역전되지 않음, 수요 집계.

`app/admin/page.tsx`는 서비스 역할 클라이언트로 필요한 테이블을 읽어 `CompanyRow[]`를 만든 뒤 위 함수에 넘긴다. 전체 운영 지표와 현재 페이지 목록은 분리해 계산한다. 베타 규모에서는 서버 메모리에서 필터·페이지를 적용하고, 조직 수가 커져 측정상 느려질 때 DB View/RPC로 옮긴다. `export const dynamic = "force-dynamic"`.

`app/admin/actions.ts`:

```ts
export async function revealPhone(profileId: string): Promise<{ phone: string } | { error: string }>;
// 관리자 확인 → 복호화 → pii_access_log insert → 평문 반환 (이 한 곳에서만 평문을 반환한다)
```

```bash
npx vitest run lib/admin-metrics.test.ts
# Tests  4 passed (4)
```

**커밋:** `Add the operations dashboard` / `Log every phone number an admin reveals`

---

## T14. 환경변수·문서·최종 검증

1. 키 생성 명령을 README에 적고 사용자에게 안내한다.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

2. `.env.example`에 `PII_ENCRYPTION_KEY`, `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` 추가.
3. 사용자가 수행할 목록을 정리해 전달한다.
   - Supabase SQL Editor에서 `004_account_pii.sql` 실행
   - Vercel 환경변수 2개 등록
   - Supabase Dashboard 비밀번호 최소 길이 6 → 10
   - Google Cloud OAuth 클라이언트 생성 + Supabase Google Provider 설정
4. 개인정보처리방침·이용약관 문구를 수집 항목에 맞춰 갱신한다 (`app/legal/privacy`, `app/legal/terms`).

**최종 검증**

```bash
npx tsc --noEmit          # 출력 없음
npx vitest run            # Tests 34+ passed
npm run build             # 28+ 라우트
```

브라우저 확인: 비로그인 진단 → 가입 → 결과 복원, `/account` 저장, `/admin` 목록·검색.

**커밋:** `Document the new environment variables and manual setup`

---

## 태스크 의존 관계

```text
T1 (마이그레이션)
T2 (PII)  ────────┐
T3 (보관)  ──┐    │
T4 (미들웨어) │    │
   ↓         ↓    ↓
T5 (진단 게이트)   T6 (가입 액션)
                     ↓
                  T7 (가입 화면) → T8 (로그인) → T9 (콜백)
                                                   ↓
                              T10 (재설정)   T11 (마이페이지) → T12 (온보딩)
                                                   ↓
                                              T13 (관리자)
                                                   ↓
                                              T14 (마무리)
```

T2·T3·T4는 서로 독립적이라 병렬로 진행할 수 있다.

## 스펙 커버리지 점검

| 설계 성공 기준 | 담당 태스크 |
|---|---|
| 1. 비로그인 55문항 완주 | T4, T5 |
| 2. 가입 후 답변 복원 | T3, T5, T9 |
| 3. 비밀번호 가입·인증메일 | T6, T7, T9 |
| 4. 기업 정보·동의 수집 | T6, T7 |
| 5. 구글 가입 + 보완 화면 | T7, T9, T12 |
| 6. 비밀번호 재설정 | T10 |
| 7. 매직링크 유지 | T8, T9 |
| 8. 프로필·수신동의 저장 | T11 |
| 9. 탈퇴 후 주문 기록 유지 | T11 |
| 10. DB 직접 조회 시 평문 없음 | T1, T2, T6 |
| 11. role 자가 승격 실패 | T1 |
| 12. 관리자 기업 현황·검색 | T13 |
| 13. 전화번호 열람 감사 로그 | T1, T13 |

누락 없음.
