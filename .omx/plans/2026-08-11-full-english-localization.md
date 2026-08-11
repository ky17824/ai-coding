# Borderless 전체 영문화 구현 계획

## 목표

`/en`에서 시작한 사용자가 가입·로그인, 55문항 진단, 대시보드, GTM 여정, 전문가 서비스, AI GTM 어시스턴트, 보고서 다운로드까지 미국 사용자가 자연스럽게 이해할 수 있는 영어로 끝까지 이용하게 한다. 한국어 경로와 저장 데이터·점수 규칙은 그대로 유지한다.

## 핵심 결정

- 한국어는 기존 무접두 경로(`/dashboard`), 영어는 같은 기능의 `/en/*` 경로를 사용한다.
- 화면을 복제하지 않고 middleware가 `/en/*`를 기존 App Router 페이지로 rewrite한다.
- 링크 생성, 인증 복귀 경로, API 요청에는 명시적 locale을 전달한다.
- 질문 ID·점수·Critical 규칙·서비스 ID는 번역하지 않는다. 표시 문구만 locale별 catalog로 분리한다.
- AI 답변과 보고서는 선택한 언어로 새로 생성한다. 이미 저장된 한국어 산출물은 `/en`에 그대로 노출하지 않고, 원본을 보존한 채 영문 표시본을 한 번 생성해 재사용한다.
- 법률 문서는 영어 별도 본문으로 제공하되 공개 전 법률 검토가 필요함을 명시한다.
- 신규 i18n dependency는 추가하지 않고 현재 `lib/i18n.ts`와 Next.js middleware를 확장한다.
- 사용자가 한국어로 입력한 설명은 원문을 보존하고, 영어 화면과 보고서에서는 자동 생성한 자연스러운 영어 표시본을 재사용한다.

## 2026-08-11 운영 감사 결과

`https://global-gtm.vercel.app/en/dashboard`의 정적 UI와 55개 진단 질문은 영어로 표시되지만 다음 저장 콘텐츠가 한국어로 남아 있다.

- 승인된 AI 계획 요약
- 계획 항목 제목과 담당 역할
- 진단 우선 액션 제목·담당 역할·완료 근거
- 같은 내용을 재사용하는 `/en/journey`, `/en/assistant/:id`, 영문 HTML 보고서

원인은 화면별 번역 분기가 아니라 `gtm_plans`, `gtm_plan_items`, `action_items`에 저장된 한국어 표시 문장을 영어 화면에서도 직접 렌더링하는 구조다. 따라서 잔존 문구를 개별 치환하지 않고 콘텐츠 출처별 렌더링 규칙을 고친다.

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
- `action_items.question_id`가 있는 진단 액션은 저장 문장 대신 영어 질문 catalog의 action·owner·follow-up을 사용
- 기존 승인 계획은 `/en/dashboard`와 `/en/journey`에서 자동 번역된 영문 표시본을 캐시해 보여주고, 번역 실패 시 원문과 재시도 안내를 제공
- 검증: 양 언어에서 55개 ID·선택지 수와 점수가 동일한 snapshot/단위 테스트

### 4. 서비스·주문·전문가

- 정적 서비스 catalog의 영어 title·description·deliverables 추가
- 서비스 목록·상세·결제·주문·전문가·운영 화면 영문화
- DB에 한국어만 저장된 사용자 작성 콘텐츠는 원문임을 표시하고 임의 번역하지 않음
- 검증: 목록→상세→주문 흐름과 긴 영문 반응형 레이아웃

### 5. AI GTM 어시스턴트·조사·보고서

- assistant 요청에 locale을 저장·전달하고 질문 중복 방지 로직은 그대로 유지
- OpenAI system prompt와 fallback을 locale별로 분기해 영어 세션에서는 영어만 생성
- 계획·계획 항목의 상태와 ID는 공유하고, 요약·가정·시장조사·항목 문장만 locale별 표시본으로 저장
- 기존 한국어 계획은 자동 덮어쓰기나 요청 중 실시간 번역을 하지 않고 영문 표시본을 한 번 생성해 캐시
- 시장·경쟁 사전조사, 전체시장·유효시장·수익가능시장·초기 공략 가능 시장, 경쟁사, 30·60·90일 계획 UI 영문화
- HTML 다운로드 보고서는 요청 locale과 일치하는 표시본만 사용하고, 영문 표시본이 없으면 한국어 보고서를 잘못 내려주지 않음
- 검증: prompt locale 테스트, 영어 fallback, 영문 보고서 다운로드와 출처 링크

