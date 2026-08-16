alter table public.profiles
  add column if not exists admin_account_purpose text
  check (
    admin_account_purpose is null
    or (role = 'admin' and admin_account_purpose in ('primary', 'recovery'))
  );

alter table public.profiles
  add column if not exists closure_pending_at timestamptz;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and deleted_at is null
  )
$$;

create or replace function public.is_org_member(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and organization_id = target and deleted_at is null
  )
$$;

create table if not exists public.admin_role_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id),
  subject_id uuid not null references public.profiles(id),
  previous_role public.user_role not null,
  new_role public.user_role not null,
  previous_admin_purpose text check (previous_admin_purpose is null or previous_admin_purpose in ('primary', 'recovery')),
  new_admin_purpose text check (new_admin_purpose is null or new_admin_purpose in ('primary', 'recovery')),
  reason text not null check (char_length(trim(reason)) between 10 and 500),
  created_at timestamptz not null default now()
);

create index if not exists admin_role_audit_log_subject_created_idx
  on public.admin_role_audit_log (subject_id, created_at desc);

alter table public.admin_role_audit_log enable row level security;

drop policy if exists "admins read role audit log" on public.admin_role_audit_log;
create policy "admins read role audit log" on public.admin_role_audit_log
  for select using (public.is_admin());

revoke all on public.admin_role_audit_log from anon, authenticated;
grant select on public.admin_role_audit_log to authenticated;

create or replace function public.manage_user_role(
  p_target_user_id uuid,
  p_new_role public.user_role,
  p_admin_purpose text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor public.profiles;
  subject public.profiles;
  next_purpose text;
  active_admin_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('manage_user_role'));

  select * into actor
  from public.profiles
  where id = auth.uid()
  for update;
  if actor.id is null or actor.deleted_at is not null or actor.role <> 'admin' then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select * into subject
  from public.profiles
  where id = p_target_user_id
  for update;
  if subject.id is null or subject.deleted_at is not null then
    raise exception 'target_not_found' using errcode = 'P0002';
  end if;
  if subject.closure_pending_at >= now() - interval '10 minutes' then
    raise exception 'closure_in_progress' using errcode = '55000';
  end if;
  if subject.closure_pending_at is not null then
    update public.profiles set closure_pending_at = null where id = subject.id;
    subject.closure_pending_at := null;
  end if;
  if actor.id = subject.id then
    raise exception 'self_change_forbidden' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null or char_length(trim(p_reason)) not between 10 and 500 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;

  if p_new_role = 'admin' then
    if p_admin_purpose is null or p_admin_purpose not in ('primary', 'recovery') then
      raise exception 'invalid_admin_purpose' using errcode = '22023';
    end if;
    next_purpose := p_admin_purpose;
  else
    if p_admin_purpose is not null then
      raise exception 'invalid_admin_purpose' using errcode = '22023';
    end if;
    next_purpose := null;
  end if;

  if subject.role = p_new_role and subject.admin_account_purpose is not distinct from next_purpose then
    raise exception 'no_change' using errcode = '22023';
  end if;

  if subject.role = 'admin' and p_new_role <> 'admin' then
    select count(*) into active_admin_count
    from public.profiles
    where role = 'admin' and deleted_at is null;
    if active_admin_count <= 1 then
      raise exception 'last_admin' using errcode = '55000';
    end if;
  end if;

  update public.profiles
  set role = p_new_role,
      admin_account_purpose = next_purpose
  where id = subject.id;

  insert into public.admin_role_audit_log (
    actor_id,
    subject_id,
    previous_role,
    new_role,
    previous_admin_purpose,
    new_admin_purpose,
    reason
  ) values (
    actor.id,
    subject.id,
    subject.role,
    p_new_role,
    subject.admin_account_purpose,
    next_purpose,
    trim(p_reason)
  );
end;
$$;

revoke all on function public.manage_user_role(uuid, public.user_role, text, text) from public, anon;
grant execute on function public.manage_user_role(uuid, public.user_role, text, text) to authenticated;

drop policy if exists "users apply as providers" on public.provider_profiles;
revoke insert on public.provider_profiles from authenticated;

