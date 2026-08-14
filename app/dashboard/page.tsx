import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AnswerQuestionChart } from "@/components/answer-question-chart";
import { StageSummaryPanel } from "@/components/stage-summary-panel";
import {
  buildStageAnswerInsights,
  calculateReadiness,
  normalizeGateMessage,
  normalizeReadinessStatus,
  questionsOfStage
} from "@/lib/readiness";
import { getIntakeStages } from "@/lib/intake-questions";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";
import type { EvidenceInput, ReadinessAnswer, ReadinessLevel } from "@/lib/types";
import { localizedPath, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { stageSummarySchema, type StageSummaryStatus } from "@/lib/stage-summary";

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
  const { user, profile } = await getCurrentProfile();
  const admin = createSupabaseAdminClient();
  if (!user) redirect(`${path("/signin")}?returnTo=${encodeURIComponent(path("/dashboard"))}`);
  if (!admin) throw new Error("Supabase admin client is not configured");

  if (!profile?.organization_id) redirect(`${path("/auth/callback")}?next=${encodeURIComponent(path("/dashboard"))}`);
  const [{ data: organization }, { data: assessment }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", profile.organization_id).single(),
    admin.from("assessments")
      .select("id,overall_score,domain_scores,status_label,is_on_hold,gate_messages,completed_at,target_country,target_customer_segment,target_market_confirmed_at,stage_summary,stage_summary_status")
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

  const [{ data: plan }, { data: answerRows }] = await Promise.all([
    admin.from("gtm_plans")
      .select("id,status")
      .eq("assessment_id", assessment.id)
      .in("status", ["draft", "active"])
      .maybeSingle(),
    admin.from("readiness_answers")
      .select("question_id,level,evidence_kind,evidence_value")
      .eq("assessment_id", assessment.id)
  ]);
  const storedDomainScores = assessment.domain_scores as Record<string, number>;
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
  const displayDomainScores = readinessAnswers.length > 0
    ? readinessResult.domainScores
    : storedDomainScores;
  const displayOverallScore = readinessAnswers.length > 0
    ? readinessResult.overallScore
    : assessment.overall_score;
  const gateMessages = readinessAnswers.length > 0
    ? readinessResult.gateMessages
    : [...new Set(((assessment.gate_messages as string[]) ?? []).map(normalizeGateMessage))];
  const displayIsOnHold = readinessAnswers.length > 0
    ? readinessResult.isOnHold
    : assessment.is_on_hold;
  const storedStageSummary = stageSummarySchema.safeParse(assessment.stage_summary);
  const stageSummaryStatus = ["pending", "generating", "complete", "failed"].includes(assessment.stage_summary_status)
    ? assessment.stage_summary_status as StageSummaryStatus
    : storedStageSummary.success ? "complete" : "pending";
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
  const planHref = plan?.status === "active" ? "/journey" : `/assistant/${assessment.id}`;
  const planCta = plan?.status === "active"
    ? (en ? "View execution plan" : "실행 계획 보기")
    : plan ? (en ? "Continue AI plan" : "AI 계획 이어가기") : (en ? "Create plan with AI" : "AI로 계획 만들기");

  return (
    <main className="app-page dashboard-page">
      <SiteHeader compact locale={locale} assistantHref={`/assistant/${assessment.id}`} />
      <div className="app-container dashboard">
        {incomplete && <IncompleteProfile locale={locale} />}
        <div className="dashboard-heading">
          <span>
            <span className="page-kicker">{organization?.name ?? (en ? "YOUR COMPANY" : "우리 회사")} · {en ? "GLOBAL GTM JOURNEY" : "글로벌 진출 여정(Global Journey)"}</span>
            <h1 className="page-title">{en ? `${profile.display_name}, continue your global expansion journey.` : "준비도를 확인하시고 AI와 함께 실행계획을 작성하세요"}</h1>
            <p className="page-description">{en ? "Your latest assessment and open actions are organized below." : "최근 진단 결과와 아직 완료하지 않은 액션을 기준으로 정리해 드렸습니다."}</p>
          </span>
          <Link href={path("/assessment?new=1")} className="button button--primary">{en ? "Retake assessment" : "재진단 시작"}</Link>
        </div>

        <section className="dashboard-overview">
          <article className="readiness-summary panel">
            <div className="summary-title">
              <span><small>{en ? "GLOBAL READINESS" : "시장진입 준비도(Global Readiness)"}</small><h2>{en ? "Readiness by stage" : "단계별 준비도"}</h2></span>
              <span className="summary-score"><strong>{displayOverallScore}<span>/ 100</span></strong><small>{en ? stages.find((stage) => stage.id === readinessResult.currentStageId)?.label ?? assessmentStatus : assessmentStatus}</small></span>
            </div>
            <div className="domain-bars">
              {stages.map((stage) => (
                <div key={stage.id}>
                  <span><small>{stage.label}</small><strong>{displayDomainScores[stage.id] ?? 0}%</strong></span>
                  <div className="meter"><span style={{ width: `${displayDomainScores[stage.id] ?? 0}%` }} /></div>
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

        <StageSummaryPanel
          assessmentId={assessment.id}
          locale={locale}
          initialSummary={storedStageSummary.success ? storedStageSummary.data : null}
          initialStatus={stageSummaryStatus}
          score={displayDomainScores.early ?? 0}
        />

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
                <span><strong>{answerInsights.counts.deferred}</strong>{en ? "90-day validation" : "90일 검증 과제"}</span>
                <span><strong>{answerInsights.counts.needs_work}</strong>{en ? "Needs work" : "보완 필요"}</span>
                <span><strong>{answerInsights.counts.passed}</strong>{en ? "Passed" : "통과"}</span>
                <span><strong>{answerInsights.counts.strength}</strong>{en ? "Strengths" : "강점"}</span>
              </div>

              <article className="answer-insight-chart panel">
                <div className="answer-insight-chart__heading">
                  <span><strong>{en ? `${answerInsights.stageLabel} gate score` : `${answerInsights.stageLabel} 단계 통과 점수`}</strong><small>{en ? "Only the weighted points from Levels 3 and 4 count." : "3·4단계로 답한 문항의 가중 배점만 합산합니다."}</small></span>
                  <span><strong>{answerInsights.positiveScore} / {answerInsights.totalScore}</strong><small>{answerInsights.score}% · {en ? `Pass at ${answerInsights.thresholdScore} points (80%)` : `통과 기준 ${answerInsights.thresholdScore}점 (80%)`}</small></span>
                </div>
                <div
                  className="answer-score-meter answer-score-meter--stage"
                  role="progressbar"
                  aria-label={en ? `${answerInsights.stageLabel} gate score` : `${answerInsights.stageLabel} 단계 통과 점수`}
                  aria-valuemin={0}
                  aria-valuemax={answerInsights.totalScore}
                  aria-valuenow={answerInsights.positiveScore}
                >
                  <span style={{ width: `${answerInsights.score}%` }} />
                  <i aria-hidden="true" />
                </div>
                <AnswerQuestionChart
                  key={answerInsights.stageId}
                  answers={answerInsights.answers}
                  locale={locale}
                  stageLabel={answerInsights.stageLabel}
                />
                <p>{en ? "Formula: gate score = sum of question weights answered at Levels 3 or 4. Passing requires at least 80% of the stage maximum and every required prerequisite. Each bar shows the selected Level 1–4 response." : "산식: 단계 통과 점수 = 3·4단계로 답한 문항의 배점 합계입니다. 단계 최대점수의 80% 이상과 필수 선결 조건 충족이 모두 필요하며, 각 막대 높이는 선택한 1~4단계 응답을 나타냅니다."}</p>
                {answerInsights.counts.deferred > 0 && <p>{en ? "The 3-point paid-pilot item is excluded from the Stage 1 numerator and denominator while deferred, then becomes required evidence at Gate C." : "90일 검증 과제로 이월된 유료 실증시험 3점은 준비 1단계의 분자와 분모에서 제외하고, 단계 통과 기준 C에서 필수 증거로 확인합니다."}</p>}
              </article>

              <div className="answer-insights__cta panel">
                <span><strong>{en ? "Turn responses that need work into an execution plan." : "보완이 필요한 답변을 실행 계획으로 전환하세요."}</strong><small>{en ? "Build a plan with the AI GTM Assistant from your current assessment." : "현재 진단 결과를 바탕으로 AI GTM 어시스턴트와 계획을 만듭니다."}</small></span>
                <Link href={path(planHref)} className="button button--primary">{planCta}<span aria-hidden="true">→</span></Link>
              </div>
            </>
          )}
        </section>

      </div>
    </main>
  );
}

function IncompleteProfile({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return (
    <div className="notice-banner dashboard-profile-notice">
      <span>{en ? "Add your company details and contact information before ordering AI expert services." : "AI 전문가 서비스를 주문하시려면 회사 정보와 연락처를 먼저 입력해 주세요."}</span>
      <Link className="button button--small" href={`${localizedPath("/account/onboarding", locale)}?next=${encodeURIComponent(localizedPath("/dashboard", locale))}`}>
        {en ? "Complete profile" : "지금 입력"}<span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
