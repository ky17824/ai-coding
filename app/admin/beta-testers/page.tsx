import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { SiteHeader } from "@/components/site-header";
import { BetaTesterInviteForm, BetaTesterRevokeButton } from "@/components/beta-tester-admin";
import { BETA_TESTER_PRODUCT_ID } from "@/lib/beta-testers";
import { PRODUCT_COPY } from "@/lib/catalog/copy";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Beta testers" : "베타 테스터 관리" };
}

type TesterRow = { email: string; max_runs: number; note: string | null; created_at: string; revoked_at: string | null };

/**
 * 창업자 초대 목록. 등록된 이메일로 로그인한 계정은 심층 시장 조사를 max_runs회 결제 없이 실행한다
 * (lib/beta-testers.ts, 026 RPC). 초대 메일 발송은 자동화하지 않는다 — 관리자가 직접 안내한다.
 */
export default async function AdminBetaTestersPage() {
  const [{ user: actor, profile }, locale] = await Promise.all([getCurrentProfile(), getRequestLocale()]);
  const en = locale === "en";
  if (!actor || profile?.role !== "admin" || profile.deleted_at) redirect(localizedPath("/dashboard", locale));
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured");

  const [testersResult, profilesResult, ordersResult] = await Promise.all([
    admin.from("beta_testers").select("email,max_runs,note,created_at,revoked_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("id,email,deleted_at"),
    admin.from("orders").select("buyer_id,status").eq("billing_mode", "beta_tester").neq("status", "cancelled")
  ]);
  if (testersResult.error) throw new Error("Unable to load beta testers");
  const testers = (testersResult.data ?? []) as TesterRow[];
  const profileByEmail = new Map((profilesResult.data ?? []).map((row) => [String(row.email ?? "").toLowerCase(), row]));
  const usedByBuyer = new Map<string, number>();
  for (const order of ordersResult.data ?? []) usedByBuyer.set(order.buyer_id, (usedByBuyer.get(order.buyer_id) ?? 0) + 1);
  const dateLocale = en ? "en-US" : "ko-KR";
  const productTitle = PRODUCT_COPY[BETA_TESTER_PRODUCT_ID].title[locale];
  const active = testers.filter((tester) => !tester.revoked_at);
  const signedUp = active.filter((tester) => profileByEmail.has(tester.email));

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
            [en ? "Invited" : "초대", active.length],
            [en ? "Signed up" : "가입 완료", signedUp.length],
            [en ? "Free runs used" : "무료 실행 사용", [...usedByBuyer.values()].reduce((sum, count) => sum + count, 0)],
            [en ? "Revoked" : "해제", testers.length - active.length]
          ].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>

        <section className="admin-section">
          <div className="section-heading"><h2>{en ? "Invite" : "초대 등록"}</h2></div>
          <BetaTesterInviteForm locale={locale} />
        </section>

        <section className="admin-section">
          <div className="section-heading section-heading--row"><span><h2>{en ? "Testers" : "테스터 목록"}</h2></span><span>{testers.length}</span></div>
          {!testers.length ? <div className="empty-state panel"><strong>{en ? "No testers yet." : "등록된 테스터가 없습니다."}</strong></div>
            : <div className="table-scroll panel"><table className="admin-table"><thead><tr>
                <th>{en ? "Email" : "이메일"}</th><th>{en ? "Note" : "메모"}</th><th>{en ? "Registered" : "등록일"}</th><th>{en ? "Account" : "가입"}</th><th>{en ? "Used / free" : "사용 / 무료"}</th><th>{en ? "Status" : "상태"}</th><th>{en ? "Action" : "작업"}</th>
              </tr></thead><tbody>{testers.map((tester) => {
                const account = profileByEmail.get(tester.email);
                const used = account ? usedByBuyer.get(account.id) ?? 0 : 0;
                return <tr key={tester.email}>
                  <td><strong>{tester.email}</strong></td>
                  <td>{tester.note ?? "-"}</td>
                  <td>{new Date(tester.created_at).toLocaleDateString(dateLocale)}</td>
                  <td>{account ? (account.deleted_at ? (en ? "Closed" : "탈퇴") : (en ? "Signed up" : "가입 완료")) : (en ? "Not yet" : "미가입")}</td>
                  <td>{used} / {tester.max_runs}</td>
                  <td>{tester.revoked_at ? (en ? "Revoked" : "해제됨") : used >= tester.max_runs ? (en ? "Exhausted" : "소진") : (en ? "Active" : "이용 가능")}</td>
                  <td><BetaTesterRevokeButton locale={locale} email={tester.email} revoked={Boolean(tester.revoked_at)} /></td>
                </tr>;
              })}</tbody></table></div>}
        </section>
      </div>
    </main>
  );
}
