# FAQ 설계 — 정보구조·콘텐츠·페이지 매핑·컴포넌트·모바일 메뉴

상태: **설계 완료, 코딩 전** · 작성 2026-08-17 · 소스 코드 변경 없음
적용 원칙: [service-detail-block-convention.md](service-detail-block-convention.md) · [progress-indicator-honesty.md](progress-indicator-honesty.md)

---

## 0. 한 문장 요약

FAQ는 **하나의 데이터 파일**(`lib/faq/entries.ts`)에 살고, **두 곳**에서 읽힌다 —
전체 목록 페이지 `/faq`와, 각 페이지 하단에 붙는 **문맥 FAQ 블록**. 어떤 페이지에
어떤 질문이 나오는지는 항목의 `pages` 태그가 정하며, 화면은 그 태그만 본다.

---

## 1. 설계 원칙

1. **답은 코드가 아는 것만 말한다.** 환불 조건, 시도 횟수, 게이트 기준 같은 값은
   `lib/catalog`, `lib/readiness` 등에서 **import**하고, 하드코딩하지 않는다.
   숫자가 바뀌면 FAQ도 같이 바뀐다. (진행표시 정직성 원칙과 같은 줄기)
2. **한 항목 = 한 질문 = 한 답.** 답은 최대 3문장. 더 길어지면 두 항목으로 나눈다.
3. **답 안에는 목록을 쓰지 않는다.** 나열이 필요하면 항목을 쪼갠다. 서식은
   서비스 상세 블록 규약을 따른다(제목 아래는 목록, 문단 하나에 두 문장 금지).
4. **팔지 않는 것을 팔지 않는다.** 1차 론칭 A/B 상품에 전문가 검토가 없다는 사실
   (`TIER_DISCLOSURE`)은 FAQ에서도 분명히 말한다.
5. **문맥 FAQ는 3~5개, 그 이상은 `/faq`로 보낸다.** 페이지 하단에서 스크롤을
   삼키지 않는다.
6. **ko/en 병기.** 모든 항목은 `Copy = { ko, en }` 이다. 한쪽만 있으면 빌드 테스트에서
   실패한다(카탈로그 테스트와 같은 방식).

---

## 2. 정보구조

### 2.1 카테고리 (7)

| id | 라벨 (ko / en) | 무엇을 다루나 |
|---|---|---|
| `start` | 시작하기 / Getting started | 회원가입·로그인·서비스 개요 |
| `assessment` | 준비도 진단 / Readiness assessment | 진단 문항·점수·단계·게이트 |
| `dashboard` | 대시보드·GTM 여정 / Dashboard & journey | 점수 읽는 법·여정·추천 |
| `assistant` | AI GTM 어시스턴트 / AI GTM assistant | 시장조사 실행·횟수·출처 |
| `services` | AI 전문가 서비스 / AI expert services | 상품·범위·한계·생성 과정 |
| `billing` | 결제·환불 / Payments & refunds | 가격·부가세·결제·환불·영수증 |
| `account` | 계정·개인정보 / Account & privacy | 마이페이지·탈퇴·데이터 처리 |

### 2.2 페이지 태그 (문맥 FAQ의 키)

FAQ 항목은 `pages: PageKey[]`를 가진다. 페이지가 자기 키로 항목을 고른다.

```
"/" | "/signin" | "/signup" | "/assessment" | "/dashboard" | "/journey"
| "/assistant" | "/services" | "/services/[id]" | "/orders/[id]" | "/account"
```

`/services/[id]`는 추가로 `products?: string[]`로 특정 상품에만 나오는 항목을 가질 수 있다
(예: `ai-entry-requirements`의 99,000원 가격 이유).

### 2.3 진입점 (3)

