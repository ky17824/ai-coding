# Borderless 카카오 로그인 도입 계획

- 상태: 설계 검토 완료 — 운영 활성화 전 검증 게이트 필수
- 작성일: 2026-08-11
- 범위: 로그인·가입·OAuth 콜백·온보딩·계정 탈퇴·운영 설정
- 구현 원칙: 기존 Supabase OAuth와 `/auth/callback`을 재사용하고 새 SDK·DB 구조·인증 경로를 만들지 않는다.

## 1. 요구사항 요약

한국 사용자가 이메일·비밀번호 또는 Google 외에 카카오 계정으로 Borderless에 가입·로그인할 수 있어야 한다. 카카오 인증 뒤에는 기존 사용자와 동일하게 회사 정보, 연락처, 필수 동의를 완료하고 대시보드 또는 요청한 경로로 복귀해야 한다. Supabase가 동일한 확인 이메일을 실제로 같은 사용자에 연결한 경우에만 기존 이력을 사용하며, 이메일을 제공하지 않는 카카오 계정은 현재 데이터 구조상 가입을 허용하지 않는다.

## 2. 현재 구현 근거

- Google OAuth 시작 로직은 `components/google-button.tsx:6-28`에 한정되어 있고 `signInWithOAuth`와 공통 콜백을 사용한다.
- 로그인·가입 화면은 각각 `components/signin-form.tsx:14-31`, `components/signup-form.tsx:11-28`에서 Google 버튼과 구분선을 조건부 표시한다.
- `app/auth/callback/route.ts:18-23`은 provider와 무관하게 PKCE code를 session으로 교환한다.
- 신규 OAuth 사용자의 조직·프로필 생성과 온보딩 분기는 `app/auth/callback/route.ts:47-108`에 이미 있다.
- 프로필 이메일은 `supabase/migrations/001_initial.sql:20-26`에서 `NOT NULL`이다.
- 현재 콜백은 이메일이 없는 사용자를 차단하지 않고 `app/auth/callback/route.ts:72-73`에서 nullable 값을 프로필에 기록하려 한다.
- 현재 탈퇴는 `app/account/actions.ts:104-128`에서 Supabase 계정만 익명화·삭제하며 카카오 unlink는 수행하지 않는다.
- 환경변수 템플릿에는 `.env.example:6`의 Google 공개 플래그만 있다.

## 3. 검토 결론

### 채택

1. Supabase가 기본 지원하는 `provider: "kakao"`를 사용한다.
2. 기존 `/auth/callback`과 온보딩 화면을 그대로 재사용한다.
3. 첫 배포에서는 카카오의 확인 이메일이 있는 사용자만 허용한다.
4. 로그인·가입 모두 `카카오로 계속하기 → Google로 계속하기 → 또는 → 이메일` 순서로 표시한다.
5. `account_email` 동의와 Supabase identity 연결 결과를 확인한 경우에만 기존 계정 이력을 사용한다. 이메일 문자열이 같다는 이유만으로 애플리케이션이 직접 계정을 합치지 않는다.
6. 카카오 인증 사용자의 서비스 탈퇴 전에 카카오 unlink를 서버에서 수행한다.
7. provider별 오류와 이메일 미제공 상태를 로그인 화면에서 실제 문장으로 안내한다.

### 제외

- 카카오 JavaScript SDK와 별도 OAuth callback
- 신규 인증·아이콘 패키지
- 이메일 없는 카카오 계정을 위한 임시 이메일 생성
- 첫 버전의 수동 계정 연결 화면
- 카카오 친구·메시지·채널 API 권한

## 4. 사용자 흐름

```text
로그인 또는 가입
  → 카카오로 계속하기
  → 카카오 동의 화면
  → Supabase /auth/v1/callback
  → Borderless /auth/callback
      ├─ 동의 취소·인증 실패: 로그인 화면 + 원인 안내
      ├─ 이메일 없음: 로그아웃 + 이메일 제공 안내
      ├─ 기존 완료 계정: 요청 경로 또는 대시보드
      └─ 신규/미완료 계정: 회사 정보·연락처·약관 온보딩
           → 요청 경로 또는 대시보드
```

## 5. 화면 설계

### 로그인

