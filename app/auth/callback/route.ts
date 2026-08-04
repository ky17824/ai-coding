import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase/server";
import { dashboardPathForRole, safeNextPath } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next");
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(
      new URL("/signin?error=configuration", url.origin)
    );
  }
  const authentication = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.getUser();
  const user = authentication.data.user;
  if (authentication.error || !user) {
    return NextResponse.redirect(new URL("/signin?error=callback", url.origin));
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.redirect(
      new URL("/signin?error=configuration", url.origin)
    );
  }
  const { data: existing, error: profileError } = await admin
    .from("profiles")
    .select("id,role,job_title,phone_enc,terms_agreed_at,privacy_agreed_at,deleted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return NextResponse.redirect(
      new URL("/signin?error=onboarding", url.origin)
    );
  }
  if (existing?.deleted_at) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/signin?error=deleted", url.origin));
  }

  let profile = existing;
  if (!existing) {
    const meta = user.user_metadata;
    const companyName =
      meta.company_name ??
      user.email?.split("@")[1]?.split(".")[0]?.toUpperCase() ??
      "새 스타트업";
    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .insert({ name: companyName })
      .select("id")
      .single();
    if (organizationError || !organization) {
      return NextResponse.redirect(
        new URL("/signin?error=onboarding", url.origin)
      );
    }
    const { error: insertError } = await admin.from("profiles").insert({
      id: user.id,
      organization_id: organization.id,
      email: user.email,
      display_name: meta.display_name ?? meta.full_name ?? user.email,
      job_title: meta.job_title ?? null,
      phone_enc: meta.phone_enc ?? null,
      marketing_opt_in: meta.marketing_opt_in === true,
      terms_agreed_at: meta.terms_agreed_at ?? null,
      privacy_agreed_at: meta.privacy_agreed_at ?? null,
      role: "startup"
    });
    if (insertError) {
      await admin.from("organizations").delete().eq("id", organization.id);
      return NextResponse.redirect(
        new URL("/signin?error=onboarding", url.origin)
      );
    }
    profile = {
      id: user.id,
      role: "startup",
      job_title: meta.job_title ?? null,
      phone_enc: meta.phone_enc ?? null,
      terms_agreed_at: meta.terms_agreed_at ?? null,
      privacy_agreed_at: meta.privacy_agreed_at ?? null,
      deleted_at: null
    };
  }

  const next = safeNextPath(requestedNext, dashboardPathForRole(profile?.role));
  const incomplete =
    profile?.role === "startup" &&
    (!profile.job_title || !profile.phone_enc || !profile.terms_agreed_at || !profile.privacy_agreed_at);
  if (incomplete && !next.startsWith("/account/onboarding")) {
    const onboarding = new URL("/account/onboarding", url.origin);
    onboarding.searchParams.set("next", next);
    return NextResponse.redirect(onboarding);
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