| 진입점 | 위치 | 동작 |
|---|---|---|
| **모바일 메뉴** | `.mobile-nav__menu` 목록 맨 아래, 로그인 영역 위 | `/faq`로 이동 |
| **데스크톱** | 공용 푸터가 없다(법률 링크는 `components/legal-page.tsx` 안에만 있음). 1차는 `/legal/*` 페이지의 링크 열에 `/faq`를 추가하고, 메인 내비 오른쪽 계정 버튼 옆에 `?` 아이콘 없이 텍스트 링크 "FAQ"를 둔다 | `/faq`로 이동 |
| **문맥 FAQ 블록** | 각 페이지 본문 끝, 푸터 위 | 접힌 목록 3~5개 + "전체 FAQ 보기" 링크 |

데스크톱 메인 내비(`main-nav`)의 이동 링크 열에는 넣지 않는다. 이미 4~5개이고, FAQ는 목적지가 아니라 도움말이다. 계정 버튼 옆의 텍스트 링크는 내비가 아니라 유틸리티 자리이므로 예외다.

---

## 3. 콘텐츠 — 전체 FAQ 초안

표기: **[id]** 질문 → 답. `pages`는 문맥 노출 위치. `⚙︎`는 코드 상수에서 읽어야 하는 값.

### 3.1 시작하기 `start`

**[start-what]** Borderless는 무엇을 하는 서비스인가요? · pages: `/`, `/signup`
→ 해외 진출을 준비하는 창업자를 위해 준비도를 진단하고, 부족한 부분을 채우는 AI 전문가 서비스를 제공합니다. 진단은 무료이고, AI 전문가 서비스는 건당 결제입니다.

**[start-who]** 어떤 회사에 맞나요? · pages: `/`
→ 첫 해외 시장을 고르는 단계부터 진출 직전까지의 스타트업과 중소기업에 맞춰져 있습니다. 이미 현지 법인과 팀이 있는 회사에는 범위가 좁을 수 있습니다.

**[start-login]** 어떤 방법으로 로그인하나요? · pages: `/signin`, `/signup`
→ 이메일·비밀번호, 이메일 링크, 그리고 Google·카카오 계정으로 로그인할 수 있습니다. 소셜 로그인은 운영 설정에 따라 일부만 켜져 있을 수 있습니다.

**[start-free]** 무료로 쓸 수 있는 범위는 어디까지인가요? · pages: `/`, `/assessment`
→ 준비도 진단, 대시보드, GTM 여정, AI GTM 어시스턴트의 기본 조사(⚙︎ 횟수 제한 있음)는 무료입니다. AI 전문가 서비스만 유료입니다.

**[start-english]** 영어로도 볼 수 있나요? · pages: `/`, `/account`
→ 네. 상단 메뉴의 언어 전환으로 한국어와 영어를 오갈 수 있고, 보고서도 선택한 언어로 생성됩니다.

### 3.2 준비도 진단 `assessment`

**[assess-what]** 준비도 진단은 무엇을 측정하나요? · pages: `/assessment`, `/`
→ 해외 진출에 필요한 준비 상태를 시장·고객·규제·운영 등 여러 영역의 문항으로 확인합니다. 답변은 4단계 중 하나를 고르며, 영역별로 점수가 계산됩니다.

**[assess-time]** 시간이 얼마나 걸리나요? · pages: `/assessment`
→ 보통 15~25분입니다. 중간에 저장되므로 나눠서 답해도 됩니다.

**[assess-honest]** 모르는 문항은 어떻게 답하나요? · pages: `/assessment`
→ 가장 낮은 단계를 고르시면 됩니다. 점수를 높이려고 짐작으로 답하면 이후 추천과 AI 보고서가 실제와 어긋납니다.

**[assess-gate]** "통과 기준"은 무엇인가요? · pages: `/dashboard`, `/assessment`
→ 각 단계는 해당 영역 점수가 ⚙︎ `GATE_THRESHOLD`(현재 80%) 이상이면 통과로 봅니다. 통과하지 못한 단계가 현재 집중할 단계입니다.

**[assess-redo]** 진단을 다시 할 수 있나요? · pages: `/assessment`, `/dashboard`
→ 네. 언제든 다시 답할 수 있고, 최신 진단이 대시보드와 AI 서비스의 기준이 됩니다. 이전 결과는 관리 목적으로 보관됩니다.

