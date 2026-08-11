import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import {
  buildStageAnswerInsights,
  calculateReadiness,
  normalizeGateMessage,
  normalizeReadinessStatus,
  questionsOfStage
} from "@/lib/readiness";
import { getIntakeItems, getIntakeQuestions, getIntakeStages } from "@/lib/intake-questions";
import { getPublishedServices } from "@/lib/services";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import type { EvidenceInput, GtmPlanItem, ReadinessAnswer, ReadinessLevel, StoredGtmPlan } from "@/lib/types";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { localizeStoredGtmPlan } from "@/lib/content-localization";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "GTM Journey Dashboard" : "GTM 여정 대시보드" };
}
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const query = await searchParams;
  const locale = await getRequestLocale();
  const en = locale === "en";
  const path = (value: string) => localizedPath(value, locale);
  const stages = getIntakeStages(locale);
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user) redirect(`${path("/signin")}?returnTo=${encodeURIComponent(path("/dashboard"))}`);
  if (!admin) throw new Error("Supabase admin client is not configured");

  const { data: profile } = await admin.from("profiles")
    .select("organization_id,display_name,job_title,phone_enc")
    .eq("id", user.id).single();
  if (!profile?.organization_id) redirect(`${path("/auth/callback")}?next=${encodeURIComponent(path("/dashboard"))}`);
  const [{ data: organization }, { data: assessment }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", profile.organization_id).single(),
    admin.from("assessments")
      .select("id,overall_score,domain_scores,status_label,is_on_hold,gate_messages,completed_at,target_country,target_customer_segment,target_market_confirmed_at")
      .eq("organization_id", profile.organization_id)
      .order("completed_at", { ascending: false }).limit(1).maybeSingle()
  ]);
  const incomplete = !profile.job_title || !profile.phone_enc;

  if (!assessment) {
    return (
      <main className="app-page dashboard-page">
        <SiteHeader compact locale={locale} />
        <div className="app-container dashboard">
          {incomplete && <IncompleteProfile locale={locale} />}
          <div className="empty-state panel">
            <strong>{en ? `Start ${organization?.name ?? "your company's"} first assessment.` : `${organization?.name ?? "우리 회사"}의 첫 진단을 시작하세요.`}</strong>
            <p>{en ? "Complete the current stage to save your stage-gate result and next actions here." : "현재 단계의 문항을 마치면 단계 통과 기준(Stage Gate) 결과와 실행 액션이 여기에 저장됩니다."}</p>
            <Link href={path("/assessment")} className="button button--primary">{en ? "Start readiness assessment" : "무료 준비도 진단"}</Link>
          </div>
        </div>
      </main>
    );
  }

  const [{ data: actions }, services, { data: plan }, { data: answerRows }] = await Promise.all([
    admin.from("action_items")
      .select("id,question_id,title,owner_label,completion_evidence,urgency,service_tag,due_date,completed_at")
      .eq("assessment_id", assessment.id)
      .order("created_at"),
    getPublishedServices(locale),
    admin.from("gtm_plans")
      .select("id,status,summary,updated_at,content_locale")
      .eq("assessment_id", assessment.id)
      .in("status", ["draft", "active"])
      .maybeSingle(),
    admin.from("readiness_answers")
      .select("question_id,level,evidence_kind,evidence_value")
      .eq("assessment_id", assessment.id)
  ]);
  const { data: planItems } = plan
    ? await admin.from("gtm_plan_items")
        .select("id,horizon,priority,title,owner_label,due_date,status,expert_required,service_tag")
        .eq("plan_id", plan.id)
        .order("horizon")
        .order("sort_order")
    : { data: null };
  const localizedPlan = plan ? await localizeStoredGtmPlan(
    admin,
    profile.organization_id,
    {
      id: plan.id,
      assessmentId: assessment.id,
      status: plan.status,
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
      items: (planItems ?? []).map((item) => ({
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
    } satisfies StoredGtmPlan,
    locale
  ) : null;
  const displayPlanItems = localizedPlan?.items ?? [];
  const questionCatalog = new Map(getIntakeQuestions(locale).map((question) => [question.id, question]));
  const itemCatalog = new Map(getIntakeItems(locale).map((item) => [item.id, item]));
  const displayActions = (actions ?? []).map((action) => {
    const question = action.question_id ? questionCatalog.get(action.question_id) : null;
    const item = question ? itemCatalog.get(question.itemId) : null;
    return {
      ...action,
      title: question?.action ?? action.title,
      owner_label: item?.owner ?? action.owner_label,
      completion_evidence: question?.followUp ?? action.completion_evidence
    };
  });
  const serviceTags = new Set((actions ?? []).map((action) => action.service_tag));
  const recommended = services
    .filter((service) => service.tags.some((tag) => serviceTags.has(tag)))
    .slice(0, 3);
  const domainScores = assessment.domain_scores as Record<string, number>;
  const assessmentStatus = normalizeReadinessStatus(assessment.status_label);
  const readinessAnswers: ReadinessAnswer[] = (answerRows ?? []).flatMap((row) => {
    const level = Number(row.level);
    if (![1, 2, 3, 4].includes(level)) return [];
    const kind = ["note", "url", "file"].includes(row.evidence_kind ?? "")
      ? row.evidence_kind as EvidenceInput["kind"]
      : null;
    return [{
      questionId: row.question_id,
      level: level as ReadinessLevel,
      evidence: kind && row.evidence_value
        ? { kind, value: row.evidence_value }
        : undefined
    }];
  });
  const answeredIds = new Set(readinessAnswers.map((answer) => answer.questionId));
  const availableStages = stages.filter((stage) =>
    questionsOfStage(stage.id, locale).some((question) => answeredIds.has(question.id))
  );
  const readinessResult = calculateReadiness(readinessAnswers, {
    targetCountry: assessment.target_country ?? "",
    targetCustomerSegment: assessment.target_customer_segment ?? "",
    confirmedAt: assessment.target_market_confirmed_at
  }, locale);
  const gateMessages = readinessAnswers.length > 0
    ? readinessResult.gateMessages
    : [...new Set(((assessment.gate_messages as string[]) ?? []).map(normalizeGateMessage))];
  const displayIsOnHold = readinessAnswers.length > 0
    ? readinessResult.isOnHold
    : assessment.is_on_hold;
  const targetPrerequisites = [
    { label: en ? "Initial target country" : "초기 목표국가", value: assessment.target_country },
    { label: en ? "Target customer segment" : "목표 고객군", value: assessment.target_customer_segment }
  ];
  const showTargetPrerequisites = readinessResult.currentStageId === "preparing" &&
    targetPrerequisites.some((entry) => !entry.value || !assessment.target_market_confirmed_at);
  const questionGateMessages = gateMessages.filter(
    (message) => ![
      "초기 목표국가를 확정해 주세요.",
      "초기 목표국가의 목표 고객군을 확정해 주세요.",
      "초기 목표시장 정보를 확인해 주세요.",
      "Confirm your initial target country.",
      "Confirm the initial customer segment in your target country.",
      "Confirm the initial target-market information."
    ].includes(message)
  );
  const defaultStageId = availableStages.some(
    (stage) => stage.id === readinessResult.currentStageId
  )
    ? readinessResult.currentStageId
    : availableStages.at(-1)?.id;
  const selectedStageId = availableStages.some((stage) => stage.id === query.stage)
    ? query.stage
    : defaultStageId;
  const answerInsights = selectedStageId
    ? buildStageAnswerInsights(readinessAnswers, selectedStageId, locale)
    : null;
  const planStatus = plan?.status === "active"
    ? (en ? "You have an approved plan in progress." : "승인되어 실행 중인 계획이 있습니다.")
    : plan ? (en ? "You have a plan in progress with the AI assistant." : "AI와 작성 중인 계획이 있습니다.") : (en ? "You have not created an AI GTM plan yet." : "아직 AI GTM 계획이 없습니다.");
  const planHref = plan?.status === "active" ? "/journey" : `/assistant/${assessment.id}`;
  const planCta = plan?.status === "active"
    ? (en ? "View execution plan" : "실행 계획 보기")
    : plan ? (en ? "Continue AI plan" : "AI 계획 이어가기") : (en ? "Create AI plan" : "AI 계획 만들기");

  return (
    <main className="app-page dashboard-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container dashboard">
        {incomplete && <IncompleteProfile locale={locale} />}
        <div className="dashboard-heading">
          <span>
            <span className="page-kicker">{organization?.name ?? (en ? "YOUR COMPANY" : "우리 회사")} · {en ? "GLOBAL GTM JOURNEY" : "글로벌 진출 여정(Global Journey)"}</span>
            <h1 className="page-title">{en ? `${profile.display_name}, continue your global expansion journey.` : `${profile.display_name}님, 이어서 진출 준비를 진행하세요.`}</h1>
            <p className="page-description">{en ? "Your latest assessment and open actions are organized below." : "최근 진단 결과와 아직 완료하지 않은 액션을 기준으로 정리해 드렸습니다."}</p>
          </span>
          <Link href={path("/assessment?new=1")} className="button button--primary">{en ? "Retake assessment" : "재진단 시작"}</Link>
        </div>

        <section className="dashboard-overview">
          <article className="readiness-summary panel">
            <div className="summary-title">
              <span><small>{en ? "GLOBAL READINESS" : "시장진입 준비도(Global Readiness)"}</small><h2>{en ? "Readiness by stage" : "단계별 준비도"}</h2></span>
              <span className="summary-score"><strong>{assessment.overall_score}</strong><small>{en ? stages.find((stage) => stage.id === readinessResult.currentStageId)?.label ?? assessmentStatus : assessmentStatus}</small></span>
            </div>
            <div className="domain-bars">
              {stages.map((stage) => (
                <div key={stage.id}>
                  <span><small>{stage.label}</small><strong>{domainScores[stage.id] ?? 0}%</strong></span>
                  <div className="meter"><span style={{ width: `${domainScores[stage.id] ?? 0}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
          <article className="next-session panel">
            <span className="page-kicker">{en ? "LATEST ASSESSMENT" : "최근 진단(Latest Assessment)"}</span>
            <h2>{new Date(assessment.completed_at).toLocaleDateString(en ? "en-US" : "ko-KR")} {en ? "assessment" : "진단"}</h2>
            <p>{displayIsOnHold ? (en ? `${gateMessages.length} prerequisite${gateMessages.length === 1 ? "" : "s"} need attention` : `확인이 필요한 선결 조건 ${gateMessages.length}건`) : (en ? "You have passed every prerequisite for this stage." : "현재 단계의 선결 조건을 모두 통과했습니다.")}</p>
            <Link href={path("/dashboard#answer-insights")} className="button button--ghost button--full">{en ? "Review previous answers" : "지난 응답 보기"}</Link>
          </article>
        </section>

        {gateMessages.length > 0 && (
          <section className="hold-banner hold-banner--dashboard">
            <div>
              <span>{en ? "STAGE GATE REVIEW" : "단계 통과 기준(Stage Gate) 확인"}</span>
              <h2>{en ? "Prerequisites to resolve first" : "먼저 해결해야 할 선결 조건"}</h2>
              <strong>{en ? `${gateMessages.length} remaining` : `${gateMessages.length}개 남음`}</strong>
            </div>
            <div className="hold-banner__content">
              {showTargetPrerequisites && (
                <div className="gate-prerequisites">
                  <header><strong>{en ? "Define your initial target market" : "초기 목표시장 정의"}</strong><small>{targetPrerequisites.filter((entry) => entry.value && assessment.target_market_confirmed_at).length}/2</small></header>
                  <ul>
                    {targetPrerequisites.map((entry) => (
                      <li key={entry.label}><span>{entry.label}</span><strong>{entry.value && assessment.target_market_confirmed_at ? (en ? "Confirmed" : "확정") : (en ? "Not confirmed" : "미확정")}</strong></li>
                    ))}
                  </ul>
                  <Link href={path("/assessment?new=1")} className="button button--small">
                    {en ? "Set initial target market" : "초기 목표시장 정하기"}<span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
              <div>
                <strong>{en ? "Assessment responses" : "진단 답변"}</strong>
                {questionGateMessages.length > 0
                  ? <ul>{questionGateMessages.map((message) => <li key={message}>{message}</li>)}</ul>
                  : <p>{en ? "Question scores and required evidence conditions are satisfied." : "질문 점수와 필수 근거 조건은 충족했습니다."}</p>}
              </div>
            </div>
          </section>
        )}

        <section className="dashboard-section answer-insights" id="answer-insights">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">{en ? "MY ANSWER REVIEW" : "내 응답 진단(My Answer Review)"}</span>
              <h2>{en ? "Review your answers and current readiness." : "내 답변과 현재 준비 상태를 확인하세요."}</h2>
            </span>
            {answerInsights && (
              <strong className="answer-insights__score">
                {answerInsights.stageLabel} {answerInsights.score}%
                <small>{en ? "Pass threshold: 80%" : "통과 기준 80%"}</small>
              </strong>
            )}
          </div>

          {!answerInsights ? (
            <p className="notice-banner">{en ? "This assessment was saved in an older format, so individual responses are unavailable. Please update the assessment." : "이전 형식으로 저장된 진단이라 개별 응답을 표시할 수 없습니다. 진단을 업데이트해 주세요."}</p>
          ) : (
            <>
              <nav className="answer-stage-tabs" aria-label={en ? "Assessment response stages" : "진단 응답 단계"}>
                {availableStages.map((stage) => (
                  <Link
                    key={stage.id}
                    href={path(`/dashboard?stage=${stage.id}#answer-insights`)}
                    className={stage.id === selectedStageId ? "is-active" : ""}
                    aria-current={stage.id === selectedStageId ? "page" : undefined}
                  >
                    {stage.label}
                  </Link>
                ))}
              </nav>

              <div className="answer-insight-counts" aria-label={en ? `${answerInsights.stageLabel} response summary` : `${answerInsights.stageLabel} 응답 상태 요약`}>
                <span><strong>{answerInsights.counts.blocker}</strong>{en ? "Required prerequisites" : "필수 선결 조건"}</span>
                <span><strong>{answerInsights.counts.needs_work}</strong>{en ? "Needs work" : "보완 필요"}</span>
                <span><strong>{answerInsights.counts.passed}</strong>{en ? "Passed" : "통과"}</span>
                <span><strong>{answerInsights.counts.strength}</strong>{en ? "Strengths" : "강점"}</span>
              </div>

              <article className="answer-insight-chart panel">
                <div className="answer-insight-chart__heading">
                  <span><strong>{en ? `${answerInsights.stageLabel} response distribution` : `${answerInsights.stageLabel} 응답 분포`}</strong><small>{en ? "Weighted points are grouped by response level." : "항목별 배점을 답변 단계에 따라 나누었습니다."}</small></span>
                  <span><strong>{answerInsights.score}%</strong><small>{en ? "Levels 3 and 4 count toward passing" : "3·4단계 통과 인정"}</small></span>
                </div>
                <ul>
                  {answerInsights.items.map((item) => (
                    <li key={item.id}>
                      <span><strong>{item.label}</strong><small>{item.totalWeight} {en ? "points" : "점"}</small></span>
                      <div
                        className="answer-stack"
                        role="img"
                        aria-label={`${item.label}: ${item.segments.map((segment) => en ? `Level ${segment.level}, ${segment.weight} points` : `${segment.level}단계 ${segment.weight}점`).join(", ")}`}
                      >
                        {item.segments.map((segment) => segment.weight > 0 && (
                          <span
                            key={segment.level}
                            className={`answer-stack__level answer-stack__level--${segment.level}`}
                            style={{ width: `${segment.percent}%` }}
                            title={en ? `Level ${segment.level}, ${segment.weight} points` : `${segment.level}단계 ${segment.weight}점`}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="answer-chart-legend" aria-label={en ? "Response-level legend" : "답변 단계 범례"}>
                  <span><i className="answer-stack__level--1" />{en ? "1 Not started" : "1 미인지"}</span>
                  <span><i className="answer-stack__level--2" />{en ? "2 Aware / planned" : "2 인지·계획"}</span>
                  <span><i className="answer-stack__level--3" />{en ? "3 Executed" : "3 실행·사례"}</span>
                  <span><i className="answer-stack__level--4" />{en ? "4 Repeatable / verified" : "4 반복·확인"}</span>
                </div>
                <p>{en ? "Only Levels 3 and 4 count toward the stage gate. Passing requires at least 80% of weighted points and every required prerequisite." : "3·4단계 답변만 단계 통과 점수로 인정되며, 가중 점수 80% 이상과 필수 선결 조건 충족이 모두 필요합니다."}</p>
              </article>

              <div className="answer-insight-list">
                {answerInsights.answers.map((answer) => (
                  <details className={`panel answer-insight-card answer-insight-card--${answer.status}`} key={answer.questionId}>
                    <summary>
                      <span><small>Q{String(answer.number).padStart(2, "0")}</small>{answer.question}</span>
                      <strong>{answer.statusLabel}</strong>
                    </summary>
                    <dl>
                      <div><dt>{en ? "My answer" : "내 답변"}</dt><dd>{answer.answerText}</dd></div>
                      <div><dt>{en ? "What it means" : "답변의 의미"}</dt><dd>{answer.meaning}</dd></div>
                      {answer.action && <div><dt>{en ? "Next action" : "다음 행동"}</dt><dd>{answer.action}</dd></div>}
                      <div><dt>{answer.hasEvidence ? (en ? "Submitted evidence" : "제출한 증거") : (en ? "Definition of done" : "완료 기준")}</dt><dd>{answer.completionEvidence}</dd></div>
                    </dl>
                  </details>
                ))}
              </div>

              <div className="answer-insights__cta panel">
                <span><strong>{en ? "Turn responses that need work into an execution plan." : "보완이 필요한 답변을 실행 계획으로 전환하세요."}</strong><small>{en ? "Build a plan with the AI GTM Assistant from your current assessment." : "현재 진단 결과를 바탕으로 AI GTM 어시스턴트와 계획을 만듭니다."}</small></span>
                <Link href={path(planHref)} className="button button--primary">{planCta}<span aria-hidden="true">→</span></Link>
              </div>
            </>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">{en ? "AI GTM PLAN" : "AI GTM 계획(AI GTM Plan)"}</span>
              <h2 className="plan-summary">{localizedPlan?.summary || (en ? "Turn your assessment into a staged 30-, 60-, and 90-day execution plan." : "진단 결과를 단계별 실행계획(30·60·90 Day Plan)으로 바꿔 보세요.")}</h2>
              <p className="page-description">{planStatus}</p>
              {localizedPlan?.translationFallback && <p className="notice-banner">{en ? "Some saved content is shown in its original language." : "일부 저장 내용은 원문으로 표시합니다."}</p>}
            </span>
            <Link href={path(planHref)} className="button button--primary">{planCta}<span aria-hidden="true">→</span></Link>
          </div>
          {displayPlanItems.length > 0 && (
            <div className="dashboard-action-list">
              {displayPlanItems.slice(0, 5).map((item, index) => (
                <article className="dashboard-action panel" key={item.id}>
                  <span className="action-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span className={`priority priority--${item.priority}`}>{item.priority === "P0" ? (en ? "Priority 0" : "우선순위 0(Priority 0)") : (en ? "Priority 1" : "우선순위 1(Priority 1)")} · {item.horizon} {en ? "days" : "일"}</span>
                    <h3>{item.title}</h3>
                    <p>{item.ownerLabel} · {item.dueDate}{item.expertRequired ? (en ? " · Expert review required" : " · 전문가 확인 필요") : ""}</p>
                  </div>
                  <strong>{item.status === "completed" ? (en ? "Complete" : "완료") : item.status === "in_progress" ? (en ? "In progress" : "진행 중") : (en ? "Not started" : "진행 전")}</strong>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__heading"><span><span className="page-kicker">{en ? "PRIORITY ACTIONS" : "우선 실행항목(Priority Actions)"}</span><h2>{en ? "Actions from this assessment" : "이번 진단의 실행 액션"}</h2></span></div>
          <div className="dashboard-action-list">
            {displayActions.map((action, index) => (
              <article className="dashboard-action panel" key={action.id}>
                <span className="action-index">{String(index + 1).padStart(2, "0")}</span>
                <div><span className={`priority priority--${action.urgency}`}>{action.urgency === "P0" ? (en ? "Priority 0" : "우선순위 0(Priority 0)") : (en ? "Priority 1" : "우선순위 1(Priority 1)")}</span><h3>{action.title}</h3><p>{action.owner_label} · {action.completion_evidence}{action.due_date ? ` · ${action.due_date}` : ""}</p></div>
                <strong>{action.completed_at ? (en ? "Complete" : "완료") : (en ? "Not started" : "진행 전")}</strong>
              </article>
            ))}
          </div>
        </section>

        {recommended.length > 0 && (
          <section className="dashboard-section">
            <div className="dashboard-section__heading"><span><span className="page-kicker">{en ? "RECOMMENDED" : "추천(Recommended)"}</span><h2>{en ? "Experts matched to your current actions" : "현재 액션에 맞는 전문가 서비스"}</h2></span><Link href={path("/services")} className="button button--small">{en ? "View all" : "전체 보기"}<span aria-hidden="true">→</span></Link></div>
            <div className="service-grid">{recommended.map((service) => <ServiceCard key={service.id} service={service} locale={locale} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}

function IncompleteProfile({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <div className="notice-banner dashboard-profile-notice">
      <span>{en ? "Add your company details and contact information before ordering expert services." : "전문가 서비스를 주문하시려면 회사 정보와 연락처를 먼저 입력해 주세요."}</span>
      <Link className="button button--small" href={`${localizedPath("/account/onboarding", locale)}?next=${encodeURIComponent(localizedPath("/dashboard", locale))}`}>
        {en ? "Complete profile" : "지금 입력"}<span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
