import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ProviderForm } from "@/components/provider-form";
import { ServiceOfferingForm } from "@/components/service-offering-form";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "전문가 센터" };

export default async function ProviderPage() {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const { data: application } =
    user && supabase
      ? await supabase
          .from("provider_profiles")
          .select("approval_status,headline,created_at")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };

  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container narrow-container">
        <span className="page-kicker">EXPERT CENTER</span>
        <h1 className="page-title">검증된 경험을 실행 가능한 서비스로</h1>
        <p className="page-description">
          공개 등록은 지원하지 않습니다. 운영팀이 경력과 제공 범위를 검토한
          뒤 승인된 전문가와 표준 서비스만 공개합니다.
        </p>
        {application ? (
          <>
            <section className="application-status panel">
              <span className="page-kicker">APPLICATION STATUS</span>
              <h2>{application.headline}</h2>
              <strong>
                {application.approval_status === "approved"
                  ? "승인 완료"
                  : application.approval_status === "rejected"
                    ? "보완 필요"
                    : "검토 대기"}
              </strong>
              <p>
                승인 후 서비스 유형, 가격, 산출물, 단계별 실행목표(Milestone)와 정산 정보를
                등록할 수 있습니다.
              </p>
            </section>
            {application.approval_status === "approved" && (
              <ServiceOfferingForm />
            )}
          </>
        ) : (
          <ProviderForm />
        )}
      </div>
    </main>
  );
}
