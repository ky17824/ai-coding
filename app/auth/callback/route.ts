import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
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
    .select("id,role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return NextResponse.redirect(
      new URL("/signin?error=onboarding", url.origin)
    );
  }

  if (!existing) {
    const companyName =
      user.user_metadata.company_name ??
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
      display_name: user.user_metadata.full_name ?? user.email,
      role: "startup"
    });
    if (insertError) {
      return NextResponse.redirect(
        new URL("/signin?error=onboarding", url.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL(dashboardPathForRole(existing?.role), url.origin)
  );
}
