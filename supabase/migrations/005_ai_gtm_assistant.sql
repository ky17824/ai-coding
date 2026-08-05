create table public.gtm_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'superseded', 'completed')),
  summary text not null default '',
  assumptions jsonb not null default '[]'::jsonb,
  founder_context jsonb not null default '{}'::jsonb,
  recent_messages jsonb not null default '[]'::jsonb,
  turn_count smallint not null default 0 check (turn_count between 0 and 20),
  generation_count smallint not null default 0 check (generation_count between 0 and 3),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  reasoning_tokens integer not null default 0 check (reasoning_tokens >= 0),
  model text not null default 'gpt-5.6-luna',
  prompt_version text not null default '2026-08-05',
  knowledge_version text,
  generation_trace jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, version)
);

create unique index one_open_gtm_plan_per_assessment
  on public.gtm_plans(assessment_id)
  where status in ('draft', 'active');
create index gtm_plans_org_idx
  on public.gtm_plans(organization_id, updated_at desc);

create table public.gtm_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.gtm_plans(id) on delete cascade,
  source_action_item_id uuid references public.action_items(id) on delete set null,
  question_id text,
  horizon smallint not null check (horizon in (30, 60, 90)),
  sort_order smallint not null default 0 check (sort_order >= 0),
  priority text not null check (priority in ('P0', 'P1')),
  title text not null check (char_length(title) between 1 and 180),
  rationale text not null,
  owner_label text not null,
  due_date date not null,
  completion_evidence text not null,
  dependencies jsonb not null default '[]'::jsonb,
  risk_note text not null default '',
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'blocked')),
  expert_required boolean not null default false,
  expert_reason text not null default '',
  service_tag text not null default '',
  handoff_brief text not null default '',
  sources jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index gtm_plan_items_plan_idx
  on public.gtm_plan_items(plan_id, horizon, sort_order);

alter table public.gtm_plans enable row level security;
alter table public.gtm_plan_items enable row level security;

create policy "org members manage gtm plans" on public.gtm_plans
  for all using (public.is_org_member(organization_id) or public.is_admin())
  with check (
    (public.is_org_member(organization_id) and created_by = auth.uid())
    or public.is_admin()
  );

create policy "org members manage gtm plan items" on public.gtm_plan_items
  for all using (exists (
    select 1 from public.gtm_plans plan
    where plan.id = plan_id
      and (public.is_org_member(plan.organization_id) or public.is_admin())
  )) with check (exists (
    select 1 from public.gtm_plans plan
    where plan.id = plan_id
      and (public.is_org_member(plan.organization_id) or public.is_admin())
  ));

grant select, insert, update, delete on public.gtm_plans to authenticated;
grant select, insert, update, delete on public.gtm_plan_items to authenticated;
grant all on public.gtm_plans to service_role;
grant all on public.gtm_plan_items to service_role;
