# OpenAI API·GTM Vector Store의 Vercel 적용 절차

작성일: 2026-08-05

대상 서비스: Borderless Global GTM (`global-gtm`)

상태: **운영 적용 완료**

## 1. 목적

AI GTM 어시스턴트가 OpenAI Responses API와 내부 GTM 지식 자료를 사용하도록 다음 서버 환경변수를 준비한다.

| 환경변수 | 용도 | 비밀 여부 | 권장 Vercel 범위 |
|---|---|---:|---|
| `OPENAI_API_KEY` | OpenAI API 서버 인증 | 비밀 | Production, Preview |
| `OPENAI_GTM_VECTOR_STORE_ID` | GTM 지식이 저장된 OpenAI Vector Store 지정 | 비밀 아님 | Production, Preview |
| `AI_GTM_ASSISTANT_ENABLED` | AI 호출 활성화 | 비밀 아님 | Production, Preview |
| `AI_GTM_ASSISTANT_MODEL` | 사용할 모델 지정 | 비밀 아님 | Production, Preview |

현재 코드의 기본 설정은 다음과 같다.

```env
AI_GTM_ASSISTANT_ENABLED=true
AI_GTM_ASSISTANT_MODEL=gpt-5.6-luna
```

`OPENAI_API_KEY`가 없거나 `AI_GTM_ASSISTANT_ENABLED=false`이면 서비스는 오류로 중단되지 않고 저장된 진단 액션을 이용한 기본 계획으로 대체한다. `OPENAI_GTM_VECTOR_STORE_ID`만 없으면 OpenAI 모델은 호출되지만 내부 GTM 자료 검색은 사용하지 않는다.

## 2. 사전 준비

