# Borderless 전체 영문화 구현 계획

## 목표

`/en`에서 시작한 사용자가 가입·로그인, 55문항 진단, 대시보드, GTM 여정, 전문가 서비스, AI GTM 어시스턴트, 보고서 다운로드까지 미국 사용자가 자연스럽게 이해할 수 있는 영어로 끝까지 이용하게 한다. 한국어 경로와 저장 데이터·점수 규칙은 그대로 유지한다.

## 핵심 결정

- 한국어는 기존 무접두 경로(`/dashboard`), 영어는 같은 기능의 `/en/*` 경로를 사용한다.
- 화면을 복제하지 않고 middleware가 `/en/*`를 기존 App Router 페이지로 rewrite한다.
- 링크 생성, 인증 복귀 경로, API 요청에는 명시적 locale을 전달한다.
- 질문 ID·점수·Critical 규칙·서비스 ID는 번역하지 않는다. 표시 문구만 locale별 catalog로 분리한다.
- AI 답변과 보고서는 선택한 언어로 새로 생성한다. 이미 저장된 한국어 산출물은 기계 번역하지 않는다.
- 법률 문서는 영어 별도 본문으로 제공하되 공개 전 법률 검토가 필요함을 명시한다.
- 신규 i18n dependency는 추가하지 않고 현재 `lib/i18n.ts`와 Next.js middleware를 확장한다.

## 단계별 구현

### 1. 로케일 경로와 공통 셸

- `lib/i18n.ts`: `localizedPath`, `stripLocalePath`, 요청 locale 판별 helper와 공통 헤더 문구 추가
- `middleware.ts`: `/en/*` rewrite, 보호 경로 판별, `/en/signin?returnTo=...` 복귀
- `components/site-header.tsx`, `components/language-switcher.tsx`, `components/landing.tsx`: 현재 경로를 보존하는 언어 전환과 locale별 CTA
- `app/layout.tsx`: 요청 locale에 맞는 `<html lang>`과 metadata
- 검증: 경로 helper 단위 테스트, `/en`, `/en/signin`, `/en/dashboard` 로그인 전후 smoke test

### 2. 인증·계정·법률

- 가입·로그인·비밀번호 재설정·온보딩·마이페이지 문구와 오류를 locale별 제공
- Google·Kakao·이메일 로그인에서 `/en/*` 복귀 경로 보존
- 이용약관·개인정보처리방침·환불정책 영어 본문과 영문 편의 번역 고지
- 검증: 이메일·Google·Kakao의 locale 복귀와 form 오류 문구

### 3. 진단·대시보드·여정

- `lib/intake-questions.ts`: 55문항의 구조·점수를 그대로 두고 영어 질문, 4개 선택지, 후속 질문, 액션을 같은 ID에 매핑
- `lib/readiness.ts`: 점수 계산과 표시 문구를 분리해 locale별 Gate·상태 문구 생성
- 진단, 결과, 대시보드, 질문별 답변 의미, GTM 여정 화면 영문화
- 검증: 양 언어에서 55개 ID·선택지 수와 점수가 동일한 snapshot/단위 테스트

### 4. 서비스·주문·전문가

- 정적 서비스 catalog의 영어 title·description·deliverables 추가
- 서비스 목록·상세·결제·주문·전문가·운영 화면 영문화
- DB에 한국어만 저장된 사용자 작성 콘텐츠는 원문임을 표시하고 임의 번역하지 않음
- 검증: 목록→상세→주문 흐름과 긴 영문 반응형 레이아웃

### 5. AI GTM 어시스턴트·조사·보고서

- assistant 요청에 locale을 저장·전달하고 질문 중복 방지 로직은 그대로 유지
- OpenAI system prompt와 fallback을 locale별로 분기해 영어 세션에서는 영어만 생성
- 시장·경쟁 사전조사, 전체시장·유효시장·수익가능시장·초기 공략 가능 시장, 경쟁사, 30·60·90일 계획 UI 영문화
- HTML 다운로드 보고서의 제목·표·상태·날짜·`lang`을 locale별 처리
- 검증: prompt locale 테스트, 영어 fallback, 영문 보고서 다운로드와 출처 링크

### 6. 최종 QA와 운영 배포

- `npm test`, `npm run typecheck`, `npm run build`
- 데스크톱·모바일에서 `/en` → 로그인/가입 → 진단 → 대시보드 → AI 계획 → 보고서 흐름 확인
- 영어 화면에서 한글 잔존 문자열과 `/en` 이탈 링크 검색
- 단계별 커밋 후 `main` push, Vercel production 배포, `https://global-gtm.vercel.app/en` smoke test

## 완료 기준

- 영어 사용자가 의도적 원문 콘텐츠를 제외하고 한국어 UI를 만나지 않는다.
- 언어 전환 시 같은 화면과 가능한 동일 record context를 유지한다.
- 한국어·영어가 같은 질문 ID, 점수, Gate, 권한, 주문, 계획 상태를 공유한다.
- AI와 보고서가 선택 locale로 생성되고 기존 산출물의 언어가 조용히 바뀌지 않는다.
- 전체 테스트·typecheck·production build와 운영 smoke test가 통과한다.
