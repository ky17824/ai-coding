create extension if not exists pgcrypto;

create type public.user_role as enum ('startup', 'provider', 'admin');
create type public.journey_phase as enum ('pre_entry', 'initial_entry', 'scale');
create type public.service_type as enum ('mentoring', 'consulting');
create type public.order_status as enum (
  'pending', 'paid', 'service_started', 'completed',
  'cancelled', 'refunded', 'disputed'
);
create type public.review_status as enum ('visible', 'hidden', 'flagged');
create type public.content_review_status as enum ('draft', 'approved', 'expired');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  invite_code_used text,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  email text not null,
  display_name text not null,
  role public.user_role not null default 'startup',
  created_at timestamptz not null default now()
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  overall_score integer not null check (overall_score between 0 and 100),
  domain_scores jsonb not null,
  status_label text not null,
  is_on_hold boolean not null default false,
  gate_messages jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);

create table public.readiness_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id text not null,
  level smallint not null check (level between 0 and 3),
  evidence_kind text check (evidence_kind in ('note', 'url', 'file')),
  evidence_value text,
  unique (assessment_id, question_id),
  check (level <> 3 or nullif(trim(evidence_value), '') is not null)
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.readiness_answers(id) on delete cascade,
  owner_id uuid not null references public.profiles(id),
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/png', 'image/jpeg')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_at timestamptz not null default now()
);

create table public.journey_steps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  step_number smallint not null check (step_number between 1 and 11),
  phase public.journey_phase not null,
  title text not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'completed', 'blocked')),
  completed_at timestamptz,
  unique (organization_id, step_number)
);

create table public.action_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  question_id text,
  title text not null,
  owner_label text not null,
  completion_evidence text not null,
  phase public.journey_phase not null,
  service_tag text not null,
  urgency text not null check (urgency in ('P0', 'P1')),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  headline text not null,
  biography text not null,
  expertise text[] not null default '{}',
  verification_note text,
  settlement_partner_id text,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.service_offerings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  type public.service_type not null,
  title text not null,
  description text not null,
  price_krw integer not null check (price_krw > 0),
  duration_minutes integer,
  duration_days integer,
  deliverables jsonb not null default '[]'::jsonb,
  milestones jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (type = 'mentoring' and duration_minutes in (60, 90) and duration_days is null)
    or
    (type = 'consulting' and duration_days > 0 and duration_minutes is null)
  )
);

create table public.availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (provider_id, starts_at, ends_at),
  check (ends_at > starts_at)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  buyer_id uuid not null references public.profiles(id),
  provider_id uuid not null references public.provider_profiles(id),
  service_id uuid not null references public.service_offerings(id),
  availability_id uuid references public.availability(id),
  status public.order_status not null default 'pending',
  payment_id text not null unique,
  amount_krw integer not null check (amount_krw > 0),
  platform_fee_krw integer not null check (platform_fee_krw >= 0),
  provider_amount_krw integer not null check (provider_amount_krw >= 0),
  service_snapshot jsonb not null,
  terms_snapshot jsonb not null,
  terms_accepted_at timestamptz not null,
  scheduled_at timestamptz,
  service_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (platform_fee_krw + provider_amount_krw = amount_krw)
);

create unique index one_active_order_per_slot
  on public.orders(availability_id)
  where availability_id is not null
    and status in ('pending', 'paid', 'service_started');

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  webhook_id text not null unique,
  payment_id text not null,
  event_type text not null,
  payment_status text,
  amount_krw integer,
  raw_event jsonb not null,
  processed_at timestamptz not null default now()
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id),
  gross_amount_krw integer not null,
  platform_fee_krw integer not null,
  payout_amount_krw integer not null,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'paid', 'cancelled', 'held')),
  portone_transfer_id text,
  scheduled_for date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  provider_id uuid not null references public.provider_profiles(id),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 2000),
  status public.review_status not null default 'visible',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_revisions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  rating smallint not null,
  body text not null,
  revised_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  reported_by uuid not null references public.profiles(id),
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (review_id, reported_by)
);

create table public.content_sources (
  id uuid primary key default gen_random_uuid(),
  claim text not null,
  domain_id text not null,
  phase public.journey_phase not null,
  action_text text not null,
  service_tags text[] not null default '{}',
  source_title text not null,
  source_url text not null,
  publisher text not null,
  citation_location text not null,
  published_at date,
  checked_at date not null,
  expires_at date,
  review_status public.content_review_status not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index assessments_org_idx on public.assessments(organization_id, completed_at desc);
create index actions_org_idx on public.action_items(organization_id, completed_at, due_date);
create index services_tags_idx on public.service_offerings using gin(tags);
create index content_tags_idx on public.content_sources using gin(service_tags);
create index orders_org_idx on public.orders(organization_id, created_at desc);
create index orders_provider_idx on public.orders(provider_id, created_at desc);

create or replace function public.current_profile()
returns public.profiles
language sql stable security definer set search_path = public
as $$ select * from public.profiles where id = auth.uid() $$;

create or replace function public.is_org_member(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and organization_id = target) $$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.assessments enable row level security;
alter table public.readiness_answers enable row level security;
alter table public.evidence_files enable row level security;
alter table public.journey_steps enable row level security;
alter table public.action_items enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.service_offerings enable row level security;
alter table public.availability enable row level security;
alter table public.orders enable row level security;
alter table public.payment_events enable row level security;
alter table public.settlements enable row level security;
alter table public.reviews enable row level security;
alter table public.review_revisions enable row level security;
alter table public.review_reports enable row level security;
alter table public.content_sources enable row level security;

create policy "members read organization" on public.organizations
  for select using (public.is_org_member(id) or public.is_admin());
create policy "users read own or org profiles" on public.profiles
  for select using (id = auth.uid() or public.is_org_member(organization_id) or public.is_admin());
create policy "users update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "org members read assessments" on public.assessments
  for select using (public.is_org_member(organization_id) or public.is_admin());
create policy "org members add assessments" on public.assessments
  for insert with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy "org members read answers" on public.readiness_answers
  for select using (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and public.is_org_member(a.organization_id)
  ) or public.is_admin());
