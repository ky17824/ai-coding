import { NextResponse } from "next/server";
import { z } from "zod";
import { applyOffering } from "@/lib/intake-questions";
import { calculateReadiness, validateAssessmentAnswers } from "@/lib/readiness";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

const answerSchema = z.object({
  questionId: z.string().min(1).max(80),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  evidence: z
    .object({
      kind: z.enum(["note", "url", "file"]),
      value: z.string().trim().min(1).max(2000)
    })
    .optional()
});
const requestSchema = z.object({
  answers: z.array(answerSchema).min(1).max(55),
  locale: z.enum(["ko", "en"]).default("ko"),
  offering: z.enum(["both", "product", "service"]).default("both"),
  targetMarket: z.object({
    targetCountry: z.string().trim().max(100).default(""),
    targetCustomerSegment: z.string().trim().max(300).default(""),
    confirmed: z.boolean().default(false)
  }).default({ targetCountry: "", targetCustomerSegment: "", confirmed: false })
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  const locale = parsed.success ? parsed.data.locale : "ko";
  if (!parsed.success) {
    return NextResponse.json(
      { message: locale === "en" ? "Review the responses in the completed stage." : "완료한 단계의 진단 응답을 확인해 주세요." },
      { status: 400 }
    );
  }
  const validation = validateAssessmentAnswers(parsed.data.answers, locale);
  if (!validation.valid) {
    return NextResponse.json(
      { message: locale === "en" ? "Review the selected responses." : "응답 값을 확인해 주세요.", errors: validation.errors },
      { status: 400 }
    );
  }
  const targetMarket = parsed.data.targetMarket;
  const marketConfirmed = Boolean(
    targetMarket.confirmed &&
    targetMarket.targetCountry &&
    targetMarket.targetCustomerSegment
  );
  const result = calculateReadiness(parsed.data.answers, {
    ...targetMarket,
    confirmed: marketConfirmed
  }, locale);
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ ...result, demo: true });
    }
    return NextResponse.json({ message: locale === "en" ? "Please sign in." : "로그인이 필요합니다." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) {
    return NextResponse.json(
      { message: locale === "en" ? "We could not find your organization." : "조직 정보를 찾을 수 없습니다." },
      { status: 403 }
    );
  }

  const { data: assessment, error } = await supabase
    .from("assessments")
    .insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      overall_score: result.overallScore,
      domain_scores: result.domainScores,
      status_label: result.status,
      is_on_hold: result.isOnHold,
      gate_messages: result.gateMessages,
      target_country: targetMarket.targetCountry || null,
      target_customer_segment: targetMarket.targetCustomerSegment || null,
      target_market_confirmed_at: marketConfirmed ? new Date().toISOString() : null
    })
    .select("id")
    .single();
  if (error || !assessment) {
    return NextResponse.json(
      { message: locale === "en" ? "We could not save the assessment results." : "진단 결과를 저장하지 못했습니다." },
      { status: 500 }
    );
  }

  const { error: answerError } = await supabase
    .from("readiness_answers")
    .insert(
      parsed.data.answers.map((answer) => ({
        assessment_id: assessment.id,
        question_id: answer.questionId,
        level: answer.level,
        evidence_kind: answer.evidence?.kind,
        evidence_value: answer.evidence?.value
      }))
    );
  if (answerError) {
    await supabase.from("assessments").delete().eq("id", assessment.id);
    return NextResponse.json(
      { message: locale === "en" ? "We could not save the assessment responses." : "진단 응답을 저장하지 못했습니다." },
      { status: 500 }
    );
  }

  const { error: actionError } = await supabase.from("action_items").insert(
    result.actions.map((action, index) => ({
      organization_id: profile.organization_id,
      assessment_id: assessment.id,
      question_id: action.questionId,
      title: applyOffering(action.title, parsed.data.offering, locale),
      owner_label: action.owner,
      completion_evidence: action.completionEvidence,
      phase: action.phase,
      service_tag: action.serviceTag,
      urgency: action.urgency,
      due_date: new Date(
        Date.now() + (index + 1) * 14 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10)
    }))
  );
  if (actionError) {
    return NextResponse.json(
      { message: locale === "en" ? "The assessment was saved, but the action items could not be created." : "진단은 저장됐지만 액션 생성에 실패했습니다." },
      { status: 500 }
    );
  }

  return NextResponse.json({ assessmentId: assessment.id, ...result });
}
