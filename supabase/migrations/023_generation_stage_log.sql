-- 단계 전환 로그: 300초에 죽은 실행도 구간별 시간을 남긴다.
-- 설계: docs/plans/2026-08-17-luna-단계예산-판별실험.md 1단계
--
-- model_attempts는 complete_/fail_ai_agent_generation에서만 기록된다. Vercel이 함수를 죽이면
-- 둘 다 실행되지 않아 실패한 실행은 attempts: []로 남는다. set_ai_agent_generation_stage는
-- 이미 각 단계 진입 직전에 호출되므로(route.ts:367,394,398,412,417), 같은 UPDATE 안에서
-- 로그 행을 붙이면 죽은 실행도 마지막으로 도달한 단계까지의 타임스탬프를 남긴다.

alter table public.ai_agent_runs
  add column if not exists generation_stage_log jsonb not null default '[]'::jsonb;

-- 021의 함수를 같은 UPDATE 안에서 로그도 append하도록 교체한다. 가드는 그대로 유지 —
-- 낡은 시도가 새 시도의 로그를 오염시키는 것을 막는다.
create or replace function public.set_ai_agent_generation_stage(
  p_order_id uuid,
  p_attempt_id uuid,
  p_stage text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ai_agent_runs
  set generation_stage = p_stage,
      generation_stage_log = generation_stage_log
        || jsonb_build_object('stage', p_stage, 'at', now(), 'attempt', p_attempt_id),
      updated_at = now()
  where order_id = p_order_id
    and status = 'generating'
    and generation_attempt_id = p_attempt_id;
end;
$$;

revoke all on function public.set_ai_agent_generation_stage(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_ai_agent_generation_stage(uuid, uuid, text) to service_role;

-- reserve도 다시 만든다: 022의 본문을 그대로 복사하고 로그 초기화 한 줄만 더한다.
-- 이유: loadOrder의 GET(생성 중 5초 폴링, route.ts:92,115)이 ai_agent_runs.select("*")로
-- 행 전체를 반환한다. stale-retry는 시도 횟수 상한을 우회하므로(022:53,70), 초기화하지
-- 않으면 로그가 시도당 ~5행씩 무한히 자라 폴링 페이로드에 실린다. attempt 필드는 그래도
-- 남긴다 — 낡은 시도의 늦은 쓰기를 식별하는 데 쓴다.
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
      generation_stage_log = '[]'::jsonb,
      model_route_snapshot = active_routes,
      model_attempts = '[]'::jsonb,
      updated_at = now()
  where order_id = p_order_id
  returning * into reserved;
  return reserved;
end;
$$;

revoke all on function public.reserve_ai_agent_generation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_ai_agent_generation(uuid) to service_role;
