import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { JOURNEY_PHASES } from "@/lib/readiness-data";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Global GTM 여정" };

const detailedSteps = [
  "본국 PMF 및 확장성 검증",
  "리더십 동의와 4대 약속",
  "후보 시장 선정",
  "현장 현지화 발견",
  "BMLC 작성",
  "LPA 작성",
  "총 진입비용 산정",
  "글로벌 성장 피치덱",
  "가설 검증과 반복",
  "모멘텀 빌더 구축",
  "글로벌 스케일 3대 기둥"
];

export const dynamic = "force-dynamic";

export default async function JourneyPage() {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  let activePlan: { id: string; assessment_id: string; summary: string } | null = null;
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
    const { data: profile } = await admin.from("profiles")
      .select("organization_id").eq("id", user.id).single();
    if (profile?.organization_id) {
      const { data: plan } = await admin.from("gtm_plans")
        .select("id,assessment_id,summary")
        .eq("organization_id", profile.organization_id)
        .eq("status", "active")
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      activePlan = plan;
      if (plan) {
        const { data } = await admin.from("gtm_plan_items")
          .select("id,horizon,priority,title,owner_label,due_date,status,expert_required,service_tag")
          .eq("plan_id", plan.id).order("horizon").order("sort_order");
        planItems = data ?? [];
      }
    }
  }
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container">
        <span className="page-kicker">GLOBAL GTM JOURNEY</span>
        <h1 className="page-title">진출 준비부터 확장까지 한 흐름으로</h1>
        <p className="page-description">
          Global Class 11단계를 세 구간으로 묶었습니다. 정해진 일정이 아니라
          완료를 증명할 근거가 있어야 다음 단계로 넘어갑니다.
        </p>
        {activePlan && planItems.length > 0 ? (
          <>
            <div className="dashboard-section__heading">
              <span><span className="page-kicker">APPROVED AI GTM PLAN</span><h2>{activePlan.summary}</h2></span>
              <Link className="button button--ghost" href={`/assistant/${activePlan.assessment_id}`}>계획 수정</Link>
            </div>
            <div className="journey-board">
              {[30, 60, 90].map((horizon) => (
                <section className="journey-column panel" key={horizon}>
                  <header><span>{horizon}</span><div><h2>{horizon}일 계획</h2><p>완료 근거를 남기시면 다음 구간으로 넘어갑니다.</p></div></header>
                  <div className="journey-step-list">
                    {planItems.filter((item) => item.horizon === horizon).map((item, index) => (
                      <article key={item.id}>
                        <span className={item.status === "completed" ? "done" : item.status === "in_progress" ? "active" : ""}>{item.status === "completed" ? "✓" : index + 1}</span>
                        <div><small>{item.priority} · {item.owner_label} · {item.due_date}</small><h3>{item.title}</h3>{item.expert_required && <Link href={`/services?tag=${encodeURIComponent(item.service_tag)}`}>전문가 연결 →</Link>}</div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        ) : (
        <div className="journey-board">
          {JOURNEY_PHASES.map((phase, phaseIndex) => (
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
                      <small>STEP {step}</small>
                      <h3>{detailedSteps[step - 1]}</h3>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
        )}
      </div>
    </main>
  );
}
