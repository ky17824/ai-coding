# 회원가입·로그인·마이페이지·관리자 대시보드 설계

- 작성일: 2026-08-04
- 상태: 구현 준비 보정
- 관련 커밋 기준: `1037950`

## 1. 배경

지금 인증은 매직링크 하나뿐이다. `/assessment`가 미들웨어로 막혀 있어 «무료 준비도 진단» 버튼을 누르면 55문항을 보기도 전에 `/signin`으로 튕긴다. 마이페이지는 없다. 관리자 화면은 전문가 승인 목록 하나뿐이라 «누가 어디까지 진단했는지»를 볼 수 없다.

확정된 결정:

| 항목 | 결정 |
|---|---|
| 구독 | 유료 구독을 만들지 않는다. 마이페이지는 프로필·비밀번호·수신동의·계정탈퇴만 다룬다 |
| 진단 게이트 | 55문항은 비로그인으로 풀고, **결과를 볼 때** 로그인을 요구한다 |
| 가입 개방 | 누구나 가입. 초대코드는 쓰지 않는다 |
| 로그인 수단 | 이메일+비밀번호 · 구글 · 매직링크 셋 다 유지 |
| 개인정보 암호화 | 전화번호만 앱 계층에서 암호화. 이름·회사명·직위는 평문 + 접근통제 |
| 전문가 매칭 | 배정 기능을 만들지 않는다. 기존 주문 흐름을 조회한다 |

### 구현 전 준비

1. 실제 저장소 `/Users/kyuhwangyeon/global-gtm-platform`의 현재 `main`과 기준 커밋 `1037950`을 보존한다.
2. 이 설계와 구현 계획을 먼저 커밋한 뒤 기능 브랜치에서 작업한다.
3. 마이그레이션 파일과 환경변수 예시는 작성하되 실제 Supabase·Vercel에는 적용하지 않는다.
4. 전체 코드·자동 테스트·프로덕션 빌드를 먼저 완료한다.

### 운영 반영 — 모든 코드 완료 후

1. Supabase 스테이징에서 마이그레이션과 가입·재설정 메일을 검증한 뒤 운영 DB에 적용한다.
2. Supabase Auth의 Site URL·Redirect URL, Secure password change, Google Provider, 인증 메일 템플릿과 운영 SMTP를 설정한다.
3. Vercel에 `PII_ENCRYPTION_KEY`와 `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`를 등록하고 암호화 키를 별도 비밀번호 관리자에 보관한다.
4. 이용약관·개인정보 수집 문구는 실제 결제 개시 전 국내 전문가 검토를 받는다.

## 2. 범위

**포함**

- 이메일+비밀번호 회원가입 (이메일 인증 필수), 구글 OAuth, 매직링크 유지
- 비밀번호 재설정
- 가입 시 이름·회사명·직위·전화번호 수집과 개인정보 동의
- 전화번호 암호화(AES-256-GCM)와 관리자 열람 감사 로그
- 마이페이지 `/account` — 프로필 수정, 비밀번호 변경, 마케팅 수신 동의, 계정 탈퇴
- `/assessment` 공개 + 결과 시점 인증 게이트
- 관리자 운영 대시보드 `/admin`
- `profiles` 컬럼 권한 축소 (3절의 권한 상승 취약점)

**제외**

- 유료 구독·정기결제
- 초대코드 게이트 (`INVITE_CODES` 환경변수는 계속 미사용)
- 관리자가 전문가를 배정하는 워크플로
- 진단 중도 이탈 추적 (8.5절)
- 2FA, 소셜 계정 연결 해제, 팀원 초대

## 3. 먼저 고칠 것 — 권한 상승

`002_api_role_grants.sql`이 `authenticated` 역할에 테이블 단위 `update`를 부여한다. `profiles`의 갱신 정책은 행만 검사한다.

```sql
create policy "users update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
```

RLS는 컬럼 단위 제한을 할 수 없다. 따라서 로그인 사용자가 자신의 anon 키로 PostgREST에 직접 요청해 `role`을 `admin`으로, `organization_id`를 남의 조직으로 바꿀 수 있다. `is_admin()`이 이 컬럼을 그대로 신뢰하므로 관리자 화면과 모든 `is_admin()` 정책이 뚫린다.

마이페이지가 없던 지금도 존재하는 결함이지만, 프로필 편집 UI를 여는 이번 작업에서 반드시 함께 닫는다. 대응은 7절 마이그레이션에 포함한다.

