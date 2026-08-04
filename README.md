# Borderless — Global GTM Journey

한국 스타트업을 위한 해외 진출 준비도 진단, 실행 여정, 승인 전문가
마켓플레이스의 비공개 베타입니다.

## 로컬 실행

```bash
cp .env.example .env.local
npm install
npm run dev
```

Supabase 환경값이 없을 때 개발 환경에서는 샘플 데이터로 진단·대시보드·
결제 전 단계까지 확인할 수 있습니다. 배포 환경에서는 인증 설정이 없으면
비공개 화면을 로그인 페이지로 돌려보냅니다.

## 외부 서비스 연결

1. Supabase 프로젝트에서 `supabase/migrations/001_initial.sql`을 적용합니다.
2. `.env.example`의 Supabase, PortOne, OpenAI 값을 Vercel 환경변수에 등록합니다.
3. PortOne V2 웹훅을 `/api/portone/webhook`으로 설정하고 웹훅 시크릿을 발급합니다.
4. Vercel 배포 URL을 `NEXT_PUBLIC_APP_URL`에 등록합니다.
5. 관리자 계정의 `profiles.role`을 `admin`으로 지정합니다.
6. Supabase SQL Editor에서 `002_api_role_grants.sql`, `003_intake_55.sql`, `004_account_pii.sql` 순서로 적용합니다.
7. Supabase Auth의 Site URL과 Redirect URL에 운영 도메인의 `/auth/callback`을 등록하고 Secure password change를 활성화합니다.
8. Google 로그인을 쓸 때 Google Provider를 설정한 뒤 `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`로 바꿉니다.
9. 운영 인증 메일용 SMTP를 연결합니다.

전화번호 암호화 키는 다음 명령으로 생성해 Vercel의 `PII_ENCRYPTION_KEY`에 등록하고 별도 비밀번호 관리자에도 보관합니다.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

키를 분실하면 저장된 전화번호는 복구할 수 없습니다.

실제 결제는 PG 입점 승인과 약관·개인정보·환불정책의 국내 전문가 검토가
완료된 뒤 활성화합니다.

## 검증

```bash
npm test
npm run typecheck
npm run build
npm audit
```

콘텐츠 편집 및 월간 갱신 절차는 `docs/content-operations.md`에 있습니다.
