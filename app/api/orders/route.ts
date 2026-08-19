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
import { aiExpertServicesEnabled, getAiAgentService, resolveAiQuestionCatalogVersion } from "@/lib/ai-agent-services";
import { buildAiReadinessSnapshot, getAiOrderAmounts } from "@/lib/ai-agent-report";
import { getNewAssessmentSurveyVersion } from "@/lib/readiness-rollout";
import { checkAdminBetaAccess } from "@/lib/admin-ai-beta";
import { checkBetaTesterAccess } from "@/lib/beta-testers";

const schema = z.object({
  serviceId: z.string().min(1).max(80),
  availabilityId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime().nullable(),
  termsAccepted: z.literal(true),
  locale: z.enum(["ko", "en"]).default("ko")
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  const en = body?.locale === "en";
  if (!parsed.success) {
    return NextResponse.json(
      { message: en ? "Review the service schedule and accept the terms." : "서비스 일정과 약관 동의를 확인해 주세요." },
      { status: 400 }
    );
  }
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const aiCatalogService = aiExpertServicesEnabled() ? getAiAgentService(parsed.data.serviceId, parsed.data.locale) : null;

  if (!user || !supabase || !admin) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ message: en ? "Please sign in." : "로그인이 필요합니다." }, { status: 401 });
    }
    const sample = aiCatalogService ?? SAMPLE_SERVICES.find(
      (service) => service.id === parsed.data.serviceId
    );
    if (!sample) {
      return NextResponse.json(
        { message: en ? "We couldn't find the service." : "서비스를 찾을 수 없습니다." },
        { status: 404 }
      );
    }
    const orderId = randomUUID();
    return NextResponse.json({
      orderId,
      paymentId: `payment-${orderId}`,
      amount: aiCatalogService ? getAiOrderAmounts(aiCatalogService.price).grossAmountKrw : sample.price,
      demo: true
    });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id,role,job_title,phone_enc,deleted_at")
    .eq("id", user.id)
    .single();
  // 베타 자격은 AI 카탈로그 상품일 때만 본다. 이 게이트는 아래 사람 주문 분기도 함께 덮으므로
  // 넓게 열면 베타 관리자가 정가 사람 주문을 만들고 정산 의무까지 생긴다.
  const betaAccess = profile
    ? checkAdminBetaAccess({
        userId: user.id,
        profile: { role: profile.role, deletedAt: profile.deleted_at },
        isAiProduct: Boolean(aiCatalogService)
      })
    : { eligible: false as const, denial: "not_admin" as const };
  if (!profile?.organization_id || (profile.role !== "startup" && !betaAccess.eligible)) {
    if (profile?.role === "admin" && !betaAccess.eligible) {
      // 운영자가 원인을 구분할 수 있도록 사유만 남긴다. 허용 목록은 절대 남기지 않는다.
      console.info("[admin-beta] denied", { denial: betaAccess.denial });
    }
    return NextResponse.json(
      { message: en ? "This service is available to startup accounts." : "스타트업 계정에서 구매할 수 있습니다." },
      { status: 403 }
    );
  }
  if (!profile.job_title || !profile.phone_enc) {
    return NextResponse.json(
      { message: en ? "Complete your company and contact information in My Account before ordering services." : "서비스를 주문하시려면 마이페이지에서 회사 정보와 연락처를 먼저 입력해 주세요." },
      { status: 403 }
    );
  }

  if (aiCatalogService) {
    const { data: assessment, error: assessmentError } = await admin.from("assessments")
      .select("id,survey_version,sales_motion,target_country,target_customer_segment,target_market_confirmed_at")
      .eq("organization_id", profile.organization_id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assessmentError) return NextResponse.json({ message: en ? "We couldn't load the readiness assessment." : "준비도 진단을 불러오지 못했습니다." }, { status: 500 });
    const { data: readinessRows, error: readinessError } = assessment
      ? await admin.from("readiness_answers").select("question_id,level").eq("assessment_id", assessment.id).limit(55)
      : { data: [], error: null };
    if (readinessError) return NextResponse.json({ message: en ? "We couldn't load the readiness answers." : "준비도 답변을 불러오지 못했습니다." }, { status: 500 });
    const surveyVersion = resolveAiQuestionCatalogVersion(
      assessment?.survey_version,
      getNewAssessmentSurveyVersion()
    );
    const aiService = getAiAgentService(parsed.data.serviceId, parsed.data.locale, surveyVersion)!;
    const readiness = buildAiReadinessSnapshot(assessment, readinessRows ?? []);
    const orderId = randomUUID();
    const paymentId = `gtm-${orderId}`;
    const now = new Date().toISOString();
    const amounts = getAiOrderAmounts(aiService.price);
    // 무료 경로는 둘: 관리자 베타(전 상품) → 베타 테스터(심층 시장 조사, 횟수 제한). 둘 다 아니면 유료.
    const testerAccess = !betaAccess.eligible && profile.role === "startup"
      ? await checkBetaTesterAccess(admin, { userId: user.id, email: user.email, productId: aiService.id })
      : { eligible: false as const };
    const freeMode = betaAccess.eligible ? "admin_beta" : testerAccess.eligible ? "beta_tester" : null;
    const isBeta = freeMode !== null;
    // 출시 전 상품은 UI에서 결제 버튼을 숨기지만, 직접 호출을 막는 것은 여기다. 관리자 베타 테스트는 계속 허용.
    if (aiService.comingSoon && freeMode !== "admin_beta") {
      return NextResponse.json({ message: en ? "This service has not launched yet." : "아직 출시 전인 서비스입니다." }, { status: 403 });
    }
    const serviceSnapshot = {
        contractVersion: 1,
        questionCatalogVersion: surveyVersion,
        productId: aiService.id,
        locale: parsed.data.locale,
        productKind: aiService.productKind,
        includedAgentIds: aiService.includedAgentIds,
        questionIds: aiService.questionIds,
        officialSourceQuestionIds: aiService.officialSourceQuestionIds,
        completionInstructions: aiService.completionInstructions,
        title: aiService.title,
        description: aiService.description,
        type: aiService.type,
        deliverables: aiService.deliverables,
        requiredInputs: aiService.requiredInputs,
        readiness,
        // 베타도 실제 상품가를 보존한다. 청구는 0원이지만 무엇을 시험했는지는 남아야 한다.
        listPriceKrw: amounts.grossAmountKrw,
        supplyPriceKrw: isBeta ? 0 : amounts.supplyAmountKrw,
        vatKrw: isBeta ? 0 : amounts.vatAmountKrw,
        priceKrw: isBeta ? 0 : amounts.grossAmountKrw
    };
    const termsSnapshot = {
        version: 1,
        acceptedAt: now,
        sellerDisclosure: en ? "Borderless provides this AI expert service." : "Borderless가 AI 전문가 서비스를 제공합니다.",
        refundPolicy: isBeta
          ? (en ? "Admin beta tests are not charged and are not eligible for a refund." : "관리자 베타 테스트는 결제·환불 대상이 아닙니다.")
          : (en ? "A full refund is available before report generation begins. After generation starts, requests are reviewed using the order record." : "보고서 생성 시작 전에는 전액 환불됩니다. 보고서 생성이 시작된 뒤의 환불 요청은 주문 및 생성 기록을 기준으로 검토합니다."),
        paymentRequired: !isBeta,
        refundEligible: !isBeta,
        includedClarificationRounds: 2,
        includedRegenerations: 1
    };

    if (isBeta) {
      // 주문과 실행 레코드를 한 트랜잭션에서 만든다. 스냅샷은 위에서 유료와 똑같이 만들어 넘긴다.
      const { error: betaError } = await admin.rpc("create_free_ai_order", {
        p_order_id: orderId,
        p_buyer_id: user.id,
        p_organization_id: profile.organization_id,
        p_product_key: aiService.id,
        p_locale: parsed.data.locale,
        p_service_snapshot: serviceSnapshot,
        p_terms_snapshot: termsSnapshot,
        p_billing_mode: freeMode
      });
      if (betaError) {
        const duplicate = betaError.code === "23505";
        const exhausted = betaError.message?.includes("beta_tester_quota_exhausted");
        console.info("[free-order] create failed", { mode: freeMode, code: betaError.code });
        return NextResponse.json(
          { message: duplicate
              ? (en ? "A beta test for this service is already in progress. Finish or cancel it first." : "이 서비스의 베타 테스트가 이미 진행 중입니다. 마치거나 취소한 뒤 다시 시도해 주세요.")
              : exhausted
                ? (en ? "You have used all of your free beta runs." : "무료 이용 횟수를 모두 사용했습니다.")
                : (en ? "We couldn't create the order." : "주문을 생성하지 못했습니다.") },
          { status: duplicate || exhausted ? 409 : 500 }
        );
      }
      console.info("[free-order] order created", { mode: freeMode, orderId, productKey: aiService.id });
      // paymentId를 클라이언트에 주지 않는다. 결제창을 열 이유가 없다.
      return NextResponse.json({ orderId, amount: 0, requiresPayment: false });
    }

    const { error } = await admin.from("orders").insert({
      id: orderId,
      organization_id: profile.organization_id,
      buyer_id: user.id,
      provider_id: null,
      service_id: null,
      order_kind: "ai_agent",
      billing_mode: "paid",
      product_key: aiService.id,
      payment_id: paymentId,
      amount_krw: amounts.grossAmountKrw,
      supply_amount_krw: amounts.supplyAmountKrw,
      vat_amount_krw: amounts.vatAmountKrw,
      platform_fee_krw: amounts.platformFeeKrw,
      provider_amount_krw: amounts.providerAmountKrw,
      service_snapshot: serviceSnapshot,
      terms_snapshot: termsSnapshot,
      terms_accepted_at: now
    });
    if (error) {
      return NextResponse.json(
        { message: en ? "We couldn't create the order." : "주문을 생성하지 못했습니다." },
        { status: 500 }
      );
    }
    return NextResponse.json({ orderId, paymentId, amount: amounts.grossAmountKrw, requiresPayment: true });
  }

  const { data: service } = await supabase
      .from("service_offerings")
      .select(
        "id,provider_id,type,title,description,price_krw,duration_minutes,duration_days,deliverables,milestones,tags,is_published,provider_profiles!inner(approval_status)"
      )
      .eq("id", parsed.data.serviceId)
      .eq("is_published", true)
      .single();
  const provider = Array.isArray(service?.provider_profiles)
    ? service.provider_profiles[0]
    : service?.provider_profiles;
  if (
    !service ||
    provider?.approval_status !== "approved"
  ) {
    return NextResponse.json(
      { message: en ? "This service is not approved for purchase." : "승인되지 않은 서비스는 구매할 수 없습니다." },
      { status: 403 }
    );
  }
  let scheduledAt = parsed.data.scheduledAt;
  if (service.type === "mentoring") {
    if (!parsed.data.availabilityId) {
      return NextResponse.json(
        { message: en ? "Select a mentoring time." : "멘토링 일정을 선택해 주세요." },
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
        { message: en ? "The selected time is no longer available." : "선택하신 일정은 예약할 수 없습니다." },
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
    sellerDisclosure: en ? "Borderless is a marketplace intermediary; the expert is the service provider." : "Borderless는 통신판매중개자이며 전문가는 서비스 제공 당사자입니다.",
    refundPolicy:
      en ? "A full refund is available before the service begins. Our operations team reviews cancellations and disputes after the service starts." : "서비스 시작 전에는 전액 환불됩니다. 시작 후의 취소·분쟁은 관리자가 직접 검토합니다.",
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

  const { error } = await admin.from("orders").insert({
    id: orderId,
    organization_id: profile.organization_id,
    buyer_id: user.id,
    provider_id: service.provider_id,
    service_id: service.id,
    availability_id: parsed.data.availabilityId,
    payment_id: paymentId,
    amount_krw: service.price_krw,
    supply_amount_krw: service.price_krw,
    vat_amount_krw: 0,
    platform_fee_krw: settlement.platformFeeKrw,
    provider_amount_krw: settlement.providerAmountKrw,
    service_snapshot: serviceSnapshot,
    terms_snapshot: termsSnapshot,
    terms_accepted_at: now,
    scheduled_at: scheduledAt
  });
  if (error?.code === "23505") {
    return NextResponse.json(
      { message: en ? "That time was just booked. Select another time." : "선택하신 일정이 방금 예약되었습니다. 다른 시간을 선택해 주세요." },
      { status: 409 }
    );
  }
  if (error) {
    return NextResponse.json(
      { message: en ? "We couldn't create the order." : "주문을 생성하지 못했습니다." },
      { status: 500 }
    );
  }
  return NextResponse.json({
    orderId,
    paymentId,
    amount: service.price_krw
  });
}