## 4. 진단 답변을 인증 리다이렉트 너머로 옮기는 방법

55문항을 비로그인으로 풀게 하면, 로그인 왕복 사이에 답변을 보존해야 한다.

| 방식 | 장점 | 단점 |
|---|---|---|
| **A. sessionStorage** | 스키마 변경 없음. 같은 탭·같은 오리진이라 OAuth 리다이렉트에도 살아남음 | 탭을 닫으면 사라짐. 기기 간 이어하기 불가 |
| B. 서버 임시 저장 | 탭을 닫아도 복구. 기기 간 이어하기 가능 | `assessment_drafts` 테이블 + RLS + 만료 정리 작업이 늘어남 |
| C. 리다이렉트 URL에 인코딩 | 저장소가 아예 필요 없음 | 55개 응답이 접속 로그·브라우저 기록·리퍼러에 남음 |

**A를 채택한다.** 이번 요구사항은 «한 자리에서 진단을 끝내는 것»이고 기기 간 이어하기는 요청에 없다. C는 사업 데이터를 URL에 흘린다. B는 이어하기가 실제로 필요해지면 A 위에 얹는다.

```text
비로그인 사용자가 55문항 응답
        ↓ [진단 결과 보기]
sessionStorage["pending-assessment"] = 응답 JSON
        ↓ /signup?next=/assessment
가입 → 이메일 인증 → /auth/callback (조직·프로필 생성)
        ↓ next 파라미터로 복귀
/assessment 가 sessionStorage 를 읽어 직접 제출 → 저장 성공 시 키 삭제 → 결과 표시
```

`app/assessment/page.tsx`는 서버 컴포넌트이므로 세션 유무를 읽어 `isSignedIn`을 폼에 넘긴다. 클라이언트에서 별도 `/api/me`를 만들지 않는다.

## 5. 인증 흐름

### 5.1 화면

| 경로 | 용도 |
|---|---|
| `/signin` | 로그인 — 구글 / 이메일+비밀번호 / 매직링크 |
| `/signup` | 가입 — 구글 / 이메일+비밀번호 + 기업 정보 |
| `/reset-password` | 재설정 메일 요청 |
| `/reset-password/update` | 새 비밀번호 입력 (메일 링크로 진입) |
| `/account` | 마이페이지 |
| `/account/onboarding` | 구글 가입자의 부족한 기업 정보 보완 |

`/signin`과 `/signup`은 상단에 구글 버튼, 구분선, 그 아래 이메일 폼을 둔다. 매직링크는 로그인 화면 하단 «비밀번호 없이 이메일로 받기» 링크로 접는다. 셋을 동등하게 나열하면 선택 부담이 커진다.

### 5.2 비밀번호 가입

```text
POST /signup (서버 액션)
  → supabase.auth.signUp({ email, password, options.emailRedirectTo=/auth/confirm })
  → 확인 메일 발송, "메일함을 확인하세요" 화면
  → 링크 클릭 → /auth/confirm?token_hash&type=signup
  → verifyOtp → /auth/callback → 조직·프로필 생성 → next 또는 /dashboard
```

`/auth/confirm`은 지금 `type: "magiclink"`로 고정돼 있다. `type`을 쿼리에서 읽어 `signup`·`recovery`·`magiclink`를 함께 처리하도록 고친다.

이미 가입된 이메일로 `signUp`을 호출해도 Supabase는 성공처럼 응답한다(사용자 열거 방지). 화면 문구를 «가입되어 있다면 로그인 링크를, 아니라면 인증 메일을 보냈습니다»로 통일해 계정 존재 여부를 노출하지 않는다.

### 5.3 구글

```text
supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${origin}/auth/callback?next=...` }
})
```

`/auth/callback`은 이미 `exchangeCodeForSession`으로 PKCE 코드를 처리하고 프로필을 부트스트랩하므로 재사용한다. `next` 파라미터 처리만 추가한다.

**사전 작업(사용자 수행):** Google Cloud 콘솔에서 OAuth 클라이언트를 만들고 Supabase Dashboard → Authentication → Providers → Google에 Client ID/Secret을 넣어야 한다. 승인된 리디렉션 URI는 `https://slufdtwiaswuphukhmov.supabase.co/auth/v1/callback`. 설정 전에는 `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` 플래그로 버튼을 숨긴다.

