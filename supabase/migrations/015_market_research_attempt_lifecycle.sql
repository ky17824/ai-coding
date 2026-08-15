alter table public.gtm_plans
  add column if not exists market_research_active_attempt_id uuid,
  add column if not exists market_research_active_started_at timestamptz,
  add column if not exists market_research_failure_count smallint not null default 0
    check (market_research_failure_count between 0 and 3),
  add column if not exists market_research_failure_window_started_at timestamptz;

create or replace function public.reserve_market_research_attempt(
  p_plan_id uuid,
  p_user_id uuid,
  p_attempt_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_plan public.gtm_plans;
  failures smallint;
  failure_window timestamptz;
  stale_attempt boolean;
begin
  select * into locked_plan from public.gtm_plans where id = p_plan_id for update;
  if locked_plan.id is null or locked_plan.created_by <> p_user_id or locked_plan.status not in ('draft', 'active') then return 'not_found'; end if;
  if locked_plan.market_research_count >= 3 then return 'limit'; end if;

  stale_attempt := locked_plan.market_research_active_attempt_id is not null
    and locked_plan.market_research_active_started_at < now() - interval '6 minutes';
  if locked_plan.market_research_active_attempt_id is not null and not stale_attempt then return 'in_progress'; end if;

  if locked_plan.market_research_failure_window_started_at is null
    or locked_plan.market_research_failure_window_started_at < now() - interval '24 hours' then
    failures := 0;
    failure_window := null;
  else
    failures := locked_plan.market_research_failure_count;
    failure_window := locked_plan.market_research_failure_window_started_at;
  end if;
  if stale_attempt then
    failures := least(3, failures + 1);
    failure_window := coalesce(failure_window, now());
  end if;
  if failures >= 3 then
    update public.gtm_plans
    set market_research_active_attempt_id = null,
        market_research_active_started_at = null,
        market_research_failure_count = failures,
        market_research_failure_window_started_at = failure_window,
        updated_at = now()
    where id = p_plan_id;
    return 'failure_limit';
  end if;

  update public.gtm_plans
  set market_research_active_attempt_id = p_attempt_id,
      market_research_active_started_at = now(),
      market_research_failure_count = failures,
      market_research_failure_window_started_at = failure_window,
      updated_at = now()
  where id = p_plan_id;
  return 'reserved';
end;
$$;

create or replace function public.complete_market_research_attempt(
  p_plan_id uuid,
  p_user_id uuid,
  p_attempt_id uuid,
  p_founder_context jsonb,
  p_market_research jsonb,
  p_locale text,
  p_preserve_existing boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_locale not in ('ko', 'en') then return false; end if;
  update public.gtm_plans
  set market_research_count = market_research_count + 1,
      market_research_active_attempt_id = null,
      market_research_active_started_at = null,
      market_research_failure_count = 0,
      market_research_failure_window_started_at = null,
      founder_context = case when p_preserve_existing then founder_context else p_founder_context end,
      founder_context_locale = case when p_preserve_existing then founder_context_locale else p_locale end,
      market_research = case when p_preserve_existing then market_research else p_market_research end,
      market_research_locale = case when p_preserve_existing then market_research_locale else p_locale end,
      market_research_confirmed_at = case when p_preserve_existing then market_research_confirmed_at else null end,
      updated_at = now()
  where id = p_plan_id
    and created_by = p_user_id
    and status in ('draft', 'active')
    and market_research_count < 3
    and market_research_active_attempt_id = p_attempt_id;
  return found;
end;
$$;

create or replace function public.fail_market_research_attempt(
  p_plan_id uuid,
  p_user_id uuid,
  p_attempt_id uuid,
  p_error_code text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.gtm_plans
  set market_research_active_attempt_id = null,
      market_research_active_started_at = null,
      market_research_failure_count = case
        when market_research_failure_window_started_at is null
          or market_research_failure_window_started_at < now() - interval '24 hours' then 1
        else least(3, market_research_failure_count + 1)
      end,
      market_research_failure_window_started_at = case
        when market_research_failure_window_started_at is null
          or market_research_failure_window_started_at < now() - interval '24 hours' then now()
        else market_research_failure_window_started_at
      end,
      updated_at = now()
  where id = p_plan_id
    and created_by = p_user_id
    and market_research_active_attempt_id = p_attempt_id;
  return found;
end;
$$;

revoke all on function public.reserve_market_research_attempt(uuid, uuid, uuid) from public, authenticated;
revoke all on function public.complete_market_research_attempt(uuid, uuid, uuid, jsonb, jsonb, text, boolean) from public, authenticated;
revoke all on function public.fail_market_research_attempt(uuid, uuid, uuid, text) from public, authenticated;
grant execute on function public.reserve_market_research_attempt(uuid, uuid, uuid) to service_role;
grant execute on function public.complete_market_research_attempt(uuid, uuid, uuid, jsonb, jsonb, text, boolean) to service_role;
grant execute on function public.fail_market_research_attempt(uuid, uuid, uuid, text) to service_role;
