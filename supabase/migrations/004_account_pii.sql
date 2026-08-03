alter table public.profiles
  add column job_title text check (char_length(job_title) between 1 and 60),
  add column phone_enc text,
  add column marketing_opt_in boolean not null default false,
  add column terms_agreed_at timestamptz,
  add column privacy_agreed_at timestamptz,
  add column deleted_at timestamptz;

create table public.pii_access_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  subject_id uuid not null references public.profiles(id),
  field text not null check (field = 'phone'),
  created_at timestamptz not null default now()
);

alter table public.pii_access_log enable row level security;

create policy "admins read pii access log" on public.pii_access_log
  for select using (public.is_admin());

revoke all on public.pii_access_log from anon, authenticated;
grant select on public.pii_access_log to authenticated;

-- Table-level grants from 002 override column revokes, so reset them first.
revoke select, update on public.profiles from anon, authenticated;
grant select (id, display_name) on public.profiles to anon;
grant select (
  id, organization_id, email, display_name, role, created_at,
  job_title, marketing_opt_in, terms_agreed_at, privacy_agreed_at, deleted_at
) on public.profiles to authenticated;
grant update (display_name, job_title, marketing_opt_in)
  on public.profiles to authenticated;

-- This unused composite RPC would otherwise expose every future profile column.
revoke execute on function public.current_profile() from public, anon, authenticated;
