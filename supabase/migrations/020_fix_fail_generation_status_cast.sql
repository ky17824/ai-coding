-- 생성 실패 처리가 항상 실패하던 버그를 고친다.
--
-- 010:280의 orders 업데이트는 case 식으로 상태를 정한다.
--   set status = case when (...) then 'completed' else 'paid' end
-- 두 분기 모두 따옴표 리터럴(unknown)이라 case 전체의 타입이 text로 결정되고,
-- orders.status는 order_status enum이므로 대입이 거부된다.
--   ERROR: column "status" is of type order_status but expression is of type text
-- 리터럴 하나만 쓰는 complete_ai_agent_generation(010:235)은 unknown이 그대로
-- enum으로 해석되어 통과했다. 그래서 성공 경로만 살아 있었고 실패 경로는 처음부터
-- 죽어 있었다.
--
-- 영향: 모델 호출이 실패하면 라우트의 catch가 이 함수를 부르는데, 함수가 예외를
-- 던지면서 트랜잭션 전체가 롤백된다. 실행 레코드는 generating에 error_message가
-- null인 채로 남고, 리스가 만료되는 15분 동안 재시도가 409로 막힌다. 실제
-- 관리자 베타 테스트에서 이 상태로 주문 하나가 묶였다.
--
-- 수정: case 식에 명시적 캐스트를 붙인다. 로직은 그대로다.

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

  -- 여기가 고친 곳이다. 캐스트가 없으면 이 문장이 항상 예외를 던진다.
  update public.orders
  set status = (
    case
      when (select report is not null from public.ai_agent_runs where order_id = p_order_id)
        then 'completed'
      else 'paid'
    end
  )::public.order_status
  where id = p_order_id and status = 'service_started';

  return true;
end;
$$;

revoke all on function public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.fail_ai_agent_generation(uuid,uuid,text,integer,integer,integer,integer,numeric,numeric,integer,integer,integer) to service_role;