```text
┌────────────────────────────────────┐
│ 글로벌 진출 여정을 이어가세요.       │
│                                    │
│ [ 카카오로 계속하기 ]                │
│ [ Google로 계속하기 ]               │
│ ─────────── 또는 ───────────        │
│ 이메일                              │
│ 비밀번호                            │
│ [ 로그인 ]                          │
│ 비밀번호 찾기                       │
│ ▸ 비밀번호 없이 이메일 링크로 로그인 │
└────────────────────────────────────┘
```

- 카카오 버튼은 공식 식별이 가능한 노란 배경과 짙은 글자를 사용한다.
- provider가 하나만 활성화되어도 구분선은 한 번만 표시한다.
- 버튼 텍스트와 accessible name에 provider 이름을 포함하며 색만으로 구분하지 않는다.
- 인증 시작 중 해당 버튼만 비활성화하고 `카카오로 이동 중…`을 표시한다.

### 가입

- 로그인과 같은 provider 순서를 사용한다.
- OAuth 가입자는 인증 후 기존 `/account/onboarding`에서 회사명·직위·휴대전화·필수 동의를 입력한다.
- OAuth 버튼 가까이에 `카카오 계정의 이메일과 기본 프로필을 인증에 사용합니다.`를 표시한다.

### 오류 문구

| 상태 | 사용자 문구 |
| --- | --- |
| 인증 시작 실패 | 카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요. |
| 동의 취소·callback 실패 | 카카오 인증이 완료되지 않았습니다. 다시 시도하거나 이메일로 로그인해 주세요. |
| 이메일 없음 | 카카오 계정에서 이메일 제공에 동의한 뒤 다시 시도하거나 이메일로 가입해 주세요. |
| 설정 누락 | 현재 카카오 로그인을 사용할 수 없습니다. 이메일 로그인을 이용해 주세요. |
| 탈퇴 unlink 실패 | 카카오 연결을 해제하지 못해 탈퇴를 완료하지 않았습니다. 다시 시도해 주세요. |

## 6. 구현 단계

### 1단계 — 공통 소셜 로그인 버튼

- `components/google-button.tsx`를 provider·label·enabled 값을 받는 작은 `SocialLoginButton`으로 일반화하거나 같은 파일 안의 공통 함수만 추출한다.
- `provider: "google" | "kakao"` 외 값을 허용하지 않는다.
- `components/signin-form.tsx`, `components/signup-form.tsx`에 `kakaoEnabled`를 전달하고 소셜 버튼들을 한 묶음으로 렌더링한다.
- provider 하나 이상 활성화된 경우에만 구분선을 표시한다.
- 새 의존성은 추가하지 않는다.

### 2단계 — 페이지·오류 상태

- `app/signin/page.tsx`, `app/signup/page.tsx`가 `NEXT_PUBLIC_KAKAO_AUTH_ENABLED`를 읽고 form에 전달한다.
- `searchParams.error`를 허용 목록으로 변환해 `AuthErrorNotice` 또는 기존 `notice-banner`에 표시한다.
- query string 원문을 그대로 화면에 출력하지 않는다.
- OAuth callback의 `error`, `error_code`는 session 교환이나 기존 session fallback보다 먼저 처리한다. 카카오 동의를 취소한 기존 로그인 사용자가 성공 처리되는 것을 막는다.

### 3단계 — 콜백 안전성

- `app/auth/callback/route.ts`는 OAuth 오류 query가 없을 때만 code 교환 또는 기존 no-code callback fallback을 수행한다.
- session 교환 직후 `user.email`을 확인한다.
- 이메일이 없으면 조직을 만들기 전에 sign out하고 `/signin?error=email_required`로 보낸다.
- display name fallback을 `display_name → full_name → name → nickname → preferred_username → email` 순서로 보강한다.
- provider별 별도 콜백·DB migration은 만들지 않는다.
- 동일 이메일 계정 회귀 테스트에서 `getUserIdentities()`에 Google과 Kakao가 함께 연결되었고 기존 assessment·plan 소유 UUID가 유지된 경우에만 자동 연결 성공으로 판정한다.

### 4단계 — 계정 탈퇴와 카카오 unlink

