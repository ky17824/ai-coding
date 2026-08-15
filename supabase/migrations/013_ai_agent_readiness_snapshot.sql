create or replace function public.bind_ai_agent_readiness_snapshot(p_order_id uuid, p_readiness_snapshot jsonb)
returns public.ai_agent_runs
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_order public.orders;
  locked_run public.ai_agent_runs;
  bound_run public.ai_agent_runs;
begin
  select * into locked_order from public.orders where id = p_order_id and order_kind = 'ai_agent' for update;
  select * into locked_run from public.ai_agent_runs where order_id = p_order_id for update;
  if locked_order.id is null or locked_run.order_id is null or jsonb_typeof(p_readiness_snapshot) <> 'object' then return null; end if;
  if p_readiness_snapshot->>'assessmentId' is not null and not exists (
    select 1 from public.assessments
    where id = (p_readiness_snapshot->>'assessmentId')::uuid
      and organization_id = locked_order.organization_id
  ) then return null; end if;

  update public.ai_agent_runs
  set scope_snapshot = scope_snapshot || jsonb_build_object('readiness', p_readiness_snapshot), updated_at = now()
  where order_id = p_order_id
    and not (scope_snapshot ? 'readiness')
  returning * into bound_run;

  if bound_run.order_id is null then
    select * into bound_run from public.ai_agent_runs where order_id = p_order_id;
  end if;
  return bound_run;
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
  -- Keep the reservation callable by old application instances during the
  -- DB-first rollout. New instances bind and validate readiness before calling.
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
      updated_at = now()
  where order_id = p_order_id
  returning * into reserved;
  return reserved;
end;
$$;

revoke all on function public.bind_ai_agent_readiness_snapshot(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.bind_ai_agent_readiness_snapshot(uuid, jsonb) to service_role;