### 5.4 비밀번호 정책

- 최소 10자. Supabase Dashboard의 최소 길이도 10으로 올린다(기본 6).
- 클라이언트는 길이만 검사하고 실제 강제는 Supabase가 한다.
- 유출 비밀번호 검사(HaveIBeenPwned)는 Pro 기능이라 이번엔 켜지 않는다.

## 6. 가입 시 수집 정보와 개인정보 보호

### 6.1 수집 항목

| 라벨 | 저장 위치 | 필수 | 처리 |
|---|---|---|---|
| 이름 | `profiles.display_name` | 필수 | 평문 |
| 회사명 | `organizations.name` | 필수 | 평문 |
| 직위 | `profiles.job_title` | 필수 | 평문 |
| 휴대전화 | `profiles.phone_enc` | 필수 | AES-256-GCM |
| 이메일 | `auth.users.email` | 필수 | Supabase 관리 |

구글 가입은 이름·이메일만 넘어온다. 부족한 세 항목은 `/account/onboarding`에서 받는다. **진단 결과 저장은 막지 않고**(이탈 방지) 대시보드 상단 배너로 안내하되, 전문가 서비스 주문 시점에는 필수로 막는다. 연락 수단 없이 매칭을 진행할 수 없기 때문이다.

### 6.2 전화번호만 암호화하는 이유

Supabase Postgres는 디스크 전체를 이미 AES-256으로 암호화한다. 컬럼 암호화가 추가로 막아주는 것은 **DB 읽기 권한이 새는 경우** — 서비스 키 유출, SQL 인젝션, 과대 권한 RLS, 백업본 탈취 — 뿐이다.

암호화된 컬럼은 DB가 검색·정렬할 수 없다. 관리자 대시보드는 회사명·담당자 검색이 핵심이라, 이름까지 암호화하면 목록을 그릴 때마다 전체를 복호화해야 하고 그 순간 암호화의 실익이 사라진다. 따라서 **조회에 쓰지 않으면서 유출 피해가 가장 큰 전화번호만** 암호화하고, 나머지는 컬럼 권한·관리자 전용 접근·감사 로그로 지킨다.

### 6.3 암호화 사양

```text
알고리즘    AES-256-GCM (node:crypto)
키          PII_ENCRYPTION_KEY — 32바이트 base64, Vercel 환경변수. DB에 저장하지 않는다
저장 형식    v1:<iv base64>:<authTag base64>:<ciphertext base64>
정규화       숫자만 남기고 국가번호를 +82 형태로 통일한 뒤 암호화
```

**pgcrypto를 쓰지 않는 이유.** `pgp_sym_encrypt(phone, key)`는 키가 SQL 문에 들어가 쿼리 로그와 `pg_stat_statements`에 남는다. 키를 DB 밖에 두는 것이 이 설계의 요점이므로 애플리케이션 계층에서 암복호화한다.

**전화번호 검색 인덱스를 만들지 않는 이유.** 현재 범위에는 전화번호 검색·중복 차단이 없고 한 사람이 여러 회사를 운영하는 경우도 허용한다. 결정적 HMAC 값은 추가 개인정보 표면과 키 운영만 늘리므로 제외한다. 정확 일치 검색이 실제 요구사항이 되면 별도 마이그레이션으로 추가한다.

**키 회전.** 접두사 `v1:`로 버전을 표시한다. 회전 시 새 키로 `v2:`를 쓰고 배치로 기존 행을 재암호화한다. 복호화 함수는 두 버전을 함께 지원한다.

### 6.4 접근 통제

```sql
revoke select, update on public.profiles from anon, authenticated;
grant select (id, organization_id, email, display_name, role, created_at,
  job_title, marketing_opt_in, terms_agreed_at, privacy_agreed_at, deleted_at)
  on public.profiles to authenticated;
grant update (display_name, job_title, marketing_opt_in)
  on public.profiles to authenticated;
revoke execute on function public.current_profile() from public, anon, authenticated;
```

- 본인도 PostgREST로는 읽을 수 없다. `/account`는 서버 액션이 서비스 역할로 복호화해 마스킹된 값만 넘긴다.
- 관리자 목록은 항상 `010-****-1234` 형태로 보여준다. 「번호 보기」를 눌러야 별도 서버 액션이 복호화하고 `pii_access_log`에 한 줄 남긴다.
- 평문 전화번호는 로그·에러 리포트·분석 이벤트에 절대 넣지 않는다. 서버 액션의 반환값에도 마스킹된 값만 싣는다.