**[assess-versions]** 문항이 예전과 달라졌는데 이전 답은 어떻게 되나요? · pages: `/assessment`
→ 문항 체계가 바뀌면 호환되는 답변은 그대로 옮기고, 새 문항만 다시 묻습니다. 다시 답할 때 화면에 어느 문항이 새 것인지 표시됩니다.

**[assess-sales-motion]** 판매 방식(직접/파트너)에 따라 문항이 달라지나요? · pages: `/assessment`
→ 네. 직접 진출로 답하면 파트너 관련 문항 일부가 "해당 없음"으로 빠지고, 점수 계산에서도 제외됩니다.

### 3.3 대시보드·GTM 여정 `dashboard`

**[dash-score]** 대시보드의 퍼센트는 무엇인가요? · pages: `/dashboard`
→ 현재 단계의 진행률입니다. 전체 평균이 아니라 지금 집중해야 할 단계의 점수를 보여 주고, 옆에 통과 기준을 함께 표시합니다.

**[dash-chart]** 막대 색이 다른 이유는 무엇인가요? · pages: `/dashboard`
→ 답변 단계(1~4)를 색 농도로 표시합니다. 짙을수록 높은 단계이고, 막대 높이도 같은 값을 나타냅니다. 테두리만 있는 막대는 아직 답하지 않았거나 해당 없는 문항입니다.

**[dash-two-scores]** 예전에 두 개의 다른 점수가 보였는데요? · pages: `/dashboard`
→ 전체 점수와 단계 점수를 함께 보여 주던 때가 있었고, 척도가 달라 혼란을 줬습니다. 지금은 현재 단계 진행률 하나만 보여 줍니다.

**[journey-what]** GTM 여정은 무엇인가요? · pages: `/journey`, `/dashboard`
→ 진단 결과를 바탕으로 지금 단계에서 해야 할 일과 그에 맞는 AI 전문가 서비스를 순서대로 보여 주는 화면입니다.

**[journey-recommend]** 추천 서비스는 어떻게 고르나요? · pages: `/journey`
→ 통과하지 못한 단계와 낮은 점수 문항에 연결된 서비스를 먼저 보여 줍니다. 추천은 진단 결과에서 나오며, 광고나 매출 순서가 아닙니다.

### 3.4 AI GTM 어시스턴트 `assistant`

**[asst-what]** AI GTM 어시스턴트는 무엇을 하나요? · pages: `/assistant`, `/dashboard`
→ 진단 결과를 바탕으로 목표 시장의 공개 자료를 조사하고, 시장 규모(TAM·SAM·SOM)와 경쟁 환경의 초안을 만듭니다. 무료이며 조사 횟수에 제한이 있습니다.

**[asst-quota]** 조사는 몇 번까지 할 수 있나요? · pages: `/assistant`
→ 진단 하나당 ⚙︎ 3회입니다. 방법론이 바뀌면 추가 1회가 열릴 수 있습니다. 횟수가 다하면 새 진단에서 다시 시작합니다.

**[asst-time]** 조사가 왜 이렇게 오래 걸리나요? · pages: `/assistant`
→ 실제로 웹을 검색하고 출처를 대조하기 때문에 보통 2~4분 걸립니다. 화면을 닫아도 작업은 계속되고, 다시 들어오면 결과를 볼 수 있습니다.

**[asst-sources]** 출처는 믿을 수 있나요? · pages: `/assistant`
→ 검색 도구가 실제로 반환한 URL만 출처로 남깁니다. 모델이 지어낸 URL은 자동으로 걸러지며, 걸러진 출처는 결과에 나타나지 않습니다.

**[asst-files]** 내 자료를 올려서 조사에 쓸 수 있나요? · pages: `/assistant`
→ 네. PDF·이미지 파일을 올리면 비공개 근거로 사용합니다. 파일은 조사 시점에만 모델에 전달되며 학습에 쓰이지 않습니다.

