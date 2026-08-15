import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssessmentForm } from "@/components/assessment-form";
import { SiteHeader } from "@/components/site-header";
import { isAnswerCompatibleAcrossVersions, type SurveyVersion } from "@/lib/intake-questions";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getNewAssessmentSurveyVersion } from "@/lib/readiness-rollout";
import { getPublishedServices } from "@/lib/services";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";
import type { EvidenceInput, ReadinessAnswer, ReadinessLevel, SalesMotion, TargetMarketContext } from "@/lib/types";

export const metadata: Metadata = {
  title: "글로벌 진출 준비도 진단"
};

export default async function AssessmentPage({
  searchParams
}: {
  searchParams: Promise<{ new?: string; resume?: string }>;
}) {
  const [{ user, profile }, query, locale] = await Promise.all([getCurrentProfile(), searchParams, getRequestLocale()]);
  const availableServices = await getPublishedServices(locale);
  const surveyVersion = getNewAssessmentSurveyVersion();
  let initialAnswers: ReadinessAnswer[] = [];
  let initialTargetMarket: TargetMarketContext | undefined;
  let initialSalesMotion: SalesMotion | undefined;
  let initialRestoreMessage = "";
  const admin = user ? createSupabaseAdminClient() : null;
  if (user && query.new !== "1" && query.resume !== "1") {
    const { data: previousAssessment } = profile?.organization_id
      ? await admin!.from("assessments")
          .select("id")
          .eq("organization_id", profile.organization_id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };
    if (previousAssessment) redirect(localizedPath("/dashboard", locale));
  }
  if (query.new === "1" && admin && profile?.organization_id) {
    const { data: previousAssessment } = await admin.from("assessments")
      .select("id,target_country,target_customer_segment,target_market_confirmed_at,survey_version,sales_motion")
      .eq("organization_id", profile.organization_id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previousAssessment) {
      const { data: rows } = await admin.from("readiness_answers")
        .select("question_id,level,evidence_kind,evidence_value")
        .eq("assessment_id", previousAssessment.id);
      const previousVersion = (previousAssessment.survey_version ?? "4.0") as SurveyVersion;
      const restored = (rows ?? []).flatMap((row) => {
        const level = Number(row.level);
        if (![1, 2, 3, 4].includes(level)) return [];
        const kind = ["note", "url", "file"].includes(row.evidence_kind ?? "")
          ? row.evidence_kind as EvidenceInput["kind"]
          : null;
        return [{
          questionId: row.question_id,
          level: level as ReadinessLevel,
          evidence: kind && row.evidence_value ? { kind, value: row.evidence_value } : undefined
        }];
      });
      initialAnswers = previousVersion === surveyVersion
        ? restored
        : previousVersion === "4.0" && surveyVersion === "5.0"
          ? restored.filter((answer) =>
              isAnswerCompatibleAcrossVersions(answer.questionId, "4.0", "5.0")
            )
          : [];
      initialSalesMotion = previousVersion === surveyVersion
        ? previousAssessment.sales_motion as SalesMotion | undefined
        : surveyVersion === "5.0" ? "unknown" : undefined;
      if (previousVersion !== surveyVersion) {
        initialRestoreMessage = locale === "en"
          ? "Compatible answers were restored. Review the changed questions before submitting."
          : "그대로 사용할 수 있는 답변만 복원했습니다. 변경된 문항을 확인한 뒤 제출해 주세요.";
      }
      initialTargetMarket = {
        targetCountry: previousAssessment.target_country ?? "",
        targetCustomerSegment: previousAssessment.target_customer_segment ?? "",
        confirmedAt: previousAssessment.target_market_confirmed_at
      };
    }
  }
  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container">
        <AssessmentForm
          isSignedIn={Boolean(user)}
          resume={query.resume === "1"}
          initialAnswers={initialAnswers}
          initialTargetMarket={initialTargetMarket}
          initialSalesMotion={initialSalesMotion}
          initialRestoreMessage={initialRestoreMessage}
          surveyVersion={surveyVersion}
          locale={locale}
          availableServices={availableServices}
        />
      </div>
    </main>
  );
}