### 6.5 동의 (개인정보보호법)

가입 폼에 세 개의 분리된 체크박스를 둔다. 필수와 선택을 하나로 묶지 않는다.

- **[필수]** 이용약관 동의
- **[필수]** 개인정보 수집·이용 동의 — 항목(이름·회사명·직위·전화번호·이메일), 목적(준비도 진단 제공, 전문가 매칭, 서비스 안내), 보유기간(탈퇴 시까지. 단 결제 기록은 전자상거래법에 따라 5년)
- **[선택]** 마케팅 정보 수신

필수 동의는 `profiles.terms_agreed_at`, `profiles.privacy_agreed_at`에 각각 기록한다. `docs/`의 개인정보처리방침과 이용약관 문구도 수집 항목에 맞춰 갱신해야 한다.

## 7. 마이페이지 `/account`

| 구역 | 내용 |
|---|---|
| 계정 | 이메일(읽기 전용), 가입일, 로그인 수단 |
| 프로필 | 이름, 회사명, 직위, 전화번호(마스킹 표시·수정 가능) |
| 비밀번호 | 새 비밀번호 설정. 구글·매직링크만 쓰던 사용자는 «비밀번호 설정»으로 표시 |
| 알림 | 마케팅·제품 안내 메일 수신 동의 토글 |
| 위험 구역 | 계정 탈퇴 |

비밀번호 변경은 `supabase.auth.updateUser({ password })`를 쓴다. 현재 비밀번호를 묻지 않는 대신 마지막 로그인 후 24시간이 지났으면 재인증을 요구한다. 세션이 탈취됐을 때 비밀번호가 조용히 바뀌는 것을 막는다.

### 7.1 계정 탈퇴 정책

`orders.buyer_id`, `reviews.author_id`가 `profiles(id)`를 CASCADE 없이 참조한다. 결제·정산 기록은 전자상거래법상 5년 보존해야 하므로 프로필을 물리 삭제할 수 없다.

**익명화 후 인증 계정만 삭제한다.**

```text
1. profiles.display_name  → '탈퇴한 사용자'
2. profiles.email         → 'deleted+<uuid>@removed.invalid'
3. profiles.job_title     → null
4. profiles.phone_enc     → null
5. profiles.marketing_opt_in → false
6. profiles.deleted_at    → now()
7. supabase.auth.admin.deleteUser(id, true)   ← 서비스 역할 soft delete
```

`profiles.id`가 `auth.users(id) on delete cascade`를 참조하므로 하드 삭제는 프로필 보존 정책과 충돌한다. 인증 사용자를 soft delete하면 인증은 비가역적으로 막히고 `auth.users` 행과 프로필 참조는 유지된다. 주문·리뷰·정산 행도 그대로 남는다.

확인 절차: 사용자가 자기 이메일을 그대로 입력해야 버튼이 활성화된다. 되돌릴 수 없다는 문구를 함께 둔다.

미해결로 남기는 것: 조직에 다른 구성원이 남아 있을 때의 처리. 지금은 조직당 사용자 1명이 사실상 전부이므로 마지막 구성원이 탈퇴해도 조직 행은 남긴다.

## 8. 관리자 운영 대시보드 `/admin`

### 8.1 설계 원칙

1. **차트보다 할 일 목록이 위에 온다.** 운영자가 대시보드를 여는 이유는 «오늘 뭘 해야 하나»이지 «지난달 지표가 얼마인가»가 아니다.
2. **모든 숫자는 클릭하면 그 숫자를 만든 행 목록으로 간다.** 집계만 있고 드릴다운이 없으면 확인할 방법이 없어 신뢰를 잃는다.
3. **목록은 서버에서 페이지네이션·필터한다.** 전체를 클라이언트로 내려받아 거르지 않는다.
4. **개인정보는 기본 마스킹.** 해제는 명시적 행동으로만 하고 감사 로그를 남긴다.
5. **빈 상태에 다음 행동을 적는다.** «데이터 없음» 대신 «아직 진단을 마친 기업이 없습니다».
6. **캐시하지 않는다.** 운영 판단이 오래된 값에 기대면 안 된다.

### 8.2 구성

**A. 지금 처리할 일** — 최상단, 각 항목은 건수와 바로가기

