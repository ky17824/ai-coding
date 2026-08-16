import { NextResponse } from "next/server";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json().catch(() => ({}));
  const en = body?.locale === "en";
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) {
    return NextResponse.json({ message: en ? "Please sign in." : "로그인이 필요합니다." }, { status: 401 });
  }
  const { id } = await params;
  const { data: order } = await admin
    .from("orders")
    .select("id,buyer_id,payment_id,status,order_kind,billing_mode,scheduled_at,service_started_at")
    .eq("id", id)
    .single();
  if (!order || order.buyer_id !== user.id) {
    return NextResponse.json({ message: en ? "We couldn't find the order." : "주문을 찾을 수 없습니다." }, { status: 404 });
  }
  // 관리자 베타는 결제가 없으므로 게이트웨이를 부르지 않는다. 어떤 상태 변경보다 먼저 처리해야
  // 아래에서 disputed로 바뀌어 실행 불가가 되는 것을 막는다(013:56은 paid|completed만 허용).
  // 취소는 019의 부분 유니크 인덱스 슬롯을 풀어 같은 상품을 다시 시험할 수 있게 한다.
  if (order.billing_mode === "admin_beta") {
    const { error } = await admin.from("orders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .in("status", ["paid", "service_started"]);
    if (error) return NextResponse.json({ message: en ? "We couldn't cancel the beta test." : "베타 테스트를 취소하지 못했습니다." }, { status: 500 });
    return NextResponse.json({ status: "cancelled", message: en ? "The beta test was cancelled. It was never charged." : "베타 테스트를 취소했습니다. 결제된 금액은 없습니다." });
  }
  if (order.service_started_at || order.status === "service_started" || order.status === "completed") {
    const { error } = await admin.from("orders").update({ refund_requested_at: new Date().toISOString() }).eq("id", id);
    if (error) return NextResponse.json({ message: en ? "We couldn't record the review request." : "검토 요청을 기록하지 못했습니다." }, { status: 500 });
    return NextResponse.json(
      { message: en ? "Our operations team reviews requests submitted after the service starts." : "서비스 시작 후 요청은 관리자가 기록을 검토합니다." },
      { status: 202 }
    );
  }
  if (!["paid", "pending"].includes(order.status)) {
    return NextResponse.json(
      { message: en ? "This order is not eligible for a refund in its current status." : "현재 상태에서는 환불할 수 없습니다." },
      { status: 409 }
    );
  }
  if (order.status === "pending") {
    if (order.order_kind === "ai_agent") {
      return NextResponse.json(
        { message: en ? "Payment is still being confirmed. Cancellation is available after the payment status is resolved." : "결제 상태를 확인 중입니다. 결제 상태가 확정된 뒤 취소할 수 있습니다." },
        { status: 409 }
      );
    }
    const { data } = await admin.from("orders").update({ status: "cancelled" }).eq("id", id).eq("status", "pending").select("id").maybeSingle();
    if (!data) return NextResponse.json({ message: en ? "The order state changed. Try again." : "주문 상태가 변경되었습니다. 다시 확인해 주세요." }, { status: 409 });
    return NextResponse.json({ status: "cancelled" });
  }
  const { data: reserved } = await admin.from("orders").update({ status: "disputed", refund_requested_at: new Date().toISOString() }).eq("id", id).eq("status", "paid").select("id").maybeSingle();
  if (!reserved) return NextResponse.json({ message: en ? "The service already started or the order state changed." : "서비스가 이미 시작되었거나 주문 상태가 변경되었습니다." }, { status: 409 });
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) {
    await admin.from("orders").update({ status: "paid" }).eq("id", id).eq("status", "disputed");
    return NextResponse.json(
      { message: en ? "Payment refunds are not configured." : "결제 환불 환경이 구성되지 않았습니다." },
      { status: 503 }
    );
  }
  const response = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(order.payment_id)}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `PortOne ${secret}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ reason: en ? "Buyer cancellation before service start" : "서비스 시작 전 구매자 취소" })
    }
  );
  if (!response.ok) {
    await admin.from("orders").update({ status: "paid" }).eq("id", id).eq("status", "disputed");
    return NextResponse.json(
      { message: en ? "The payment gateway could not process the refund." : "결제대행 서비스(Payment Gateway) 환불 요청에 실패했습니다." },
      { status: 502 }
    );
  }
  const { data: refunded } = await admin.from("orders").update({ status: "refunded" }).eq("id", id).eq("status", "disputed").select("id").maybeSingle();
  if (!refunded) return NextResponse.json({ message: en ? "The refund succeeded but the local order needs an operations review." : "환불은 완료되었으나 주문 상태는 운영 확인이 필요합니다." }, { status: 202 });
  await admin
    .from("settlements")
    .update({ status: "cancelled" })
    .eq("order_id", id)
    .in("status", ["pending", "scheduled"]);
  return NextResponse.json({ status: "refunded" });
}
