# 베타 테스터 초대 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 이메일을 등록한 창업자가 결제 없이 심층 시장 조사(ai-market-intelligence)를 3회 실행할 수 있게 한다.

**Architecture:** 기존 관리자 베타(0원 주문 `billing_mode=admin_beta`, RPC 트랜잭션, 결제창 우회)를 일반화한다. `beta_testers` 테이블이 자격의 단일 출처이고, 자격 판정은 서버(`lib/beta-testers.ts`)와 DB RPC(`create_free_ai_order`)에서 이중으로 한다. 화면은 관리자 베타 UI(0원 패널·CheckoutButton betaMode)를 재사용한다.

**Tech Stack:** Next.js 15 App Router(서버 컴포넌트·서버 액션), Supabase(Postgres RPC, service_role), zod, vitest(node env, renderToStaticMarkup).

**Spec:** docs/superpowers/specs/2026-08-19-beta-tester-invites-design.md

## Global Constraints
- 무료 여부는 클라이언트 값으로 결정하지 않는다(fail closed). RPC는 service_role만 실행.
- 상품 제한: `ai-market-intelligence`만. 횟수: `beta_testers.max_runs` 기본 3, 사용 횟수 = `billing_mode='beta_tester' and status<>'cancelled'` 주문 수.
- 사용자 노출 한글은 합쇼체·표준 띄어쓰기(DESIGN.md).
- 컴포넌트 테스트는 `renderToStaticMarkup`(jsdom 없음).

---

### Task 1: 마이그레이션 027 — beta_testers 테이블, billing_mode 확장, create_free_ai_order RPC
**Files:** Create `supabase/migrations/027_beta_testers.sql`, Test `supabase/migrations/027_beta_testers.test.ts`
**Produces:** table `public.beta_testers`, RPC `create_free_ai_order(p_order_id uuid, p_buyer_id uuid, p_organization_id uuid, p_product_key text, p_locale text, p_service_snapshot jsonb, p_terms_snapshot jsonb, p_billing_mode text)`; billing_mode 값 `beta_tester`.
- [ ] 테스트: SQL 문자열에 `create table if not exists public.beta_testers`, `billing_mode in ('paid', 'admin_beta', 'beta_tester')`, `create_free_ai_order`, `beta_tester_quota_exhausted`, `drop function if exists public.create_admin_beta_ai_order`, `for update`(경쟁 조건 잠금)가 있고, RPC 안에서 `beta_testers` 조회가 `insert into public.orders`보다 앞에 온다.
- [ ] SQL: 테이블(email pk lower, max_runs default 3 check 0..100, note, invited_by, created_at, revoked_at) + admin만 select/insert/update RLS(`public.is_admin()` 001:261 사용); `orders_billing_mode_check`·`orders_amount_by_billing_mode_check`·`orders_admin_beta_open_run` 인덱스를 두 값 모두 포함하도록 재생성; RPC: `p_billing_mode='admin_beta'`면 019와 같은 admin 검증, `'beta_tester'`면 `select email from auth.users where id=p_buyer_id` → `beta_testers` 행 `for update`(revoked_at null) 없으면 `beta_tester_not_allowed`, `p_product_key<>'ai-market-intelligence'`면 `beta_tester_not_allowed`, `count(orders where buyer_id and billing_mode='beta_tester' and status<>'cancelled') >= max_runs`면 `beta_tester_quota_exhausted`; insert orders(billing_mode=p_billing_mode, payment_id 'beta-'||uuid) + ai_agent_runs. revoke public/anon/authenticated, grant service_role. 옛 함수 drop.
- [ ] `npx vitest run supabase/migrations/026` PASS. Commit.

### Task 2: lib/beta-testers.ts — 순수 자격 판정 + 서버 조회 + isFreeBilling
**Files:** Create `lib/beta-testers.ts`, `lib/beta-testers.test.ts`
**Produces:** `BETA_TESTER_PRODUCT_ID`, `isFreeBilling(mode)`, `resolveBetaTesterAccess({registered, revoked, maxRuns, usedRuns, productId}) → {eligible:true, remaining} | {eligible:false, denial}`, `checkBetaTesterAccess(admin, {userId, email, productId}) → Promise<same>`, `normalizeBetaEmail(raw)`.
- [ ] 테스트: 미등록→`not_registered`; revoked→`revoked`; 타 상품→`not_beta_product`; used 3/3→`quota_exhausted`; used 1/3 정상→`{eligible:true, remaining:2}`; `isFreeBilling("admin_beta"|"beta_tester")=true, "paid"=false`; `normalizeBetaEmail(" Foo@Bar.com ")="foo@bar.com"`.
- [ ] 구현. `checkBetaTesterAccess`는 `beta_testers` 1행 + `orders` count(head:true) 두 쿼리.
- [ ] PASS. Commit.