- `app/account/actions.ts`에서 사용자의 identities 중 `provider === "kakao"`인 항목을 찾는다.
- 카카오 API의 `target_id`는 Supabase identity 행의 UUID(`identity.id`, `identity.identity_id`)가 아니다. `identity.identity_data.sub`를 문자열로 읽어 숫자 형식인지 검증하고, 스테이징에서 이것이 Kakao Service user ID와 동일함을 확인한 뒤 사용한다.
- 카카오 identity가 있을 때만 서버 전용 `KAKAO_ADMIN_KEY`로 아래 요청을 보낸다.

```http
POST https://kapi.kakao.com/v1/user/unlink
Authorization: KakaoAK <KAKAO_ADMIN_KEY>
Content-Type: application/x-www-form-urlencoded;charset=utf-8

target_id_type=user_id&target_id=<numeric Kakao Service user ID>
```

- 성공 응답의 `id`가 요청한 `target_id`와 같은지 검증한다.
- unlink가 실패하면 익명화·Supabase 삭제를 시작하지 않아 재시도가 가능해야 한다.
- 네트워크 요청에는 timeout을 두고 키·응답 본문을 로그에 남기지 않는다.
- unlink 성공 후 로컬 삭제가 실패한 경우의 재시도는 Kakao 관리자 사용자 조회로 상태를 확인한다. 같은 Admin Key와 Service user ID로 `POST https://kapi.kakao.com/v2/user/me`를 호출해 `200`이면 아직 연결된 상태이므로 unlink를 다시 요청하고, HTTP `400`과 Kakao 오류 코드 `-101`이면 공식 정의상 앱에 연결되지 않은 사용자이므로 로컬 삭제를 계속한다.
- `-101` 이외의 4xx, 잘못된 Admin Key인 `-401`, timeout, 5xx, 파싱 실패는 모두 fail-closed로 처리해 로컬 삭제를 시작하지 않고 재시도 또는 지원 경로를 안내한다. Supabase identity 존재 여부만으로 Kakao unlink 상태를 추정하지 않는다.
- 현재 `deleteUser(user.id, true)`는 Supabase soft delete다. 스테이징에서 탈퇴 후 `auth.identities`, 사용자 metadata, 애플리케이션 테이블에 복구 가능한 Kakao Service user ID가 남지 않는지 감사한다. 남는다면 feature flag를 켜지 않고 hard delete 또는 보존정책 변경을 별도 결정한다.
- 외부 카카오 계정 설정에서 먼저 연결을 해제한 이벤트는 서비스 unlink API 호출 때는 오지 않는다. 초대형 제한 베타는 webhook 없이 시작할 수 있지만, 공개 운영 전에는 Kakao unlink callback의 Admin Key·`app_id` 검증, 3초 이내 HTTP 200 응답, 내부 계정 정리 절차를 설계·구현한다.

### 5단계 — 운영 설정과 문서

- `.env.example`: `NEXT_PUBLIC_KAKAO_AUTH_ENABLED=false`, `KAKAO_ADMIN_KEY=` 추가.
- `README.md`: Kakao Developers, Supabase, Vercel 설정 순서와 rollback을 추가.
- Kakao Developers:
  - 앱 도메인: `https://global-gtm.vercel.app`
  - Redirect URI: `https://slufdtwiaswuphukhmov.supabase.co/auth/v1/callback`
  - 카카오 로그인 활성화, Client Secret 활성화
  - 동의항목: 확인 이메일, 닉네임; 프로필 이미지는 사용하지 않으면 요청하지 않음
  - Biz App 전환과 개인정보 처리방침 URL 확인
  - 공개 운영 전 unlink callback URL과 Admin Key 검증 등록
- Supabase:
  - Kakao provider에 REST API key와 Client Secret 저장
  - `Allow users without an email`은 비활성 상태 유지
  - 앱 `/auth/callback` redirect allowlist 확인
- Vercel:
  - 설정 완료 전에는 `NEXT_PUBLIC_KAKAO_AUTH_ENABLED=false`
  - 운영·프리뷰에 공개 플래그와 서버 전용 `KAKAO_ADMIN_KEY`를 분리 저장
  - 설정 후 새 배포에서 버튼 활성화
  - 공개 플래그 rollback은 값 변경만으로 즉시 적용되지 않으므로 `false`로 변경 후 재배포하거나 직전 정상 배포를 복원

