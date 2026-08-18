-- 025: 상품별 AI 모델 라우팅
--
-- 공통 기본값(routes)은 그대로 두고, 상품별로 덮어쓸 단계만 product_overrides에 둔다.
--   product_overrides = { "<productId>": { "<stage>": {"model": "...", "effort": "..."} } }
-- 예약 시점에 routes || overrides->product 로 얕게 병합해 스냅샷에 넣으므로, 실행·어댑터·화면이
-- 읽는 model_route_snapshot 모양은 022 그대로다. 어느 버전이 이 실행을 만들었는지는
-- ai_agent_runs.model_route_version에 남긴다(상품별 × 버전별 측정용).
--
-- 패키지의 조사·보고서 'high' 승격은 지금까지 코드(route.ts)에 박혀 있었다. 여기서 활성 행의
-- 오버라이드로 옮겨 시드하고, 같은 배포에서 코드 승격을 지운다 → 첫 배포는 동작이 바뀌지 않는다.

-- 1. 컬럼 ------------------------------------------------------------------
alter table public.ai_model_routing_configs
  add column if not exists product_overrides jsonb not null default '{}'::jsonb;

alter table public.ai_agent_runs
  add column if not exists model_route_version integer;

-- 2. 예약: 유효 라우팅(기본값 || 상품 오버라이드)을 스냅샷에 고정 ------------------
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
  active_overrides jsonb;
  active_version integer;
  effective jsonb;
begin
  select routes, product_overrides, version into active_routes, active_overrides, active_version
  from public.ai_model_routing_configs where status = 'active';
  -- 활성 설정이 없으면 어떤 모델로 돌릴지 알 수 없다. 예약을 거절한다.
  if active_routes is null then return null; end if;

  select * into locked_order from public.orders where id = p_order_id and order_kind = 'ai_agent' for update;
  select * into locked_run from public.ai_agent_runs where order_id = p_order_id for update;
  if locked_order.id is null or locked_run.order_id is null then return null; end if;

  -- jsonb || 는 최상위 키(단계) 단위로 교체한다 — 오버라이드는 단계별 완전한 route만 저장한다.
  effective := active_routes || coalesce(active_overrides -> locked_order.product_key, '{}'::jsonb);

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
      generation_stage_log = '[]'::jsonb,
      research_summary = null,
      model_route_snapshot = effective,
      model_route_version = active_version,
      model_attempts = '[]'::jsonb,
      updated_at = now()
  where order_id = p_order_id
  returning * into reserved;
  return reserved;
end;
$$;

-- 3. 적용: 옛 3인자 시그니처를 지우고 4인자로 다시 만든다 ------------------------
-- (022의 교훈: create or replace에 인자를 더하면 오버로드가 남아 조용히 옛 것이 불린다.)
drop function if exists public.apply_ai_model_routing(jsonb, text, uuid);

create or replace function public.apply_ai_model_routing(p_routes jsonb, p_product_overrides jsonb, p_reason text, p_actor uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version integer;
begin
  -- 라우트·오버라이드 모양과 모델 검증은 서버 액션이 lib/ai-models/routing.ts로 이미 했다.
  -- 여기서는 최소한만 다시 본다: 세 단계 키가 있는가, 오버라이드가 객체인가.
  if not (p_routes ? 'classification' and p_routes ? 'public_research' and p_routes ? 'final_report') then
    raise exception 'invalid_routes' using errcode = '22023';
  end if;
  if p_product_overrides is null or jsonb_typeof(p_product_overrides) <> 'object' then
    raise exception 'invalid_product_overrides' using errcode = '22023';
  end if;
  update public.ai_model_routing_configs set status = 'superseded', superseded_at = now() where status = 'active';
  select coalesce(max(version), 0) + 1 into next_version from public.ai_model_routing_configs;
  insert into public.ai_model_routing_configs (version, status, routes, product_overrides, reason, created_by)
  values (next_version, 'active', p_routes, p_product_overrides, p_reason, p_actor);
  return next_version;
end;
$$;

-- 4. 시드: 패키지 2종의 조사·보고서 'high'를 활성 행의 오버라이드로 옮긴다 -----------
-- 모델은 현재 기본값 그대로, 노력만 high — 지금 코드의 승격과 정확히 같은 결과.
update public.ai_model_routing_configs
set product_overrides = product_overrides || jsonb_build_object(
  'pkg-feasibility', jsonb_build_object(
    'public_research', (routes -> 'public_research') || '{"effort":"high"}'::jsonb,
    'final_report', (routes -> 'final_report') || '{"effort":"high"}'::jsonb
  ),
  'pkg-entry-design', jsonb_build_object(
    'public_research', (routes -> 'public_research') || '{"effort":"high"}'::jsonb,
    'final_report', (routes -> 'final_report') || '{"effort":"high"}'::jsonb
  )
)
where status = 'active'
  and not (product_overrides ? 'pkg-feasibility')
  and not (product_overrides ? 'pkg-entry-design');

-- 5. 권한 ------------------------------------------------------------------
revoke all on function public.reserve_ai_agent_generation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_agent_generation(uuid) to service_role;
revoke all on function public.apply_ai_model_routing(jsonb, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.apply_ai_model_routing(jsonb, jsonb, text, uuid) to service_role;
