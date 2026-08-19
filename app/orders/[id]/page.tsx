import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { OrderActions } from "@/components/order-actions";
import { AiAgentWorkspace } from "@/components/ai-agent-workspace";
import { getRequestLocale } from "@/lib/i18n-server";
import { getIntakeQuestions } from "@/lib/intake-questions";
import { ATTACHMENT_HINT_BY_AGENT, ORDER_STATUS_LABEL, PRODUCT_COPY, REQUIRED_INPUT_BY_AGENT } from "@/lib/catalog/copy";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";
import { isFreeBilling } from "@/lib/beta-testers";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Order Details" : "주문 상세" };
}

export default async function OrderPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, locale] = await Promise.all([params, getRequestLocale()]);
  const en = locale === "en";
  const won = new Intl.NumberFormat(en ? "en-US" : "ko-KR");
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: order } =
    user && admin
      ? await admin
          .from("orders")
          .select("id,organization_id,buyer_id,status,amount_krw,service_snapshot,terms_snapshot,scheduled_at,created_at,order_kind,billing_mode,product_key,ai_agent_runs(*)")
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
          organization_id: null,
          buyer_id: "demo",
          status: "pending",
          amount_krw: 180000,
          service_snapshot: {
            title: en ? "Unit economics review before global expansion" : "글로벌 확장 전 단위 경제성(Unit Economics) 점검",
            type: "mentoring",
            deliverables: en ? ["Core-metrics diagnostic", "90-day improvement priorities"] : ["핵심 지표 진단표", "90일 개선 우선순위"]
          },
          terms_snapshot: {
            refundPolicy: en ? "Full refund before the service begins" : "서비스 시작 전 전액 환불"
          },
          scheduled_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          created_at: new Date().toISOString(),
          order_kind: "human",
          billing_mode: "paid",
          product_key: null,
          ai_agent_runs: []
        }
      : null);

  if (!shownOrder) {
    return (
      <main className="app-page">
        <SiteHeader compact locale={locale} />
        <div className="app-container"><h1>{en ? "We couldn't find this order." : "주문을 찾을 수 없습니다."}</h1></div>
      </main>
    );
  }
  const snapshot = shownOrder.service_snapshot as {
    title: string;
    type: string;
    deliverables: string[];
    includedAgentIds?: string[];
  };
  const terms = shownOrder.terms_snapshot as { refundPolicy: string };
  const aiRun = Array.isArray(shownOrder.ai_agent_runs) ? shownOrder.ai_agent_runs[0] : shownOrder.ai_agent_runs;
  const isAiOrder = shownOrder.order_kind === "ai_agent";
  // 결제 없이 실행하는 관리자 테스트 주문. 화면에 원시 상태(paid)를 노출하지 않는다.
  const isBetaOrder = isFreeBilling(shownOrder.billing_mode);
  const listPriceKrw = Number((snapshot as { listPriceKrw?: number }).listPriceKrw ?? 0);
  const { data: readinessBaseline } = isAiOrder && admin
    ? await admin.from("assessments").select("target_country,target_customer_segment").eq("organization_id", shownOrder.organization_id).order("completed_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const storedIntake = (aiRun?.intake ?? {}) as Record<string, unknown>;
  const hydratedAiRun = aiRun ? {
    ...aiRun,
    intake: {
      ...storedIntake,
      targetCountry: storedIntake.targetCountry || readinessBaseline?.target_country || "",
      targetCustomer: storedIntake.targetCustomer || readinessBaseline?.target_customer_segment || ""
    }
  } : null;
  // 상품에 포함된 전문가마다 특화 입력칸 하나. 문구는 결제 시점 스냅샷이 아니라 현재 카탈로그를
  // 읽는다 — 안내 문구이지 계약(deliverables)이 아니고, 문구 개선이 기존 주문에도 닿아야 한다.
  // 서버는 includedAgentIds 전부를 감사하므로 화면도 전부 그린다(문구가 빠져도 칸은 있어야 답할 수 있다).
  const serviceInputs = (snapshot.includedAgentIds ?? []).map((id) => ({ id, title: PRODUCT_COPY[id]?.title[locale] ?? id, label: REQUIRED_INPUT_BY_AGENT[id]?.[locale] ?? "", fileHint: ATTACHMENT_HINT_BY_AGENT[id]?.[locale] }));

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container narrow-container">
        <span className="page-kicker">ORDER {shownOrder.id.slice(0, 8)}</span>
        <h1 className="page-title">{snapshot.title}</h1>
        <section className="order-detail panel">
          <div className="order-status-line">
            <span className="pill">{isBetaOrder ? (en ? "Beta test" : "베타 테스트") : ORDER_STATUS_LABEL[shownOrder.status]?.[locale] ?? shownOrder.status}</span>
            <strong>{isBetaOrder
              ? (en ? "KRW 0 charged" : "청구액 0원")
              : en ? `KRW ${won.format(shownOrder.amount_krw)}` : `${won.format(shownOrder.amount_krw)}원`}</strong>
            {isBetaOrder && listPriceKrw > 0 && <small>{en ? `List price KRW ${won.format(listPriceKrw)}` : `서비스 기준가 ${won.format(listPriceKrw)}원`}</small>}
          </div>
          <dl>
            <div>
              <dt>{en ? "Service type" : "서비스 유형"}</dt>
              <dd>{isAiOrder ? (en ? "AI expert service" : "AI 전문가 서비스") : snapshot.type === "mentoring" ? (en ? "1:1 mentoring" : "1:1 멘토링") : (en ? "Consulting package" : "컨설팅 패키지")}</dd>
            </div>
            {!isAiOrder && <div>
              <dt>{en ? "Scheduled for" : "예정일"}</dt>
              <dd>
                {shownOrder.scheduled_at
                    ? new Intl.DateTimeFormat(en ? "en-US" : "ko-KR", {
                      dateStyle: "long",
                      timeStyle: "short"
                    }).format(new Date(shownOrder.scheduled_at))
                  : en ? "To be scheduled after payment" : "결제 후 협의"}
              </dd>
            </div>}
            <div>
              <dt>{en ? "Refund policy" : "환불 정책"}</dt>
              <dd>{terms.refundPolicy}</dd>
            </div>
          </dl>
          <div className="detail-block">
            <h2>{en ? "Agreed deliverables" : "합의된 결과물"}</h2>
            <ul>
              {snapshot.deliverables.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <OrderActions
            orderId={shownOrder.id}
            refundable={!isBetaOrder && (isAiOrder ? ["paid", "service_started", "completed"] : ["pending", "paid", "service_started", "completed"]).includes(shownOrder.status)}
            reviewOnly={["service_started", "completed"].includes(shownOrder.status)}
            locale={locale}
          />
        </section>
        {isAiOrder && ["paid", "service_started", "completed"].includes(shownOrder.status) && hydratedAiRun && (
          <AiAgentWorkspace
            locale={locale}
            initialRun={hydratedAiRun as never}
            serviceInputs={serviceInputs}
            // 보고서는 준비도 문항 ID로 근거를 추적한다. 화면에는 ID 대신 문항 문장을 보여 준다.
            questionLabels={Object.fromEntries(getIntakeQuestions(locale, "5.0").map((question) => [question.id, question.question]))}
          />
        )}
        {isAiOrder && shownOrder.status === "paid" && !aiRun && <p className="notice-banner">{en ? "Payment confirmation is still being processed. Refresh in a moment." : "결제 확인을 처리 중입니다. 잠시 후 새로 고침해 주세요."}</p>}
      </div>
    </main>
  );
}
