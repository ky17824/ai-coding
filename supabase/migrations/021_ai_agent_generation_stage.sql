-- 생성 중 실제 진행 단계를 기록한다.
--
-- 지금까지 실행 레코드는 generating에서 completed/failed로 한 번에 건너뛰었고,
-- 화면에는 스피너 하나만 돌았다. 사용자는 몇 분 동안 아무 정보도 얻지 못한다.
--
-- 진행 표시를 시간 기반 애니메이션으로 흉내 내지 않는다. 라우트가 각 모델 호출
-- 직전에 이 값을 실제로 갱신하고, 화면은 그 값만 그린다. 값이 멈춰 있으면 화면도
-- 멈춰 있어야 한다. 그것이 사실이기 때문이다.

alter table public.ai_agent_runs
  add column if not exists generation_stage text;

alter table public.ai_agent_runs drop constraint if exists ai_agent_runs_generation_stage_check;
alter table public.ai_agent_runs add constraint ai_agent_runs_generation_stage_check
  check (generation_stage is null or generation_stage in ('context', 'research', 'verify', 'report', 'finalize'));

-- 단계 기록은 부가 정보다. 실패해도 생성 자체를 막으면 안 된다.
-- generating이 아니거나 시도 ID가 다르면 조용히 아무것도 하지 않는다. 이전 시도가
-- 남긴 갱신이 새 시도의 단계를 덮어쓰는 것을 막는다.
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
  set generation_stage = p_stage, updated_at = now()
  where order_id = p_order_id
    and status = 'generating'
    and generation_attempt_id = p_attempt_id;
end;
$$;

revoke all on function public.set_ai_agent_generation_stage(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_ai_agent_generation_stage(uuid, uuid, text) to service_role;
