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
  const meta = user.user_metadata;
  const displayName = [
    meta.display_name,
    meta.full_name,
    meta.name,
    meta.nickname,
    meta.preferred_username,
    user.email
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0)!;
  const metadataCompany = typeof meta.company_name === "string" ? meta.company_name.trim() : "";
  const companyName = metadataCompany ||
    user.email.split("@")[1]?.split(".")[0]?.toUpperCase() ||
    (locale === "en" ? "New startup" : "새 스타트업");
  const optionalText = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
  const { data: profile, error: profileError } = await admin.rpc("ensure_oauth_profile", {
    p_user_id: user.id,
    p_email: user.email,
    p_display_name: displayName,
    p_company_name: companyName,
    p_job_title: optionalText(meta.job_title),
    p_phone_enc: optionalText(meta.phone_enc),
    p_marketing_opt_in: meta.marketing_opt_in === true,
    p_terms_agreed_at: optionalText(meta.terms_agreed_at),
    p_privacy_agreed_at: optionalText(meta.privacy_agreed_at)
  });
  if (profileError || !profile) return NextResponse.redirect(failure("onboarding"));
  if (profile.deleted_at) {
    await supabase.auth.signOut();
    return NextResponse.redirect(failure("deleted"));
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
