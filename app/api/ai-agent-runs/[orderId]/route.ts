import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  aiIntakeFields,
  auditAiAgentIntake,
  aiReadinessSnapshotSchema,
  buildAiReadinessSnapshot,
  buildSafePublicResearchBrief,
  buildAiAgentInstructions,
  clearUnknownIntakeValues,
  estimateAiVariableCosts,
  nextAiAgentStep,
  normalizeAiAgentScope,
  publicTargetCountryCode,
  normalizeReportTitles,
  validateAiAgentReport,
  validateAiAgentSources
} from "@/lib/ai-agent-report";
import { collectCitedUrls, stripUnverifiedSources } from "@/lib/research-sources";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";
import { getIntakeQuestions, INTAKE_ITEMS, INTAKE_STAGES } from "@/lib/intake-questions";
import { costOf, modelSpec, type ModelKey } from "@/lib/ai-models/catalog";
import { STAGES, routesSchema, type Stage } from "@/lib/ai-models/routing";
import { openaiAdapter } from "@/lib/ai-models/openai";
import { anthropicAdapter } from "@/lib/ai-models/anthropic";
import { EMPTY_USAGE, StageError, type Adapter } from "@/lib/ai-models/types";

export const runtime = "nodejs";
const intakeSchema = z.object({
  objective: z.string().trim().max(2000).default(""),
  offering: z.string().trim().max(2000).default(""),
  targetCountry: z.string().trim().max(200).default(""),
  targetCustomer: z.string().trim().max(1000).default(""),
  currentEvidence: z.string().trim().max(6000).default(""),
  constraints: z.string().trim().max(3000).default(""),
  resources: z.string().trim().max(3000).default(""),
  deadline: z.string().trim().max(200).default(""),
  unknownFields: z.array(z.enum(aiIntakeFields)).max(8).default([])
});
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("submit_intake"), locale: z.enum(["ko", "en"]).default("ko"), intake: intakeSchema }),
  z.object({ action: z.literal("submit_clarification"), locale: z.enum(["ko", "en"]).default("ko"), answers: z.record(z.string(), z.string().trim().max(3000)) }),
  z.object({ action: z.literal("generate"), locale: z.enum(["ko", "en"]).default("ko"), assumptionsConfirmed: z.literal(true) })
]);
// Vercel Fluid Compute의 Hobby 함수 상한과 같은 값. 선언이 없으면 기본값에서
// 강제 종료되어 catch가 실행되지 않고 실행 리스가 묶인 채 남는다.
export const maxDuration = 300;

const paidServiceSchema = z.object({
  contractVersion: z.literal(1),
  questionCatalogVersion: z.enum(["4.0", "5.0"]).optional(),
  productId: z.string().trim().min(1),
  productKind: z.enum(["specialist", "package"]),
  includedAgentIds: z.array(z.string().trim().min(1)).min(1),
  questionIds: z.array(z.string().trim().min(1)).min(1),
  officialSourceQuestionIds: z.array(z.string().trim().min(1)).default([]),
  completionInstructions: z.array(z.string().trim().min(1)).min(1),
  title: z.string().trim().min(1),
  type: z.literal("ai_agent"),
  deliverables: z.array(z.string().trim().min(1)).min(1),
  readiness: aiReadinessSnapshotSchema.optional()
});

type Intake = z.infer<typeof intakeSchema>;
const requiredFields: (keyof Intake)[] = [...aiIntakeFields];
const labels = {
  ko: { objective: "이번 업무의 의사결정 목표", offering: "제품·서비스", targetCountry: "목표국가", targetCustomer: "목표고객", currentEvidence: "현재 증거", constraints: "제약", resources: "가용자원", deadline: "계획기한", unknownFields: "모름 항목" },
  en: { objective: "decision objective", offering: "offering", targetCountry: "target country", targetCustomer: "target customer", currentEvidence: "current evidence", constraints: "constraints", resources: "available resources", deadline: "deadline", unknownFields: "unknown fields" }
} as const;

function missingFields(intake: Intake, baseline: Record<string, unknown> = {}, confirmedFields: string[] = []) {
  return auditAiAgentIntake(intake, baseline, confirmedFields).filter((item) => item.status === "missing" || item.status === "conflicting").map((item) => item.field);
}