**[asst-vs-service]** AI 전문가 서비스와 무엇이 다른가요? · pages: `/assistant`, `/services`
→ 어시스턴트는 무료 초안입니다. AI 전문가 서비스는 상품별 계약 범위에 따라 더 깊은 조사와 실행계획, 문항 추적, 정정 재생성까지 제공하는 유료 보고서입니다.

### 3.5 AI 전문가 서비스 `services`

**[svc-what]** AI 전문가 서비스는 무엇인가요? · pages: `/services`, `/`
→ 시장조사·규제요건·파트너 조사 같은 특정 주제를 AI가 조사해 보고서로 만드는 유료 서비스입니다. 1차 론칭에서는 AI가 전 과정을 수행하며 사람 전문가 검토는 포함되지 않습니다.

**[svc-no-expert]** "전문가 검토는 포함되지 않습니다"가 무슨 뜻인가요? · pages: `/services`, `/services/[id]`
→ 보고서는 AI가 만들고 사람이 검토하지 않는다는 뜻입니다. 법률·세무·규제 판단, 파트너 접촉 같은 일은 보고서가 "사람 검증 필요"로 표시하고, 실행은 직접 하셔야 합니다. (⚙︎ `TIER_DISCLOSURE`, `HUMAN_BOUNDARY`)

**[svc-price]** 가격은 얼마인가요? · pages: `/services`
→ 대부분 ⚙︎ `INTRO_PRICE`(현재 50,000원)이고 규제·시장진입 요건만 99,000원입니다. 표시 가격은 공급가이며 결제 시 부가세가 붙습니다.

**[svc-why-99]** 규제·시장진입 요건만 왜 비싼가요? · pages: `/services/[id]` · products: `ai-entry-requirements`
→ 공식 출처 대조와 더 깊은 추론(effort high)을 쓰기 때문에 원가가 높고, 잘못된 결론의 위험이 커서 조기 중단 규칙을 별도로 둡니다.

**[svc-package]** 패키지는 무엇이 다른가요? · pages: `/services`
→ 관련 상품 여러 개를 하나의 보고서로 묶은 것입니다. 낱개를 합친 것보다 저렴하고, 중복 조사가 없습니다.

**[svc-inputs]** 무엇을 준비해야 하나요? · pages: `/services/[id]`, `/orders/[id]`
→ 결정하려는 것, 제품·서비스, 목표 국가와 고객이 핵심입니다. 나머지는 "모름"으로 두면 AI가 유사사례 가정으로 보완하고, 그 사실을 보고서에 표시합니다.

**[svc-unknown]** "모름"으로 두면 결과가 나빠지나요? · pages: `/orders/[id]`
→ 결과의 확신도가 낮아지고, 그 부분은 "유사사례 가정"으로 표시됩니다. 짐작으로 채우는 것보다 정직하게 모름으로 두는 편이 낫습니다.

**[svc-time]** 보고서 생성은 얼마나 걸리나요? · pages: `/orders/[id]`, `/services/[id]`
→ 보통 3~6분입니다. 화면에 다섯 단계(입력 정리 → 공개 조사 → 출처 검증 → 보고서 작성 → 최종 점검)가 실제 진행에 맞춰 표시됩니다.

**[svc-progress-honest]** 진행 표시가 멈췄는데 고장인가요? · pages: `/orders/[id]`
→ 진행 표시는 서버가 실제로 기록한 단계만 보여 주므로, 멈춰 있으면 실제로 멈춘 것입니다. 15분이 지나면 "작업 이어가기" 버튼이 나타나며, 그때 다시 시작할 수 있습니다.

**[svc-retry]** 실패하면 다시 할 수 있나요? · pages: `/orders/[id]`
→ 주문당 생성 시도는 ⚙︎ 2회입니다. 실패한 시도는 횟수를 쓰지 않도록 운영에서 복구할 수 있으니 실패 화면의 안내를 따라 주세요.

**[svc-correction]** 보고서의 사실이 틀렸을 때는요? · pages: `/orders/[id]`
→ "사실 정정 후 재생성"으로 입력을 고쳐 한 번 다시 만들 수 있습니다. 이 정정 1회는 주문에 포함되어 있습니다.

