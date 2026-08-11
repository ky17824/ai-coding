import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssessmentForm } from "@/components/assessment-form";
import { SiteHeader } from "@/components/site-header";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { getPublishedServices } from "@/lib/services";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import type { EvidenceInput, ReadinessAnswer, ReadinessLevel, TargetMarketContext } from "@/lib/types";

export const metadata: Metadata = {
  title: "글로벌 진출 준비도 진단"
};

export default async function AssessmentPage({
  searchParams
}: {
  searchParams: Promise<{ new?: string; resume?: string }>;
}) {
  const [user, query, locale] = await Promise.all([requireUser(), searchParams, getRequestLocale()]);
  const availableServices = await getPublishedServices(locale);
  let initialAnswers: ReadinessAnswer[] = [];
  let initialTargetMarket: TargetMarketContext | undefined;
  const admin = user ? createSupabaseAdminClient() : null;
  const { data: profile } = user && admin
    ? await admin.from("profiles").select("organization_id").eq("id", user.id).single()
    : { data: null };
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
      .select("id,target_country,target_customer_segment,target_market_confirmed_at")
      .eq("organization_id", profile.organization_id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previousAssessment) {
      const { data: rows } = await admin.from("readiness_answers")
        .select("question_id,level,evidence_kind,evidence_value")
        .eq("assessment_id", previousAssessment.id);
      initialAnswers = (rows ?? []).flatMap((row) => {
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
          locale={locale}
          availableServices={availableServices}
        />
      </div>
    </main>
  );
}
