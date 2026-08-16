-- 지정된 두 관리자만 결제 없이 AI 전문가 서비스를 실행할 수 있게 한다.
-- 설계: docs/plans/2026-08-17-관리자-AI-베타접근-통합계획.md
--
-- 실행 권한 상태는 기존 'paid'를 재사용하고, 결제 사실은 billing_mode와 0원 금액이 표현한다.
-- 이 마이그레이션만으로는 아무도 베타를 쓸 수 없다. ADMIN_AI_BETA_ACCESS_ENABLED가 켜져야 한다.

alter table public.orders
  add column if not exists billing_mode text not null default 'paid';

alter table public.orders drop constraint if exists orders_billing_mode_check;
alter table public.orders add constraint orders_billing_mode_check
  check (billing_mode in ('paid', 'admin_beta'));

-- 0원 주문을 막는 제약은 둘이다. 이름이 있는 것과 없는 것의 처리 방법이 다르다.
--   001:146  amount_krw > 0                  → 인라인 단일 컬럼 check라 orders_amount_krw_check로 자동 명명
--   011:7-8  orders_amount_tax_check         → 명시적 이름
-- 016의 pg_constraint 조회 패턴을 여기 쓰면 안 된다. orders에는 amount_krw를 포함하는 check가
-- 셋이라(001:146, 001:148, 001:156) limit 1이 엉뚱한 것을 고를 수 있고, 조용히 성공한다.
alter table public.orders drop constraint if exists orders_amount_krw_check;
alter table public.orders drop constraint if exists orders_amount_tax_check;

-- 의도한 제약이 실제로 사라졌는지 확인한다. 남아 있으면 019 전체를 롤백한다.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%amount_krw > 0%'
  ) then
    raise exception 'orders.amount_krw > 0 제약이 남아 있어 019를 중단합니다';
  end if;
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%supply_amount_krw > 0%'
  ) then
    raise exception 'orders supply_amount_krw > 0 제약이 남아 있어 019를 중단합니다';
  end if;
end $$;

-- 결제 모드별로 다시 건다. paid의 불변식은 그대로 유지된다.
alter table public.orders add constraint orders_amount_by_billing_mode_check check (
  (billing_mode = 'paid'
     and amount_krw > 0 and supply_amount_krw > 0 and vat_amount_krw >= 0
     and supply_amount_krw + vat_amount_krw = amount_krw)
  or
  (billing_mode = 'admin_beta'
     and amount_krw = 0 and supply_amount_krw = 0 and vat_amount_krw = 0
     and platform_fee_krw = 0 and provider_amount_krw = 0)
);

-- 001:156(platform_fee + provider_amount = amount)은 건드리지 않는다. 0+0=0으로 통과한다.

-- 베타가 사람 주문 형태를 갖지 못하게 한다. provider_id가 붙으면 webhook:102에서
-- 0원 정산이 만들어질 수 있다.
alter table public.orders drop constraint if exists orders_beta_is_ai_only_check;
alter table public.orders add constraint orders_beta_is_ai_only_check
  check (billing_mode = 'paid' or order_kind = 'ai_agent');

-- 중복 생성 제한. 주문 생성에는 idempotency key가 없고(route.ts가 매번 새 UUID),
-- 유료 경로에서는 가격이 사실상 유일한 제동 장치였다. 무료가 되면 그 제동이 사라진다.
-- 관리자 1인·상품 1개당 진행 중 베타 주문 하나로 묶는다.
-- 취소 경로(refund route의 admin_beta 분기)가 cancelled로 풀어 준다.
drop index if exists public.orders_admin_beta_open_run;
create unique index orders_admin_beta_open_run
  on public.orders (buyer_id, product_key)
  where billing_mode = 'admin_beta' and status in ('paid', 'service_started');

-- 주문과 실행 레코드를 한 트랜잭션에서 만든다.
--
-- 스냅샷은 여기서 만들지 않는다. route.ts가 유료 주문과 똑같이 만들어 jsonb로 넘긴다.
-- 계약 모양을 두 언어에 이중으로 두면 반드시 어긋나고, paidServiceSchema가 검증하는
-- 대상이 갈라진다.
--
-- 호출자 식별: 서비스 롤로 호출하므로 auth.uid()는 null이다. p_buyer_id를 받아 검증한다.
create or replace function public.create_admin_beta_ai_order(
  p_order_id uuid,
  p_buyer_id uuid,
  p_organization_id uuid,
  p_product_key text,
  p_locale text,
  p_service_snapshot jsonb,
  p_terms_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer public.profiles;
begin
  if p_locale not in ('ko', 'en') then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;

  -- 라우트에서 이미 판정했지만 여기서 다시 본다. 이 재검증은 라우트의 버그를 막는 장치다.
  select * into buyer from public.profiles where id = p_buyer_id;
  if buyer.id is null or buyer.deleted_at is not null or buyer.role <> 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  insert into public.orders (
    id, organization_id, buyer_id, provider_id, service_id,
    order_kind, billing_mode, product_key, payment_id, status,
    amount_krw, supply_amount_krw, vat_amount_krw, platform_fee_krw, provider_amount_krw,
    service_snapshot, terms_snapshot, terms_accepted_at
  ) values (
    p_order_id, p_organization_id, p_buyer_id, null, null,
    'ai_agent', 'admin_beta', p_product_key,
    -- gtm- 네임스페이스를 재사용하면 안 된다. webhook:57이 payment_id로 주문을 찾기 때문에,
    -- 누가 gtm-<베타주문id>로 소액 결제하면 금액 불일치로 그 주문이 disputed가 되어 벽돌이 된다.
    'beta-' || gen_random_uuid()::text,
    'paid',
    0, 0, 0, 0, 0,
    p_service_snapshot, p_terms_snapshot, now()
  );

  insert into public.ai_agent_runs (order_id, organization_id, buyer_id, product_key, status, locale)
  values (p_order_id, p_organization_id, p_buyer_id, p_product_key, 'intake', p_locale);
end;
$$;

-- PostgREST는 public 스키마 함수를 authenticated에 자동 노출한다. revoke하지 않으면
-- 로그인한 아무나 임의의 스냅샷과 product_key로 주문을 찍을 수 있다.
revoke all on function public.create_admin_beta_ai_order(uuid, uuid, uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_admin_beta_ai_order(uuid, uuid, uuid, text, text, jsonb, jsonb) to service_role;
