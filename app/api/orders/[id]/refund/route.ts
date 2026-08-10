import { NextResponse } from "next/server";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }
  const { id } = await params;
  const { data: order } = await admin
    .from("orders")
    .select("id,buyer_id,payment_id,status,scheduled_at,service_started_at")
    .eq("id", id)
    .single();
  if (!order || order.buyer_id !== user.id) {
    return NextResponse.json({ message: "주문을 찾을 수 없습니다." }, { status: 404 });
  }
  if (
    order.service_started_at ||
    order.status === "service_started" ||
    order.status === "completed"
  ) {
    await admin.from("orders").update({ status: "disputed" }).eq("id", id);
    return NextResponse.json(
      { message: "서비스 시작 후 요청은 관리자가 기록을 검토합니다." },
      { status: 202 }
    );
  }
  if (!["paid", "pending"].includes(order.status)) {
    return NextResponse.json(
      { message: "현재 상태에서는 환불할 수 없습니다." },
      { status: 409 }
    );
  }
  if (order.status === "pending") {
    await admin.from("orders").update({ status: "cancelled" }).eq("id", id);
    return NextResponse.json({ status: "cancelled" });
  }
  const secret = process.env.PORTONE_API_SECRET;
  if (!secret) {
    return NextResponse.json(
      { message: "결제 환불 환경이 구성되지 않았습니다." },
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
      body: JSON.stringify({ reason: "서비스 시작 전 구매자 취소" })
    }
  );
  if (!response.ok) {
    return NextResponse.json(
      { message: "결제대행 서비스(Payment Gateway) 환불 요청에 실패했습니다." },
      { status: 502 }
    );
  }
  await admin.from("orders").update({ status: "refunded" }).eq("id", id);
  await admin
    .from("settlements")
    .update({ status: "cancelled" })
    .eq("order_id", id)
    .in("status", ["pending", "scheduled"]);
  return NextResponse.json({ status: "refunded" });
}
