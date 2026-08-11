alter table public.gtm_plans
  add column if not exists content_locale text not null default 'ko'
  check (content_locale in ('ko', 'en'));
alter table public.gtm_plans
  add column if not exists founder_context_locale text not null default 'ko'
  check (founder_context_locale in ('ko', 'en'));
alter table public.gtm_plans
  add column if not exists market_research_locale text not null default 'ko'
  check (market_research_locale in ('ko', 'en'));

create table if not exists public.content_translations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  field_name text not null,
  target_locale text not null check (target_locale in ('ko', 'en')),
  source_hash text not null,
  translated_text text not null,
  is_official boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id, field_name, target_locale)
);

create index if not exists content_translations_org_idx
  on public.content_translations(organization_id, updated_at desc);

alter table public.content_translations enable row level security;

create policy "org members read content translations" on public.content_translations
  for select using (public.is_org_member(organization_id) or public.is_admin());

create policy "org members manage content translations" on public.content_translations
  for all using (public.is_org_member(organization_id) or public.is_admin())
  with check (public.is_org_member(organization_id) or public.is_admin());

grant select, insert, update, delete on public.content_translations to authenticated;
grant all on public.content_translations to service_role;
