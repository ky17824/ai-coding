import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/admin-nav";
import { approveProvider } from "@/app/provider/actions";
import {
  buildExpertDemand,
  buildFunnel,
  buildOperationalMetrics,
  buildWorklist,
  lastActivityAt,
  type CompanyRow
} from "@/lib/admin-metrics";
import { normalizeReadinessStatus } from "@/lib/readiness";
import type { OrderStatus } from "@/lib/types";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  getCurrentProfile
} from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Operations Admin" : "운영 관리자" };
}
export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    stage?: string;
    gate?: string;
    order?: string;
    from?: string;
    to?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const [{ profile }, locale] = await Promise.all([getCurrentProfile(), getRequestLocale()]);
  const en = locale === "en";
  const statusText = (value: string) => en ? ({ "준비 1단계": "Readiness Stage 1", "준비 2단계": "Readiness Stage 2", "준비 3단계": "Readiness Stage 3", "진출 실행 가능": "Ready to Enter" }[value] ?? value) : value;
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const isDemo = !supabase && process.env.NODE_ENV === "development";
  if ((profile?.role !== "admin" || profile.deleted_at) && !isDemo) redirect(localizedPath("/dashboard", locale));
  if (!admin) throw new Error("Supabase admin client is not configured");

  const [organizationsResult, profilesResult, assessmentsResult, actionsResult, ordersResult, providersResult, reviewsResult] = await Promise.all([
    admin.from("organizations").select("id,name,created_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("id,organization_id,display_name,job_title,deleted_at"),
    admin.from("assessments").select("id,organization_id,status_label,overall_score,gate_messages,completed_at,survey_version").order("completed_at", { ascending: false }),
    admin.from("action_items").select("organization_id,service_tag,completed_at"),
    admin.from("orders").select("id,organization_id,provider_id,status,created_at,service_snapshot"),
    admin.from("provider_profiles").select("id,headline,biography,expertise,verification_note,approval_status,created_at,profiles!inner(display_name,email)").order("created_at"),
    admin.from("reviews").select("rating").eq("status", "visible")
  ]);

  const profiles = profilesResult.data ?? [];
  const assessments = assessmentsResult.data ?? [];
  const actions = actionsResult.data ?? [];
  const orders = ordersResult.data ?? [];
  const providers = providersResult.data ?? [];
  // ponytail: beta-scale server join; move to a DB view when organization count makes this measurably slow.
  const rows: CompanyRow[] = (organizationsResult.data ?? []).map((organization) => {
    const contact = profiles.find((entry) => entry.organization_id === organization.id && !entry.deleted_at);
    const organizationAssessments = assessments.filter((entry) => entry.organization_id === organization.id);
    const latest = organizationAssessments[0];
    return {
      organizationId: organization.id,
      companyName: organization.name,
      contactId: contact?.id ?? null,
      contactName: contact?.display_name ?? null,
      jobTitle: contact?.job_title ?? null,
      firstAssessmentAt: organizationAssessments.at(-1)?.completed_at ?? null,
      latestAssessment: latest ? {
        id: latest.id,
        surveyVersion: latest.survey_version === "5.0" ? "5.0" : "4.0",
        completedAt: latest.completed_at,
        statusLabel: normalizeReadinessStatus(latest.status_label),
        overallScore: latest.overall_score,
        gateMessages: latest.gate_messages as string[]
      } : null,
      assessmentHistory: organizationAssessments.map((entry) => ({
        id: entry.id,
        surveyVersion: entry.survey_version === "5.0" ? "5.0" : "4.0",
        completedAt: entry.completed_at,
        statusLabel: normalizeReadinessStatus(entry.status_label)
      })),
      actions: actions.filter((entry) => entry.organization_id === organization.id).map((entry) => ({ serviceTag: entry.service_tag, completedAt: entry.completed_at })),
      orders: orders.filter((entry) => entry.organization_id === organization.id).map((entry) => {
        const provider = providers.find((candidate) => candidate.id === entry.provider_id);
        const account = Array.isArray(provider?.profiles) ? provider.profiles[0] : provider?.profiles;
        return {
          status: entry.status as OrderStatus,
          providerName: account?.display_name ?? (en ? "Expert unassigned" : "전문가 미지정"),
          createdAt: entry.created_at,
          assessmentId: typeof (entry.service_snapshot as { readiness?: { assessmentId?: unknown } } | null)?.readiness?.assessmentId === "string"
            ? (entry.service_snapshot as { readiness: { assessmentId: string } }).readiness.assessmentId
            : null
        };
      })
    };
  });

  const pendingProviders = providers.filter((provider) => provider.approval_status === "pending");
  const approvedByTag: Record<string, number> = {};
  for (const provider of providers.filter((entry) => entry.approval_status === "approved")) {
    for (const tag of provider.expertise) approvedByTag[tag] = (approvedByTag[tag] ?? 0) + 1;
  }
  const worklist = buildWorklist(rows, new Date(), locale);
  const funnels = (["4.0", "5.0"] as const).map((surveyVersion) => ({
    surveyVersion,
    steps: buildFunnel(rows, locale, surveyVersion)
  }));
  const expertDemand = buildExpertDemand(rows, approvedByTag);
  const operationalMetrics = buildOperationalMetrics(rows, (reviewsResult.data ?? []).map((review) => review.rating));
  const disputeCount = orders.filter((order) => ["disputed", "refunded"].includes(order.status)).length;
  const disputeOrders = orders.filter((order) => ["disputed", "refunded"].includes(order.status));

  const query = await searchParams;
  const q = (query.q ?? "").trim().toLowerCase();
  const filtered = rows.filter((row) =>
    (!q || row.companyName.toLowerCase().includes(q) || row.contactName?.toLowerCase().includes(q)) &&
    (!query.stage || row.latestAssessment?.statusLabel === query.stage) &&
    (query.gate !== "blocked" || Boolean(row.latestAssessment?.gateMessages.length)) &&
    (query.order !== "yes" || row.orders.length > 0) &&
    (query.order !== "no" || row.orders.length === 0) &&
    (!query.from || Boolean(row.latestAssessment && row.latestAssessment.completedAt.slice(0, 10) >= query.from)) &&
    (!query.to || Boolean(row.latestAssessment && row.latestAssessment.completedAt.slice(0, 10) <= query.to))
  ).sort((a, b) => {
    if (query.sort === "score") return (b.latestAssessment?.overallScore ?? -1) - (a.latestAssessment?.overallScore ?? -1);
    if (query.sort === "activity") return (lastActivityAt(b) ?? "").localeCompare(lastActivityAt(a) ?? "");
    return (b.latestAssessment?.completedAt ?? "").localeCompare(a.latestAssessment?.completedAt ?? "");
  });
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = 20;
  const shown = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container admin-dashboard">
        <span className="page-kicker">OPERATIONS</span>
        <h1 className="page-title">{en ? "Operations Admin" : "운영 관리자"}</h1>
        <p className="page-description">{en ? "Use live data to find the companies and expert-supply bottlenecks that need attention today." : "오늘 처리할 기업과 전문가 수급 병목을 실제 데이터로 확인합니다."}</p>
        <AdminNav locale={locale} />

        <div className="admin-metrics">
          {[
            [en ? "Companies to review" : "처리할 기업", String(worklist.length)],
            [en ? "Expert approvals pending" : "전문가 승인 대기", String(pendingProviders.length)],
            [en ? "Refunds & disputes" : "환불·분쟁", String(disputeCount)],
            [en ? "Total companies" : "전체 기업", String(rows.length)]
          ].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>

        <section className="admin-section">
          <h2>{en ? "Work queue" : "지금 처리할 일"}</h2>
          <div className="admin-worklist">
            {worklist.slice(0, 12).map((item, index) => (
              <Link className="panel" href={localizedPath(`/admin/companies/${item.organizationId}`, locale)} key={`${item.organizationId}-${item.kind}-${index}`}>
                <strong>{item.companyName}</strong><span>{item.label}</span>
              </Link>
            ))}
            {pendingProviders.length > 0 && <a className="panel" href="#provider-review"><strong>{en ? `${pendingProviders.length} expert approvals pending` : `전문가 승인 대기 ${pendingProviders.length}건`}</strong><span>{en ? "Review applications" : "신청서 검토"}</span></a>}
            {disputeOrders.slice(0, 4).map((order) => <Link className="panel" href={localizedPath(`/orders/${order.id}`, locale)} key={order.id}><strong>{en ? "Refund or disputed order" : "환불·분쟁 주문"}</strong><span>{order.status}</span></Link>)}
            {!worklist.length && !pendingProviders.length && !disputeOrders.length && <div className="empty-state panel"><strong>{en ? "No issues need attention right now." : "지금 처리할 이슈가 없습니다."}</strong></div>}
          </div>
        </section>

        <section className="admin-section">
          <h2>{en ? "Assessment funnel" : "진단 고객 전환 단계(Funnel)"}</h2>
          {funnels.map((funnel) => <div className="funnel-row" key={funnel.surveyVersion}>{funnel.steps.map((step) => <div className="panel" key={step.label}><span>{step.label}</span><strong>{step.count}</strong></div>)}</div>)}
        </section>

        <section className="admin-section">
          <h2>{en ? "Operating metrics" : "운영 지표"}</h2>
          <div className="admin-metrics">
            {[
              ...operationalMetrics.assessmentByVersion.flatMap((metric) => [[
                en ? `v${metric.surveyVersion} assessments` : `v${metric.surveyVersion} 진단 수`,
                String(metric.assessed)
              ], [
                en ? `v${metric.surveyVersion} assessment-to-order` : `v${metric.surveyVersion} 진단→주문 전환율`,
                `${metric.assessmentToOrderRate}%`
              ]]),
              [en ? "Time to first order" : "첫 주문까지", operationalMetrics.averageDaysToFirstOrder === null ? "-" : `${operationalMetrics.averageDaysToFirstOrder} ${en ? "days" : "일"}`],
              [en ? "Average review rating" : "리뷰 평균", operationalMetrics.averageReviewRating === null ? "-" : `${operationalMetrics.averageReviewRating}${en ? "/5" : "점"}`]
            ].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </section>

        <section className="admin-section">
          <div className="section-heading section-heading--row"><span><h2>{en ? "Companies" : "기업 목록"}</h2></span><span>{filtered.length}{en ? "" : "개"}</span></div>
          <form className="admin-filters">
            <input name="q" defaultValue={query.q} placeholder={en ? "Search company or contact" : "회사명·담당자 검색"} />
            <select name="stage" defaultValue={query.stage ?? ""}><option value="">{en ? "All stages" : "전체 단계"}</option><option value="준비 1단계">{en ? "Readiness Stage 1" : "준비 1단계"}</option><option value="준비 2단계">{en ? "Readiness Stage 2" : "준비 2단계"}</option><option value="준비 3단계">{en ? "Readiness Stage 3" : "준비 3단계"}</option><option value="진출 실행 가능">{en ? "Ready to Enter" : "진출 실행 가능"}</option></select>
            <select name="gate" defaultValue={query.gate ?? ""}><option value="">{en ? "All gate results" : "단계 통과 기준(Stage Gate) 전체"}</option><option value="blocked">{en ? "Gate blocked" : "단계 통과 기준(Stage Gate) 차단"}</option></select>
            <select name="order" defaultValue={query.order ?? ""}><option value="">{en ? "All orders" : "주문 전체"}</option><option value="yes">{en ? "Has orders" : "주문 있음"}</option><option value="no">{en ? "No orders" : "주문 없음"}</option></select>
            <input aria-label={en ? "Assessment start date" : "진단 시작일"} name="from" type="date" defaultValue={query.from} />
            <input aria-label={en ? "Assessment end date" : "진단 종료일"} name="to" type="date" defaultValue={query.to} />
            <select name="sort" defaultValue={query.sort ?? "recent"}><option value="recent">{en ? "Most recent assessment" : "최근 진단순"}</option><option value="score">{en ? "Highest score" : "총점순"}</option><option value="activity">{en ? "Most recent activity" : "최근 활동순"}</option></select>
            <button className="button button--dark">{en ? "Apply" : "조회"}</button>
          </form>
          <div className="table-scroll panel">
            <table className="admin-table"><thead><tr><th>{en ? "Company" : "회사"}</th><th>{en ? "Contact" : "담당자"}</th><th>{en ? "Latest assessment" : "최근 진단"}</th><th>{en ? "Score" : "점수"}</th><th>{en ? "Gate issues" : "단계 통과 기준(Stage Gate)"}</th><th>{en ? "Actions" : "액션"}</th><th>{en ? "Orders" : "주문"}</th><th>{en ? "Last activity" : "최근 활동"}</th></tr></thead><tbody>
              {shown.map((row) => <tr key={row.organizationId}>
                <td><Link href={localizedPath(`/admin/companies/${row.organizationId}`, locale)}>{row.companyName}</Link></td>
                <td>{row.contactName ?? "-"}{row.jobTitle ? ` · ${row.jobTitle}` : ""}</td>
                <td>{row.latestAssessment ? <>{statusText(row.latestAssessment.statusLabel)}<small>{new Date(row.latestAssessment.completedAt).toLocaleDateString(en ? "en-US" : "ko-KR")}</small></> : en ? "Not assessed" : "미진단"}</td><td>{row.latestAssessment?.overallScore ?? "-"}</td>
                <td>{row.latestAssessment?.gateMessages.length ?? 0}</td>
                <td>{row.actions.filter((action) => action.completedAt).length}/{row.actions.length}</td><td>{row.orders[0] ? `${row.orders[0].status} · ${row.orders[0].providerName}` : en ? "None" : "없음"}</td>
                <td>{lastActivityAt(row) ? new Date(lastActivityAt(row)!).toLocaleDateString(en ? "en-US" : "ko-KR") : "-"}</td>
              </tr>)}
            </tbody></table>
          </div>
          <div className="pagination">{page > 1 && <Link className="button button--ghost" href={`?${new URLSearchParams({ ...query, page: String(page - 1) }).toString()}`}>{en ? "Previous" : "이전"}</Link>}{page * pageSize < filtered.length && <Link className="button button--ghost" href={`?${new URLSearchParams({ ...query, page: String(page + 1) }).toString()}`}>{en ? "Next" : "다음"}</Link>}</div>
        </section>

        <section className="admin-section">
          <h2>{en ? "Expert supply" : "전문가 수급"}</h2>
          <div className="table-scroll panel"><table className="admin-table"><thead><tr><th>{en ? "Tag" : "태그"}</th><th>{en ? "Open action demand" : "미완료 액션 수요"}</th><th>{en ? "Approved experts" : "승인 전문가"}</th></tr></thead><tbody>{expertDemand.map((item) => <tr key={item.tag}><td>{item.tag}</td><td>{item.demand}</td><td>{item.supply}</td></tr>)}</tbody></table></div>
        </section>

        <section className="admin-section" id="provider-review">
          <h2>{en ? "Expert approvals pending" : "전문가 승인 대기"}</h2>
          {!pendingProviders.length ? <div className="empty-state panel"><strong>{en ? "No applications to review." : "검토할 신청이 없습니다."}</strong></div> : <div className="provider-review-list">{pendingProviders.map((provider) => (
            <article className="provider-review panel" key={provider.id}><div><span className="page-kicker">PENDING EXPERT</span><h3>{provider.headline}</h3><p>{provider.biography}</p><small>{provider.expertise.join(" · ")}</small><blockquote>{provider.verification_note}</blockquote></div><form action={approveProvider}><input type="hidden" name="providerId" value={provider.id} /><button className="button button--ghost" name="decision" value="rejected">{en ? "Request changes" : "보완 요청"}</button><button className="button button--primary" name="decision" value="approved">{en ? "Approve" : "승인"}</button></form></article>
          ))}</div>}
        </section>
      </div>
    </main>
  );
}
