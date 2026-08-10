import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PhoneReveal } from "@/components/phone-reveal";
import { SiteHeader } from "@/components/site-header";
import { INTAKE_QUESTIONS } from "@/lib/intake-questions";
import { normalizeReadinessStatus } from "@/lib/readiness";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";

export const metadata: Metadata = { title: "기업 운영 상세" };
export const dynamic = "force-dynamic";

export default async function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: actor } = user && supabase
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  if (actor?.role !== "admin") redirect("/dashboard");
  if (!admin) throw new Error("Supabase admin client is not configured");
  const { id } = await params;
  const [{ data: organization }, { data: profiles }, { data: assessments }, { data: actions }, { data: orders }] = await Promise.all([
    admin.from("organizations").select("id,name,created_at").eq("id", id).maybeSingle(),
    admin.from("profiles").select("id,display_name,email,job_title,created_at,deleted_at").eq("organization_id", id),
    admin.from("assessments").select("id,overall_score,domain_scores,status_label,gate_messages,completed_at").eq("organization_id", id).order("completed_at", { ascending: false }),
    admin.from("action_items").select("id,title,owner_label,completion_evidence,service_tag,urgency,due_date,completed_at").eq("organization_id", id).order("created_at", { ascending: false }),
    admin.from("orders").select("id,status,amount_krw,service_snapshot,created_at,service_started_at,completed_at").eq("organization_id", id).order("created_at", { ascending: false })
  ]);
  if (!organization) notFound();
  const assessmentIds = (assessments ?? []).map((assessment) => assessment.id);
  const orderIds = (orders ?? []).map((order) => order.id);
  const [{ data: answers }, { data: settlements }, { data: reviews }] = await Promise.all([
    assessmentIds.length ? admin.from("readiness_answers").select("assessment_id,question_id,level,evidence_kind,evidence_value").in("assessment_id", assessmentIds) : Promise.resolve({ data: [] }),
    orderIds.length ? admin.from("settlements").select("order_id,status,payout_amount_krw,paid_at").in("order_id", orderIds) : Promise.resolve({ data: [] }),
    orderIds.length ? admin.from("reviews").select("order_id,rating,body,status,created_at").in("order_id", orderIds) : Promise.resolve({ data: [] })
  ]);
  const contact = (profiles ?? []).find((profile) => !profile.deleted_at) ?? profiles?.[0];
  const latest = assessments?.[0];
  const questionById = new Map(INTAKE_QUESTIONS.map((question) => [question.id, question]));

  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container admin-company">
        <Link href="/admin" className="text-link">← 기업 목록</Link>
        <span className="page-kicker">기업 운영(Company Operations)</span>
        <h1 className="page-title">{organization.name}</h1>
        <div className="company-summary panel">
          <div><span>담당자</span><strong>{contact?.display_name ?? "-"}</strong><small>{contact?.job_title ?? "직위 미등록"} · {contact?.email ?? ""}</small></div>
          <div><span>최근 진단</span><strong>{latest ? normalizeReadinessStatus(latest.status_label) : "미진단"}</strong><small>{latest ? `${latest.overall_score}점 · ${new Date(latest.completed_at).toLocaleDateString("ko-KR")}` : ""}</small></div>
          <div><span>연락처</span>{contact ? <PhoneReveal profileId={contact.id} /> : <strong>-</strong>}</div>
        </div>

        <section className="admin-section"><h2>진단 이력</h2><div className="table-scroll panel"><table className="admin-table"><thead><tr><th>일자</th><th>단계</th><th>총점</th><th>단계 통과 기준(Stage Gate)</th></tr></thead><tbody>{(assessments ?? []).map((assessment) => <tr key={assessment.id}><td>{new Date(assessment.completed_at).toLocaleDateString("ko-KR")}</td><td>{normalizeReadinessStatus(assessment.status_label)}</td><td>{assessment.overall_score}</td><td>{(assessment.gate_messages as string[]).length}</td></tr>)}</tbody></table></div></section>

        {latest && <section className="admin-section"><h2>최근 55문항 응답</h2><div className="answer-audit-list">{(answers ?? []).filter((answer) => answer.assessment_id === latest.id).map((answer) => { const question = questionById.get(answer.question_id); return <details className="panel" key={answer.question_id}><summary><strong>{answer.level}단계</strong> {question?.question ?? answer.question_id}</summary>{answer.evidence_value && <p>{answer.evidence_value}</p>}</details>; })}</div></section>}

        <section className="admin-section"><h2>액션</h2><div className="table-scroll panel"><table className="admin-table"><thead><tr><th>우선순위</th><th>액션</th><th>담당</th><th>기한</th><th>상태</th></tr></thead><tbody>{(actions ?? []).map((action) => <tr key={action.id}><td>{action.urgency === "P0" ? "우선순위 0(Priority 0)" : "우선순위 1(Priority 1)"}</td><td>{action.title}</td><td>{action.owner_label}</td><td>{action.due_date ?? "-"}</td><td>{action.completed_at ? "완료" : "진행 전"}</td></tr>)}</tbody></table></div></section>

        <section className="admin-section"><h2>주문·정산·후기</h2><div className="order-audit-list">{!(orders ?? []).length ? <div className="empty-state panel"><strong>주문이 없습니다.</strong></div> : (orders ?? []).map((order) => { const settlement = (settlements ?? []).find((item) => item.order_id === order.id); const review = (reviews ?? []).find((item) => item.order_id === order.id); return <article className="panel" key={order.id}><strong>{typeof order.service_snapshot === "object" && order.service_snapshot && "title" in order.service_snapshot ? String(order.service_snapshot.title) : "전문가 서비스"}</strong><p>{order.status} · {order.amount_krw.toLocaleString("ko-KR")}원 · {new Date(order.created_at).toLocaleDateString("ko-KR")}</p><small>정산 {settlement?.status ?? "없음"}{review ? ` · 후기 ${review.rating}점` : " · 후기 없음"}</small></article>; })}</div></section>
      </div>
    </main>
  );
}
