import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { approveProvider } from "@/app/provider/actions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";

export const metadata: Metadata = { title: "운영 관리자" };

export default async function AdminPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: profile } =
    user && supabase
      ? await supabase.from("profiles").select("role").eq("id", user.id).single()
      : { data: null };
  const isDemo = !supabase && process.env.NODE_ENV === "development";
  const { data: providers } =
    (profile?.role === "admin" || isDemo) && admin
      ? await admin
          .from("provider_profiles")
          .select("id,headline,biography,expertise,verification_note,created_at,profiles!inner(display_name,email)")
          .eq("approval_status", "pending")
          .order("created_at")
      : { data: [] };

  if (profile?.role !== "admin" && !isDemo) {
    return (
      <main className="app-page">
        <SiteHeader compact />
        <div className="app-container">
          <h1>관리자 권한이 필요합니다.</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container">
        <span className="page-kicker">OPERATIONS</span>
        <h1 className="page-title">비공개 베타 운영</h1>
        <p className="page-description">
          전문가 승인, 분쟁·환불, 만료 콘텐츠를 자동 판단하지 않고 운영자가
          근거를 확인합니다.
        </p>
        <div className="admin-metrics">
          {[
            ["전문가 승인 대기", String(providers?.length ?? 0)],
            ["열린 분쟁", "0"],
            ["만료 예정 콘텐츠", "0"],
            ["정산 보류", "0"]
          ].map(([label, value]) => (
            <div className="panel" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <section className="admin-section">
          <h2>전문가 승인 대기</h2>
          {!providers?.length ? (
            <div className="empty-state panel">
              <strong>검토할 신청이 없습니다.</strong>
              <p>새 신청이 접수되면 경력·전문분야·증빙을 여기서 확인합니다.</p>
            </div>
          ) : (
            <div className="provider-review-list">
              {providers.map((provider) => (
                <article className="provider-review panel" key={provider.id}>
                  <div>
                    <span className="page-kicker">PENDING EXPERT</span>
                    <h3>{provider.headline}</h3>
                    <p>{provider.biography}</p>
                    <small>{provider.expertise.join(" · ")}</small>
                    <blockquote>{provider.verification_note}</blockquote>
                  </div>
                  <form action={approveProvider}>
                    <input type="hidden" name="providerId" value={provider.id} />
                    <button
                      className="button button--ghost"
                      name="decision"
                      value="rejected"
                    >
                      보완 요청
                    </button>
                    <button
                      className="button button--primary"
                      name="decision"
                      value="approved"
                    >
                      승인
                    </button>
                  </form>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
