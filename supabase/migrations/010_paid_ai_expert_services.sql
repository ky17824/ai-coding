alter table public.orders alter column provider_id drop not null;
alter table public.orders alter column service_id drop not null;
alter table public.orders add column if not exists order_kind text not null default 'human'
  check (order_kind in ('human', 'ai_agent'));
alter table public.orders add column if not exists product_key text;
alter table public.orders add column if not exists supply_amount_krw integer;
alter table public.orders add column if not exists vat_amount_krw integer;
alter table public.orders add column if not exists refund_requested_at timestamptz;

drop policy if exists "startup buyers create orders" on public.orders;
create policy "startup buyers create human orders" on public.orders
  for insert with check (
    buyer_id = auth.uid()
    and order_kind = 'human'
    and public.is_org_member(organization_id)
  );

create table public.ai_agent_runs (
  order_id uuid primary key references public.orders(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  product_key text not null,
  status text not null default 'intake'
    check (status in ('intake', 'clarifying', 'ready', 'generating', 'completed', 'failed')),
  locale text not null default 'ko' check (locale in ('ko', 'en')),
  intake jsonb not null default '{}'::jsonb,
  scope_snapshot jsonb not null default '{}'::jsonb,
  input_audit jsonb not null default '[]'::jsonb,
  reference_files jsonb not null default '[]'::jsonb,
  clarification_round smallint not null default 0 check (clarification_round between 0 and 2),
  pending_questions jsonb not null default '[]'::jsonb,
  clarification_answers jsonb not null default '[]'::jsonb,
  assumptions jsonb not null default '[]'::jsonb,
  report jsonb,
  generation_count smallint not null default 0 check (generation_count between 0 and 2),
  generation_attempt_id uuid,
  lease_expires_at timestamptz,
  model text not null default 'gpt-5.6-sol',
  input_tokens integer not null default 0 check (input_tokens >= 0),
  cached_input_tokens integer not null default 0 check (cached_input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  web_search_calls integer not null default 0 check (web_search_calls >= 0),
  estimated_model_cost_usd numeric(12,6) not null default 0 check (estimated_model_cost_usd >= 0),
  estimated_tool_cost_usd numeric(12,6) not null default 0 check (estimated_tool_cost_usd >= 0),
  estimated_payment_fee_krw integer not null default 0 check (estimated_payment_fee_krw >= 0),
  estimated_support_storage_krw integer not null default 0 check (estimated_support_storage_krw >= 0),
  estimated_total_variable_cost_krw integer not null default 0 check (estimated_total_variable_cost_krw >= 0),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ai_agent_runs_org_idx on public.ai_agent_runs(organization_id, created_at desc);

alter table public.ai_agent_runs enable row level security;
create policy "buyers read ai agent runs" on public.ai_agent_runs
  for select using (
    buyer_id = auth.uid()
    or public.is_org_member(organization_id)
    or public.is_admin()
  );

grant select on public.ai_agent_runs to authenticated;
revoke insert, update, delete on public.ai_agent_runs from authenticated;
grant all on public.ai_agent_runs to service_role;

create or replace function public.reconcile_ai_payment(
  p_order_id uuid,
  p_webhook_id text,
  p_payment_id text,
  p_event_type text,
  p_payment_status text,
  p_amount_krw integer,
  p_raw_event jsonb
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_order public.orders;
begin
  select * into locked_order from public.orders where id = p_order_id and order_kind = 'ai_agent' for update;
  if locked_order.id is null then return 'missing'; end if;

  insert into public.payment_events(order_id, webhook_id, payment_id, event_type, payment_status, amount_krw, raw_event)
  values (p_order_id, p_webhook_id, p_payment_id, p_event_type, p_payment_status, p_amount_krw, p_raw_event)
  on conflict (webhook_id) do nothing;
  if not found then return locked_order.status::text; end if;

  if locked_order.payment_id <> p_payment_id or locked_order.amount_krw <> p_amount_krw then
    update public.orders set status = 'disputed' where id = p_order_id;
    return 'disputed';
  end if;

  if p_payment_status = 'PAID' then
    update public.orders set status = 'paid' where id = p_order_id and status = 'pending';
    if not found then
      if locked_order.status in ('paid', 'service_started', 'completed') then return locked_order.status::text; end if;
      update public.orders set status = 'disputed' where id = p_order_id;
      return 'disputed';
    end if;
    insert into public.ai_agent_runs(order_id, organization_id, buyer_id, product_key, locale)
    values (locked_order.id, locked_order.organization_id, locked_order.buyer_id, locked_order.product_key, coalesce(locked_order.service_snapshot->>'locale', 'ko'))
    on conflict (order_id) do nothing;
    return 'paid';
  elsif p_payment_status = 'CANCELLED' then
    update public.orders set status = 'refunded' where id = p_order_id and status in ('pending', 'paid', 'disputed');
    if found then return 'refunded'; end if;
    if locked_order.status in ('service_started', 'completed') then
      update public.orders set refund_requested_at = coalesce(refund_requested_at, now()) where id = p_order_id;
      return 'refund_review';
    end if;
    if locked_order.status = 'refunded' then return 'refunded'; end if;
    update public.orders set status = 'disputed' where id = p_order_id;
    return 'disputed';
  elsif p_payment_status = 'PARTIAL_CANCELLED' then
    if locked_order.status in ('service_started', 'completed') then
      update public.orders set refund_requested_at = coalesce(refund_requested_at, now()) where id = p_order_id;
      return 'refund_review';
    end if;
    update public.orders set status = 'disputed', refund_requested_at = coalesce(refund_requested_at, now()) where id = p_order_id;
    return 'refund_review';
  end if;
  return locked_order.status::text;
end;
$$;

create or replace function public.reserve_ai_agent_generation(p_order_id uuid)
returns public.ai_agent_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_run public.ai_agent_runs;
  locked_order public.orders;
  reserved public.ai_agent_runs;
  is_stale_retry boolean;
begin
  select * into locked_order from public.orders where id = p_order_id and order_kind = 'ai_agent' for update;
  select * into locked_run from public.ai_agent_runs where order_id = p_order_id for update;
  if locked_order.id is null or locked_run.order_id is null then return null; end if;

  is_stale_retry := locked_run.status = 'generating' and locked_run.lease_expires_at < now();
  if not is_stale_retry and (locked_run.status not in ('ready', 'failed', 'completed') or locked_run.generation_count >= 2) then return null; end if;
  if is_stale_retry then
    if locked_order.status <> 'service_started' then return null; end if;
  elsif locked_order.status not in ('paid', 'completed') then
    return null;
  end if;

  update public.orders
  set status = 'service_started', service_started_at = coalesce(service_started_at, now())
  where id = p_order_id;
  update public.ai_agent_runs
  set status = 'generating',
      scope_snapshot = case when generation_count = 0 then jsonb_build_object(
        'offering', intake->>'offering',
        'targetCountry', intake->>'targetCountry',
        'targetCustomer', intake->>'targetCustomer'
      ) else scope_snapshot end,
      generation_count = generation_count + case when is_stale_retry then 0 else 1 end,
      generation_attempt_id = gen_random_uuid(),
      lease_expires_at = now() + interval '15 minutes',
      started_at = coalesce(started_at, now()),
      error_message = null,
      updated_at = now()
  where order_id = p_order_id
  returning * into reserved;
  return reserved;
end;
$$;

create or replace function public.append_ai_agent_reference_file(p_order_id uuid, p_buyer_id uuid, p_file jsonb)
returns public.ai_agent_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_run public.ai_agent_runs;
begin
  select * into locked_run from public.ai_agent_runs where order_id = p_order_id for update;
  if locked_run.order_id is null or locked_run.buyer_id <> p_buyer_id or locked_run.status = 'generating' then return null; end if;
  if exists (select 1 from jsonb_array_elements(locked_run.reference_files) item where item->>'storagePath' = p_file->>'storagePath') then return locked_run; end if;
  if jsonb_array_length(locked_run.reference_files) >= 3 then return null; end if;
  update public.ai_agent_runs
  set reference_files = reference_files || jsonb_build_array(p_file), updated_at = now()
  where order_id = p_order_id
  returning * into locked_run;
  return locked_run;
end;
$$;

create or replace function public.complete_ai_agent_generation(
  p_order_id uuid,
  p_attempt_id uuid,
  p_report jsonb,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_output_tokens integer,
  p_web_search_calls integer,
  p_model_cost_usd numeric,
  p_tool_cost_usd numeric,
  p_payment_fee_krw integer,
  p_support_storage_krw integer,
  p_total_variable_cost_krw integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_agent_runs
  set status = 'completed', report = p_report,
      input_tokens = input_tokens + p_input_tokens,
      cached_input_tokens = cached_input_tokens + p_cached_input_tokens,
      output_tokens = output_tokens + p_output_tokens,
      web_search_calls = web_search_calls + p_web_search_calls,
      estimated_model_cost_usd = estimated_model_cost_usd + p_model_cost_usd,
      estimated_tool_cost_usd = estimated_tool_cost_usd + p_tool_cost_usd,
      estimated_payment_fee_krw = greatest(estimated_payment_fee_krw, p_payment_fee_krw),
      estimated_support_storage_krw = estimated_support_storage_krw + p_support_storage_krw,
      estimated_total_variable_cost_krw = estimated_total_variable_cost_krw
        + greatest(0, p_total_variable_cost_krw - p_payment_fee_krw)
        + greatest(0, p_payment_fee_krw - estimated_payment_fee_krw),
      lease_expires_at = null, completed_at = now(), updated_at = now()
  where order_id = p_order_id and status = 'generating' and generation_attempt_id = p_attempt_id;
  if not found then return false; end if;
  update public.orders set status = 'completed', completed_at = now()
  where id = p_order_id and status = 'service_started';
  if not found then raise exception 'order transition rejected'; end if;
  return true;
end;
$$;

create or replace function public.fail_ai_agent_generation(
  p_order_id uuid,
  p_attempt_id uuid,
  p_error_message text,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_output_tokens integer,
  p_web_search_calls integer,
  p_model_cost_usd numeric,
  p_tool_cost_usd numeric,
  p_payment_fee_krw integer,
  p_support_storage_krw integer,
  p_total_variable_cost_krw integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_agent_runs
  set status = case when report is null then 'failed' else 'completed' end,
      error_message = left(p_error_message, 1000),
      input_tokens = input_tokens + p_input_tokens,
      cached_input_tokens = cached_input_tokens + p_cached_input_tokens,
      output_tokens = output_tokens + p_output_tokens,
      web_search_calls = web_search_calls + p_web_search_calls,
      estimated_model_cost_usd = estimated_model_cost_usd + p_model_cost_usd,
      estimated_tool_cost_usd = estimated_tool_cost_usd + p_tool_cost_usd,
      estimated_payment_fee_krw = greatest(estimated_payment_fee_krw, p_payment_fee_krw),
      estimated_support_storage_krw = estimated_support_storage_krw + p_support_storage_krw,
      estimated_total_variable_cost_krw = estimated_total_variable_cost_krw
        + greatest(0, p_total_variable_cost_krw - p_payment_fee_krw)
        + greatest(0, p_payment_fee_krw - estimated_payment_fee_krw),
      lease_expires_at = null, updated_at = now()
  where order_id = p_order_id and status = 'generating' and generation_attempt_id = p_attempt_id;
  if not found then return false; end if;
  update public.orders
  set status = case when (select report is not null from public.ai_agent_runs where order_id = p_order_id) then 'completed' else 'paid' end
  where id = p_order_id and status = 'service_started';
  return true;
end;
$$;

revoke all on function public.reconcile_ai_payment(uuid,text,text,text,text,integer,jsonb) from public, anon, authenticated;
revoke all on function public.reserve_ai_agent_generation(uuid) from public, anon, authenticated;
revoke all on function public.append_ai_agent_reference_file(uuid,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.complete_ai_agent_generation(uuid,uuid,jsonb,integer,integer,integer,integer,numeric,numeric,integer,integer,integer) from public, anon, authenticated;
revoke all on function public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.reconcile_ai_payment(uuid,text,text,text,text,integer,jsonb) to service_role;
grant execute on function public.reserve_ai_agent_generation(uuid) to service_role;
grant execute on function public.append_ai_agent_reference_file(uuid,uuid,jsonb) to service_role;
grant execute on function public.complete_ai_agent_generation(uuid,uuid,jsonb,integer,integer,integer,integer,numeric,numeric,integer,integer,integer) to service_role;
grant execute on function public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer) to service_role;