**[svc-sources]** 보고서 출처는 어떻게 검증하나요? · pages: `/orders/[id]`
→ 웹 검색이 실제로 반환한 URL만 인용할 수 있습니다. 확인되지 않은 출처는 자동으로 제거되고, 검증된 출처가 하나도 없으면 생성이 실패합니다.

**[svc-download]** 보고서를 파일로 받을 수 있나요? · pages: `/orders/[id]`
→ HTML 파일로 내려받을 수 있습니다. 화면과 같은 내용이며 인쇄나 공유에 쓸 수 있습니다.

**[svc-model]** 어떤 AI 모델을 쓰나요? · pages: `/services`, `/orders/[id]`
→ 프론티어 모델을 사용합니다. 모델은 품질과 비용에 따라 바뀔 수 있으며, 바뀌면 이 답도 함께 갱신합니다.

**[svc-data]** 내가 입력한 정보는 어디로 가나요? · pages: `/services/[id]`, `/orders/[id]`
→ 보고서 생성을 위해 모델 제공사에 비공개로 전달되며 학습에 쓰이지 않습니다. 공개 웹 조사에는 익명화된 브리프만 사용됩니다.

**[svc-phase2]** 사람 전문가 서비스는 언제 나오나요? · pages: `/services`
→ 관세사·현지 전문가·GTM 컨설턴트·멘토가 참여하는 2차 상품을 준비 중입니다. 시점은 확정되지 않았고, 확정되면 카탈로그와 이 FAQ에 반영합니다.

### 3.6 결제·환불 `billing`

**[bill-methods]** 결제 수단은 무엇인가요? · pages: `/services/[id]`, `/orders/[id]`
→ 신용·체크카드와 간편결제입니다. 결제는 PortOne을 통해 처리되며 카드 정보는 저희 서버에 저장되지 않습니다.

**[bill-vat]** 표시 가격에 부가세가 포함되어 있나요? · pages: `/services`, `/services/[id]`
→ 상품 카드의 가격은 공급가입니다. 상세 페이지와 결제 화면에 부가세와 최종 결제금액이 함께 표시됩니다.

**[bill-refund-before]** 환불이 되나요? · pages: `/orders/[id]`, `/services/[id]`
→ ⚙︎ `REFUND_POLICY`: 보고서 생성을 시작하기 전에는 전액 환불됩니다. 생성 시작 후 요청은 주문·생성 기록을 기준으로 검토합니다.

**[bill-refund-after]** 보고서가 마음에 들지 않으면 환불되나요? · pages: `/orders/[id]`
→ 생성이 완료된 보고서는 원칙적으로 환불되지 않습니다. 사실 오류는 포함된 정정 재생성 1회로 먼저 바로잡고, 그래도 문제가 있으면 주문 화면의 환불 요청으로 검토를 신청할 수 있습니다.

**[bill-refund-failed]** 생성이 실패하면 어떻게 되나요? · pages: `/orders/[id]`
→ 실패한 시도는 결제 상태를 바꾸지 않습니다. 재시도 후에도 완성되지 않으면 전액 환불 대상입니다.

**[bill-receipt]** 영수증·세금계산서는 어떻게 받나요? · pages: `/orders/[id]`, `/account`
→ 결제 완료 시 PortOne 영수증이 발급됩니다. 세금계산서는 마이페이지의 사업자 정보를 채운 뒤 요청할 수 있습니다.

**[bill-beta]** "관리자 베타 · 청구액 0원"이 보이는데요? · pages: `/orders/[id]`
→ 운영 테스트용 주문입니다. 지정된 관리자 계정만 결제 없이 실행할 수 있으며 일반 사용자에게는 나타나지 않습니다.

### 3.7 계정·개인정보 `account`

**[acct-edit]** 회사 정보를 어디서 바꾸나요? · pages: `/account`
→ 마이페이지에서 회사명·업종·목표 시장을 수정할 수 있습니다. 진단과 보고서는 수정 시점 이후부터 새 정보를 씁니다.

