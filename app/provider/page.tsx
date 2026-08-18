import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { ProviderForm } from "@/components/provider-form";
import { ServiceOfferingForm } from "@/components/service-offering-form";
import { getRequestLocale } from "@/lib/i18n-server";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Expert Center" : "전문가 센터" };
}

export default async function ProviderPage() {
  const [user, locale] = await Promise.all([requireUser(), getRequestLocale()]);
  const en = locale === "en";
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
      <SiteHeader compact locale={locale} />
      <div className="app-container narrow-container">
        <span className="page-kicker">EXPERT CENTER</span>
        <h1 className="page-title">{en ? "Turn proven experience into an actionable service" : "검증된 경험을 실행 가능한 서비스로"}</h1>
        <p className="page-description">
          {en ? "We do not support open listings. Our operations team reviews each expert's experience and scope before publishing approved experts and standardized services." : "공개 등록은 지원하지 않습니다. 운영팀이 경력과 제공 범위를 검토한 뒤 승인된 전문가와 표준 서비스만 공개합니다."}
        </p>
        {application ? (
          <>
            <section className="application-status panel">
              <span className="page-kicker">{en ? "APPLICATION STATUS" : "신청 상태"}</span>
              <h2>{application.headline}</h2>
              <strong>
                {application.approval_status === "approved"
                  ? en ? "Approved" : "승인 완료"
                  : application.approval_status === "rejected"
                    ? en ? "Changes requested" : "보완 필요"
                    : en ? "Under review" : "검토 대기"}
              </strong>
              <p>
                {en ? "Once approved, you can register the service type, price, deliverables, milestones, and payout details." : "승인 후 서비스 유형, 가격, 산출물, 단계별 실행목표(Milestone)와 정산 정보를 등록할 수 있습니다."}
              </p>
            </section>
            {application.approval_status === "approved" && (
              <ServiceOfferingForm locale={locale} />
            )}
          </>
        ) : (
          <ProviderForm locale={locale} />
        )}
      </div>
    </main>
  );
}
