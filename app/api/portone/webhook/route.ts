import { NextResponse } from "next/server";
import * as PortOne from "@portone/server-sdk";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { reconcilePaymentEvent } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const webhookSecret = process.env.PORTONE_WEBHOOK_SECRET;
  const apiSecret = process.env.PORTONE_API_SECRET;
  const admin = createSupabaseAdminClient();
  if (!webhookSecret || !apiSecret || !admin) {
    return NextResponse.json(
      { message: "결제 연동이 구성되지 않았습니다." },
      { status: 503 }
    );
  }
  const payload = await request.text();
  const webhookId = request.headers.get("webhook-id");
  const webhookTimestamp = request.headers.get("webhook-timestamp");
  const webhookSignature = request.headers.get("webhook-signature");
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json({ message: "서명이 없습니다." }, { status: 400 });
  }

  let webhook: Awaited<ReturnType<typeof PortOne.Webhook.verify>>;
  try {
    webhook = await PortOne.Webhook.verify(webhookSecret, payload, {
      "webhook-id": webhookId,
      "webhook-timestamp": webhookTimestamp,
      "webhook-signature": webhookSignature
    });
  } catch {
    return NextResponse.json({ message: "서명이 유효하지 않습니다." }, { status: 400 });
  }
  if (!("data" in webhook) || !("paymentId" in webhook.data)) {
    return new NextResponse(null, { status: 200 });
  }

  const { data: duplicate } = await admin
    .from("payment_events")
    .select("id")
    .eq("webhook_id", webhookId)
    .maybeSingle();
  if (duplicate) return new NextResponse(null, { status: 200 });

  const paymentId = webhook.data.paymentId;
  const client = PortOne.PortOneClient({ secret: apiSecret });
  const payment = await client.payment.getPayment({ paymentId });
  if (!payment || !("amount" in payment)) {
    return new NextResponse(null, { status: 200 });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id,organization_id,buyer_id,amount_krw,status,provider_id,platform_fee_krw,provider_amount_krw,order_kind,product_key,service_snapshot")
    .eq("payment_id", paymentId)
    .single();
  if (!order) return new NextResponse(null, { status: 200 });
  if (order.order_kind === "ai_agent") {
    const { data: reconciledStatus, error } = await admin.rpc("reconcile_ai_payment", {
      p_order_id: order.id,
      p_webhook_id: webhookId,
      p_payment_id: paymentId,
      p_event_type: webhook.type,
      p_payment_status: payment.status,
      p_amount_krw: payment.amount.total,
      p_raw_event: JSON.parse(payload)
    });
    if (error) return NextResponse.json({ message: "AI 결제 상태를 저장하지 못했습니다." }, { status: 500 });
    if (reconciledStatus === "disputed") return NextResponse.json({ message: "결제 상태를 운영 검토로 전환했습니다." });
    return new NextResponse(null, { status: 200 });
  }
  const reconciliation = reconcilePaymentEvent({
    duplicate: false,
    orderAmountKrw: order.amount_krw,
    paidAmountKrw: payment.amount.total,
    currentStatus: order.status,
    paymentStatus: payment.status
  });
  if (reconciliation.nextStatus === "disputed") {
    const { error } = await admin.from("orders").update({ status: "disputed" }).eq("id", order.id);
    if (error) return NextResponse.json({ message: "주문 상태를 저장하지 못했습니다." }, { status: 500 });
    return NextResponse.json({ message: "결제 금액이 일치하지 않습니다." }, { status: 409 });
  }
  const nextStatus = reconciliation.nextStatus;
  const { error: eventError } = await admin.from("payment_events").insert({
    order_id: order.id,
    webhook_id: webhookId,
    payment_id: paymentId,
    event_type: webhook.type,
    payment_status: payment.status,
    amount_krw: payment.amount.total,
    raw_event: JSON.parse(payload)
  });
  if (eventError) return NextResponse.json({ message: "결제 이벤트를 저장하지 못했습니다." }, { status: 500 });
  if (reconciliation.action === "update") {
    const { error } = await admin.from("orders").update({ status: nextStatus }).eq("id", order.id);
    if (error) return NextResponse.json({ message: "주문 상태를 저장하지 못했습니다." }, { status: 500 });
  }

  if (nextStatus === "paid" && order.provider_id) {
    const { error } = await admin.from("settlements").upsert({
      order_id: order.id,
      provider_id: order.provider_id,
      gross_amount_krw: order.amount_krw,
      platform_fee_krw: order.platform_fee_krw,
      payout_amount_krw: order.provider_amount_krw,
      status: "pending"
    });
    if (error) return NextResponse.json({ message: "정산 상태를 저장하지 못했습니다." }, { status: 500 });
  }
  if (nextStatus === "refunded") {
    await admin
      .from("settlements")
      .update({ status: "cancelled" })
      .eq("order_id", order.id)
      .in("status", ["pending", "scheduled"]);
  }
  return new NextResponse(null, { status: 200 });
}
