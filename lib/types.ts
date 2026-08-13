export type UserRole = "startup" | "provider" | "admin";
export type JourneyPhase = "pre_entry" | "initial_entry" | "scale";
/** 1 미인지 · 2 인지·계획 · 3 실행·사례 · 4 반복·확인 */
export type ReadinessLevel = 1 | 2 | 3 | 4;
export type ReadinessStatus =
  | "준비 1단계"
  | "준비 2단계"
  | "준비 3단계"
  | "진출 실행 가능"
  | "Readiness Stage 1"
  | "Readiness Stage 2"
  | "Readiness Stage 3"
  | "Ready to Enter";
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

export interface TargetMarketContext {
  targetCountry: string;
  targetCustomerSegment: string;
  confirmed?: boolean;
  confirmedAt?: string | null;
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
  /** 문항 점수와 별도로 창업자가 직접 확정해야 하는 조건 */
  prerequisiteBlockers: string[];
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

export interface GtmFounderContext {
  offeringType: "product" | "service" | "solution" | "hybrid" | "";
  offeringName: string;
  offeringSummary: string;
  customerProblem: string;
  coreValue: string;
  currentAlternative: string;
  differentiation: string;
  deliveryModel: string;
  revenueModel: string;
  expectedPrice: string;
  annualPurchaseFrequency: string;
  initialReachableCustomers: string;
  threeYearSalesCapacity: string;
  validationEvidence: string;
  targetCountry: string;
  targetCustomer: string;
  resources: string;
  deadline: string;
  constraints: string;
}

export interface GtmMarketSizingSource {
  title: string;
  url: string | null;
  publisher: string;
  publishedAt: string | null;
  checkedAt: string;
  kind: "fact" | "founder_input" | "proxy_assumption";
}

export interface GtmMarketSizingEntry {
  key: "tam" | "sam" | "som" | "beachhead";
  label: "TAM" | "SAM" | "SOM" | "Beachhead Market";
  status: "estimated" | "insufficient_evidence";
  estimate: string;
  range: {
    low: number;
    base: number;
    high: number;
    currency: string;
    referenceYear: number;
  } | null;
  method: string;
  formula: string;
  calculationInputs: {
    name: string;
    low: number;
    base: number;
    high: number;
    unit: string;
    sourceTitles: string[];
    sources: GtmMarketSizingSource[];
  }[];
  assumptions: string[];
  sources: GtmMarketSizingSource[];
  confidence: "high" | "medium" | "low";
  evidenceGaps: string[];
  sensitivityDrivers: string[];
  validation: string[];
  cohesion: {
    buysSimilarProducts: boolean;
    similarSalesCycle: boolean;
    wordOfMouthPotential: boolean;
    notes: string;
  } | null;
  expansionPath: string[];
}

export type GtmResearchLane =
  | "demand"
  | "customer_behavior"
  | "channel"
  | "regulation"
  | "product_culture"
  | "direct_competitors"
  | "adjacent_competitors"
  | "substitutes";

export interface GtmResearchSource {
  title: string;
  url: string | null;
  publisher: string;
  publishedAt: string | null;
  checkedAt: string | null;
  kind: "government" | "industry" | "retail" | "company" | "consumer" | "media";
}

export interface GtmMarketTrend {
  category: Exclude<GtmResearchLane, "direct_competitors" | "adjacent_competitors" | "substitutes">;
  title: string;
  finding: string;
  implication: string;
  confidence: "low" | "medium" | "high";
  freshness: "current" | "aging" | "undated";
  sources: GtmResearchSource[];
  /** Primary source retained for existing compact views and legacy exports. */
  sourceTitle: string;
  url: string | null;
}

export interface GtmMarketCompetitor {
  name: string;
  type: "direct" | "adjacent" | "alternative";
  marketPresence: "local" | "regional" | "global";
  pricePositioning: string;
  targetCustomer: string;
  valueProposition: string;
  channels: string[];
  strengths: string[];
  weaknesses: string[];
  relevance: string;
  differentiationGap: string;
  confidence: "low" | "medium" | "high";
  freshness: "current" | "aging" | "undated";
  sources: GtmResearchSource[];
  /** Primary source retained for existing compact views and legacy exports. */
  sourceTitle: string;
  url: string | null;
}

export interface GtmResearchCoverage {
  lanes: GtmResearchLane[];
  sourceCount: number;
  uniqueDomainCount: number;
  competitorCount: number;
  sourceTypes: Record<GtmResearchSource["kind"], number>;
  coverageGaps: string[];
}

export interface GtmMarketResearch {
  kind: "market_research";
  scope: "market_preresearch" | "sellability_review";
  targetCountry: string;
  targetCustomer: string;
  offeringName: string;
  executiveSummary: string;
  trends: GtmMarketTrend[];
  marketSizing: GtmMarketSizingEntry[];
  marketSizingMethodologyVersion: "market-sizing-v2" | "market-sizing-v1" | "legacy";
  marketSizingEvidence?: unknown;
  researchContextSignature: string;
  marketDefinition: {
    included: string;
    excluded: string;
    annualRevenueUnit: string;
  };
  competitors: GtmMarketCompetitor[];
  contradictions: {
    topic: string;
    summary: string;
    sources: GtmResearchSource[];
  }[];
  researchCoverage: GtmResearchCoverage;
  researchMethodologyVersion: "market-research-v2" | "legacy";
  sellability: {
    available: boolean;
    verdict: "not_assessed" | "weak" | "conditional" | "promising";
    summary: string;
    evidenceGaps: string[];
  };
  nextExperiments: string[];
  limitations: string[];
  generatedAt: string;
  generatedBy: "gpt-5.6-luna" | "gpt-5.6-terra" | "gpt-5.6-sol";
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
  completedFields: number;
  totalFields: number;
  clarificationCount: number;
  clarificationLimit: number;
  generatedBy: "system";
}

export interface GtmAssistantMessage {
  role: "assistant" | "user";
  content: string;
  questionKey?: string;
  status?: "asked" | "answered" | "unknown_confirmed";
}

export interface StoredGtmPlan {
  id: string;
  assessmentId: string;
  status: GtmPlanStatus;
  summary: string;
  assumptions: string[];
  founderContext: Partial<GtmFounderContext>;
  marketResearch: GtmMarketResearch | null;
  marketResearchConfirmedAt: string | null;
  recentMessages: GtmAssistantMessage[];
  turnCount: number;
  generationCount: number;
  generatedBy: string;
  contentLocale: "ko" | "en";
  founderContextLocale?: "ko" | "en";
  marketResearchLocale?: "ko" | "en";
  translationFallback?: boolean;
  items: GtmPlanItem[];
}
