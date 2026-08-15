alter table public.gtm_plans
  add column if not exists market_research_documents jsonb not null default '[]'::jsonb
  check (jsonb_typeof(market_research_documents) = 'array');

create or replace function public.append_gtm_research_document(
  p_plan_id uuid,
  p_user_id uuid,
  p_document jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_plan public.gtm_plans;
begin
  select * into locked_plan from public.gtm_plans where id = p_plan_id for update;
  if locked_plan.id is null or locked_plan.created_by <> p_user_id then raise exception 'plan_not_found'; end if;
  if jsonb_array_length(locked_plan.market_research_documents) >= 3 then raise exception 'document_limit'; end if;
  if coalesce(p_document->>'status', '') <> 'uploaded'
    or coalesce(p_document->>'id', '') !~* '^[0-9a-f-]{36}$'
    or coalesce(p_document->>'displayName', '') = ''
    or coalesce(p_document->>'mimeType', '') not in ('application/pdf', 'image/png', 'image/jpeg')
    or coalesce((p_document->>'size')::integer, 0) not between 1 and 4194304
    or coalesce(p_document->>'sha256', '') !~ '^[a-f0-9]{64}$'
    or coalesce(p_document->>'storagePath', '') = ''
  then raise exception 'invalid_document'; end if;
  if exists (select 1 from jsonb_array_elements(locked_plan.market_research_documents) item where item->>'id' = p_document->>'id') then
    raise exception 'duplicate_document';
  end if;

  update public.gtm_plans
  set market_research_documents = market_research_documents || jsonb_build_array(p_document), updated_at = now()
  where id = p_plan_id
  returning market_research_documents into locked_plan.market_research_documents;
  return locked_plan.market_research_documents;
end;
$$;

create or replace function public.remove_gtm_research_document(
  p_plan_id uuid,
  p_user_id uuid,
  p_document_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_plan public.gtm_plans;
  removed jsonb;
begin
  select * into locked_plan from public.gtm_plans where id = p_plan_id for update;
  if locked_plan.id is null or locked_plan.created_by <> p_user_id then raise exception 'plan_not_found'; end if;
  select item into removed from jsonb_array_elements(locked_plan.market_research_documents) item where item->>'id' = p_document_id::text;
  if removed is null then raise exception 'document_not_found'; end if;

  update public.gtm_plans
  set market_research_documents = coalesce((
    select jsonb_agg(item) from jsonb_array_elements(market_research_documents) item where item->>'id' <> p_document_id::text
  ), '[]'::jsonb), updated_at = now()
  where id = p_plan_id;
  return removed;
end;
$$;

create or replace function public.update_gtm_research_document(
  p_plan_id uuid,
  p_user_id uuid,
  p_document_id uuid,
  p_status text,
  p_evidence jsonb,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  locked_plan public.gtm_plans;
  current_status text;
begin
  select * into locked_plan from public.gtm_plans where id = p_plan_id for update;
  if locked_plan.id is null or locked_plan.created_by <> p_user_id then raise exception 'plan_not_found'; end if;
  select item->>'status' into current_status from jsonb_array_elements(locked_plan.market_research_documents) item where item->>'id' = p_document_id::text;
  if current_status is null then raise exception 'document_not_found'; end if;
  if not ((current_status = 'uploaded' and p_status in ('processed', 'failed', 'cleanup_pending'))
    or (current_status = 'failed' and p_status in ('processed', 'cleanup_pending'))
    or (current_status = 'cleanup_pending' and p_status = 'processed')) then
    raise exception 'invalid_document_transition';
  end if;

  update public.gtm_plans
  set market_research_documents = (
    select jsonb_agg(
      case when item->>'id' = p_document_id::text then
        item || jsonb_build_object(
          'status', p_status,
          'evidence', p_evidence,
          'errorMessage', p_error_message,
          'storagePath', case when p_status = 'processed' then null else item->'storagePath' end
        )
      else item end
    )
    from jsonb_array_elements(market_research_documents) item
  ), updated_at = now()
  where id = p_plan_id
  returning market_research_documents into locked_plan.market_research_documents;
  return locked_plan.market_research_documents;
end;
$$;

revoke all on function public.append_gtm_research_document(uuid, uuid, jsonb) from public, authenticated;
revoke all on function public.remove_gtm_research_document(uuid, uuid, uuid) from public, authenticated;
revoke all on function public.update_gtm_research_document(uuid, uuid, uuid, text, jsonb, text) from public, authenticated;
grant execute on function public.append_gtm_research_document(uuid, uuid, jsonb) to service_role;
grant execute on function public.remove_gtm_research_document(uuid, uuid, uuid) to service_role;
grant execute on function public.update_gtm_research_document(uuid, uuid, uuid, text, jsonb, text) to service_role;
