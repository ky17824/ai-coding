-- AI 전문가 서비스의 단계별 모델을 관리자가 고르게 한다.
-- 설계: docs/superpowers/specs/2026-08-17-ai-model-routing-design.md
--
-- 폴백은 없다. 설정은 버전으로 쌓이고 활성 1개만 있다. 실행은 예약 시점의 스냅샷을 쓴다.

-- 1. 설정 이력 -----------------------------------------------------------
create table if not exists public.ai_model_routing_configs (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique,
  status text not null check (status in ('active', 'superseded')),
  routes jsonb not null,
  reason text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

drop index if exists public.ai_model_routing_configs_one_active;
create unique index ai_model_routing_configs_one_active
  on public.ai_model_routing_configs ((true)) where status = 'active';

alter table public.ai_model_routing_configs enable row level security;
-- 읽기·쓰기 모두 서비스 롤(서버 액션)만. 정책을 만들지 않으면 authenticated는 아무것도 못 한다.

-- 2. 실행 레코드 ---------------------------------------------------------
alter table public.ai_agent_runs
  add column if not exists model_route_snapshot jsonb not null default '{}',
  add column if not exists model_attempts jsonb not null default '[]';

-- 3. 예약: 활성 설정을 스냅샷에 고정 -------------------------------------
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
  active_routes jsonb;
begin
  select routes into active_routes from public.ai_model_routing_configs where status = 'active';
  -- 활성 설정이 없으면 어떤 모델로 돌릴지 알 수 없다. 예약을 거절한다.
  if active_routes is null then return null; end if;

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
      scope_snapshot = case when generation_count = 0 then scope_snapshot || jsonb_build_object(
        'offering', intake->>'offering',
        'targetCountry', intake->>'targetCountry',
        'targetCustomer', intake->>'targetCustomer'
      ) else scope_snapshot end,
      generation_count = generation_count + case when is_stale_retry then 0 else 1 end,
      generation_attempt_id = gen_random_uuid(),
      lease_expires_at = now() + interval '15 minutes',
      started_at = coalesce(started_at, now()),
      error_message = null,
      generation_stage = null,
      model_route_snapshot = active_routes,
      model_attempts = '[]'::jsonb,
      updated_at = now()
  where order_id = p_order_id
  returning * into reserved;
  return reserved;
end;
$$;

-- 4. 완료·실패: 옛 시그니처를 지우고 새 인자로 다시 만든다 ------------------
-- create or replace에 인자를 추가하면 오버로드가 생기고 옛 함수가 남는다.
-- 라우트가 어느 쪽을 부르는지는 인자 개수로 정해지므로 조용히 옛 것을 계속 부를 수 있다.
drop function if exists public.complete_ai_agent_generation(uuid,uuid,jsonb,integer,integer,integer,integer,numeric,numeric,integer,integer,integer);
drop function if exists public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer);

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
  p_total_variable_cost_krw integer,
  p_model text,
  p_model_attempts jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_agent_runs
  set status = 'completed', report = p_report, model = p_model, model_attempts = p_model_attempts,
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
      error_message = null, lease_expires_at = null, completed_at = now(), updated_at = now()
  where order_id = p_order_id and status = 'generating' and generation_attempt_id = p_attempt_id;
  if not found then return false; end if;
  update public.orders set status = 'completed', completed_at = now()
  where id = p_order_id and status = 'service_started';
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
  p_total_variable_cost_krw integer,
  p_model_attempts jsonb
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
      model_attempts = p_model_attempts,
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
  -- 020과 같은 이유로 캐스트한다. case 식은 text로 결정되어 enum 컬럼에 대입할 수 없다.
  update public.orders
  set status = (case when (select report is not null from public.ai_agent_runs where order_id = p_order_id) then 'completed' else 'paid' end)::public.order_status
  where id = p_order_id and status = 'service_started';
  return true;
end;
$$;

-- 5. 설정 적용: 새 버전 + 이전 활성 종료 (한 트랜잭션) -------------------------
create or replace function public.apply_ai_model_routing(p_routes jsonb, p_reason text, p_actor uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
begin
  -- 라우트 모양·모델 검증은 서버 액션이 lib/ai-models/routing.ts로 이미 했다.
  -- 여기서는 최소한만 다시 본다: 세 단계 키가 있는가.
  if not (p_routes ? 'classification' and p_routes ? 'public_research' and p_routes ? 'final_report') then
    raise exception 'invalid_routes' using errcode = '22023';
  end if;
  update public.ai_model_routing_configs set status = 'superseded', superseded_at = now() where status = 'active';
  select coalesce(max(version), 0) + 1 into next_version from public.ai_model_routing_configs;
  insert into public.ai_model_routing_configs (version, status, routes, reason, created_by)
  values (next_version, 'active', p_routes, p_reason, p_actor);
  return next_version;
end;
$$;

-- 6. 시드 v1: 세 단계 sol. 코드 배포만으로 동작이 바뀌지 않는다. ---------------
insert into public.ai_model_routing_configs (version, status, routes, reason, created_by)
select 1, 'active',
  '{"classification":{"model":"openai:gpt-5.6-sol","effort":"medium"},"public_research":{"model":"openai:gpt-5.6-sol","effort":"medium"},"final_report":{"model":"openai:gpt-5.6-sol","effort":"medium"}}'::jsonb,
  'seed: keep the pre-022 behaviour', null
where not exists (select 1 from public.ai_model_routing_configs);

-- 7. 권한 ------------------------------------------------------------------
revoke all on function public.reserve_ai_agent_generation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_agent_generation(uuid) to service_role;
revoke all on function public.complete_ai_agent_generation(uuid,uuid,jsonb,integer,integer,integer,integer,numeric,numeric,integer,integer,integer,text,jsonb) from public, anon, authenticated;
grant execute on function public.complete_ai_agent_generation(uuid,uuid,jsonb,integer,integer,integer,integer,numeric,numeric,integer,integer,integer,text,jsonb) to service_role;
revoke all on function public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer,jsonb) from public, anon, authenticated;
grant execute on function public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer,jsonb) to service_role;
revoke all on function public.apply_ai_model_routing(jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.apply_ai_model_routing(jsonb, text, uuid) to service_role;