- 진단을 마쳤지만 7일 넘게 주문이 없는 기업
- Critical 미해소로 Gate가 막힌 기업
- 결제 완료 후 서비스가 시작되지 않은 주문
- 승인 대기 중인 전문가
- 환불·분쟁 상태 주문

**B. 진단 퍼널**

```text
가입 → 진단 완료 → 준비 1단계 통과 → 준비 2단계 통과 → 준비 3단계 통과
```

각 단계의 기업 수와 직전 단계 대비 통과율. 막대를 클릭하면 해당 기업 목록으로 간다.

**C. 기업 목록** — 화면의 중심

| 컬럼 | 출처 |
|---|---|
| 회사명 | `organizations.name` |
| 담당자·직위 | `profiles.display_name`, `job_title` |
| 최근 진단일 | `assessments.completed_at` |
| 달성 단계 | `assessments.status_label` |
| 총점 | `assessments.overall_score` |
| Critical | `assessments.gate_messages` 개수 |
| 액션 진행 | `action_items` 완료 수 / 5 |
| 주문 | `orders` 최신 상태와 전문가명 |
| 마지막 활동 | 진단·액션·주문 중 최신 시각 |

필터: 달성 단계, Gate 차단 여부, 주문 유무, 기간. 정렬: 최근 진단일 / 총점 / 마지막 활동. 검색: 회사명·담당자명.

**D. 기업 상세**

- 진단 이력과 총점 추이 (여러 번 진단한 경우)
- 55문항 응답 — 단계별로 접어서 표시, 1~2단계 응답을 강조
- 액션 5개와 완료 여부, 담당자, 기한
- 주문·정산·리뷰 이력
- 연락처 — 마스킹, 「번호 보기」에 감사 로그

**E. 전문가 수급**

`action_items.service_tag`별 «액션에서 발생한 수요»와 «승인된 전문가 수»를 나란히 놓는다. 수요는 많은데 전문가가 없는 태그가 매칭 병목이므로 영입 우선순위가 된다.

**F. 운영 지표**

진단 완료율, 진단→주문 전환율, 진단부터 첫 주문까지 평균 일수, 리뷰 평점 평균.

### 8.3 데이터와 권한

필요한 데이터는 전부 기존 테이블 조인으로 나온다. `assessments`, `readiness_answers`, `action_items`, `orders`, `provider_profiles`, `settlements`, `reviews` 모두 `is_admin()`이 select 정책에 포함돼 있고, 현재 `/admin`은 이미 서비스 역할 클라이언트를 쓴다. **새 RLS 정책은 필요 없다.**

새로 만드는 테이블은 `pii_access_log` 하나뿐이다.

### 8.4 성능

기업 목록은 조직당 최신 진단 1건만 필요하다.

```sql
select distinct on (organization_id) *
from public.assessments
order by organization_id, completed_at desc
```

기존 인덱스 `assessments_org_idx (organization_id, completed_at desc)`가 그대로 쓰인다. 추가 인덱스는 필요 없다.

### 8.5 알려진 공백

진단을 시작했다가 중간에 그만둔 사람은 보이지 않는다. 답변이 가입 전까지 sessionStorage에만 있기 때문이다. 문항별 이탈 지점을 봐야 한다면 «진단 시작·단계 이동» 이벤트를 익명으로 남기는 별도 작업이 필요하다. 이번 범위에서 제외한다.

## 9. 스키마 변경 — 마이그레이션 004

```sql
alter table public.profiles
  add column job_title text check (char_length(job_title) between 1 and 60),
  add column phone_enc text,
  add column marketing_opt_in boolean not null default false,
  add column terms_agreed_at timestamptz,
  add column privacy_agreed_at timestamptz,
  add column deleted_at timestamptz;

create table public.pii_access_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  subject_id uuid not null references public.profiles(id),
  field text not null,
  created_at timestamptz not null default now()
);
alter table public.pii_access_log enable row level security;
create policy "admins read pii access log" on public.pii_access_log
  for select using (public.is_admin());

-- 3절 권한 상승과 전화번호 직접 조회 차단
revoke select, update on public.profiles from anon, authenticated;
grant select (id, organization_id, email, display_name, role, created_at,
  job_title, marketing_opt_in, terms_agreed_at, privacy_agreed_at, deleted_at)
  on public.profiles to authenticated;
grant update (display_name, job_title, marketing_opt_in)
  on public.profiles to authenticated;
revoke execute on function public.current_profile() from public, anon, authenticated;
```

