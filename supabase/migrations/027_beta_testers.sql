-- 027: 베타 테스터 초대 (026은 codex/ai-expert-health-check의 health_events가 이미 원격에 적용되어 있어 건너뛴다)
--
-- 관리자가 이메일을 등록한 창업자가 결제 없이 심층 시장 조사(ai-market-intelligence)를
-- max_runs(기본 3)회 실행한다. 관리자 베타(019, admin_beta)와 별개 계층이며 billing_mode는
-- 'beta_tester'다. 자격은 라우트(lib/beta-testers.ts)와 이 RPC에서 이중으로 본다 —
-- 라우트의 버그가 무료 주문을 만들지 못하게 하고, 횟수 검사와 삽입을 한 트랜잭션에 두어
-- 동시 클릭으로 4회째가 생기는 것을 막는다.
-- 설계: docs/superpowers/specs/2026-08-19-beta-tester-invites-design.md

-- 1. 초대 목록 ----------------------------------------------------------------
create table if not exists public.beta_testers (
  email text primary key,                       -- lower(trim(email))로만 저장한다(앱 + 아래 check)
  max_runs int not null default 3 check (max_runs between 0 and 100),
  note text,
  invited_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint beta_testers_email_lower_check check (email = lower(btrim(email)))
);

alter table public.beta_testers enable row level security;
drop policy if exists "admins manage beta testers" on public.beta_testers;
create policy "admins manage beta testers" on public.beta_testers
  for all using (public.is_admin()) with check (public.is_admin());

-- 2. 주문 제약을 두 무료 모드로 넓힌다 -----------------------------------------
alter table public.orders drop constraint if exists orders_billing_mode_check;
alter table public.orders add constraint orders_billing_mode_check
  check (billing_mode in ('paid', 'admin_beta', 'beta_tester'));

alter table public.orders drop constraint if exists orders_amount_by_billing_mode_check;
alter table public.orders add constraint orders_amount_by_billing_mode_check check (
  (billing_mode = 'paid'
     and amount_krw > 0 and supply_amount_krw > 0 and vat_amount_krw >= 0
     and supply_amount_krw + vat_amount_krw = amount_krw)
  or
  (billing_mode in ('admin_beta', 'beta_tester')
     and amount_krw = 0 and supply_amount_krw = 0 and vat_amount_krw = 0
     and platform_fee_krw = 0 and provider_amount_krw = 0)
);

-- 무료 주문은 사람 주문 형태를 갖지 못한다(019와 같은 이유).
alter table public.orders drop constraint if exists orders_beta_is_ai_only_check;
alter table public.orders add constraint orders_beta_is_ai_only_check
  check (billing_mode = 'paid' or order_kind = 'ai_agent');

-- 진행 중 무료 주문은 사람·상품당 하나. 취소(refund route)가 슬롯을 푼다.
drop index if exists public.orders_admin_beta_open_run;
create unique index orders_admin_beta_open_run
  on public.orders (buyer_id, product_key)
  where billing_mode in ('admin_beta', 'beta_tester') and status in ('paid', 'service_started');

-- 3. 무료 주문 RPC (019의 create_admin_beta_ai_order를 일반화) ------------------
drop function if exists public.create_admin_beta_ai_order(uuid, uuid, uuid, text, text, jsonb, jsonb);

create or replace function public.create_free_ai_order(
  p_order_id uuid,
  p_buyer_id uuid,
  p_organization_id uuid,
  p_product_key text,
  p_locale text,
  p_service_snapshot jsonb,
  p_terms_snapshot jsonb,
  p_billing_mode text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer public.profiles;
  buyer_email text;
  tester public.beta_testers;
  used_runs int;
begin
  if p_locale not in ('ko', 'en') then
    raise exception 'invalid_locale' using errcode = '22023';
  end if;

  select * into buyer from public.profiles where id = p_buyer_id;
  if buyer.id is null or buyer.deleted_at is not null then
    raise exception 'buyer_required' using errcode = '42501';
  end if;

  if p_billing_mode = 'admin_beta' then
    -- 관리자 베타: 019 그대로.
    if buyer.role <> 'admin' then
      raise exception 'admin_required' using errcode = '42501';
    end if;
  elsif p_billing_mode = 'beta_tester' then
    -- 베타 테스터: 이메일 등록 + 상품 제한 + 횟수. 행 잠금으로 동시 주문을 직렬화한다.
    select lower(email) into buyer_email from auth.users where id = p_buyer_id;
    select * into tester from public.beta_testers
      where email = buyer_email and revoked_at is null
      for update;
    if tester.email is null then
      raise exception 'beta_tester_not_allowed' using errcode = '42501';
    end if;
    if p_product_key <> 'ai-market-intelligence' then
      raise exception 'beta_tester_not_allowed' using errcode = '42501';
    end if;
    select count(*) into used_runs from public.orders
      where buyer_id = p_buyer_id and billing_mode = 'beta_tester' and status <> 'cancelled';
    if used_runs >= tester.max_runs then
      raise exception 'beta_tester_quota_exhausted' using errcode = '42501';
    end if;
  else
    raise exception 'invalid_billing_mode' using errcode = '22023';
  end if;

  insert into public.orders (
    id, organization_id, buyer_id, provider_id, service_id,
    order_kind, billing_mode, product_key, payment_id, status,
    amount_krw, supply_amount_krw, vat_amount_krw, platform_fee_krw, provider_amount_krw,
    service_snapshot, terms_snapshot, terms_accepted_at
  ) values (
    p_order_id, p_organization_id, p_buyer_id, null, null,
    'ai_agent', p_billing_mode, p_product_key,
    -- gtm- 네임스페이스를 쓰면 webhook이 소액 결제로 이 주문을 disputed로 만들 수 있다(019 참고).
    'beta-' || gen_random_uuid()::text,
    'paid',
    0, 0, 0, 0, 0,
    p_service_snapshot, p_terms_snapshot, now()
  );

  insert into public.ai_agent_runs (order_id, organization_id, buyer_id, product_key, status, locale)
  values (p_order_id, p_organization_id, p_buyer_id, p_product_key, 'intake', p_locale);
end;
$$;

revoke all on function public.create_free_ai_order(uuid, uuid, uuid, text, text, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_free_ai_order(uuid, uuid, uuid, text, text, jsonb, jsonb, text) to service_role;
