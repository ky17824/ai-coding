import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountDangerZone, AccountProfileForm, PasswordForm } from "@/components/account-forms";
import { SiteHeader } from "@/components/site-header";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { decryptPhone, maskPhone } from "@/lib/pii";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "My Account" : "마이페이지" };
}

export default async function AccountPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const { user, profile } = await getCurrentProfile();
  const admin = createSupabaseAdminClient();
  if (!user) redirect(`${localizedPath("/signin", locale)}?returnTo=${encodeURIComponent(localizedPath("/account", locale))}`);
  if (!admin) throw new Error("Supabase admin client is not configured");
  if (!profile) redirect(`${localizedPath("/auth/callback", locale)}?next=${encodeURIComponent(localizedPath("/account", locale))}`);
  const { data: organization } = profile.organization_id
    ? await admin.from("organizations").select("name").eq("id", profile.organization_id).single()
    : { data: null };
  let maskedPhone = "";
  try { if (profile.phone_enc) maskedPhone = maskPhone(decryptPhone(profile.phone_enc)); } catch {}
  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container narrow-container account-page">
        <span className="page-kicker">MY ACCOUNT</span>
        <h1 className="page-title">{en ? "My Account" : "마이페이지"}</h1>
        <p className="page-description">{user.email} · {en ? "Joined" : "가입일"} {new Date(profile.created_at).toLocaleDateString(en ? "en-US" : "ko-KR")} · {(user.app_metadata.providers ?? []).join(", ") || "email"}</p>
        <AccountProfileForm profile={{
          displayName: profile.display_name,
          companyName: organization?.name ?? "",
          jobTitle: profile.job_title ?? "",
          maskedPhone,
          marketingOptIn: profile.marketing_opt_in
        }} locale={locale} />
        <PasswordForm locale={locale} />
        <AccountDangerZone email={user.email ?? ""} locale={locale} />
      </div>
    </main>
  );
}