**[acct-delete]** 계정을 삭제하면 어떻게 되나요? · pages: `/account`
→ 인증 계정과 프로필이 삭제되고 로그인할 수 없게 됩니다. 결제·주문 기록은 법정 보관 의무에 따라 익명화된 형태로 남습니다.

**[acct-privacy]** 개인정보는 어떻게 처리되나요? · pages: `/account`, `/signup`
→ 개인정보 처리방침(⚙︎ `/legal/privacy`)에 따릅니다. 서비스 제공과 결제 처리에 필요한 범위에서만 사용합니다.

**[acct-provider]** 전문가로 참여하고 싶어요. · pages: `/account`, `/services`
→ 2차 상품 준비와 함께 전문가 모집을 계획하고 있습니다. 마이페이지의 문의 경로로 관심을 남겨 주시면 모집 시 안내드립니다.

---

## 4. 페이지별 매핑 (문맥 FAQ 3~5개)

| 페이지 | 노출 항목 (순서대로) |
|---|---|
| `/` | start-what · start-free · assess-what · svc-what |
| `/signin` `/signup` | start-login · start-what · acct-privacy |
| `/assessment` | assess-time · assess-honest · assess-redo · assess-sales-motion · assess-versions |
| `/dashboard` | dash-score · assess-gate · dash-chart · journey-what |
| `/journey` | journey-what · journey-recommend · svc-what |
| `/assistant` | asst-quota · asst-time · asst-sources · asst-files · asst-vs-service |
| `/services` | svc-price · svc-no-expert · svc-package · bill-vat · svc-phase2 |
| `/services/[id]` | svc-inputs · svc-no-expert · bill-refund-before · svc-time · (+ products 지정 항목) |
| `/orders/[id]` (생성 전) | svc-inputs · svc-unknown · bill-refund-before |
| `/orders/[id]` (생성 중) | svc-time · svc-progress-honest |
| `/orders/[id]` (완료) | svc-correction · svc-download · svc-sources · bill-refund-after |
| `/orders/[id]` (실패) | svc-retry · bill-refund-failed |
| `/account` | acct-edit · acct-delete · bill-receipt · acct-privacy |

`/orders/[id]`는 실행 상태(`ai_agent_runs.status`)에 따라 다른 묶음을 보여 준다. 상태는
이미 페이지가 알고 있으므로 추가 조회가 없다.

---

## 5. 데이터 구조

```ts
// lib/faq/types.ts
export type FaqCategory = "start" | "assessment" | "dashboard" | "assistant" | "services" | "billing" | "account";
export type FaqPage = "/" | "/signin" | "/signup" | "/assessment" | "/dashboard" | "/journey"
  | "/assistant" | "/services" | "/services/[id]" | "/orders/[id]" | "/account";
export type OrderStage = "before" | "generating" | "completed" | "failed";

export type FaqEntry = {
  id: string;                    // "svc-retry" — 앵커·테스트·분석 키
  category: FaqCategory;
  question: Copy;                // { ko, en }
  answer: Copy;                  // 최대 3문장. 목록 금지. 값은 상수에서 보간
  pages: FaqPage[];              // 문맥 노출 위치
  products?: string[];           // /services/[id]에서 특정 상품에만
  orderStages?: OrderStage[];    // /orders/[id]에서 특정 상태에만
  related?: string[];            // 다른 항목 id
};
```

```ts
// lib/faq/entries.ts — 유일한 진실 원천
import { INTRO_PRICE } from "@/lib/catalog/products"; // 현재 미export(products.ts:13). 코딩 1단계에서 export 추가
import { REFUND_POLICY, TIER_DISCLOSURE } from "@/lib/catalog/copy";
import { GATE_THRESHOLD } from "@/lib/readiness";

export const FAQ_ENTRIES: FaqEntry[] = [
  { id: "assess-gate", category: "assessment",
    question: { ko: "\"통과 기준\"은 무엇인가요?", en: "What is the pass threshold?" },
    answer: { ko: `각 단계는 해당 영역 점수가 ${Math.round(GATE_THRESHOLD * 100)}% 이상이면 통과로 봅니다. …`, en: `…` },
    pages: ["/dashboard", "/assessment"] },
  // …
];
```