## 7. 테스트 계획

### 자동화

- provider mapping 순수 함수: Kakao·Google 각각 정확한 provider와 `next`를 전달한다.
- 조건부 렌더링 계산: 0개/Google만/Kakao만/둘 다에서 버튼과 구분선 수가 정확하다.
- callback: 이메일 없는 사용자에게 조직·프로필 write가 발생하지 않고 `email_required`로 이동한다.
- callback: 기존 session이 있어도 카카오 동의 취소 query가 성공 fallback으로 처리되지 않는다.
- callback: 카카오 nickname이 display name fallback으로 사용된다.
- callback: 동일 확인 이메일의 Kakao 로그인 뒤 Google·Kakao identities와 기존 사용자 UUID·진단 이력이 유지된다.
- 탈퇴: Kakao identity가 있으면 unlink 성공 후에만 익명화·삭제한다.
- 탈퇴: `identity_data.sub`만 숫자형 Kakao Service user ID로 사용하고 Supabase identity UUID는 전송하지 않는다.
- 탈퇴: unlink 실패 시 로컬 계정이 삭제되지 않는다.
- 탈퇴: unlink 성공 후 로컬 삭제 실패를 재시도하면 관리자 사용자 조회 `-101`에서만 이미 해제됨으로 인정하고 완료할 수 있다.
- 탈퇴: 관리자 사용자 조회 `200`은 unlink 재호출, `-401`·기타 4xx·timeout·5xx는 로컬 삭제 중단으로 분류한다.

### 수동 브라우저 검증

1. 신규 카카오 사용자 가입 → 온보딩 → 대시보드
2. 기존 이메일과 같은 카카오 계정 로그인 → 동일 진단·계획 확인
3. 카카오 동의 취소 → 이해 가능한 오류 안내
4. 이메일 미제공 계정 → 로컬 조직 생성 없이 차단
5. `next=/assessment` 복귀
6. 모바일 375px, 데스크톱, 키보드 조작, focus 표시
7. Google·이메일·magic link 회귀 확인
8. 카카오 계정 사용자 탈퇴 후 카카오 연결 해제 확인
9. soft delete 뒤 Supabase auth identity·metadata·앱 테이블의 Kakao 식별자 잔존 여부 확인
10. unlink 성공 → 로컬 삭제 실패 → 재시도에서 관리자 사용자 조회 `-101` → 로컬 삭제 완료
11. 외부에서 이미 unlink된 사용자 `-101`, 잘못된 Admin Key `-401`, timeout·5xx의 fail-closed 분기

## 8. 인수 조건

- [ ] 카카오 버튼은 feature flag가 `true`일 때만 로그인·가입 화면에 보인다.
- [ ] 카카오 로그인은 기존 Supabase PKCE callback을 통과한다.
- [ ] 이메일 없는 계정은 DB write 전에 안전하게 중단된다.
- [ ] 신규 사용자는 기존 온보딩과 필수 동의를 완료한다.
- [ ] `account_email`이 제공되고 Supabase가 동일 identity로 연결한 기존 사용자는 과거 진단·계획이 있는 동일 UUID로 들어간다.
- [ ] callback 오류가 query string만 남지 않고 한국어 안내로 보인다.
- [ ] 카카오 사용자의 서비스 탈퇴는 카카오 unlink 성공 뒤에만 완료된다.
- [ ] Kakao API에는 숫자형 Service user ID만 전송되고 성공 응답 ID를 검증한다.
- [ ] soft delete 후 복구 가능한 카카오 식별자가 남지 않는다는 스테이징 증거가 있다. 증명되지 않으면 운영 flag를 켜지 않는다.
- [ ] Google·이메일·magic link 동작에 회귀가 없다.
- [ ] 기존 저장소 스크립트 기준 typecheck, unit test, production build가 통과한다.
- [ ] 운영 smoke test 후 feature flag를 켜며, 문제 시 flag를 내린 새 배포 또는 직전 정상 배포 복원으로 rollback한다.

## 9. 보안·개인정보 위험과 완화

