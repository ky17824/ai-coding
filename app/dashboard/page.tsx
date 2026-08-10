import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import {
  STAGES,
  buildStageAnswerInsights,
  calculateReadiness,
  questionsOfStage
} from "@/lib/readiness";
import { getPublishedServices } from "@/lib/services";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import type { EvidenceInput, ReadinessAnswer, ReadinessLevel } from "@/lib/types";

export const metadata: Metadata = { title: "GTM 여정 대시보드" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ stage?: string }>;
}) {
  const query = await searchParams;
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user) redirect("/signin?returnTo=/dashboard");
  if (!admin) throw new Error("Supabase admin client is not configured");

  const { data: profile } = await admin.from("profiles")
    .select("organization_id,display_name,job_title,phone_enc")
    .eq("id", user.id).single();
  if (!profile?.organization_id) redirect("/auth/callback?next=/dashboard");
  const [{ data: organization }, { data: assessment }] = await Promise.all([
    admin.from("organizations").select("name").eq("id", profile.organization_id).single(),
    admin.from("assessments")
      .select("id,overall_score,domain_scores,status_label,is_on_hold,gate_messages,completed_at")
      .eq("organization_id", profile.organization_id)
      .order("completed_at", { ascending: false }).limit(1).maybeSingle()
  ]);
  const incomplete = !profile.job_title || !profile.phone_enc;

  if (!assessment) {
    return (
      <main className="app-page">
        <SiteHeader compact />
        <div className="app-container dashboard">
          {incomplete && <IncompleteProfile />}
          <div className="empty-state panel">
            <strong>{organization?.name ?? "우리 회사"}의 첫 진단을 시작하세요.</strong>
            <p>현재 단계의 문항을 마치면 단계 통과 기준(Stage Gate) 결과와 실행 액션이 여기에 저장됩니다.</p>
            <Link href="/assessment" className="button button--primary">무료 준비도 진단</Link>
          </div>
        </div>
      </main>
    );
  }

  const [{ data: actions }, services, { data: plan }, { data: answerRows }] = await Promise.all([
    admin.from("action_items")
      .select("id,title,owner_label,completion_evidence,urgency,service_tag,due_date,completed_at")
      .eq("assessment_id", assessment.id)
      .order("created_at"),
    getPublishedServices(),
    admin.from("gtm_plans")
      .select("id,status,summary,updated_at")
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
  const serviceTags = new Set((actions ?? []).map((action) => action.service_tag));
  const recommended = services
    .filter((service) => service.tags.some((tag) => serviceTags.has(tag)))
    .slice(0, 3);
  const domainScores = assessment.domain_scores as Record<string, number>;
  const gateMessages = assessment.gate_messages as string[];
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
  const availableStages = STAGES.filter((stage) =>
    questionsOfStage(stage.id).some((question) => answeredIds.has(question.id))
  );
  const readinessResult = calculateReadiness(readinessAnswers);
  const defaultStageId = availableStages.some(
    (stage) => stage.id === readinessResult.currentStageId
  )
    ? readinessResult.currentStageId
    : availableStages.at(-1)?.id;
  const selectedStageId = availableStages.some((stage) => stage.id === query.stage)
    ? query.stage
    : defaultStageId;
  const answerInsights = selectedStageId
    ? buildStageAnswerInsights(readinessAnswers, selectedStageId)
    : null;
  const planStatus = plan?.status === "active"
    ? "승인되어 실행 중인 계획이 있습니다."
    : plan ? "AI와 작성 중인 계획이 있습니다." : "아직 AI GTM 계획이 없습니다.";
  const planHref = plan?.status === "active" ? "/journey" : `/assistant/${assessment.id}`;
  const planCta = plan?.status === "active"
    ? "실행 계획 보기"
    : plan ? "AI 계획 이어가기" : "AI 계획 만들기";

  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container dashboard">
        {incomplete && <IncompleteProfile />}
        <div className="dashboard-heading">
          <span>
            <span className="page-kicker">{organization?.name ?? "우리 회사"} · 글로벌 진출 여정(Global Journey)</span>
            <h1 className="page-title">{profile.display_name}님, 이어서 진출 준비를 진행하세요.</h1>
            <p className="page-description">최근 진단 결과와 아직 완료하지 않은 액션을 기준으로 정리해 드렸습니다.</p>
          </span>
          <Link href="/assessment?new=1" className="button button--primary">재진단 시작</Link>
        </div>

        <section className="dashboard-overview">
          <article className="readiness-summary panel">
            <div className="summary-title">
              <span><small>시장진입 준비도(Global Readiness)</small><h2>단계별 준비도</h2></span>
              <span className="summary-score"><strong>{assessment.overall_score}</strong><small>{assessment.status_label} 단계</small></span>
            </div>
            <div className="domain-bars">
              {STAGES.map((stage) => (
                <div key={stage.id}>
                  <span><small>{stage.label}</small><strong>{domainScores[stage.id] ?? 0}%</strong></span>
                  <div className="meter"><span style={{ width: `${domainScores[stage.id] ?? 0}%` }} /></div>
                </div>
              ))}
            </div>
          </article>
          <article className="next-session panel">
            <span className="page-kicker">최근 진단(Latest Assessment)</span>
            <h2>{new Date(assessment.completed_at).toLocaleDateString("ko-KR")} 진단</h2>
            <p>{assessment.is_on_hold ? `확인이 필요한 선결 조건 ${gateMessages.length}건` : "현재 단계의 선결 조건을 모두 통과했습니다."}</p>
            <Link href="/dashboard#answer-insights" className="button button--ghost button--full">지난 응답 보기</Link>
          </article>
        </section>

        {gateMessages.length > 0 && (
          <section className="hold-banner"><div><span>단계 통과 기준(Stage Gate) 확인</span><h2>먼저 해결해야 할 선결 조건</h2></div><ul>{gateMessages.map((message) => <li key={message}>{message}</li>)}</ul></section>
        )}

        <section className="dashboard-section answer-insights" id="answer-insights">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">내 응답 진단(My Answer Review)</span>
              <h2>내 답변과 현재 준비 상태를 확인하세요.</h2>
            </span>
            {answerInsights && (
              <strong className="answer-insights__score">
                {answerInsights.stageLabel} {answerInsights.score}%
                <small>통과 기준 80%</small>
              </strong>
            )}
          </div>

          {!answerInsights ? (
            <p className="notice-banner">이전 형식으로 저장된 진단이라 개별 응답을 표시할 수 없습니다. 진단을 업데이트해 주세요.</p>
          ) : (
            <>
              <nav className="answer-stage-tabs" aria-label="진단 응답 단계">
                {availableStages.map((stage) => (
                  <Link
                    key={stage.id}
                    href={`/dashboard?stage=${stage.id}#answer-insights`}
                    className={stage.id === selectedStageId ? "is-active" : ""}
                    aria-current={stage.id === selectedStageId ? "page" : undefined}
                  >
                    {stage.label}
                  </Link>
                ))}
              </nav>

              <div className="answer-insight-counts" aria-label={`${answerInsights.stageLabel} 응답 상태 요약`}>
                <span><strong>{answerInsights.counts.blocker}</strong>필수 선결 조건</span>
                <span><strong>{answerInsights.counts.needs_work}</strong>보완 필요</span>
                <span><strong>{answerInsights.counts.passed}</strong>통과</span>
                <span><strong>{answerInsights.counts.strength}</strong>강점</span>
              </div>

              <article className="answer-insight-chart panel">
                <div className="answer-insight-chart__heading">
                  <span><strong>{answerInsights.stageLabel} 단계 응답 분포</strong><small>항목별 배점을 답변 단계에 따라 나누었습니다.</small></span>
                  <span><strong>{answerInsights.score}%</strong><small>3·4단계 통과 인정</small></span>
                </div>
                <ul>
                  {answerInsights.items.map((item) => (
                    <li key={item.id}>
                      <span><strong>{item.label}</strong><small>{item.totalWeight}점</small></span>
                      <div
                        className="answer-stack"
                        role="img"
                        aria-label={`${item.label}: ${item.segments.map((segment) => `${segment.level}단계 ${segment.weight}점`).join(", ")}`}
                      >
                        {item.segments.map((segment) => segment.weight > 0 && (
                          <span
                            key={segment.level}
                            className={`answer-stack__level answer-stack__level--${segment.level}`}
                            style={{ width: `${segment.percent}%` }}
                            title={`${segment.level}단계 ${segment.weight}점`}
                          />
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="answer-chart-legend" aria-label="답변 단계 범례">
                  <span><i className="answer-stack__level--1" />1 미인지</span>
                  <span><i className="answer-stack__level--2" />2 인지·계획</span>
                  <span><i className="answer-stack__level--3" />3 실행·사례</span>
                  <span><i className="answer-stack__level--4" />4 반복·확인</span>
                </div>
                <p>3·4단계 답변만 단계 통과 점수로 인정되며, 가중 점수 80% 이상과 필수 선결 조건 충족이 모두 필요합니다.</p>
              </article>

              <div className="answer-insight-list">
                {answerInsights.answers.map((answer) => (
                  <details className={`panel answer-insight-card answer-insight-card--${answer.status}`} key={answer.questionId}>
                    <summary>
                      <span><small>Q{String(answer.number).padStart(2, "0")}</small>{answer.question}</span>
                      <strong>{answer.statusLabel}</strong>
                    </summary>
                    <dl>
                      <div><dt>내 답변</dt><dd>{answer.answerText}</dd></div>
                      <div><dt>답변의 의미</dt><dd>{answer.meaning}</dd></div>
                      {answer.action && <div><dt>다음 행동</dt><dd>{answer.action}</dd></div>}
                      <div><dt>{answer.hasEvidence ? "제출한 증거" : "완료 기준"}</dt><dd>{answer.completionEvidence}</dd></div>
                    </dl>
                  </details>
                ))}
              </div>

              <div className="answer-insights__cta panel">
                <span><strong>보완이 필요한 답변을 실행 계획으로 전환하세요.</strong><small>현재 진단 결과를 바탕으로 AI GTM 어시스턴트와 계획을 만듭니다.</small></span>
                <Link href={planHref} className="button button--primary">{planCta} →</Link>
              </div>
            </>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">AI GTM 계획(AI GTM Plan)</span>
              <h2 className="plan-summary">{plan?.summary || "진단 결과를 단계별 실행계획(30·60·90 Day Plan)으로 바꿔 보세요."}</h2>
              <p className="page-description">{planStatus}</p>
            </span>
            <Link href={planHref} className="button button--primary">{planCta} →</Link>
          </div>
          {planItems && planItems.length > 0 && (
            <div className="dashboard-action-list">
              {planItems.slice(0, 5).map((item, index) => (
                <article className="dashboard-action panel" key={item.id}>
                  <span className="action-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span className={`priority priority--${item.priority}`}>{item.priority === "P0" ? "우선순위 0(Priority 0)" : "우선순위 1(Priority 1)"} · {item.horizon}일</span>
                    <h3>{item.title}</h3>
                    <p>{item.owner_label} · {item.due_date}{item.expert_required ? " · 전문가 확인 필요" : ""}</p>
                  </div>
                  <strong>{item.status === "completed" ? "완료" : item.status === "in_progress" ? "진행 중" : "진행 전"}</strong>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section__heading"><span><span className="page-kicker">우선 실행항목(Priority Actions)</span><h2>이번 진단의 실행 액션</h2></span></div>
          <div className="dashboard-action-list">
            {(actions ?? []).map((action, index) => (
              <article className="dashboard-action panel" key={action.id}>
                <span className="action-index">{String(index + 1).padStart(2, "0")}</span>
                <div><span className={`priority priority--${action.urgency}`}>{action.urgency === "P0" ? "우선순위 0(Priority 0)" : "우선순위 1(Priority 1)"}</span><h3>{action.title}</h3><p>{action.owner_label} · {action.completion_evidence}{action.due_date ? ` · ${action.due_date}` : ""}</p></div>
                <strong>{action.completed_at ? "완료" : "진행 전"}</strong>
              </article>
            ))}
          </div>
        </section>

        {recommended.length > 0 && (
          <section className="dashboard-section">
            <div className="dashboard-section__heading"><span><span className="page-kicker">추천(Recommended)</span><h2>현재 액션에 맞는 전문가 서비스</h2></span><Link href="/services" className="text-link">전체 보기 →</Link></div>
            <div className="service-grid">{recommended.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
          </section>
        )}
      </div>
    </main>
  );
}

function IncompleteProfile() {
  return <p className="notice-banner">전문가 서비스를 주문하시려면 회사 정보와 연락처를 먼저 입력해 주세요. <Link href="/account/onboarding?next=/dashboard">지금 입력 →</Link></p>;
}