```ts
// lib/faq/index.ts
export function faqForPage(page: FaqPage, opts?: { productId?: string; orderStage?: OrderStage; limit?: number }): FaqEntry[]
export function faqByCategory(): Record<FaqCategory, FaqEntry[]>
export function faqEntry(id: string): FaqEntry | undefined
```

### 5.1 테스트 (`lib/faq/faq.test.ts`)

- 모든 항목이 ko/en 둘 다 비어 있지 않다
- 답에 `\n- ` 또는 `①②③` 같은 목록 표기가 없다
- 답이 3문장을 넘지 않는다(`.`·`?`·`!` 기준, 한글 마침표 포함)
- `pages`가 하나 이상이고, §4의 매핑에 나온 모든 페이지가 3~5개를 반환한다
- `related` id가 전부 실존한다
- ⚙︎ 표시 항목이 상수를 실제로 참조한다 — `INTRO_PRICE`를 바꿔도 테스트가 통과해야 한다
  (문자열에 하드코딩된 "50,000"이 없음을 단언)

---

## 6. 컴포넌트·라우트

### 6.1 `/faq` 페이지 (`app/faq/page.tsx`, 서버 컴포넌트)

```
[page-kicker] HELP
[h1] 자주 묻는 질문
[p]  답을 찾지 못하셨나요? → 문의 링크

[filter-row]  전체 · 시작하기 · 준비도 진단 · 대시보드·여정 · AI 어시스턴트 · AI 전문가 서비스 · 결제·환불 · 계정
              (기존 .filter-row 재사용, ?category= 쿼리)

[section per category]
  [h2] 카테고리 라벨
  [details.faq-item#id] ×N
     [summary] 질문
     [p]       답
     [small]   관련: 링크 · 링크
```

- `?category=billing`으로 진입하면 그 섹션으로 스크롤하고 필터가 선택된다.
- `#svc-retry` 앵커로 진입하면 해당 `details`가 `open` 상태로 렌더된다(서버에서 `open` 속성 부여 — JS 없이 동작).
- 검색은 1차에서 넣지 않는다. 항목이 50개 미만이면 카테고리 필터로 충분하다.
  50개를 넘으면 클라이언트 필터(입력창)를 추가한다.

### 6.2 문맥 FAQ 블록 (`components/faq-block.tsx`, 서버 컴포넌트)

```tsx
<FaqBlock locale={locale} page="/orders/[id]" orderStage={stage} />
```

```
[section.faq-block]
  [h2] 자주 묻는 질문                       ← 서비스 상세 블록과 같은 h2 스타일
  [details.faq-item] ×3~5
     [summary] 질문
     [p]       답
  [a] 전체 FAQ 보기 →  /faq?category=<첫 항목의 카테고리>
```

- 서비스 상세 블록 규약을 따른다: 제목 아래는 목록(`details` 나열), 답 안에 목록 없음, 문단 하나.
- 항목이 0개면 블록을 렌더하지 않는다(빈 제목 금지).
- 각 페이지 본문의 마지막, `SiteFooter` 바로 위에 둔다.

### 6.3 모바일 메뉴 진입점 (`components/site-header.tsx`)

`.mobile-nav__menu` 안, `navItems` 목록 뒤·`HeaderAccount` 앞에 한 줄 추가한다.

```tsx
<Link href={localizedPath("/faq", locale)} className="mobile-nav__help">{m.header.faq}</Link>
```

- `m.header.faq = "자주 묻는 질문" / "FAQ"` 를 `lib/i18n.ts`에 추가한다.
- 데스크톱 `main-nav`에는 넣지 않는다(§2.3).
- 데스크톱: `legal-page.tsx`의 링크 열과 헤더 계정 버튼 옆에 `/faq` 텍스트 링크 추가. 공용 푸터는 없다.