1. [OpenAI API Keys](https://platform.openai.com/api-keys)에서 Borderless 전용 **프로젝트 API 키**를 생성한다.
2. 키를 채팅, 문서, Git 커밋, 화면 캡처에 남기지 않는다.
3. OpenAI API 결제수단과 사용 한도를 확인한다.
4. 로컬 운영 파일 `.env.local`이 Git에서 제외되는지 확인한다. 이 저장소는 `.env*`를 이미 무시한다.

로컬 파일에는 다음처럼 저장한다.

```env
OPENAI_API_KEY=발급받은_프로젝트_API_키
OPENAI_GTM_VECTOR_STORE_ID=뒤에서_생성할_vs_ID
```

`OPENAI_API_KEY`에는 `NEXT_PUBLIC_` 접두사를 붙이지 않는다. 이 키는 브라우저에 전달되면 안 되는 서버 전용 비밀값이다.

## 3. Vector Store 생성

### 권장 방법: 현재 프로젝트의 OpenAI SDK 사용

먼저 `.env.local`에 `OPENAI_API_KEY`만 저장한 뒤 프로젝트 루트에서 아래 명령을 실행한다.

```bash
node --env-file=.env.local --input-type=module -e \
  'import OpenAI from "openai"; const client = new OpenAI(); const store = await client.vectorStores.create({ name: "Borderless GTM Knowledge" }); console.log(store.id);'
```

출력된 `vs_...` 값을 `.env.local`의 `OPENAI_GTM_VECTOR_STORE_ID`에 저장한다. Vector Store ID는 API 키처럼 인증에 사용할 수 있는 비밀값은 아니지만 임의 변경을 막기 위해 운영 설정으로 관리한다.

## 4. Obsidian GTM 자료 동기화

동기화 스크립트는 다음 자료만 허용한다.

- `methodology/`
- `templates/`
- `checklists/`
- `industries/`
- `SCHEMA.md`
- `GTM Resource Index.md`

`confidentiality: confidential` 문서와 `_archive/`, `raw/`, `Startups/`, `Assessments/`, `Cases/`, `Action Plans/` 등은 제외한다.

### 4.1 사전 확인만 실행

```bash
node --env-file=.env.local scripts/sync-gtm-knowledge.mjs
```

이 단계는 대상 파일과 변경 목록만 보여 주며 OpenAI에는 업로드하지 않는다.

### 4.2 실제 반영

대상 목록을 검토한 다음에만 실행한다.

```bash
node --env-file=.env.local scripts/sync-gtm-knowledge.mjs --apply
```

완료되면 `.gtm-knowledge-manifest.json`에 로컬 파일 해시와 OpenAI 파일 ID가 기록된다. 이 파일은 Git에 포함되지 않는다. 같은 Vector Store를 계속 갱신하려면 운영 작업 환경에서 이 파일을 보존해야 한다. 파일을 잃어버린 경우 기존 자료가 중복될 수 있으므로 기존 Vector Store를 정리하거나 새 Vector Store를 만드는 편이 안전하다.

## 5. Vercel 환경변수 등록

Vercel Dashboard에서 다음 경로로 이동한다.

`global-gtm 프로젝트 → Settings → Environment Variables`

### 5.1 `OPENAI_API_KEY`

- Key: `OPENAI_API_KEY`
- Value: OpenAI 프로젝트 API 키
- Environments: `Production`, `Preview`
- Sensitive: **활성화**

### 5.2 `OPENAI_GTM_VECTOR_STORE_ID`

- Key: `OPENAI_GTM_VECTOR_STORE_ID`
- Value: 생성한 `vs_...` ID
- Environments: `Production`, `Preview`
- Sensitive: 선택 사항

### 5.3 기존 활성화 설정 확인

```text
AI_GTM_ASSISTANT_ENABLED=true
AI_GTM_ASSISTANT_MODEL=gpt-5.6-luna
```

두 값도 `Production`, `Preview`에 적용되어 있어야 한다.

## 6. 재배포

Vercel 환경변수 변경은 기존 배포에 소급 적용되지 않는다. 두 값을 저장한 뒤 최신 정상 배포를 **Redeploy**하거나 Production 배포를 새로 실행한다.

권장 순서:

1. Preview를 먼저 새로 배포한다.
2. Preview에서 로그인, 진단 결과, AI 계획 생성을 확인한다.
3. 이상이 없으면 Production을 재배포한다.
4. `https://global-gtm.vercel.app`에서 최종 확인한다.

## 7. 검증 체크리스트

### 설정

- [ ] Vercel에 `OPENAI_API_KEY`가 Sensitive로 저장됨
- [ ] Vercel에 `OPENAI_GTM_VECTOR_STORE_ID`가 저장됨
- [ ] 두 값의 범위가 Production과 Preview로 설정됨
- [ ] `AI_GTM_ASSISTANT_ENABLED=true`
- [ ] `AI_GTM_ASSISTANT_MODEL=gpt-5.6-luna`
- [ ] 환경변수 저장 후 새 배포가 생성됨

### 지식 동기화

- [ ] dry run에서 허용된 문서만 표시됨
- [ ] `--apply`가 `GTM knowledge sync complete.`로 종료됨
- [ ] OpenAI Vector Store의 파일 처리가 완료 상태임
- [ ] `.gtm-knowledge-manifest.json`이 생성되고 Git에는 포함되지 않음

### 서비스

- [ ] 로그인과 대시보드 접근이 정상임
- [ ] 55문항 진단 결과에서 AI GTM 어시스턴트로 이동 가능함
- [ ] AI가 창업자 맥락을 질문하거나 30·60·90일 계획을 생성함
- [ ] 내부 자료가 사용된 계획에 근거가 표시됨
- [ ] 최신 국가 정보가 필요한 요청에서만 웹 검색이 사용됨
- [ ] Vercel Runtime Logs에 OpenAI 인증 오류(`401`)나 Vector Store 오류가 없음

## 8. 장애 시 중지·복구

가장 빠른 비상 중지는 Vercel에서 아래 값을 변경하고 재배포하는 것이다.

```env
AI_GTM_ASSISTANT_ENABLED=false
```

이 경우 AI 호출을 멈추고 기본 계획 생성으로 돌아간다. API 키가 노출되었거나 의심되는 경우에는 OpenAI에서 즉시 키를 폐기하고 새 키를 발급한 뒤 Vercel의 Sensitive 값을 교체하고 재배포한다.

Vector Store 자료에 문제가 있으면 `OPENAI_GTM_VECTOR_STORE_ID`를 제거하거나 올바른 ID로 교체한다. API 키는 유지되므로 내부 자료 검색 없이 모델 호출은 계속될 수 있다.

## 9. 운영 원칙

- API 키는 사람별 키가 아니라 Borderless 전용 OpenAI 프로젝트 키를 사용한다.
- OpenAI 프로젝트의 월 사용 한도와 알림을 설정한다.
- Vector Store 업로드 전 dry run 결과를 사람이 검토한다.
- 문서 변경 후에만 동기화를 실행하며 자동 주기 동기화는 현재 추가하지 않는다.
- 키 값 자체를 로그나 검증 화면에 출력하지 않고 존재 여부만 확인한다.
- 키 교체일과 Vector Store 변경 이력은 비밀값이 없는 운영 기록으로 남긴다.

## 10. 공식 참고자료

- [OpenAI API Quickstart](https://platform.openai.com/docs/quickstart/make-your-first-api-request)
- [OpenAI Vector Stores API](https://platform.openai.com/docs/api-reference/vector-stores/list)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Vercel Sensitive Environment Variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [Vercel Managing Environment Variables](https://vercel.com/docs/environment-variables/managing-environment-variables)

## 11. 적용 결과

2026-08-05 기준으로 다음 작업을 완료했다.

- Borderless 전용 OpenAI API 키를 로컬과 Vercel Sensitive 환경변수로 저장
- `Borderless GTM Knowledge` Vector Store 생성
- 허용된 Obsidian GTM Markdown 49개 업로드·색인 완료, 실패 0개
- `OPENAI_API_KEY`와 `OPENAI_GTM_VECTOR_STORE_ID`를 Vercel Production·Preview에 등록
- `gpt-5.6-luna`와 Vector Store 검색 최소 API 요청 성공
- Preview 최종 HTTP 200 및 비로그인 AI API 401 확인
- Production 재배포 완료 및 `https://global-gtm.vercel.app` 연결 확인

API 키 값은 이 문서와 Git 이력에 기록하지 않았다. 이후 지식 자료를 변경하면 **4. Obsidian GTM 자료 동기화** 절차부터 다시 실행한다.
