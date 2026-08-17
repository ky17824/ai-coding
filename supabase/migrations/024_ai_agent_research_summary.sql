-- 조사 완료 시점의 출처·발견 개수를 기록한다. 대기 화면이 "조사 중" 다음 단계에서도
-- 서버가 실제로 아는 사실 하나를 더 보여줄 수 있게 하기 위함이다 (진행 표시 원칙 1번).
-- 설계: docs/design/progress-indicator-honesty.md

alter table public.ai_agent_runs
  add column if not exists research_summary jsonb;

-- reserve도 다시 만든다: 023의 본문을 그대로 복사하고 요약 초기화 한 줄만 더한다.
-- 이유: 새 시도가 이전 시도의 research_summary를 그대로 물려받으면, 이번 시도의 조사가
-- 아직 끝나지 않았는데도 화면이 지난 시도의 "출처 N건"을 보여주게 된다 — 거짓 진행 표시다.
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
      research_summary = null,
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
