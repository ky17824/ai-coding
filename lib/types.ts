export type UserRole = "startup" | "provider" | "admin";
export type JourneyPhase = "pre_entry" | "initial_entry" | "scale";
export type ReadinessLevel = 0 | 1 | 2 | 3;
export type ReadinessStatus =
  | "기초 정비"
  | "진출 준비"
  | "현장 검증"
  | "실행 가능";
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

export interface ReadinessResult {
  overallScore: number;
  domainScores: Record<string, number>;
  status: ReadinessStatus;
  isOnHold: boolean;
  gateMessages: string[];
  actions: ActionRecommendation[];
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