create policy "assessment creator adds answers" on public.readiness_answers
  for insert with check (exists (
    select 1 from public.assessments a
    where a.id = assessment_id and a.created_by = auth.uid()
  ));

create policy "owners read evidence metadata" on public.evidence_files
  for select using (owner_id = auth.uid() or public.is_admin());
create policy "owners add evidence metadata" on public.evidence_files
  for insert with check (owner_id = auth.uid());

create policy "org members manage journey" on public.journey_steps
  for all using (public.is_org_member(organization_id) or public.is_admin())
  with check (public.is_org_member(organization_id) or public.is_admin());
create policy "org members manage actions" on public.action_items
  for all using (public.is_org_member(organization_id) or public.is_admin())
  with check (public.is_org_member(organization_id) or public.is_admin());

create policy "approved providers are public" on public.provider_profiles
  for select using (
    approval_status = 'approved' or user_id = auth.uid() or public.is_admin()
  );
create policy "users apply as providers" on public.provider_profiles
  for insert with check (user_id = auth.uid());
create policy "providers update pending profile" on public.provider_profiles
  for update using (user_id = auth.uid() and approval_status = 'pending');

create policy "published services are public" on public.service_offerings
  for select using (
    is_published and exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.approval_status = 'approved'
    )
    or exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
    or public.is_admin()
  );
create policy "providers manage services" on public.service_offerings
  for all using (exists (
    select 1 from public.provider_profiles p
    where p.id = provider_id and p.user_id = auth.uid()
  ) or public.is_admin())
  with check (exists (
    select 1 from public.provider_profiles p
    where p.id = provider_id and p.user_id = auth.uid()
  ) or public.is_admin());

create policy "approved provider slots are public" on public.availability
  for select using (exists (
    select 1 from public.provider_profiles p
    where p.id = provider_id and p.approval_status = 'approved'
  ));
create policy "providers manage slots" on public.availability
  for all using (exists (
    select 1 from public.provider_profiles p
    where p.id = provider_id and p.user_id = auth.uid()
  ) or public.is_admin())
  with check (exists (
    select 1 from public.provider_profiles p
    where p.id = provider_id and p.user_id = auth.uid()
  ) or public.is_admin());

create policy "order parties read orders" on public.orders
  for select using (
    public.is_org_member(organization_id)
    or exists (
      select 1 from public.provider_profiles p
      where p.id = provider_id and p.user_id = auth.uid()
    )
    or public.is_admin()
  );
create policy "startup buyers create orders" on public.orders
  for insert with check (buyer_id = auth.uid() and public.is_org_member(organization_id));

create policy "order parties read payment events" on public.payment_events
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_id and (
      public.is_org_member(o.organization_id)
      or exists (
        select 1 from public.provider_profiles p
        where p.id = o.provider_id and p.user_id = auth.uid()
      )
    )
  ) or public.is_admin());
create policy "order parties read settlements" on public.settlements
  for select using (exists (
    select 1 from public.orders o
    where o.id = order_id and (
      public.is_org_member(o.organization_id)
      or exists (
        select 1 from public.provider_profiles p
        where p.id = o.provider_id and p.user_id = auth.uid()
      )
    )
  ) or public.is_admin());

create policy "visible reviews are public" on public.reviews
  for select using (status = 'visible' or author_id = auth.uid() or public.is_admin());
create policy "completed buyers add reviews" on public.reviews
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.buyer_id = auth.uid() and o.status = 'completed'
    )
  );
create policy "authors update reviews" on public.reviews
  for update using (author_id = auth.uid());
create policy "authors read revisions" on public.review_revisions
  for select using (revised_by = auth.uid() or public.is_admin());
create policy "authors add revisions" on public.review_revisions
  for insert with check (revised_by = auth.uid());
create policy "users report reviews" on public.review_reports
  for insert with check (reported_by = auth.uid());
create policy "reporters read reports" on public.review_reports
  for select using (reported_by = auth.uid() or public.is_admin());

create policy "approved unexpired content is public" on public.content_sources
  for select using (
    (review_status = 'approved' and (expires_at is null or expires_at >= current_date))
    or public.is_admin()
  );
create policy "admins manage content" on public.content_sources
  for all using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence',
  'evidence',
  false,
  10485760,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own evidence files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "users read own evidence files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evidence'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
