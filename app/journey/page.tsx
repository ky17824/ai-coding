import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import { JOURNEY_PHASES } from "@/lib/readiness-data";
import { StageGateBar } from "@/components/stage-gate-bar";
import { getIntakeStages } from "@/lib/intake-questions";
import { formatReadinessStatus } from "@/lib/readiness";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { matchExpertSupport } from "@/lib/expert-matching";
import { localizeStoredGtmPlan } from "@/lib/content-localization";
import { getPublishedServices } from "@/lib/services";
import type { GtmPlanItem, ServiceOffering, StoredGtmPlan } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Global GTM Journey" : "Global GTM 여정" };
}

const detailedSteps = [
  "본국 PMF 및 확장성 검증",
  "리더십 동의와 4대 약속",
  "후보 시장 선정",
  "현장 현지화(Localization) 발견",
  "사업모델 현지화 캔버스(Business Model Localization Canvas) 작성",
  "현지화 프리미엄 분석(Localization Premium Analysis) 작성",
  "총 진입비용(Total Cost of Entry) 산정",
  "글로벌 성장 발표자료(Global Growth Pitch Deck) 작성",
  "가설(Hypothesis) 검증과 반복",
  "성장동력 구축(Momentum Building)",
  "글로벌 규모 확장(Global Scaling) 3대 기둥"
];
const detailedStepsEn = [
  "Validate home-market product-market fit and scalability",
  "Align leadership on four commitments",
  "Select candidate markets",
  "Run field-based localization discovery",
  "Build a Business Model Localization Canvas",
  "Complete a Localization Premium Analysis",
  "Estimate Total Cost of Entry",
  "Build a Global Growth Pitch Deck",
  "Test and iterate on hypotheses",
  "Build momentum",
  "Establish the three pillars of global scale"
];

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const path = (value: string) => localizedPath(value, locale);
  const phases = en ? JOURNEY_PHASES.map((phase) => ({
    ...phase,
    label: phase.id === "pre_entry" ? "Pre-entry" : phase.id === "initial_entry" ? "Initial entry" : "Scale",
    description: phase.id === "pre_entry"
      ? "Validate the beachhead market and entry hypothesis with evidence."
      : phase.id === "initial_entry"
        ? "Build a repeatable pattern in which similar customers buy for the same reason."
        : "Become a repeatable organization while preserving unit economics and quality."
  })) : JOURNEY_PHASES;
  const steps = en ? detailedStepsEn : detailedSteps;
  const { user, profile } = await getCurrentProfile();
  const admin = createSupabaseAdminClient();
  let activePlan: StoredGtmPlan | null = null;
  let recommended: ServiceOffering[] = [];
  let readinessStages: Array<{ id: string; label: string; value: number }> = [];
  let currentStageId: string | undefined;
  let planItems: {
    id: string;
    horizon: number;
    priority: string;
    title: string;
    owner_label: string;
    due_date: string;
    status: string;
    expert_required: boolean;
    service_tag: string;
  }[] = [];
  if (user && admin) {
    if (profile?.organization_id) {
      const [{ data: plan }, { data: assessment }, services] = await Promise.all([
        admin.from("gtm_plans")
          .select("id,assessment_id,summary,content_locale,gtm_plan_items(id,horizon,priority,title,owner_label,due_date,status,expert_required,service_tag,sort_order)")
          .eq("organization_id", profile.organization_id)
          .eq("status", "active")
          .order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("assessments")
          .select("id,domain_scores,status_label")
          .eq("organization_id", profile.organization_id)
          .order("completed_at", { ascending: false }).limit(1).maybeSingle(),
        getPublishedServices(locale)
      ]);
      if (assessment) {
        const scores = (assessment.domain_scores ?? {}) as Record<string, number>;
        readinessStages = getIntakeStages(locale).map((stage) => ({ id: stage.id, label: stage.label, value: scores[stage.id] ?? 0 }));
        currentStageId = getIntakeStages(locale).find((stage) => stage.label === formatReadinessStatus(assessment.status_label, locale))?.id;
        const { data: actions } = await admin.from("action_items")
          .select("service_tag")
          .eq("assessment_id", assessment.id);
        const serviceTags = new Set((actions ?? []).map((action) => action.service_tag));
        recommended = services
          .filter((service) => service.tags.some((tag) => serviceTags.has(tag)))
          .slice(0, 3);
      }
      if (plan) {
        planItems = [...(plan.gtm_plan_items ?? [])].sort((a, b) =>
          a.horizon - b.horizon || a.sort_order - b.sort_order
        );
        activePlan = await localizeStoredGtmPlan(admin, profile.organization_id, {
          id: plan.id,
          assessmentId: plan.assessment_id,
          status: "active",
          summary: plan.summary,
          assumptions: [],
          founderContext: {},
          marketResearch: null,
          marketResearchConfirmedAt: null,
          recentMessages: [],
          turnCount: 0,
          generationCount: 0,
          generatedBy: "",
          contentLocale: plan.content_locale ?? "ko",
          items: planItems.map((item) => ({
            id: item.id,
            sourceActionItemId: null,
            questionId: null,
            horizon: item.horizon as 30 | 60 | 90,
            priority: item.priority as GtmPlanItem["priority"],
            title: item.title,
            rationale: "",
            ownerLabel: item.owner_label,
            dueDate: item.due_date,
            completionEvidence: "",
            dependencies: [],
            riskNote: "",
            status: item.status as GtmPlanItem["status"],
            expertRequired: item.expert_required,
            expertReason: "",
            serviceTag: item.service_tag,
            handoffBrief: "",
            sources: []
          }))
        }, locale);
      }
    }
  }
  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container">
        <span className="page-kicker">{en ? "GLOBAL GTM JOURNEY" : "글로벌 GTM 여정(Global GTM Journey)"}</span>
        <h1 className="page-title">{en ? "One flow from readiness to scale" : "진출 준비부터 확장까지 한 흐름으로"}</h1>
        <p className="page-description">
          {en ? "We group the 11 Global Class steps into three horizons. Progress depends on evidence of completion, not a fixed schedule." : "Global Class 11단계를 세 구간으로 묶었습니다. 정해진 일정이 아니라 완료를 증명할 근거가 있어야 다음 단계로 넘어갑니다."}
        </p>
        {readinessStages.length > 0 && <div className="journey-readiness"><StageGateBar stages={readinessStages} current={currentStageId} size="sm" ariaLabel={en ? "Readiness by stage" : "단계별 준비도"} /><small>{en ? "Readiness by stage · pass at 80%" : "단계별 준비도 · 통과 기준 80%"}</small></div>}
        {activePlan && activePlan.items.length > 0 ? (
          <>
            <div className="dashboard-section__heading">
              <span><span className="page-kicker">{en ? "APPROVED AI GTM PLAN" : "승인된 AI GTM 계획(Approved AI GTM Plan)"}</span><h2 className="plan-summary">{activePlan.summary}</h2></span>
              <Link className="button button--ghost" href={path(`/assistant/${activePlan.assessmentId}`)}>{en ? "Edit plan" : "계획 수정"}</Link>
            </div>
            {activePlan.translationFallback && <p className="notice-banner">{en ? "Some saved content is shown in its original language." : "일부 저장 내용은 원문으로 표시합니다."}</p>}
            <div className="journey-board">
              {[30, 60, 90].map((horizon) => (
                <section className="journey-column panel" key={horizon}>
                  <header><span>{horizon}</span><div><h2>{en ? `${horizon}-day plan` : `${horizon}일 계획`}</h2><p>{horizon === 30 ? (en ? "Add completion evidence to move to the next horizon." : "완료 근거를 남기시면 다음 구간으로 넘어갑니다.") : (en ? `Opens as ${horizon - 30}-day items are completed.` : `${horizon - 30}일 항목의 완료 근거가 쌓이면 열립니다.`)}</p></div></header>
                  <div className="journey-step-list">
                    {activePlan.items.every((item) => item.horizon !== horizon) && (
                      <p className="journey-empty">{en ? "No items in this horizon yet." : "이 구간에는 아직 항목이 없습니다."}</p>
                    )}
                    {activePlan.items.filter((item) => item.horizon === horizon).map((item, index) => {
                      const expert = matchExpertSupport({
                        title: item.title,
                        serviceTag: item.serviceTag,
                        expertRequired: item.expertRequired
                      });
                      return (
                        <article key={item.id}>
                          <span className={item.status === "completed" ? "done" : item.status === "in_progress" ? "active" : ""}>{item.status === "completed" ? "✓" : index + 1}</span>
                          <div>
                            <small>{item.priority} · {item.ownerLabel} · {item.dueDate}</small>
                            <h3>{item.title}</h3>
                            {expert.recommended && (
                              <Link
                                className="button button--soft button--small journey-expert-cta"
                                href={path(`/services?tag=${encodeURIComponent(expert.tag)}`)}
                                aria-label={en ? `Use an AI expert for ${item.title}` : `${item.title} AI 전문가 사용`}
                              >
                                {en ? "Use an AI expert" : "AI 전문가 사용"} <span aria-hidden="true">→</span>
                              </Link>
                            )}
                            {/* 사람이 확정하거나 직접 움직여야 끝나는 액션. AI 상품만 있는 동안 기대를 관리한다. */}
                            {(expert.reason === "regulated" || expert.reason === "field_execution") && (
                              <small className="journey-expert-note">
                                {expert.reason === "regulated"
                                  ? en
                                    ? "The AI research gathers official sources; a licensed expert still has to confirm the conclusion."
                                    : "AI가 공식 자료를 모아 드리지만, 최종 확정은 자격을 갖춘 전문가의 확인이 필요합니다."
                                  : en
                                    ? "The AI designs and prepares this step; the interviews and meetings themselves are yours to run."
                                    : "AI가 설계와 준비를 맡고, 실제 인터뷰와 미팅은 직접 진행하셔야 합니다."}
                              </small>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
        <div className="journey-board">
          {phases.map((phase, phaseIndex) => (
            <section className="journey-column panel" key={phase.id}>
              <header>
                <span>0{phaseIndex + 1}</span>
                <div>
                  <h2>{phase.label}</h2>
                  <p>{phase.description}</p>
                </div>
              </header>
              <div className="journey-step-list">
                {phase.steps.map((step) => (
                  <article key={step}>
                    <span className={step <= 3 ? "done" : step === 4 ? "active" : ""}>
                      {step <= 3 ? "✓" : step}
                    </span>
                    <div>
                      <small>{en ? `STEP ${step}` : `단계(Step) ${step}`}</small>
                      <h3>{steps[step - 1]}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        )}
        {recommended.length > 0 && (
          <section className="journey-recommendations" aria-labelledby="journey-recommendations-title">
            <div className="dashboard-section__heading journey-recommendations__heading">
              <span>
                <span className="page-kicker">{en ? "RECOMMENDED AI EXPERTS" : "추천 AI 전문가"}</span>
                <h2 id="journey-recommendations-title">{en ? "AI expert work matched to your current actions" : "현재 액션에 맞는 AI 전문가 서비스"}</h2>
                <p>{en ? "Continue the journey with focused research, validation, and execution support." : "현재 여정의 미완료 액션을 기준으로 조사·검증·실행 업무를 이어가세요."}</p>
              </span>
              <Link href={path("/services")} className="button button--primary button--small">
                {en ? "View all" : "전체 보기"}<span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="service-grid">
              {recommended.map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
