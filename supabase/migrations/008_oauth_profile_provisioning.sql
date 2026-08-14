create or replace function public.ensure_oauth_profile(
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_company_name text,
  p_job_title text default null,
  p_phone_enc text default null,
  p_marketing_opt_in boolean default false,
  p_terms_agreed_at timestamptz default null,
  p_privacy_agreed_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
  v_organization_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  select * into v_profile from public.profiles where id = p_user_id for update;

  if v_profile.deleted_at is not null then
    return jsonb_build_object(
      'id', v_profile.id,
      'organization_id', v_profile.organization_id,
      'role', v_profile.role,
      'job_title', v_profile.job_title,
      'phone_enc', v_profile.phone_enc,
      'terms_agreed_at', v_profile.terms_agreed_at,
      'privacy_agreed_at', v_profile.privacy_agreed_at,
      'deleted_at', v_profile.deleted_at
    );
  end if;

  if v_profile.id is null or v_profile.organization_id is null then
    insert into public.organizations (name)
    values (left(coalesce(nullif(trim(p_company_name), ''), 'New startup'), 120))
    returning id into v_organization_id;

    if v_profile.id is null then
      insert into public.profiles (
        id, organization_id, email, display_name, role, job_title, phone_enc,
        marketing_opt_in, terms_agreed_at, privacy_agreed_at
      ) values (
        p_user_id, v_organization_id, p_email,
        left(coalesce(nullif(trim(p_display_name), ''), p_email), 120),
        'startup', p_job_title, p_phone_enc, p_marketing_opt_in,
        p_terms_agreed_at, p_privacy_agreed_at
      );
    else
      update public.profiles
      set organization_id = v_organization_id
      where id = p_user_id;
    end if;
  end if;

  return (
    select jsonb_build_object(
      'id', id,
      'organization_id', organization_id,
      'role', role,
      'job_title', job_title,
      'phone_enc', phone_enc,
      'terms_agreed_at', terms_agreed_at,
      'privacy_agreed_at', privacy_agreed_at,
      'deleted_at', deleted_at
    )
    from public.profiles
    where id = p_user_id
  );
end;
$$;

revoke all on function public.ensure_oauth_profile(
  uuid, text, text, text, text, text, boolean, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.ensure_oauth_profile(
  uuid, text, text, text, text, text, boolean, timestamptz, timestamptz
) to service_role;
