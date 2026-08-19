import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SiteHeader } from "@/components/site-header";
import { BetaInvitationCard, BetaTesterEmptySlot, BetaTesterFilledSlot, type BetaTesterSlotData } from "@/components/beta-tester-admin";
import { BETA_FREE_RUNS, BETA_TESTER_PRODUCT_ID, MAX_BETA_TESTERS, betaFeedbackFormUrl, buildBetaInvitation } from "@/lib/beta-testers";
import { appOrigin } from "@/lib/auth";
import { PRODUCT_COPY } from "@/lib/catalog/copy";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Beta testers" : "베타 테스터 관리" };
}

type TesterRow = { email: string; max_runs: number; created_at: string; quota_started_at: string | null };

/**
 * 창업자 초대 목록. 등록된 이메일로 로그인한 계정은 심층 시장 조사를 max_runs회 결제 없이 실행한다
 * (lib/beta-testers.ts, 027 RPC). 초대 메일 발송은 자동화하지 않는다 — 관리자가 직접 안내한다.
 */
export default async function AdminBetaTestersPage() {
  const [{ user: actor, profile }, locale] = await Promise.all([getCurrentProfile(), getRequestLocale()]);
  const en = locale === "en";
  if (!actor || profile?.role !== "admin" || profile.deleted_at) redirect(localizedPath("/dashboard", locale));
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured");

  const [testersResult, profilesResult, ordersResult] = await Promise.all([
    admin.from("beta_testers").select("email,max_runs,created_at,quota_started_at").order("created_at", { ascending: true }),
    admin.from("profiles").select("id,email,deleted_at"),
    admin.from("orders").select("buyer_id,created_at").eq("billing_mode", "beta_tester").neq("status", "cancelled")
  ]);
  if (testersResult.error) throw new Error("Unable to load beta testers");
  const testers = (testersResult.data ?? []) as TesterRow[];
  const profileByEmail = new Map((profilesResult.data ?? []).map((row) => [String(row.email ?? "").toLowerCase(), row]));
  const orders = ordersResult.data ?? [];
  const productTitle = PRODUCT_COPY[BETA_TESTER_PRODUCT_ID].title[locale];
  // 슬롯 데이터. 사용 횟수는 리셋 기준 시각(quota_started_at) 이후 주문만 센다 — 라우트·RPC와 같은 규칙.
  const slots: BetaTesterSlotData[] = testers.slice(0, MAX_BETA_TESTERS).map((tester) => {
    const account = profileByEmail.get(tester.email);
    const since = Date.parse(tester.quota_started_at ?? "1970-01-01");
    const usedRuns = account ? orders.filter((order) => order.buyer_id === account.id && Date.parse(order.created_at) >= since).length : 0;
    return { email: tester.email, createdAt: tester.created_at, maxRuns: tester.max_runs, usedRuns, account: account ? (account.deleted_at ? "closed" : "active") : "none" };
  });
  const totalUsed = slots.reduce((sum, slot) => sum + slot.usedRuns, 0);
  const formUrl = betaFeedbackFormUrl();
  const invitation = buildBetaInvitation({ serviceUrl: `${appOrigin()}${localizedPath("/services/ai-market-intelligence", locale)}`, formUrl, locale });

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container admin-users-page">
        <span className="page-kicker">BETA TESTERS</span>
        <h1 className="page-title">{en ? "Beta tester management" : "베타 테스터 관리"}</h1>
        <p className="page-description">{en
          ? `Registered emails can run ${productTitle} without payment, up to the free-run limit per person. Everything else stays paid or coming soon.`
          : `등록한 이메일의 계정은 ${productTitle}를 1인 무료 횟수 안에서 결제 없이 실행합니다. 다른 서비스는 일반 사용자와 같습니다.`}</p>
        <AdminNav locale={locale} />

        <div className="admin-metrics">
          {[
            [en ? "Slots in use" : "사용 중인 슬롯", `${slots.length} / ${MAX_BETA_TESTERS}`],
            [en ? "Signed up" : "가입 완료", slots.filter((slot) => slot.account === "active").length],
            [en ? "Free runs used" : "무료 실행 사용", totalUsed],
            [en ? "Free runs each" : "1인 무료 횟수", BETA_FREE_RUNS]
          ].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>

        <section className="admin-section">
          <div className="section-heading"><h2>{en ? "Invitation" : "초대장"}</h2></div>
          <BetaInvitationCard locale={locale} text={invitation} formUrl={formUrl} />
        </section>

        <section className="admin-section">
          <div className="section-heading"><h2>{en ? "Invite slots" : "초대 슬롯"}</h2></div>
          <p className="page-description">{en ? "One email per slot. Delete a tester to free the slot for someone else; reset returns their free runs to the full count." : "슬롯마다 이메일 하나. 다른 사람을 초대하려면 삭제해 슬롯을 비우고, 리셋하면 무료 횟수가 처음부터 다시 시작됩니다."}</p>
          <div className="beta-slots">
            {Array.from({ length: MAX_BETA_TESTERS }, (_, index) => slots[index]
              ? <BetaTesterFilledSlot key={slots[index].email} locale={locale} index={index} tester={slots[index]} />
              : <BetaTesterEmptySlot key={`empty-${index}`} locale={locale} index={index} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
