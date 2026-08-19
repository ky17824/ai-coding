-- 028: 베타 테스터 무료 횟수 리셋
--
-- 사용 횟수는 주문에서 세므로 "리셋"은 기준 시각을 옮기는 것이다. quota_started_at 이후의
-- beta_tester 주문만 센다. 리셋 = quota_started_at = now(). 과거 주문 기록은 그대로 남는다.
-- 027 RPC의 count 조건에 같은 기준을 넣는다(라우트·화면 집계와 셋이 같은 규칙).

alter table public.beta_testers
  add column if not exists quota_started_at timestamptz not null default now();

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
    if buyer.role <> 'admin' then
      raise exception 'admin_required' using errcode = '42501';
    end if;
  elsif p_billing_mode = 'beta_tester' then
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
      where buyer_id = p_buyer_id and billing_mode = 'beta_tester' and status <> 'cancelled'
        and created_at >= tester.quota_started_at;
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
