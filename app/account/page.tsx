import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountDangerZone, AccountProfileForm, PasswordForm } from "@/components/account-forms";
import { SiteHeader } from "@/components/site-header";
import { decryptPhone, maskPhone } from "@/lib/pii";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "마이페이지" };

export default async function AccountPage() {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user) redirect("/signin?returnTo=/account");
  if (!admin) throw new Error("Supabase admin client is not configured");
  const { data: profile } = await admin.from("profiles")
    .select("organization_id,display_name,job_title,phone_enc,marketing_opt_in,created_at")
    .eq("id", user.id).single();
  if (!profile) redirect("/auth/callback?next=/account");
  const { data: organization } = profile.organization_id
    ? await admin.from("organizations").select("name").eq("id", profile.organization_id).single()
    : { data: null };
  let maskedPhone = "";
  try { if (profile.phone_enc) maskedPhone = maskPhone(decryptPhone(profile.phone_enc)); } catch {}
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container narrow-container account-page">
        <span className="page-kicker">MY ACCOUNT</span>
        <h1 className="page-title">마이페이지</h1>
        <p className="page-description">{user.email} · 가입일 {new Date(profile.created_at).toLocaleDateString("ko-KR")} · {(user.app_metadata.providers ?? []).join(", ") || "email"}</p>
        <AccountProfileForm profile={{
          displayName: profile.display_name,
          companyName: organization?.name ?? "",
          jobTitle: profile.job_title ?? "",
          maskedPhone,
          marketingOptIn: profile.marketing_opt_in
        }} />
        <PasswordForm />
        <AccountDangerZone email={user.email ?? ""} />
      </div>
    </main>
  );
}
