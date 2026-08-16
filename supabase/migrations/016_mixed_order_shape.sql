-- 2차(전문가 결합) 상품이 필요로 하는 주문 형태를 미리 연다.
--
-- C 계층 상품은 AI 보고서(product_key)와 배정된 전문가(provider_id)를 동시에 갖는다.
-- 현재 orders_product_shape_check는 두 분기 모두 그 조합을 금지하므로, 이 제약이
-- 2차의 실질 차단 지점이다. 1차에서는 mixed 주문을 만들지 않으며 자리만 열어 둔다.
--
-- 데이터 이전은 없다. 기존 human·ai_agent 주문은 그대로 통과한다.

-- order_kind 체크는 인라인 컬럼 제약이라 이름이 서버 생성이다. 이름을 찾아 지운다.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'orders'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%order_kind%'
    and pg_get_constraintdef(con.oid) not ilike '%product_key%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.orders drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.orders add constraint orders_order_kind_check
  check (order_kind in ('human', 'ai_agent', 'mixed'));

alter table public.orders drop constraint if exists orders_product_shape_check;
alter table public.orders add constraint orders_product_shape_check check (
  (order_kind = 'human' and provider_id is not null and service_id is not null and product_key is null)
  or (order_kind = 'ai_agent' and provider_id is null and service_id is null and product_key is not null)
  -- 전문가가 배정된 AI 결합 상품. 2차에서만 생성된다.
  or (order_kind = 'mixed' and provider_id is not null and product_key is not null)
);
