import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase/server";
import { dashboardPathForRole, safeNextPath } from "@/lib/auth";
import { localeFromPath, localizedPath } from "@/lib/i18n";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const locale = localeFromPath(requestedNext ?? "");
  const signInPath = localizedPath("/signin", locale);
  const failure = (error: string) => new URL(`${signInPath}?error=${error}`, url.origin);
  const oauthError = url.searchParams.get("error") ?? url.searchParams.get("error_code");
  if (oauthError) {
    const error = oauthError === "access_denied" ? "oauth_cancelled" : "callback";
    return NextResponse.redirect(failure(error));
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      failure("configuration")
    );
  }
  const authentication = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.getUser();
  const user = authentication.data.user;
  if (authentication.error || !user) {
    return NextResponse.redirect(failure("callback"));
  }
  if (!user.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(failure("email_required"));
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.redirect(
      failure("configuration")
    );
  }
  const { data: existing, error: profileError } = await admin
    .from("profiles")
    .select("id,organization_id,role,job_title,phone_enc,terms_agreed_at,privacy_agreed_at,deleted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return NextResponse.redirect(
      failure("onboarding")
    );
  }
  if (existing?.deleted_at) {
    await supabase.auth.signOut();
    return NextResponse.redirect(failure("deleted"));
  }

  let profile = existing;
  if (!existing?.organization_id) {
    const meta = user.user_metadata;
    const displayName = [
      meta.display_name,
      meta.full_name,
      meta.name,
      meta.nickname,
      meta.preferred_username,
      user.email
    ].find((value): value is string => typeof value === "string" && value.trim().length > 0);
    const companyName =
      meta.company_name ??
      user.email?.split("@")[1]?.split(".")[0]?.toUpperCase() ??
      (locale === "en" ? "New startup" : "새 스타트업");
    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .insert({ name: companyName })
      .select("id")
      .single();
    if (organizationError || !organization) {
      return NextResponse.redirect(
        failure("onboarding")
      );
    }
    const { error: writeError } = existing
      ? await admin
          .from("profiles")
          .update({ organization_id: organization.id })
          .eq("id", user.id)
      : await admin.from("profiles").insert({
          id: user.id,
          organization_id: organization.id,
          email: user.email,
          display_name: displayName,
          job_title: meta.job_title ?? null,
          phone_enc: meta.phone_enc ?? null,
          marketing_opt_in: meta.marketing_opt_in === true,
          terms_agreed_at: meta.terms_agreed_at ?? null,
          privacy_agreed_at: meta.privacy_agreed_at ?? null,
          role: "startup"
        });
    if (writeError) {
      await admin.from("organizations").delete().eq("id", organization.id);
      return NextResponse.redirect(
        failure("onboarding")
      );
    }
    profile = existing
      ? { ...existing, organization_id: organization.id }
      : {
          id: user.id,
          organization_id: organization.id,
          role: "startup",
          job_title: meta.job_title ?? null,
          phone_enc: meta.phone_enc ?? null,
          terms_agreed_at: meta.terms_agreed_at ?? null,
          privacy_agreed_at: meta.privacy_agreed_at ?? null,
          deleted_at: null
        };
  }

  const next = safeNextPath(
    requestedNext,
    localizedPath(dashboardPathForRole(profile?.role), locale)
  );
  const incomplete =
    profile?.role === "startup" &&
    (!profile.job_title || !profile.phone_enc || !profile.terms_agreed_at || !profile.privacy_agreed_at);
  if (incomplete && !next.startsWith("/account/onboarding")) {
    const onboarding = new URL(localizedPath("/account/onboarding", locale), url.origin);
    onboarding.searchParams.set("next", next);
    return NextResponse.redirect(onboarding);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