create or replace function public.apply_for_provider(
  p_headline text,
  p_biography text,
  p_expertise text[],
  p_verification_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  applicant public.profiles;
  normalized_headline text;
  normalized_biography text;
  normalized_expertise text[];
  normalized_verification_note text;
begin
  perform pg_advisory_xact_lock(hashtext('manage_user_role'));

  select * into applicant
  from public.profiles
  where id = auth.uid()
  for update;

  if applicant.id is null or applicant.deleted_at is not null
    or applicant.closure_pending_at >= now() - interval '10 minutes'
  then
    raise exception 'active_profile_required' using errcode = '42501';
  end if;
  if applicant.closure_pending_at is not null then
    update public.profiles set closure_pending_at = null where id = applicant.id;
  end if;
  if applicant.role = 'admin' then
    raise exception 'admin_provider_forbidden' using errcode = '42501';
  end if;
  normalized_headline := trim(p_headline);
  normalized_biography := trim(p_biography);
  normalized_expertise := array(select trim(item) from unnest(coalesce(p_expertise, array[]::text[])) item);
  normalized_verification_note := trim(p_verification_note);

  if coalesce(char_length(normalized_headline), 0) not between 5 and 120
    or coalesce(char_length(normalized_biography), 0) not between 50 and 3000
    or coalesce(char_length(normalized_verification_note), 0) not between 10 and 1000
    or coalesce(cardinality(normalized_expertise), 0) = 0
    or coalesce(char_length(array_to_string(normalized_expertise, ',')), 0) not between 2 and 500
    or exists(select 1 from unnest(coalesce(p_expertise, array[]::text[])) item where item is null or nullif(trim(item), '') is null)
  then
    raise exception 'invalid_provider_application' using errcode = '22023';
  end if;

  insert into public.provider_profiles (
    user_id,
    headline,
    biography,
    expertise,
    verification_note
  ) values (
    applicant.id,
    normalized_headline,
    normalized_biography,
    normalized_expertise,
    normalized_verification_note
  );

  update public.profiles
  set role = 'provider'
  where id = applicant.id;
end;
$$;

revoke all on function public.apply_for_provider(text, text, text[], text) from public, anon;
grant execute on function public.apply_for_provider(text, text, text[], text) to authenticated;

create or replace function public.begin_profile_closure(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  closing_profile public.profiles;
begin
  perform pg_advisory_xact_lock(hashtext('manage_user_role'));

  select * into closing_profile
  from public.profiles
  where id = p_user_id
  for update;

  if closing_profile.id is null or closing_profile.deleted_at is not null then
    raise exception 'active_profile_required' using errcode = '42501';
  end if;
  if closing_profile.role = 'admin' then
    raise exception 'admin_closure_forbidden' using errcode = '42501';
  end if;

  update public.profiles
  set closure_pending_at = case
    when closure_pending_at is null or closure_pending_at < now() - interval '10 minutes' then now()
    else closure_pending_at
  end
  where id = closing_profile.id;
end;
$$;

revoke all on function public.begin_profile_closure(uuid) from public, anon, authenticated;
grant execute on function public.begin_profile_closure(uuid) to service_role;

create or replace function public.cancel_profile_closure(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('manage_user_role'));

  update public.profiles
  set closure_pending_at = null
  where id = p_user_id and deleted_at is null;
end;
$$;

revoke all on function public.cancel_profile_closure(uuid) from public, anon, authenticated;
grant execute on function public.cancel_profile_closure(uuid) to service_role;

create or replace function public.close_profile(
  p_user_id uuid,
  p_display_name text,
  p_anonymized_email text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  closing_profile public.profiles;
begin
  perform pg_advisory_xact_lock(hashtext('manage_user_role'));

  select * into closing_profile
  from public.profiles
  where id = p_user_id
  for update;

  if closing_profile.id is null or closing_profile.deleted_at is not null then
    raise exception 'active_profile_required' using errcode = '42501';
  end if;

  if closing_profile.role = 'admin' then
    raise exception 'admin_closure_forbidden' using errcode = '42501';
  end if;
  if closing_profile.closure_pending_at is null
    or closing_profile.closure_pending_at < now() - interval '10 minutes'
  then
    raise exception 'closure_not_reserved' using errcode = '55000';
  end if;

  update public.profiles
  set display_name = p_display_name,
      email = p_anonymized_email,
      job_title = null,
      phone_enc = null,
      marketing_opt_in = false,
      closure_pending_at = null,
      deleted_at = now()
  where id = closing_profile.id;
end;
$$;

revoke all on function public.close_profile(uuid, text, text) from public, anon, authenticated;
grant execute on function public.close_profile(uuid, text, text) to service_role;
