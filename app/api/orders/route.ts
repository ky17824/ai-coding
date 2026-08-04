import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { SAMPLE_SERVICES } from "@/lib/service-data";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";
import { calculateSettlement } from "@/lib/orders";

const schema = z.object({
  serviceId: z.string().min(1).max(80),
  availabilityId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime().nullable(),
  termsAccepted: z.literal(true)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "서비스 일정과 약관 동의를 확인해 주세요." },
      { status: 400 }
    );
  }
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  if (!user || !supabase || !admin) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
    }
    const sample = SAMPLE_SERVICES.find(
      (service) => service.id === parsed.data.serviceId
    );
    if (!sample) {
      return NextResponse.json(
        { message: "서비스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    const orderId = randomUUID();
    return NextResponse.json({
      orderId,
      paymentId: `payment-${orderId}`,
      amount: sample.price,
      demo: true
    });
  }

  const [{ data: profile }, { data: service }] = await Promise.all([
    admin
      .from("profiles")
      .select("organization_id,role,job_title,phone_enc")
      .eq("id", user.id)
      .single(),
    supabase
      .from("service_offerings")
      .select(
        "id,provider_id,type,title,description,price_krw,duration_minutes,duration_days,deliverables,milestones,tags,is_published,provider_profiles!inner(approval_status)"
      )
      .eq("id", parsed.data.serviceId)
      .eq("is_published", true)
      .single()
  ]);
  const provider = Array.isArray(service?.provider_profiles)
    ? service.provider_profiles[0]
    : service?.provider_profiles;
  if (
    !profile?.organization_id ||
    profile.role !== "startup" ||
    !service ||
    provider?.approval_status !== "approved"
  ) {
    return NextResponse.json(
      { message: "승인된 서비스를 구매할 수 없습니다." },
      { status: 403 }
    );
  }
  if (!profile.job_title || !profile.phone_enc) {
    return NextResponse.json(
      { message: "전문가 서비스 주문 전에 마이페이지에서 회사 정보와 연락처를 완성해 주세요." },
      { status: 403 }
    );
  }

  let scheduledAt = parsed.data.scheduledAt;
  if (service.type === "mentoring") {
    if (!parsed.data.availabilityId) {
      return NextResponse.json(
        { message: "멘토링 일정을 선택해 주세요." },
        { status: 400 }
      );
    }
    const { data: slot } = await supabase
      .from("availability")
      .select("id,provider_id,starts_at")
      .eq("id", parsed.data.availabilityId)
      .eq("provider_id", service.provider_id)
      .single();
    if (!slot || new Date(slot.starts_at) <= new Date()) {
      return NextResponse.json(
        { message: "선택한 일정을 예약할 수 없습니다." },
        { status: 409 }
      );
    }
    scheduledAt = slot.starts_at;
  }
  const orderId = randomUUID();
  const paymentId = `gtm-${orderId}`;
  const settlement = calculateSettlement(service.price_krw);
  const now = new Date().toISOString();
  const termsSnapshot = {
    version: 1,
    acceptedAt: now,
    sellerDisclosure: "Borderless는 통신판매중개자이며 전문가는 서비스 제공 당사자입니다.",
    refundPolicy:
      "서비스 시작 전 전액 환불. 시작 후 취소·분쟁은 관리자 수동 검토.",
    serviceStartsAt: scheduledAt
  };
  const serviceSnapshot = {
    title: service.title,
    description: service.description,
    type: service.type,
    durationMinutes: service.duration_minutes,
    durationDays: service.duration_days,
    deliverables: service.deliverables,
    milestones: service.milestones,
    priceKrw: service.price_krw
  };

  const { error } = await supabase.from("orders").insert({
    id: orderId,
    organization_id: profile.organization_id,
    buyer_id: user.id,
    provider_id: service.provider_id,
    service_id: service.id,
    availability_id: parsed.data.availabilityId,
    payment_id: paymentId,
    amount_krw: service.price_krw,
    platform_fee_krw: settlement.platformFeeKrw,
    provider_amount_krw: settlement.providerAmountKrw,
    service_snapshot: serviceSnapshot,
    terms_snapshot: termsSnapshot,
    terms_accepted_at: now,
    scheduled_at: scheduledAt
  });
  if (error?.code === "23505") {
    return NextResponse.json(
      { message: "선택한 일정이 방금 예약됐습니다. 다른 시간을 선택해 주세요." },
      { status: 409 }
    );
  }
  if (error) {
    return NextResponse.json(
      { message: "주문을 생성하지 못했습니다." },
      { status: 500 }
    );
  }
  return NextResponse.json({
    orderId,
    paymentId,
    amount: service.price_krw
  });
}