### Task 3: 주문 API — 테스터 분기 + isFreeBilling 통일
**Files:** Modify `app/api/orders/route.ts`, `app/api/orders/[id]/refund/route.ts:27`, `app/api/portone/webhook/route.ts:62`, `lib/admin-metrics.ts:53`, `app/orders/[id]/page.tsx:83`; Test `app/api/orders/route.test.ts`
- [ ] 테스트(소스 검사): route.ts에 `checkBetaTesterAccess(`, `create_free_ai_order`, `p_billing_mode`, 그리고 `create_admin_beta_ai_order` 없음; refund/webhook/metrics/order page가 `isFreeBilling(`.
- [ ] route.ts: 프로필 조회 뒤 `const testerAccess = aiCatalogService && profile?.role==="startup" ? await checkBetaTesterAccess(admin,{userId:user.id,email:user.email??"",productId:aiCatalogService.id}) : {eligible:false}`; `const freeMode = betaAccess.eligible ? "admin_beta" : testerAccess.eligible ? "beta_tester" : null`; `isBeta` 자리를 `freeMode !== null`로, RPC 호출을 `create_free_ai_order` + `p_billing_mode: freeMode`로; RPC 에러 메시지에 `beta_tester_quota_exhausted` → 409 "무료 이용 횟수를 모두 사용했습니다." 처리; comingSoon 403은 `freeMode !== "admin_beta"`일 때(테스터도 미출시 상품은 403 — 어차피 상품 제한으로 자격 없음). 로그 태그 `[free-order]`.
- [ ] 나머지 4곳 `=== "admin_beta"` → `isFreeBilling(...)`. 주문 페이지 라벨 "관리자 베타 테스트"→"베타 테스트".
- [ ] PASS + `npx tsc --noEmit`. Commit.

### Task 4: 상세 페이지 — 테스터 0원 패널
**Files:** Modify `app/services/[id]/page.tsx`; Test `app/api/orders/route.test.ts`("service detail beta affordance" describe)
- [ ] 테스트: detail 소스에 `checkBetaTesterAccess(`, `무료 이용` 문구, `betaMode={isFree}`.
- [ ] 구현: `isBeta`(관리자) 계산 뒤 `tester = !isBeta && user && isAi ? await checkBetaTesterAccess(admin, {...}) : null`; `isFree = isBeta || tester?.eligible`; 배너: 관리자면 기존 문구, 테스터면 "베타 테스터 — 결제 없이 이용합니다. 무료 이용 {remaining}/{max}회 남음"; 0원 표시·CheckoutButton `betaMode={isFree}`; comingSoon 분기는 `!isFree`.
- [ ] PASS. Commit.

### Task 5: 관리자 화면 /admin/beta-testers + 서버 액션 + nav
**Files:** Create `app/admin/beta-testers/page.tsx`, `components/beta-tester-form.tsx`("use client", useActionState), Modify `app/admin/actions.ts`(`addBetaTesters`, `setBetaTesterRevoked`), `components/admin-nav.tsx`; Test `app/admin/beta-testers/page.test.ts`(소스 검사) 
- [ ] 테스트: nav에 `/admin/beta-testers`; page가 `profile?.role !== "admin"` 리다이렉트, `beta_testers` 조회, "베타 테스터" 제목; actions에 `addBetaTesters`·`setBetaTesterRevoked`가 admin 검증(`actor?.role !== "admin"`) 후 `beta_testers` upsert/update, `revalidatePath("/admin/beta-testers")`.
- [ ] page: 등록 폼(textarea, 줄마다 이메일, note 선택) + 표(이메일·메모·등록일·가입 여부(profiles.email 매칭)·사용/최대(orders count group by buyer)·해제/복구 버튼). 액션은 서버 액션 form.
- [ ] PASS. Commit.

### Task 6: 검증·배포
- [ ] `npm test`, `npx tsc --noEmit`, `npm run build`. 로컬 dev로 `/admin/beta-testers` 렌더 확인(로그인 불가 시 정적 렌더 테스트로 대체).
- [ ] Supabase 마이그레이션 적용(`supabase db push` 또는 대시보드 SQL — 프로젝트 관례 확인). push → Vercel alias→deployment→commit 확인.
