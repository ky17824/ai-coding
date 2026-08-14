update public.orders
set supply_amount_krw = coalesce(supply_amount_krw, amount_krw),
    vat_amount_krw = coalesce(vat_amount_krw, 0);

alter table public.orders alter column supply_amount_krw set not null;
alter table public.orders alter column vat_amount_krw set not null;
alter table public.orders add constraint orders_amount_tax_check
  check (supply_amount_krw > 0 and vat_amount_krw >= 0 and supply_amount_krw + vat_amount_krw = amount_krw);
alter table public.orders add constraint orders_product_shape_check check (
  (order_kind = 'human' and provider_id is not null and service_id is not null and product_key is null)
  or (order_kind = 'ai_agent' and provider_id is null and service_id is null and product_key is not null)
);

drop policy if exists "startup buyers create orders" on public.orders;
drop policy if exists "startup buyers create human orders" on public.orders;
revoke insert, update, delete on public.orders from authenticated;