function questionsFor(fields: (keyof Intake)[], locale: "ko" | "en") {
  return fields.slice(0, 4).map((field) => ({
    id: String(field),
    question: locale === "en"
      ? `Please provide ${labels.en[field]}, or answer “unknown” so the AI can use labelled analog assumptions.`
      : `${labels.ko[field]}을 알려주세요. 모르면 ‘모름’이라고 답하면 AI가 유사사례 가정으로 보완합니다.`
  }));
}

async function loadOrder(orderId: string, userId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return { admin: null, order: null, run: null };
  const { data: order } = await admin.from("orders")
    .select("id,organization_id,buyer_id,status,order_kind,product_key,amount_krw,service_snapshot,created_at")
    .eq("id", orderId).eq("buyer_id", userId).maybeSingle();
  if (!order || order.order_kind !== "ai_agent" || !order.product_key) return { admin, order: null, run: null };
  const { data: run } = await admin.from("ai_agent_runs").select("*").eq("order_id", orderId).maybeSingle();
  return { admin, order, run };
}

/**
 * 생성 중 화면이 진행 단계를 읽어 가는 곳. 폴링용이라 가볍게 유지한다.
 * 생성이 끝나면 클라이언트가 보고서까지 받아야 하므로 실행 레코드 전체를 돌려준다.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const { orderId } = await params;
  const { order, run } = await loadOrder(orderId, user.id);
  if (!order || !run) return NextResponse.json({ message: "AI 주문을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ run }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const startedAt = Date.now();
  const user = await requireUser();
  if (!user) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "입력값을 확인해 주세요." }, { status: 400 });
  const { orderId } = await params;
  const en = parsed.data.locale === "en";
  const { admin, order, run } = await loadOrder(orderId, user.id);
  if (!admin || !order) return NextResponse.json({ message: en ? "We couldn't find the AI order." : "AI 주문을 찾을 수 없습니다." }, { status: 404 });
  if (!run || !["paid", "service_started", "completed"].includes(order.status)) {
    return NextResponse.json({ message: en ? "Payment confirmation is still being processed." : "결제 확인을 처리 중입니다. 잠시 후 다시 확인해 주세요." }, { status: 402 });
  }
  const parsedService = paidServiceSchema.safeParse(order.service_snapshot);
  if (!parsedService.success || parsedService.data.productId !== order.product_key) return NextResponse.json({ message: en ? "We couldn't find the paid AI product contract." : "결제 당시 AI 상품 실행 기준을 찾을 수 없습니다." }, { status: 409 });
  const service = { ...parsedService.data, id: parsedService.data.productId };
  let readiness = parsedService.data.readiness;
  if (!readiness) {
    const { data: legacyAssessment, error: assessmentError } = await admin.from("assessments")
      .select("id,overall_score,status_label,gate_messages,completed_at,target_country,target_customer_segment,target_market_confirmed_at,survey_version,sales_motion")
      .eq("organization_id", order.organization_id)
      .lte("completed_at", order.created_at)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assessmentError) return NextResponse.json({ message: en ? "We couldn't load the saved readiness assessment." : "저장된 준비도 진단을 불러오지 못했습니다." }, { status: 500 });
    const { data: legacyAnswers, error: legacyAnswersError } = legacyAssessment
      ? await admin.from("readiness_answers").select("question_id,level").eq("assessment_id", legacyAssessment.id).limit(55)
      : { data: [], error: null };
    if (legacyAnswersError) return NextResponse.json({ message: en ? "We couldn't load the saved readiness answers." : "저장된 준비도 답변을 불러오지 못했습니다." }, { status: 500 });
    readiness = buildAiReadinessSnapshot(legacyAssessment, legacyAnswers ?? []);
  }
  const { data: boundRun, error: bindError } = await admin.rpc("bind_ai_agent_readiness_snapshot", { p_order_id: orderId, p_readiness_snapshot: readiness });
  if (bindError || !boundRun) return NextResponse.json({ message: en ? "We couldn't bind the paid readiness scope." : "결제 시점의 준비도 범위를 고정하지 못했습니다." }, { status: 500 });
  const boundReadiness = aiReadinessSnapshotSchema.safeParse(boundRun.scope_snapshot?.readiness);
  if (!boundReadiness.success) return NextResponse.json({ message: en ? "The paid readiness scope is invalid." : "결제 시점의 준비도 범위가 올바르지 않습니다." }, { status: 500 });
  readiness = boundReadiness.data;
  const { data: boundAssessment, error: assessmentError } = readiness.assessmentId
    ? await admin.from("assessments")
      .select("id,overall_score,status_label,gate_messages,completed_at,target_country,target_customer_segment")
      .eq("id", readiness.assessmentId)
      .eq("organization_id", order.organization_id)
      .maybeSingle()
    : { data: null, error: null };
  if (assessmentError) return NextResponse.json({ message: en ? "We couldn't load the bound readiness assessment." : "고정된 준비도 진단을 불러오지 못했습니다." }, { status: 500 });
  const activeRun = boundRun;
  const intakeBaseline = { targetCountry: boundAssessment?.target_country ?? "", targetCustomer: boundAssessment?.target_customer_segment ?? "" };

  if (parsed.data.action === "submit_intake") {
    const normalizedIntake = clearUnknownIntakeValues(parsed.data.intake);
    const nextScope = normalizeAiAgentScope(normalizedIntake);
    const savedScope = normalizeAiAgentScope(activeRun.scope_snapshot ?? {});
    const scopeUnknown = normalizedIntake.unknownFields.some((field) => ["offering", "targetCountry", "targetCustomer"].includes(field));
    if (Number(activeRun.generation_count ?? 0) >= 2) {
      return NextResponse.json({ message: en ? "The included correction has already been used." : "포함된 사실 정정 재생성을 이미 사용했습니다." }, { status: 409 });
    }
    if (Number(activeRun.generation_count ?? 0) > 0 && (scopeUnknown || JSON.stringify(nextScope) !== JSON.stringify(savedScope))) {
      return NextResponse.json({ message: en ? "Changing the offering, target country, or core customer requires a new order." : "제품·목표국가·핵심고객 변경은 새로운 유료 업무로 신청해야 합니다." }, { status: 409 });
    }
    const missing = missingFields(normalizedIntake, intakeBaseline);
    const inputAudit = auditAiAgentIntake(normalizedIntake, intakeBaseline);
    const nextStatus = nextAiAgentStep({ missingCriticalInputs: missing.length > 0, clarificationRound: 0 });
    const pendingQuestions = nextStatus === "clarifying" ? questionsFor(missing, parsed.data.locale) : [];
    const { data, error } = await admin.from("ai_agent_runs").update({
      locale: parsed.data.locale,
      intake: normalizedIntake,
      input_audit: inputAudit,
      clarification_round: 0,
      pending_questions: pendingQuestions,
      clarification_answers: [],
      assumptions: normalizedIntake.unknownFields.map((field) => ({ field, basis: "analog_case_required" })),
      status: nextStatus,
      updated_at: new Date().toISOString()
    }).eq("order_id", orderId).in("status", ["intake", "ready", "failed", "completed"]).select("*").maybeSingle();
    if (error) return NextResponse.json({ message: en ? "We couldn't save the intake." : "필요정보를 저장하지 못했습니다." }, { status: 500 });
    if (!data) return NextResponse.json({ message: en ? "The report is currently being generated." : "현재 보고서를 생성 중입니다." }, { status: 409 });
    return NextResponse.json({ run: data });
  }

  if (parsed.data.action === "submit_clarification") {
    const intake = intakeSchema.parse(activeRun.intake ?? {});
    const merged = { ...intake } as Intake;
    const unknown = new Set(merged.unknownFields);
    const pendingIds = new Set(Array.isArray(activeRun.pending_questions) ? activeRun.pending_questions.map((question: { id?: string }) => question.id) : []);
    const acceptedAnswers: Record<string, string> = {};
    for (const [field, answer] of Object.entries(parsed.data.answers)) {
      if (!pendingIds.has(field)) continue;
      if (!requiredFields.includes(field as keyof Intake)) continue;
      acceptedAnswers[field] = answer;
      if (/^(모름|unknown|don't know|do not know)$/i.test(answer.trim())) {
        unknown.add(field as never);
        (merged as unknown as Record<string, unknown>)[field] = "";
      }
      else {
        unknown.delete(field as never);
        (merged as unknown as Record<string, unknown>)[field] = answer;
      }
    }
    merged.unknownFields = [...unknown];
    if (Number(activeRun.generation_count ?? 0) > 0) {
      const scopeUnknown = merged.unknownFields.some((field) => ["offering", "targetCountry", "targetCustomer"].includes(field));
      if (scopeUnknown || JSON.stringify(normalizeAiAgentScope(merged)) !== JSON.stringify(normalizeAiAgentScope(activeRun.scope_snapshot ?? {}))) {
        return NextResponse.json({ message: en ? "Changing the offering, target country, or core customer requires a new order." : "제품·목표국가·핵심고객 변경은 새로운 유료 업무로 신청해야 합니다." }, { status: 409 });
      }
    }
    const round = Math.min(2, Number(activeRun.clarification_round ?? 0) + 1);
    const previousAnswers = Array.isArray(activeRun.clarification_answers) ? activeRun.clarification_answers : [];
    const confirmedFields = [...new Set([...previousAnswers, acceptedAnswers].flatMap((entry) => Object.keys(entry ?? {})))];
    let missing = missingFields(merged, intakeBaseline, confirmedFields);
    const nextStatus = nextAiAgentStep({ missingCriticalInputs: missing.length > 0, clarificationRound: round });
    if (nextStatus === "ready" && missing.length > 0) {
      merged.unknownFields = [...new Set([...merged.unknownFields, ...missing])];
      for (const field of missing) (merged as unknown as Record<string, unknown>)[field] = "";
      missing = [];
    }
    const pendingQuestions = nextStatus === "clarifying" ? questionsFor(missing, parsed.data.locale) : [];
    const { data, error } = await admin.from("ai_agent_runs").update({
      intake: merged,
      input_audit: auditAiAgentIntake(merged, intakeBaseline, confirmedFields),
      clarification_round: round,
      pending_questions: pendingQuestions,
      clarification_answers: [...previousAnswers, acceptedAnswers],
      assumptions: merged.unknownFields.map((field) => ({ field, basis: "analog_case_required" })),
      status: nextStatus,
      updated_at: new Date().toISOString()
    }).eq("order_id", orderId).eq("status", "clarifying").select("*").maybeSingle();
    if (error) return NextResponse.json({ message: en ? "We couldn't save the clarification." : "추가정보를 저장하지 못했습니다." }, { status: 500 });
    if (!data) return NextResponse.json({ message: en ? "The run state changed. Refresh the order." : "작업 상태가 변경되었습니다. 주문을 새로고침해 주세요." }, { status: 409 });
    return NextResponse.json({ run: data });
  }

  if (!["ready", "failed", "completed", "generating"].includes(activeRun.status)) return NextResponse.json({ message: en ? "Review the required information first." : "필요정보와 가정을 먼저 확인해 주세요." }, { status: 409 });
  const { data: answers, error: answersError } = readiness.assessmentId
    ? await admin.from("readiness_answers").select("question_id,level,evidence_kind,evidence_value").eq("assessment_id", readiness.assessmentId).limit(55)
    : { data: [], error: null };
  if (answersError) return NextResponse.json({ message: en ? "We couldn't load the saved readiness answers." : "저장된 준비도 답변을 불러오지 못했습니다." }, { status: 500 });
  const { data: reserved, error: reserveError } = await admin.rpc("reserve_ai_agent_generation", { p_order_id: orderId });
  if (reserveError) return NextResponse.json({ message: en ? "We couldn't reserve report generation." : "보고서 생성 작업을 예약하지 못했습니다." }, { status: 500 });
  if (!reserved?.generation_attempt_id) {
    // reserve_ai_agent_generation은 활성 라우팅 설정이 없을 때도 null을 반환한다(022 §3) —
    // 생성 중/재생성 한도 소진과 같은 null이라 구분이 안 된다. 사용자에게 "재생성 한도를
    // 썼다"고 잘못 말하지 않으려면 활성 설정이 실제로 없는지 따로 확인해야 한다.
    const { data: activeConfig, error: activeConfigError } = await admin
      .from("ai_model_routing_configs")
      .select("version")
      .eq("status", "active")
      .maybeSingle();
    if (!activeConfigError && !activeConfig) {
      console.error("[ai-agent-run] reserve refused: no active model routing config", { orderId, userId: user.id, runStatus: activeRun.status, orderStatus: order.status });
      return NextResponse.json({ message: en ? "The AI model is not configured yet. Please contact support." : "AI 모델 설정이 없어 보고서를 생성할 수 없습니다. 운영팀에 문의해 주세요." }, { status: 503 });
    }
    return NextResponse.json({ message: en ? "A report is already being generated or the correction limit was reached." : "이미 보고서를 생성 중이거나 사실 정정 재생성 한도를 사용했습니다." }, { status: 409 });
  }

  // 시도 기록과 실패 RPC 헬퍼. 예약 직후부터 필요하다 — 라우트 스냅샷이 깨져 있거나
  // 필요한 공급자 키가 없으면 어떤 단계도 시작하기 전에 실패 처리해야 한다.
  //
  // 기록 자체(fail_ai_agent_generation 호출)가 실패하면 실행이 이유 없이 'generating'에
  // 묶인 채 15분 리스가 재시도를 막는다 — 오늘 실제로 겪은 장애라 020이 존재한다.
  // 그래서 모든 실패 경로가 이 함수 하나만 거치게 해서, 쓰기 실패를 반드시 로그로 남긴다.
  const attempts: Array<{ stage: Stage; model: ModelKey; ok: boolean; errorClass?: string; usage: typeof EMPTY_USAGE; costUsd: number; ms: number }> = [];
  const recordFailure = async (u: typeof EMPTY_USAGE, message: string, modelAttempts: typeof attempts) => {
    const cost = attempts.reduce((sum, a) => sum + a.costUsd, 0);
    const c = estimateAiVariableCosts({ modelCostUsd: cost, webSearchCalls: u.webSearchCalls, grossAmountKrw: order.amount_krw });
    const { data, error } = await admin.rpc("fail_ai_agent_generation", {
      p_order_id: orderId, p_attempt_id: reserved.generation_attempt_id, p_error_message: message,
      p_input_tokens: u.input, p_cached_input_tokens: u.cachedInput, p_output_tokens: u.output, p_web_search_calls: u.webSearchCalls,
      p_model_cost_usd: cost, p_tool_cost_usd: c.toolCostUsd, p_payment_fee_krw: c.paymentFeeKrw, p_support_storage_krw: c.supportStorageKrw, p_total_variable_cost_krw: c.totalVariableCostKrw,
      p_model_attempts: modelAttempts
    });
    if (error || !data) console.error("[ai-agent-run] failure handling did not persist", { orderId, error, data });
    return { data, error };
  };

  const routes = routesSchema.safeParse(reserved.model_route_snapshot);
  if (!routes.success) {
    await recordFailure(EMPTY_USAGE, "invalid_model_route_snapshot", []);
    return NextResponse.json({ message: en ? "The AI model configuration is invalid." : "AI 모델 설정이 올바르지 않습니다." }, { status: 500 });
  }
  const providersNeeded = new Set(STAGES.map((stage) => modelSpec(routes.data[stage].model).provider));
  if ((providersNeeded.has("openai") && !process.env.OPENAI_API_KEY) || (providersNeeded.has("anthropic") && !process.env.ANTHROPIC_API_KEY)) {
    await recordFailure(EMPTY_USAGE, "provider_key_missing", []);
    return NextResponse.json({ message: en ? "The AI model is not configured." : "AI 모델이 구성되지 않았습니다." }, { status: 503 });
  }

  const reportDate = new Date().toISOString().slice(0, 10);
  const questions = getIntakeQuestions(
    parsed.data.locale,
    service.questionCatalogVersion ?? readiness.surveyVersion ?? "4.0"
  );
  const resolvedQuestionIds = new Set(readiness.resolvedQuestionIds);
  const contractQuestionIds = readiness.assessmentId
    ? service.questionIds.filter((id) => resolvedQuestionIds.has(id))
    : service.questionIds;
  const itemStage = new Map(INTAKE_ITEMS.map((item) => [item.id, item.stageId]));
  const answerMap = new Map((answers ?? []).map((answer) => [answer.question_id, answer]));
  const currentStageId = INTAKE_STAGES.find((stage) => questions.some((question) => {
    const answer = answerMap.get(question.id);
    return itemStage.get(question.itemId) === stage.id && Boolean(answer) && Number(answer?.level) < 3;
  }))?.id;
  const priorityRank = { critical: 0, current_gate: 1, low_score: 2, other: 3 } as const;
  const relevantQuestions = questions.filter((question) => contractQuestionIds.includes(question.id)).map((question) => {
    const answer = answerMap.get(question.id);
    const stageId = itemStage.get(question.itemId);
    const priority: keyof typeof priorityRank = question.critical ? "critical" : answer && stageId === currentStageId ? "current_gate" : answer && Number(answer.level) < 3 ? "low_score" : "other";
    return { questionId: question.id, question: question.question, action: question.action, stageId, critical: Boolean(question.critical), priority, level: answer?.level ?? null, evidenceKind: answer?.evidence_kind ?? null, evidence: answer?.evidence_value ?? null };
  }).sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  const privateContext = {
    intake: reserved.intake,
    clarificationAnswers: reserved.clarification_answers,
    requiredAnalogAssumptions: reserved.assumptions,
    readiness: boundAssessment,
    readinessApplicability: readiness.notApplicable,
    relevantQuestions,
    reportDate
  };

  const deadlineAt = startedAt + 285_000;
  const ensureBudget = (stage: Stage) => { if (deadlineAt - Date.now() < 20_000) throw new Error(`budget_exhausted:${stage}`); };
  const adapterFor = (key: ModelKey): Adapter => { const spec = modelSpec(key); return spec.provider === "anthropic" ? anthropicAdapter(spec.model) : openaiAdapter(spec.model); };
  let usage = { ...EMPTY_USAGE };
  let modelCostUsd = 0;
  const runStage = async <T>(stage: Stage, fn: (adapter: Adapter, effort: "low" | "medium" | "high") => Promise<{ parsed: T; usage: typeof EMPTY_USAGE; allowedUrls?: Set<string> }>) => {
    ensureBudget(stage);
    const route = routes.data[stage];
    // 패키지 상품은 조사·보고서 단계를 high로 승격한다(020 이전 동작과 동일 — 4b19b47).
    // 분류 단계는 원래도 늘 medium이었으므로 승격 대상이 아니다.
    const effort = (stage === "public_research" || stage === "final_report") && service.productKind === "package" ? "high" : route.effort;
    const began = Date.now();
    try {
      const result = await fn(adapterFor(route.model), effort);
      const cost = costOf(route.model, result.usage);
      attempts.push({ stage, model: route.model, ok: true, usage: result.usage, costUsd: cost, ms: Date.now() - began });
      usage = { input: usage.input + result.usage.input, cachedInput: usage.cachedInput + result.usage.cachedInput, cacheWriteInput: usage.cacheWriteInput + result.usage.cacheWriteInput, output: usage.output + result.usage.output, webSearchCalls: usage.webSearchCalls + result.usage.webSearchCalls };
      modelCostUsd += cost;
      return result;
    } catch (error) {
      // Anthropic 쪽은 StageError로 실패 전까지 쌓인 usage를 실어 던진다(pause_turn 상한,
      // 예산 초과 등). 그냥 Error(예산 사전 검사, OpenAI 쪽 실패)는 usage가 없다 — 둘 다 받는다.
      const errUsage = error instanceof StageError ? error.usage : EMPTY_USAGE;
      const errCost = costOf(route.model, errUsage);
      attempts.push({ stage, model: route.model, ok: false, errorClass: error instanceof Error ? error.message.slice(0, 120) : "unknown", usage: errUsage, costUsd: errCost, ms: Date.now() - began });
      usage = { input: usage.input + errUsage.input, cachedInput: usage.cachedInput + errUsage.cachedInput, cacheWriteInput: usage.cacheWriteInput + errUsage.cacheWriteInput, output: usage.output + errUsage.output, webSearchCalls: usage.webSearchCalls + errUsage.webSearchCalls };
      modelCostUsd += errCost;
      throw error;
    }
  };
  const userHash = createHash("sha256").update(user.id).digest("hex");
  const finalModel = routes.data.final_report.model;

  let allowedUrls = new Set<string>();
  // 진행 단계 기록. 화면의 플로우차트는 이 값만 그린다.
  // 실패해도 생성을 막지 않는다 — 진행 표시가 없다고 보고서를 포기할 이유는 없다.
  const markStage = (stage: "context" | "research" | "verify" | "report" | "finalize") =>
    admin.rpc("set_ai_agent_generation_stage", { p_order_id: orderId, p_attempt_id: reserved.generation_attempt_id, p_stage: stage })
      .then(({ error }) => { if (error) console.warn("[ai-agent-run] stage not recorded", { orderId, stage, error }); });

  try {
    await markStage("context");
    const rawReferenceFiles = Array.isArray(reserved.reference_files) ? reserved.reference_files.slice(0, 3) : [];
    const referenceFiles = await Promise.all(rawReferenceFiles.map(async (file: { storagePath?: string; fileName?: string; mimeType?: string }) => {
      const prefix = `${user.id}/ai-agent/${orderId}/`;
      if (!file.storagePath?.startsWith(prefix) || !file.fileName) throw new Error("reference_file_invalid");
      const name = file.storagePath.slice(prefix.length);
      const { data: stored } = await admin.storage.from("evidence").list(`${user.id}/ai-agent/${orderId}`, { search: name, limit: 1 });
      if (!stored?.some((item) => item.name === name)) throw new Error("reference_file_missing");
      const { data, error } = await admin.storage.from("evidence").createSignedUrl(file.storagePath, 15 * 60);
      if (error || !data?.signedUrl) throw new Error("reference_file_unavailable");
      return { signedUrl: data.signedUrl, fileName: file.fileName, mimeType: file.mimeType ?? "application/octet-stream" };
    }));

    const classification = await runStage("classification", (adapter, effort) =>
      adapter.classify({ locale: parsed.data.locale, effort, userHash, intake: reserved.intake ?? {} }));
    const parsedClassification = classification.parsed;
    const publicBrief = buildSafePublicResearchBrief({
      ...parsedClassification,
      targetCountryCode: publicTargetCountryCode(reserved.intake?.targetCountry, parsedClassification.targetCountryCode),
      locale: parsed.data.locale,
      researchQuestions: [
        en ? `Current external evidence for ${service.type}` : `${service.type} 관련 최신 외부 근거`,
        en ? `Comparable cases and counter-evidence for ${service.title}` : `${service.title} 관련 유사사례와 반대 근거`,
        en ? `Implementation requirements for ${service.deliverables.join(", ")}` : `${service.deliverables.join(", ")} 실행 요건`
      ]
    });

    await markStage("research");
    const research = await runStage("public_research", (adapter, effort) =>
      adapter.research({ locale: parsed.data.locale, effort, userHash, serviceTitle: service.title, deliverables: service.deliverables, completionInstructions: service.completionInstructions ?? [], publicBrief, reportDate, deadlineAt }));
    const publicEvidence = research.parsed;
    await markStage("verify");
    allowedUrls = research.allowedUrls ?? new Set();
    // 검색으로 확인되지 않은 출처는 버리고 진행한다. 전체를 실패시키던 예전 방식은
    // 모델이 URL 하나만 잘못 적어도 4분짜리 실행을 통째로 날렸다(주문 6d76942a).
    // 다만 남는 것이 없으면 조사가 무의미하므로 그때는 실패한다.
    const droppedUrls: string[] = [];
    stripUnverifiedSources(publicEvidence, allowedUrls, droppedUrls);
    if (droppedUrls.length) console.warn("[ai-agent-run] unverified sources dropped", { orderId, dropped: droppedUrls });
    if (publicEvidence.sources.length === 0) throw new Error("검색 도구로 확인된 출처가 하나도 없습니다.");
    // 개별 발견 항목의 출처가 전부 걸러졌을 수 있다. 근거 없는 발견은 남기지 않는다.
    publicEvidence.findings = publicEvidence.findings.filter((finding) => finding.sourceUrls.length > 0);
    if (publicEvidence.findings.length === 0) throw new Error("검색 도구로 확인된 출처를 가진 발견이 없습니다.");
    validateAiAgentSources([...collectCitedUrls(publicEvidence)], allowedUrls);

    await markStage("report");
    const reportInstructions = `${buildAiAgentInstructions(parsed.data.locale, service.title, service.deliverables)} ${(service.completionInstructions ?? []).join(" ")} ${en ? `Use every question ID exactly once in questionCoverage, ordered Critical, current_gate, low_score, other. Mark unused questions excluded with a reason. Cite source URLs only from publicEvidence. Resolve or explicitly record every contradiction. Required question IDs: ${contractQuestionIds.join(", ")}.` : `모든 문항 ID를 questionCoverage에 정확히 한 번 넣고 Critical, current_gate, low_score, other 순서로 정렬하세요. 사용하지 않은 문항은 제외 이유를 적으세요. 출처 URL은 publicEvidence에 있는 것만 사용하세요. 모순은 모두 해결하거나 명시적으로 기록하세요. 필수 문항 ID: ${contractQuestionIds.join(", ")}.`}`;
    const reportPayload = { product: { id: service.id, title: service.title, includedAgentIds: service.includedAgentIds, deliverables: service.deliverables }, privateContext, publicEvidence, privateFiles: referenceFiles.map((file) => file.fileName).filter(Boolean) };
    const reportResult = await runStage("final_report", (adapter, effort) =>
      adapter.writeReport({ locale: parsed.data.locale, effort, userHash, instructions: reportInstructions, payload: reportPayload, includedAgentIds: service.includedAgentIds, files: referenceFiles, deadlineAt }));
    await markStage("finalize");
    const report = normalizeReportTitles(reportResult.parsed);
    validateAiAgentSources([...collectCitedUrls(report)], allowedUrls);
    validateAiAgentReport(report, {
      questionIds: contractQuestionIds,
      includedAgentIds: service.includedAgentIds,
      officialSourceQuestionIds: service.officialSourceQuestionIds,
      questionPriorities: Object.fromEntries(relevantQuestions.map((question) => [question.questionId, question.priority]))
    }, reportDate);
    const costs = estimateAiVariableCosts({ modelCostUsd, webSearchCalls: usage.webSearchCalls, grossAmountKrw: order.amount_krw });
    const { data: completed, error } = await admin.rpc("complete_ai_agent_generation", {
      p_order_id: orderId, p_attempt_id: reserved.generation_attempt_id, p_report: report,
      p_input_tokens: usage.input, p_cached_input_tokens: usage.cachedInput, p_output_tokens: usage.output,
      p_web_search_calls: usage.webSearchCalls, p_model_cost_usd: modelCostUsd, p_tool_cost_usd: costs.toolCostUsd,
      p_payment_fee_krw: costs.paymentFeeKrw, p_support_storage_krw: costs.supportStorageKrw, p_total_variable_cost_krw: costs.totalVariableCostKrw,
      p_model: finalModel, p_model_attempts: attempts
    });
    if (error || !completed) throw new Error("stale_generation_attempt");
    return NextResponse.json({ report, generatedBy: finalModel });
  } catch (error) {
    // DB에 남기기 전에 먼저 기록한다. 아래 RPC가 실패하면 원인이 어디에도 남지 않는다.
    // 실제로 fail_ai_agent_generation의 타입 버그(020에서 수정) 때문에 실패한 실행의
    // 원인을 사후에 알 방법이 없었다.
    console.error("[ai-agent-run] generation failed", { orderId, attemptId: reserved.generation_attempt_id, error });
    const { data: failed, error: failError } = await recordFailure(usage, error instanceof Error ? error.message : "generation_failed", attempts);
    if (failError || !failed) return NextResponse.json({ message: en ? "The generation state needs an operations review." : "생성 상태를 저장하지 못해 운영 확인이 필요합니다." }, { status: 500 });
    if (reserved.report) {
      return NextResponse.json({ report: reserved.report, correctionFailed: true, generationCount: reserved.generation_count, message: en ? "The correction attempt failed. The previous report is unchanged, and the included correction attempt was used." : "사실 정정 생성에 실패해 이전 보고서는 변경되지 않았으며, 포함된 정정 시도 1회는 사용되었습니다." });
    }
    return NextResponse.json({ message: en ? "The report could not be completed. You can retry once." : "보고서를 완성하지 못했습니다. 한 번 다시 시도할 수 있습니다." }, { status: 502 });
  }
}
