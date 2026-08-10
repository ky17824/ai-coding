import { z } from "zod";
import type {
  GtmAssistantQuestion,
  GtmPlanDraft,
  GtmPlanItem,
  GtmPlanSource
} from "./types";

export const ASSISTANT_MODEL = "gpt-5.6-luna" as const;

const sourceSchema = z.object({
  kind: z.enum(["diagnosis", "vault", "web"]),
  title: z.string().min(1).max(180),
  url: z.string().max(2048).nullable(),
  checkedAt: z.string().nullable()
});

const itemSchema = z.object({
  sourceActionItemId: z.string().nullable(),
  questionId: z.string().nullable(),
  horizon: z.union([z.literal(30), z.literal(60), z.literal(90)]),
  priority: z.enum(["P0", "P1"]),
  title: z.string().min(1).max(180),
  rationale: z.string().min(1).max(500),
  ownerLabel: z.string().min(1).max(80),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  completionEvidence: z.string().min(1).max(400),
  dependencies: z.array(z.string().max(180)).max(5),
  riskNote: z.string().max(400),
  status: z.enum(["not_started", "in_progress", "completed", "blocked"]),
  expertRequired: z.boolean(),
  expertReason: z.string().max(400),
  serviceTag: z.string().max(80),
  handoffBrief: z.string().max(600),
  sources: z.array(sourceSchema).min(1).max(5)
});

export const assistantOutputSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("next_question"),
    questionKey: z.string().min(1).max(80),
    question: z.string().min(1).max(300),
    reason: z.string().min(1).max(300),
    inputType: z.enum(["text", "date", "select"]),
    options: z.array(z.string().max(100)).max(6)
  }),
  z.object({
    kind: z.literal("plan_draft"),
    summary: z.string().min(1).max(800),
    assumptions: z.array(z.string().max(300)).max(8),
    items: z.array(itemSchema).min(1).max(8)
  })
]);

export const assistantResponseSchema = z.object({
  result: assistantOutputSchema
});

export type AssistantModelOutput = z.infer<typeof assistantOutputSchema>;

export interface SavedAction {
  id: string;
  question_id: string | null;
  title: string;
  owner_label: string;
  completion_evidence: string;
  service_tag: string;
  urgency: "P0" | "P1";
}

const HIGH_RISK = /legal|law|tax|privacy|regulat|certif|contract|payment|정산|법|세무|인증|규제|개인정보/i;
const CURRENT_FACTS = /최신|현재|규정|규제|법률|세율|관세|인증|허가|비자|보조금|지원사업|시장 규모|환율|가격/i;

export function sanitizeFounderText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[이메일]")
    .replace(/(?:\+?82[- ]?)?0?1[016789][- ]?\d{3,4}[- ]?\d{4}/g, "[전화번호]")
    .trim();
}

export function shouldUseWebSearch(targetCountry: string, request: string) {
  return Boolean(targetCountry.trim() && CURRENT_FACTS.test(request));
}

function dateAfter(base: Date, days: number) {
  const date = new Date(base);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildDeterministicPlan(
  actions: SavedAction[],
  now = new Date()
): GtmPlanDraft {
  const source: GtmPlanSource = {
    kind: "diagnosis",
    title: "55문항 준비도 진단",
    url: null,
    checkedAt: now.toISOString().slice(0, 10)
  };
  const horizons: (30 | 60 | 90)[] = [30, 30, 60, 60, 90, 90, 90, 90];
  const items: GtmPlanItem[] = actions.slice(0, 8).map((action, index) => {
    const horizon = horizons[index];
    const expertRequired = HIGH_RISK.test(`${action.service_tag} ${action.title}`);
    return {
      sourceActionItemId: action.id,
      questionId: action.question_id,
      horizon,
      priority: action.urgency,
      title: action.title,
      rationale: "진단에서 확인된 준비도 격차를 완료 근거가 남는 실행으로 바꿉니다.",
      ownerLabel: action.owner_label,
      dueDate: dateAfter(now, horizon),
      completionEvidence: action.completion_evidence,
      dependencies: [],
      riskNote: expertRequired ? "현지 규정과 계약 조건은 실행 전에 전문가 확인이 필요합니다." : "전제가 바뀌면 일정과 완료 기준을 다시 확인해 주세요.",
      status: "not_started",
      expertRequired,
      expertReason: expertRequired ? "법률·세무·규제 판단이 포함될 수 있습니다." : "",
      serviceTag: action.service_tag,
      handoffBrief: expertRequired
        ? `${action.title}의 현지 적용 조건과 완료 근거를 검토해 주세요.`
        : "",
      sources: [source]
    };
  });

  return {
    kind: "plan_draft",
    summary: "진단에서 확인된 우선 격차를 단계별 실행계획(30·60·90 Day Plan) 순서로 정리해 드렸습니다.",
    assumptions: ["현재 진단 응답과 저장된 실행 액션을 기준으로 작성했습니다."],
    items,
    generatedBy: "deterministic-fallback"
  };
}

export function validatePlanDraft(output: AssistantModelOutput) {
  if (output.kind !== "plan_draft") return output;
  if (output.items.some((item) => item.sources.length === 0)) {
    throw new Error("모든 계획 항목에는 근거가 필요합니다.");
  }
  for (const source of output.items.flatMap((item) => item.sources)) {
    if (!source.url) continue;
    const url = new URL(source.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("근거 URL은 HTTP(S) 주소여야 합니다.");
    }
  }
  return output;
}

export function withGeneratedBy(
  output: AssistantModelOutput
): GtmAssistantQuestion | GtmPlanDraft {
  return { ...output, generatedBy: ASSISTANT_MODEL } as
    | GtmAssistantQuestion
    | GtmPlanDraft;
}
