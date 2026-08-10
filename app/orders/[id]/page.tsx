import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { OrderActions } from "@/components/order-actions";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";

export const metadata: Metadata = { title: "주문 상세" };
const won = new Intl.NumberFormat("ko-KR");

export default async function OrderPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: order } =
    user && admin
      ? await admin
          .from("orders")
          .select("id,buyer_id,status,amount_krw,service_snapshot,terms_snapshot,scheduled_at,created_at")
          .eq("id", id)
          .eq("buyer_id", user.id)
          .maybeSingle()
      : { data: null };
  const demo = !supabase && process.env.NODE_ENV === "development";
  const shownOrder =
    order ??
    (demo
      ? {
          id,
          buyer_id: "demo",
          status: "pending",
          amount_krw: 180000,
          service_snapshot: {
            title: "글로벌 확장 전 단위 경제성(Unit Economics) 점검",
            type: "mentoring",
            deliverables: ["핵심 지표 진단표", "90일 개선 우선순위"]
          },
          terms_snapshot: {
            refundPolicy: "서비스 시작 전 전액 환불"
          },
          scheduled_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          created_at: new Date().toISOString()
        }
      : null);

  if (!shownOrder) {
    return (
      <main className="app-page">
        <SiteHeader compact />
        <div className="app-container"><h1>주문을 찾을 수 없습니다.</h1></div>
      </main>
    );
  }
  const snapshot = shownOrder.service_snapshot as {
    title: string;
    type: string;
    deliverables: string[];
  };
  const terms = shownOrder.terms_snapshot as { refundPolicy: string };

  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container narrow-container">
        <span className="page-kicker">ORDER {shownOrder.id.slice(0, 8)}</span>
        <h1 className="page-title">{snapshot.title}</h1>
        <section className="order-detail panel">
          <div className="order-status-line">
            <span className="pill">{shownOrder.status}</span>
            <strong>{won.format(shownOrder.amount_krw)}원</strong>
          </div>
          <dl>
            <div>
              <dt>서비스 유형</dt>
              <dd>{snapshot.type === "mentoring" ? "1:1 멘토링" : "컨설팅 패키지"}</dd>
            </div>
            <div>
              <dt>예정일</dt>
              <dd>
                {shownOrder.scheduled_at
                  ? new Intl.DateTimeFormat("ko-KR", {
                      dateStyle: "long",
                      timeStyle: "short"
                    }).format(new Date(shownOrder.scheduled_at))
                  : "결제 후 협의"}
              </dd>
            </div>
            <div>
              <dt>환불 정책</dt>
              <dd>{terms.refundPolicy}</dd>
            </div>
          </dl>
          <div className="detail-block">
            <h2>합의된 결과물</h2>
            <ul>
              {snapshot.deliverables.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <OrderActions
            orderId={shownOrder.id}
            refundable={["pending", "paid"].includes(shownOrder.status)}
          />
        </section>
      </div>
    </main>
  );
}
