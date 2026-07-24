import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient
} from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = new URL("/dashboard", url.origin);
  if (!code) return NextResponse.redirect(new URL("/signin", url.origin));

  const supabase = await createSupabaseServerClient();
  const { data, error } = (await supabase?.auth.exchangeCodeForSession(code)) ?? {
    data: null,
    error: new Error("Supabase is not configured")
  };
  if (error || !data?.user) {
    return NextResponse.redirect(
      new URL("/signin?error=callback", url.origin)
    );
  }

  const cookieStore = await cookies();
  const inviteCode = cookieStore.get("gtm-invite")?.value;
  const allowedCodes = (process.env.INVITE_CODES ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!inviteCode || !allowedCodes.includes(inviteCode)) {
    await supabase?.auth.signOut();
    return NextResponse.redirect(
      new URL("/signin?error=invite", url.origin)
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.redirect(
      new URL("/signin?error=configuration", url.origin)
    );
  }
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!existing) {
    const companyName =
      data.user.user_metadata.company_name ??
      data.user.email?.split("@")[1]?.split(".")[0]?.toUpperCase() ??
      "새 스타트업";
    const { data: organization, error: organizationError } = await admin
      .from("organizations")
      .insert({ name: companyName, invite_code_used: inviteCode })
      .select("id")
      .single();
    if (organizationError || !organization) {
      return NextResponse.redirect(
        new URL("/signin?error=onboarding", url.origin)
      );
    }
    await admin.from("profiles").insert({
      id: data.user.id,
      organization_id: organization.id,
      email: data.user.email,
      display_name: data.user.user_metadata.full_name ?? data.user.email,
      role: "startup"
    });
  }

  cookieStore.delete("gtm-invite");
  return NextResponse.redirect(redirectTo);
}