새 테이블은 `pii_access_log` 하나다.

## 10. 미들웨어 변경

```diff
 const protectedPrefixes = [
   "/dashboard",
-  "/assessment",
   "/journey",
   "/orders",
   "/provider",
-  "/admin"
+  "/admin",
+  "/account"
 ];
```

`matcher`도 같이 고친다. `/assessment`는 공개, `/account`는 보호.

## 11. 새 환경변수

| 이름 | 용도 | 없을 때 |
|---|---|---|
| `PII_ENCRYPTION_KEY` | 전화번호 AES-256-GCM 키 (32바이트 base64) | 가입 시 전화번호 저장 실패 — 부팅 시 검사해 명시적으로 실패시킨다 |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | 구글 버튼 노출 | 버튼 숨김 |

암호화 키는 코드·DB에 저장하지 않고 Vercel 환경변수와 별도 비밀번호 관리자에 보관한다.

## 12. 성공 기준

1. 비로그인 사용자가 랜딩에서 «무료 준비도 진단»을 눌러 55문항을 끝까지 답할 수 있다.
2. 결과를 보려 할 때 가입 화면이 뜨고, 가입을 마치면 **답변을 다시 입력하지 않고** 결과가 나온다.
3. 이메일+비밀번호 가입 시 인증 메일이 오고, 링크를 누르면 조직과 프로필이 생성된다.
4. 가입 폼에서 이름·회사명·직위·전화번호와 두 개의 필수 동의를 받는다.
5. 구글 버튼으로 가입·로그인이 되고, 부족한 기업 정보를 보완 화면에서 받는다.
6. 비밀번호를 잊어도 재설정 메일로 복구된다.
7. 기존 매직링크 사용자가 그대로 로그인된다.
8. `/account`에서 프로필·수신동의를 바꾸면 저장되고 새로고침해도 유지된다.
9. `/account`에서 계정을 지우면 다시 로그인할 수 없고 기존 주문 기록은 남는다.
10. DB에서 `select phone_enc from profiles`를 직접 조회해도 평문이 보이지 않는다.
11. 로그인 사용자가 PostgREST로 자기 `role`을 `admin`으로 바꾸려 하면 실패한다.
12. 관리자가 `/admin`에서 기업별 진단 단계·총점·액션 진행·주문 상태를 한 화면에서 보고, 회사명으로 검색할 수 있다.
13. 관리자가 전화번호를 열람하면 `pii_access_log`에 행이 남는다.

## 13. 위험과 대응

| 위험 | 대응 |
|---|---|
| Google OAuth 설정이 콘솔 작업이라 코드만으로 완결되지 않음 | `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` 플래그로 버튼을 숨긴다 |
| sessionStorage 유실로 답변이 날아감 | 가입 화면에 «진단 응답을 보관 중입니다» 표시. 유실 시 «다시 진단하기»로 안내하고 빈 결과를 저장하지 않는다 |
| `PII_ENCRYPTION_KEY` 분실 시 전화번호 복구 불가 | 키를 비밀번호 관리자에 별도 보관. 분실은 전화번호 전량 손실로 이어진다는 점을 운영 문서에 남긴다 |
| 가입 개방으로 스팸 계정 유입 | 이메일 인증 필수 + Supabase 기본 레이트리밋. 부족하면 초대코드나 CAPTCHA를 검토 |
| 이메일 인증 메일이 스팸으로 분류 | Supabase 기본 발신 도메인의 한계. 커스텀 SMTP는 범위 밖으로 두고 기록만 남긴다 |
| 관리자 대시보드가 개인정보 집합소가 됨 | 기본 마스킹 + 감사 로그 + 관리자 계정 최소화. 관리자 목록을 주기적으로 점검한다 |
| 필수 정보를 나중에 받는 구글 가입자가 영영 안 채움 | 주문 시점에 필수 게이트. 대시보드 배너를 상시 노출 |

## 14. 이번에 하지 않는 것

- 조직에 팀원 초대
- 소셜 계정과 비밀번호 계정 병합 UI (Supabase가 동일 이메일이면 자동 연결)
- 로그인 기록·세션 목록 화면
- 탈퇴 유예 기간과 복구
- 관리자의 전문가 배정 워크플로
- 진단 중도 이탈 추적
