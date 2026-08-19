# 베타 테스터 초대 — 설계

작성 2026-08-19 · 승인됨(채팅) · 목표: 창업자 10명이 결제 없이 **심층 시장 조사(ai-market-intelligence)** 를 **1인 3회** 실행하고, 관리자가 이메일로 초대·해제한다.

## 결정
- 초대 = 관리자가 `/admin/beta-testers`에서 이메일 등록. 초대 메일 발송 자동화 없음(관리자가 직접 안내). 테스터는 그 이메일로 평소처럼 가입/로그인.
- 자격 판정은 서버·DB에서만. 클라이언트 값은 무료 여부를 결정하지 못한다(fail closed).
- 관리자 베타(`admin_beta`, 관리자 2명·전 상품·무제한)와 **별개 계층**. 테스터는 `beta_tester` billing_mode.

## 데이터
```sql
create table public.beta_testers (
  email text primary key,            -- lower(trim(email))로 저장
  max_runs int not null default 3 check (max_runs between 0 and 100),
  note text,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
```
- `orders.billing_mode`에 `'beta_tester'` 허용(019의 `orders_beta_is_ai_only_check`를 `billing_mode in ('admin_beta','beta_tester')` → order_kind='ai_agent' and amount 0 으로 확장).
- 사용 횟수 = `count(orders where buyer_id=user and billing_mode='beta_tester' and status<>'cancelled')`.

## RPC
`create_free_ai_order(p_order_id, p_buyer_id, p_organization_id, p_product_key, p_locale, p_service_snapshot, p_terms_snapshot, p_billing_mode)`:
- `admin_beta`: 기존 admin 재검증 그대로.
- `beta_tester`: `auth.users.email`(lower) ∈ beta_testers(revoked_at null) **and** p_product_key='ai-market-intelligence' **and** 사용 횟수 < max_runs — 같은 트랜잭션에서 검사 후 삽입(동시 클릭으로 4회째 생성 불가). 위반 시 `beta_tester_not_allowed` / `beta_tester_quota_exhausted`.
- 기존 `create_admin_beta_ai_order`는 drop. service_role만 execute.

## 서버 코드
- `lib/beta-testers.ts`: `BETA_TESTER_PRODUCT_ID`, `resolveBetaTesterAccess({registered, revoked, maxRuns, usedRuns, productId})` 순수 함수 → `{eligible, remaining}`; `checkBetaTesterAccess(admin, user)`가 DB 조회 후 순수 함수 호출; `isFreeBilling(mode)`.
- `POST /api/orders`: 관리자 베타 → 테스터 → 유료 순. 테스터 주문은 RPC(`beta_tester`). 미출시 상품 403 유지.
- `admin_beta` 문자열 비교 5곳(orders route, refund route, webhook, admin-metrics, orders/[id] page)을 `isFreeBilling`로 통일.

## 화면
- 상세 `purchase-panel`: 테스터 자격이면 0원 패널(관리자 베타 UI 재사용) + "베타 테스터 · 무료 N/3회 남음". 소진 시 유료 패널.
- 주문 상세 라벨 "관리자 베타 테스트" → 무료 주문 공통 "베타 테스트".
- `/admin/beta-testers`: 등록 폼(여러 줄, 줄마다 이메일), 목록(이메일·메모·등록일·가입 여부·사용/최대·해제/복구). nav 링크 추가.

## 테스트
- 순수 자격 함수(미등록·취소·타 상품·소진·정상), 마이그레이션 SQL 문자열(제약·RPC 검사 순서), orders route 소스(테스터 분기·RPC 이름), admin 페이지 렌더(등록 폼·목록).

## 범위 밖
초대 메일 자동 발송, 테스터별 상품 확대, 셀프 서비스 초대 코드.
