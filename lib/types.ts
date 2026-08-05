export type UserRole = "startup" | "provider" | "admin";
export type JourneyPhase = "pre_entry" | "initial_entry" | "scale";
/** 1 미인지 · 2 인지·계획 · 3 실행·사례 · 4 반복·확인 */
export type ReadinessLevel = 1 | 2 | 3 | 4;
export type ReadinessStatus = "극초기" | "준비중" | "준비완료" | "진출 실행 가능";
export type ServiceType = "mentoring" | "consulting";
export type OrderStatus =
  | "pending"
  | "paid"
  | "service_started"
  | "completed"
  | "cancelled"
  | "refunded"
  | "disputed";

export interface EvidenceInput {
  kind: "note" | "url" | "file";
  value: string;
}

export interface ReadinessAnswer {
  questionId: string;
  level: ReadinessLevel;
  evidence?: EvidenceInput;
}

export interface ActionRecommendation {
  questionId: string;
  title: string;
  owner: string;
  completionEvidence: string;
  phase: JourneyPhase;
  serviceTag: string;
  urgency: "P0" | "P1";
}

export interface StageResult {
  stageId: string;
  label: string;
  gate: string;
  unlocks: string;
  /** 긍정(3~4단계) 문항의 배점 합 */
  positiveScore: number;
  totalScore: number;
  /** positiveScore / totalScore */
  ratio: number;
  /** 3단계 미만인 Critical 문항의 질문 문구 */
  blockers: string[];
  passed: boolean;
  /** 80%까지 남은 배점 */
  scoreToPass: number;
}

export interface ReadinessResult {
  /** 100점 만점의 긍정 배점 합 */
  overallScore: number;
  /** stageId → 긍정 비율 %. DB assessments.domain_scores 로 저장된다. */
  domainScores: Record<string, number>;
  status: ReadinessStatus;
  isOnHold: boolean;
  gateMessages: string[];
  actions: ActionRecommendation[];
  stages: StageResult[];
  /** 연속으로 통과한 마지막 단계 */
  achievedStageId: string | null;
  /** 지금 집중할 단계. 전부 통과하면 null */
  currentStageId: string | null;
}

export interface ServiceOffering {
  id: string;
  providerId?: string;
  providerName: string;
  providerTitle: string;
  type: ServiceType;
  title: string;
  description: string;
  price: number;
  durationLabel: string;
  tags: string[];
  deliverables: string[];
  approved: boolean;
  rating: number;
  reviewCount: number;
  availableSlots?: {
    id: string;
    startsAt: string;
    endsAt: string;
  }[];
}

export type GtmPlanStatus = "draft" | "active" | "superseded" | "completed";
export type GtmPlanItemStatus = "not_started" | "in_progress" | "completed" | "blocked";

export interface GtmPlanSource {
  kind: "diagnosis" | "vault" | "web";
  title: string;
  url: string | null;
  checkedAt: string | null;
}

export interface GtmPlanItem {
  id?: string;
  sourceActionItemId: string | null;
  questionId: string | null;
  horizon: 30 | 60 | 90;
  priority: "P0" | "P1";
  title: string;
  rationale: string;
  ownerLabel: string;
  dueDate: string;
  completionEvidence: string;
  dependencies: string[];
  riskNote: string;
  status: GtmPlanItemStatus;
  expertRequired: boolean;
  expertReason: string;
  serviceTag: string;
  handoffBrief: string;
  sources: GtmPlanSource[];
}

export interface GtmPlanDraft {
  kind: "plan_draft";
  summary: string;
  assumptions: string[];
  items: GtmPlanItem[];
  generatedBy: "gpt-5.6-luna" | "deterministic-fallback";
}

export interface GtmAssistantQuestion {
  kind: "next_question";
  questionKey: string;
  question: string;
  reason: string;
  inputType: "text" | "date" | "select";
  options: string[];
  generatedBy: "gpt-5.6-luna";
}

export interface StoredGtmPlan {
  id: string;
  assessmentId: string;
  status: GtmPlanStatus;
  summary: string;
  assumptions: string[];
  founderContext: Record<string, string>;
  recentMessages: { role: "assistant" | "user"; content: string }[];
  turnCount: number;
  generationCount: number;
  generatedBy: string;
  items: GtmPlanItem[];
}