### 6.4 스타일 (`app/globals.css`)

```css
.faq-item { border-top: 1px solid var(--line); padding: 14px 0; }
.faq-item:first-of-type { border-top: 0; }
.faq-item > summary { cursor: pointer; font-weight: 600; color: var(--ink); list-style: none; display: flex; justify-content: space-between; gap: 12px; }
.faq-item > summary::after { content: "+"; color: var(--muted); }
.faq-item[open] > summary::after { content: "−"; }
.faq-item > p { margin: 8px 0 0; color: var(--muted); line-height: 1.7; }
.faq-block { margin-top: 40px; }
.mobile-nav__help { border-top: 1px solid var(--line); padding-top: 12px; margin-top: 4px; }
```

- 아이콘 없이 `+`/`−` 텍스트. 색만으로 상태를 구분하지 않는다.
- `prefers-reduced-motion`과 무관 — 애니메이션이 없다.

---

## 7. 모바일 메뉴 시안

```
┌──────────────────────────────┐
│  ≡  Borderless          [KO] │
├──────────────────────────────┤
│  대시보드                     │
│  준비도 진단                  │
│  AI GTM 어시스턴트            │
│  GTM 여정                     │
│  AI 전문가 서비스             │
│ ──────────────────────────── │
│  자주 묻는 질문          ← 추가 │
│ ──────────────────────────── │
│  마이페이지                   │
│  로그아웃                     │
└──────────────────────────────┘
```

구분선 하나로 "이동 메뉴"와 "도움말"을 나눈다. 아이콘·배지 없음.

---

## 8. 문맥 FAQ 시안 — `/orders/[id]` 완료 상태

```
┌────────────────────────────────────────────┐
│ 자주 묻는 질문                              │
│                                            │
│ 보고서의 사실이 틀렸을 때는요?          +  │
│ ────────────────────────────────────────── │
│ 보고서를 파일로 받을 수 있나요?         −  │
│   HTML 파일로 내려받을 수 있습니다.        │
│   화면과 같은 내용이며 인쇄나 공유에       │
│   쓸 수 있습니다.                          │
│ ────────────────────────────────────────── │
│ 보고서 출처는 어떻게 검증하나요?        +  │
│ ────────────────────────────────────────── │
│ 보고서가 마음에 들지 않으면 환불되나요? +  │
│                                            │
│ 전체 FAQ 보기 →                            │
└────────────────────────────────────────────┘
```

---

## 9. 구현 순서 (코딩 단계 — 이 문서 범위 밖)

1. `lib/catalog/products.ts`의 `INTRO_PRICE`를 export → `lib/faq/{types,entries,index}.ts` + 테스트 — 콘텐츠와 상수 보간
2. `app/faq/page.tsx` + CSS
3. `components/faq-block.tsx`, 페이지 13곳에 삽입 (`/orders/[id]`는 상태 분기)
4. `site-header.tsx` 모바일 메뉴 + 푸터 링크 + `i18n.header.faq`
5. `/faq`가 sitemap·metadata를 갖도록 `generateMetadata`

각 단계는 독립 커밋 가능. 1이 끝나면 테스트가 콘텐츠 규칙을 지키고, 이후 콘텐츠
수정은 `entries.ts` 한 파일에서만 일어난다.

---

## 10. 열린 질문 (사용자 결정 필요)

1. **세금계산서** — 현재 코드에 발급 흐름이 없다. `bill-receipt` 답을 "준비 중"으로 낮출지,
   기능을 먼저 만들지.
2. **전문가 참여 문의 경로** — `acct-provider`가 가리킬 실제 링크(메일·폼)가 없다.
3. **`svc-model`** — 모델명을 명시할지("gpt-5.6-sol") 아니면 "프론티어 모델"로 둘지.
   Opus 5 전환 계획이 pending이라 우선 일반 표현으로 초안했다.
4. **검색** — 1차에서 뺐다. 항목 50개 시점에 재검토.
