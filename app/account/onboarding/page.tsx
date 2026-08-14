import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountProfileForm } from "@/components/account-forms";
import { SiteHeader } from "@/components/site-header";
import { safeNextPath } from "@/lib/auth";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Complete Your Profile" : "계정 정보 보완" };
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const { user, profile } = await getCurrentProfile();
  const admin = createSupabaseAdminClient();
  if (!user) redirect(localizedPath("/signin", locale));
  if (!admin) throw new Error("Supabase admin client is not configured");
  const next = safeNextPath((await searchParams).next, localizedPath("/dashboard", locale));
  if (!profile) redirect(localizedPath("/auth/callback", locale));
  const { data: organization } = profile.organization_id
    ? await admin.from("organizations").select("name").eq("id", profile.organization_id).single()
    : { data: null };
  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container narrow-container account-page">
        <span className="page-kicker">COMPLETE PROFILE</span>
        <h1 className="page-title">{en ? "Tell us about your company." : "회사 정보를 보완해 주세요."}</h1>
        <p className="page-description">{en ? "You can skip this and still save your assessment. We will need these details before you can order an expert service." : "진단 결과 저장은 건너뛰셔도 되지만, 전문가 서비스를 주문하시려면 필요한 정보입니다."}</p>
        <AccountProfileForm onboarding next={next} locale={locale} profile={{
          displayName: profile.display_name,
          companyName: organization?.name === "새 스타트업" ? "" : organization?.name ?? "",
          jobTitle: profile.job_title ?? "",
          maskedPhone: "",
          marketingOptIn: profile.marketing_opt_in
        }} />
        <Link className="text-link" href={next}>{en ? "Skip for now →" : "나중에 입력하고 계속 →"}</Link>
      </div>
    </main>
  );
}