| 위험 | 완화 |
| --- | --- |
| 카카오 이메일이 없거나 바뀜 | 내부 식별자는 Supabase UUID를 계속 사용하고, 확인 이메일이 없는 가입은 차단한다. |
| Client Secret·Admin Key 노출 | Client ID·Secret은 Supabase에, Admin Key는 Vercel server-only 변수에만 저장한다. 공개 변수·클라이언트 번들·로그에 넣지 않는다. |
| 탈퇴 후 카카오 연결 잔존 | 로컬 삭제 전에 카카오 unlink를 수행하고 실패 시 삭제를 중단한다. |
| OAuth callback open redirect | 기존 `safeNextPath`를 유지한다. |
| 계정 중복 | `account_email`이 있고 Supabase가 identities를 실제 연결했는지 확인한다. 이메일 문자열만으로 직접 병합하지 않는다. |
| 개인정보 국외 처리 고지 누락 | 개인정보 처리방침에 카카오·Supabase 처리 목적, 항목, 보관, 국외 이전 여부를 법률 검토 후 반영한다. |

## 10. 운영 활성화 전 검증 게이트

아래 항목 중 하나라도 미확인인 경우 `NEXT_PUBLIC_KAKAO_AUTH_ENABLED=true` 운영 배포를 하지 않는다.

1. 스테이징 Kakao identity의 `identity_data.sub`가 숫자형 Service user ID임을 확인한다.
2. 동일 확인 이메일 로그인 후 Supabase identities와 기존 사용자 UUID·진단 이력이 유지됨을 확인한다.
3. 카카오 unlink 성공·실패와 로컬 삭제 실패 재시도가 검증된다. 관리자 사용자 조회 `-101`만 이미 해제됨으로 인정하고, `200`은 unlink 재호출, `-401`·기타 4xx·timeout·5xx는 fail-closed로 처리한다.
4. Supabase soft delete 뒤 복구 가능한 Kakao 식별자 잔존 여부를 감사하고 정책 적합 판정을 받는다.
5. 개인정보 처리방침·이용자 탈퇴 처리 방식에 대한 운영·법무 검토가 완료된다.
6. 제한 베타를 넘어 공개 운영할 때는 외부 unlink callback 처리를 먼저 완료한다.

## 11. 공식 근거

- [Supabase Kakao 로그인](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase social login과 provider token](https://supabase.com/docs/guides/auth/social-login)
- [Kakao Login 공통 개념](https://developers.kakao.com/docs/en/kakaologin/common)
- [Kakao 이메일 FAQ](https://developers.kakao.com/docs/en/kakaologin/faq)
- [Kakao unlink REST API](https://developers.kakao.com/docs/en/kakaologin/rest-api)
- [Kakao unlink callback](https://developers.kakao.com/docs/en/kakaologin/callback)
- [Kakao REST API 오류 코드](https://developers.kakao.com/docs/en/rest-api/error-code)
- [Vercel 환경변수](https://vercel.com/docs/environment-variables)

## 12. 구현 순서와 정지 조건

1. 버튼·페이지 조건부 표시
2. callback 이메일 guard와 오류 표시
3. 계정 탈퇴 unlink
4. 자동 테스트와 build
5. Supabase·Kakao·Vercel 운영 설정
6. 프리뷰 신규/기존/동의 취소/탈퇴 smoke test와 식별자 잔존 감사
7. 운영·법무 검토 및 공개 운영 시 unlink callback 완료
8. 운영 flag 활성화, 재배포, 재검증

구현 완료 조건은 인수 조건 전체와 운영 smoke test가 통과한 상태다. 이번 계획 단계에서는 소스 코드나 운영 설정을 변경하지 않는다.

## 13. 검토 반영 기록

- OAuth 동의 취소를 기존 session 성공으로 오인할 수 있는 callback 분기를 수정 대상으로 추가했다.
- Supabase identity UUID와 Kakao Service user ID를 명확히 분리했다.
- 기존 soft delete가 카카오 식별자를 실제로 제거하는지 스테이징 감사 전에는 운영을 활성화하지 않도록 했다.
- 동일 이메일 자동 연결을 보장 문구가 아니라 Supabase identity 결과 검증 조건으로 바꿨다.
- 저장소에 없는 lint·DOM 테스트 도구를 전제로 하지 않고 기존 Vitest 순수 로직 테스트와 수동 브라우저 행렬을 사용한다.
