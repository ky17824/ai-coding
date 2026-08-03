import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { approveProvider } from "@/app/provider/actions";
import {
  buildExpertDemand,
  buildFunnel,
  buildOperationalMetrics,
  buildWorklist,
  lastActivityAt,
  type CompanyRow
} from "@/lib/admin-metrics";
import type { OrderStatus } from "@/lib/types";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";

export const metadata: Metadata = { title: "운영 관리자" };
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
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: profile } = user && supabase
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isDemo = !supabase && process.env.NODE_ENV === "development";
  if (profile?.role !== "admin" && !isDemo) redirect("/dashboard");
  if (!admin) throw new Error("Supabase admin client is not configured");

  const [organizationsResult, profilesResult, assessmentsResult, actionsResult, ordersResult, providersResult, reviewsResult] = await Promise.all([
    admin.from("organizations").select("id,name,created_at").order("created_at", { ascending: false }),
    admin.from("profiles").select("id,organization_id,display_name,job_title,deleted_at"),
    admin.from("assessments").select("organization_id,status_label,overall_score,gate_messages,completed_at").order("completed_at", { ascending: false }),
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
        completedAt: latest.completed_at,
        statusLabel: latest.status_label,
        overallScore: latest.overall_score,
        gateMessages: latest.gate_messages as string[]
      } : null,
      actions: actions.filter((entry) => entry.organization_id === organization.id).map((entry) => ({ serviceTag: entry.service_tag, completedAt: entry.completed_at })),
      orders: orders.filter((entry) => entry.organization_id === organization.id).map((entry) => {
        const provider = providers.find((candidate) => candidate.id === entry.provider_id);
        const account = Array.isArray(provider?.profiles) ? provider.profiles[0] : provider?.profiles;
        return {
          status: entry.status as OrderStatus,
          providerName: account?.display_name ?? "전문가 미지정",
          createdAt: entry.created_at
        };
      })
    };
  });

  const pendingProviders = providers.filter((provider) => provider.approval_status === "pending");
  const approvedByTag: Record<string, number> = {};
  for (const provider of providers.filter((entry) => entry.approval_status === "approved")) {
    for (const tag of provider.expertise) approvedByTag[tag] = (approvedByTag[tag] ?? 0) + 1;
  }
  const worklist = buildWorklist(rows, new Date());
  const funnel = buildFunnel(rows);
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
      <SiteHeader compact />
      <div className="app-container admin-dashboard">
        <span className="page-kicker">OPERATIONS</span>
        <h1 className="page-title">운영 관리자</h1>
        <p className="page-description">오늘 처리할 기업과 전문가 수급 병목을 실제 데이터로 확인합니다.</p>

        <div className="admin-metrics">
          {[
            ["처리할 기업", String(worklist.length)],
            ["전문가 승인 대기", String(pendingProviders.length)],
            ["환불·분쟁", String(disputeCount)],
            ["전체 기업", String(rows.length)]
          ].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>

        <section className="admin-section">
          <h2>지금 처리할 일</h2>
          <div className="admin-worklist">
            {worklist.slice(0, 12).map((item, index) => (
              <Link className="panel" href={`/admin/companies/${item.organizationId}`} key={`${item.organizationId}-${item.kind}-${index}`}>
                <strong>{item.companyName}</strong><span>{item.label}</span>
              </Link>
            ))}
            {pendingProviders.length > 0 && <a className="panel" href="#provider-review"><strong>전문가 승인 대기 {pendingProviders.length}건</strong><span>신청서 검토</span></a>}
            {disputeOrders.slice(0, 4).map((order) => <Link className="panel" href={`/orders/${order.id}`} key={order.id}><strong>환불·분쟁 주문</strong><span>{order.status}</span></Link>)}
            {!worklist.length && !pendingProviders.length && !disputeOrders.length && <div className="empty-state panel"><strong>지금 처리할 이슈가 없습니다.</strong></div>}
          </div>
        </section>

        <section className="admin-section">
          <h2>진단 퍼널</h2>
          <div className="funnel-row">{funnel.map((step) => <div className="panel" key={step.label}><span>{step.label}</span><strong>{step.count}</strong></div>)}</div>
        </section>

        <section className="admin-section">
          <h2>운영 지표</h2>
          <div className="admin-metrics">
            {[
              ["진단 완료율", `${operationalMetrics.assessmentCompletionRate}%`],
              ["진단→주문 전환율", `${operationalMetrics.assessmentToOrderRate}%`],
              ["첫 주문까지", operationalMetrics.averageDaysToFirstOrder === null ? "-" : `${operationalMetrics.averageDaysToFirstOrder}일`],
              ["리뷰 평균", operationalMetrics.averageReviewRating === null ? "-" : `${operationalMetrics.averageReviewRating}점`]
            ].map(([label, value]) => <div className="panel" key={label}><span>{label}</span><strong>{value}</strong></div>)}
          </div>
        </section>

        <section className="admin-section">
          <div className="section-heading section-heading--row"><span><h2>기업 목록</h2></span><span>{filtered.length}개</span></div>
          <form className="admin-filters">
            <input name="q" defaultValue={query.q} placeholder="회사명·담당자 검색" />
            <select name="stage" defaultValue={query.stage ?? ""}><option value="">전체 단계</option><option>극초기</option><option>준비중</option><option>준비완료</option><option>진출 실행 가능</option></select>
            <select name="gate" defaultValue={query.gate ?? ""}><option value="">Gate 전체</option><option value="blocked">Gate 차단</option></select>
            <select name="order" defaultValue={query.order ?? ""}><option value="">주문 전체</option><option value="yes">주문 있음</option><option value="no">주문 없음</option></select>
            <input aria-label="진단 시작일" name="from" type="date" defaultValue={query.from} />
            <input aria-label="진단 종료일" name="to" type="date" defaultValue={query.to} />
            <select name="sort" defaultValue={query.sort ?? "recent"}><option value="recent">최근 진단순</option><option value="score">총점순</option><option value="activity">최근 활동순</option></select>
            <button className="button button--dark">조회</button>
          </form>
          <div className="table-scroll panel">
            <table className="admin-table"><thead><tr><th>회사</th><th>담당자</th><th>최근 진단</th><th>점수</th><th>Gate</th><th>액션</th><th>주문</th><th>최근 활동</th></tr></thead><tbody>
              {shown.map((row) => <tr key={row.organizationId}>
                <td><Link href={`/admin/companies/${row.organizationId}`}>{row.companyName}</Link></td>
                <td>{row.contactName ?? "-"}{row.jobTitle ? ` · ${row.jobTitle}` : ""}</td>
                <td>{row.latestAssessment ? <>{row.latestAssessment.statusLabel}<small>{new Date(row.latestAssessment.completedAt).toLocaleDateString("ko-KR")}</small></> : "미진단"}</td><td>{row.latestAssessment?.overallScore ?? "-"}</td>
                <td>{row.latestAssessment?.gateMessages.length ?? 0}</td>
                <td>{row.actions.filter((action) => action.completedAt).length}/{row.actions.length}</td><td>{row.orders[0] ? `${row.orders[0].status} · ${row.orders[0].providerName}` : "없음"}</td>
                <td>{lastActivityAt(row) ? new Date(lastActivityAt(row)!).toLocaleDateString("ko-KR") : "-"}</td>
              </tr>)}
            </tbody></table>
          </div>
          <div className="pagination">{page > 1 && <Link className="button button--ghost" href={`?${new URLSearchParams({ ...query, page: String(page - 1) }).toString()}`}>이전</Link>}{page * pageSize < filtered.length && <Link className="button button--ghost" href={`?${new URLSearchParams({ ...query, page: String(page + 1) }).toString()}`}>다음</Link>}</div>
        </section>

        <section className="admin-section">
          <h2>전문가 수급</h2>
          <div className="table-scroll panel"><table className="admin-table"><thead><tr><th>태그</th><th>미완료 액션 수요</th><th>승인 전문가</th></tr></thead><tbody>{expertDemand.map((item) => <tr key={item.tag}><td>{item.tag}</td><td>{item.demand}</td><td>{item.supply}</td></tr>)}</tbody></table></div>
        </section>

        <section className="admin-section" id="provider-review">
          <h2>전문가 승인 대기</h2>
          {!pendingProviders.length ? <div className="empty-state panel"><strong>검토할 신청이 없습니다.</strong></div> : <div className="provider-review-list">{pendingProviders.map((provider) => (
            <article className="provider-review panel" key={provider.id}><div><span className="page-kicker">PENDING EXPERT</span><h3>{provider.headline}</h3><p>{provider.biography}</p><small>{provider.expertise.join(" · ")}</small><blockquote>{provider.verification_note}</blockquote></div><form action={approveProvider}><input type="hidden" name="providerId" value={provider.id} /><button className="button button--ghost" name="decision" value="rejected">보완 요청</button><button className="button button--primary" name="decision" value="approved">승인</button></form></article>
          ))}</div>}
        </section>
      </div>
    </main>
  );
}
