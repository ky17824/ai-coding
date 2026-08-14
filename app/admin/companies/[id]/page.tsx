import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PhoneReveal } from "@/components/phone-reveal";
import { SiteHeader } from "@/components/site-header";
import { getIntakeQuestions } from "@/lib/intake-questions";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { normalizeReadinessStatus } from "@/lib/readiness";
import {
  createSupabaseAdminClient,
  getCurrentProfile
} from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Company Operations" : "기업 운영 상세" };
}
export const dynamic = "force-dynamic";

export default async function AdminCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ profile: actor }, locale] = await Promise.all([getCurrentProfile(), getRequestLocale()]);
  const en = locale === "en";
  const statusText = (value: string) => en ? ({ "준비 1단계": "Readiness Stage 1", "준비 2단계": "Readiness Stage 2", "준비 3단계": "Readiness Stage 3", "진출 실행 가능": "Ready to Enter" }[value] ?? value) : value;
  const admin = createSupabaseAdminClient();
  if (actor?.role !== "admin") redirect(localizedPath("/dashboard", locale));
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
  const questionById = new Map(getIntakeQuestions(locale).map((question) => [question.id, question]));
  const dateLocale = en ? "en-US" : "ko-KR";

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container admin-company">
        <Link href={localizedPath("/admin", locale)} className="text-link">← {en ? "Companies" : "기업 목록"}</Link>
        <span className="page-kicker">{en ? "COMPANY OPERATIONS" : "기업 운영(Company Operations)"}</span>
        <h1 className="page-title">{organization.name}</h1>
        <div className="company-summary panel">
          <div><span>{en ? "Contact" : "담당자"}</span><strong>{contact?.display_name ?? "-"}</strong><small>{contact?.job_title ?? (en ? "Job title not provided" : "직위 미등록")} · {contact?.email ?? ""}</small></div>
          <div><span>{en ? "Latest assessment" : "최근 진단"}</span><strong>{latest ? statusText(normalizeReadinessStatus(latest.status_label)) : en ? "Not assessed" : "미진단"}</strong><small>{latest ? `${latest.overall_score}${en ? " points" : "점"} · ${new Date(latest.completed_at).toLocaleDateString(dateLocale)}` : ""}</small></div>
          <div><span>{en ? "Phone" : "연락처"}</span>{contact ? <PhoneReveal profileId={contact.id} locale={locale} /> : <strong>-</strong>}</div>
        </div>

        <section className="admin-section"><h2>{en ? "Assessment history" : "진단 이력"}</h2><div className="table-scroll panel"><table className="admin-table"><thead><tr><th>{en ? "Date" : "일자"}</th><th>{en ? "Stage" : "단계"}</th><th>{en ? "Score" : "총점"}</th><th>{en ? "Gate issues" : "단계 통과 기준(Stage Gate)"}</th></tr></thead><tbody>{(assessments ?? []).map((assessment) => <tr key={assessment.id}><td>{new Date(assessment.completed_at).toLocaleDateString(dateLocale)}</td><td>{statusText(normalizeReadinessStatus(assessment.status_label))}</td><td>{assessment.overall_score}</td><td>{(assessment.gate_messages as string[]).length}</td></tr>)}</tbody></table></div></section>

        {latest && <section className="admin-section"><h2>{en ? "Latest 55-question responses" : "최근 55문항 응답"}</h2><div className="answer-audit-list">{(answers ?? []).filter((answer) => answer.assessment_id === latest.id).map((answer) => { const question = questionById.get(answer.question_id); return <details className="panel" key={answer.question_id}><summary><strong>{en ? `Level ${answer.level}` : `${answer.level}단계`}</strong> {question?.question ?? answer.question_id}</summary>{answer.evidence_value && <p>{answer.evidence_value}</p>}</details>; })}</div></section>}

        <section className="admin-section"><h2>{en ? "Actions" : "액션"}</h2><div className="table-scroll panel"><table className="admin-table"><thead><tr><th>{en ? "Priority" : "우선순위"}</th><th>{en ? "Action" : "액션"}</th><th>{en ? "Owner" : "담당"}</th><th>{en ? "Due" : "기한"}</th><th>{en ? "Status" : "상태"}</th></tr></thead><tbody>{(actions ?? []).map((action) => <tr key={action.id}><td>{action.urgency === "P0" ? (en ? "Priority 0" : "우선순위 0(Priority 0)") : (en ? "Priority 1" : "우선순위 1(Priority 1)")}</td><td>{action.title}</td><td>{action.owner_label}</td><td>{action.due_date ?? "-"}</td><td>{action.completed_at ? (en ? "Complete" : "완료") : (en ? "Not started" : "진행 전")}</td></tr>)}</tbody></table></div></section>

        <section className="admin-section"><h2>{en ? "Orders, settlements, and reviews" : "주문·정산·후기"}</h2><div className="order-audit-list">{!(orders ?? []).length ? <div className="empty-state panel"><strong>{en ? "No orders yet." : "주문이 없습니다."}</strong></div> : (orders ?? []).map((order) => { const settlement = (settlements ?? []).find((item) => item.order_id === order.id); const review = (reviews ?? []).find((item) => item.order_id === order.id); return <article className="panel" key={order.id}><strong>{typeof order.service_snapshot === "object" && order.service_snapshot && "title" in order.service_snapshot ? String(order.service_snapshot.title) : en ? "Expert service" : "전문가 서비스"}</strong><p>{order.status} · {new Intl.NumberFormat(dateLocale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(order.amount_krw)} · {new Date(order.created_at).toLocaleDateString(dateLocale)}</p><small>{en ? "Settlement" : "정산"} {settlement?.status ?? (en ? "none" : "없음")}{review ? ` · ${en ? "Review" : "후기"} ${review.rating}${en ? "/5" : "점"}` : en ? " · No review" : " · 후기 없음"}</small></article>; })}</div></section>
      </div>
    </main>
  );
}
