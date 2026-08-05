import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { ServiceCard } from "@/components/service-card";
import { STAGES } from "@/lib/readiness";
import { getPublishedServices } from "@/lib/services";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "GTM 여정 대시보드" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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
            <p>55문항을 모두 마치시면 준비 단계와 실행 액션이 여기에 저장됩니다.</p>
            <Link href="/assessment" className="button button--primary">무료 준비도 진단</Link>
          </div>
        </div>
      </main>
    );
  }

  const [{ data: actions }, services, { data: plan }] = await Promise.all([
    admin.from("action_items")
      .select("id,title,owner_label,completion_evidence,urgency,service_tag,due_date,completed_at")
      .eq("assessment_id", assessment.id)
      .order("created_at"),
    getPublishedServices(),
    admin.from("gtm_plans")
      .select("id,status,summary,updated_at")
      .eq("assessment_id", assessment.id)
      .in("status", ["draft", "active"])
      .maybeSingle()
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

  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container dashboard">
        {incomplete && <IncompleteProfile />}
        <div className="dashboard-heading">
          <span>
            <span className="page-kicker">{organization?.name ?? "우리 회사"} · GLOBAL JOURNEY</span>
            <h1 className="page-title">{profile.display_name}님, 이어서 진출 준비를 진행하세요.</h1>
            <p className="page-description">최근 진단 결과와 아직 완료하지 않은 액션을 기준으로 정리해 드렸습니다.</p>
          </span>
          <Link href="/assessment" className="button button--primary">진단 업데이트</Link>
        </div>

        <section className="dashboard-overview">
          <article className="readiness-summary panel">
            <div className="summary-title">
              <span><small>GLOBAL READINESS</small><h2>단계별 준비도</h2></span>
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
            <span className="page-kicker">LATEST ASSESSMENT</span>
            <h2>{new Date(assessment.completed_at).toLocaleDateString("ko-KR")} 진단</h2>
            <p>{assessment.is_on_hold ? `확인이 필요한 선결 조건 ${gateMessages.length}건` : "현재 단계의 선결 조건을 모두 통과했습니다."}</p>
            <Link href="/assessment" className="button button--ghost button--full">응답 다시 보기</Link>
          </article>
        </section>

        {gateMessages.length > 0 && (
          <section className="hold-banner"><div><span>GATE CHECK</span><h2>먼저 해결해야 할 선결 조건</h2></div><ul>{gateMessages.map((message) => <li key={message}>{message}</li>)}</ul></section>
        )}

        <section className="dashboard-section">
          <div className="dashboard-section__heading">
            <span>
              <span className="page-kicker">AI GTM PLAN</span>
              <h2>{plan?.summary || "진단 결과를 30·60·90일 실행 계획으로 바꿔 보세요."}</h2>
            </span>
            <Link href={`/assistant/${assessment.id}`} className="button button--primary">
              {plan ? "AI 계획 이어가기" : "AI 계획 만들기"} →
            </Link>
          </div>
          {planItems && planItems.length > 0 && (
            <div className="dashboard-action-list">
              {planItems.slice(0, 5).map((item, index) => (
                <article className="dashboard-action panel" key={item.id}>
                  <span className="action-index">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <span className={`priority priority--${item.priority}`}>{item.priority} · {item.horizon}일</span>
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
          <div className="dashboard-section__heading"><span><span className="page-kicker">PRIORITY ACTIONS</span><h2>이번 진단의 실행 액션</h2></span></div>
          <div className="dashboard-action-list">
            {(actions ?? []).map((action, index) => (
              <article className="dashboard-action panel" key={action.id}>
                <span className="action-index">{String(index + 1).padStart(2, "0")}</span>
                <div><span className={`priority priority--${action.urgency}`}>{action.urgency}</span><h3>{action.title}</h3><p>{action.owner_label} · {action.completion_evidence}{action.due_date ? ` · ${action.due_date}` : ""}</p></div>
                <strong>{action.completed_at ? "완료" : "진행 전"}</strong>
              </article>
            ))}
          </div>
        </section>

        {recommended.length > 0 && (
          <section className="dashboard-section">
            <div className="dashboard-section__heading"><span><span className="page-kicker">RECOMMENDED</span><h2>현재 액션에 맞는 전문가 서비스</h2></span><Link href="/services" className="text-link">전체 보기 →</Link></div>
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