### 6. 한국어 사용자 입력의 자동 영문 표시

- `content_translations` 캐시를 추가한다: 조직, 원본 entity와 field, target locale, source hash, 번역문, 생성 방식, 사용자 승인 여부를 저장
- 가입·온보딩·창업자 공동계획 회의 저장은 원본 성공을 먼저 확정하고 번역 실패 때문에 사용자 입력 저장을 취소하지 않음
- 신규 입력은 저장 직후 영어 번역을 한 번 생성하고, 기존 입력은 `/en` 최초 조회에서 화면에 필요한 필드만 batch 생성
- 번역 대상: 회사·제품·서비스·솔루션 설명, 고객 문제, 핵심가치, 차별점, 제공·수익모델, 목표시장·고객, 자원·제약, 사용자 실행 메모
- 자동 번역 제외: 이메일, 전화번호, URL, 날짜, 통화·수치 원문, 증거 파일, 사람 이름, 등록 법인명, 브랜드·제품명. 공식 영문명이 등록된 경우에만 해당 이름을 교체
- OpenAI 요청은 한 화면의 누락 필드를 한 번에 구조화 출력하고, 미국 스타트업 문맥의 자연스러운 문장으로 번역하되 새로운 주장이나 시장정보를 추가하지 않도록 제한
- 원문 수정 시 source hash로 번역 캐시를 무효화하고 새 번역을 생성
- 영어 화면은 번역 생성 중 skeleton, 실패 시 영어 안내와 `Retry translation`·`View original`을 제공
- 사용자가 영문본을 직접 고쳐 `Official English version`으로 승인하면 자동 번역보다 우선
- 대시보드·assistant·journey·admin·보고서가 동일한 번역 조회 helper를 사용
- 검증: 원문 불변, 숫자·통화·URL 보존, batch 1회 호출, cache hit 무호출, 원문 변경 시 재번역, 영문 DOM 한글 잔존 검사

### 7. 사용자 제공 문서

- `scripts/build-questionnaire-docx.js`에 `ko|en` 문서 locale을 명시적으로 전달
- 영어 55문항 설문은 별도 파일명과 영어 안내·질문·선택지·증거 작성란으로 생성
- 질문 ID·배점·Critical·단계 연결은 한국어 설문과 자동 비교하고 문서 version을 함께 기록
- 개발 계획과 변경 이력은 화면에 노출되지 않으므로 번역 범위에서 제외

### 8. 최종 QA와 운영 배포

- `npm test`, `npm run typecheck`, `npm run build`
- 데스크톱·모바일에서 `/en` → 로그인/가입 → 진단 → 대시보드 → AI 계획 → 보고서 흐름 확인
- 영어 화면에서 플랫폼 소유 한글 잔존 문자열과 `/en` 이탈 링크 검색. 회사명·사람 이름·브랜드명·사용자 원문은 허용 목록으로 분리
- 단계별 커밋 후 `main` push, Vercel production 배포, `https://global-gtm.vercel.app/en` smoke test

## 완료 기준

- 영어 사용자가 의도적 원문 콘텐츠를 제외하고 한국어 UI를 만나지 않는다.
- 언어 전환 시 같은 화면과 가능한 동일 record context를 유지한다.
- 한국어·영어가 같은 질문 ID, 점수, Gate, 권한, 주문, 계획 상태를 공유한다.
- AI와 보고서가 선택 locale로 생성되고 기존 산출물의 언어가 조용히 바뀌지 않는다.
- 영문 표시본이 없는 기존 AI 계획은 한국어 본문 대신 영어 안내를 표시하며, 한 번 생성한 영문본을 다시 사용한다.
- 영문 대시보드·여정·보고서가 저장된 한국어 진단 액션 문장을 직접 출력하지 않는다.
- 사용자가 한국어로 입력한 주요 회사·제품·시장 정보는 원문을 잃지 않으면서 영문 화면과 보고서에서 자연스러운 영어로 표시된다.
- 전체 테스트·typecheck·production build와 운영 smoke test가 통과한다.
