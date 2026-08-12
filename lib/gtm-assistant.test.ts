import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  assistantResponseSchema,
  buildDeterministicPlan,
  classifyFounderContextValue,
  finalizeMarketResearch,
  getPendingFounderQuestion,
  marketResearchResponseSchema,
  marketSizingEvidenceResponseSchema,
  sanitizeFounderText,
  selectFounderQuestion,
  shouldUseWebSearch,
  validatePlanDraft
} from "./gtm-assistant";
import type { GtmAssistantMessage, GtmFounderContext } from "./types";
import type { SavedAction } from "./gtm-assistant";

const actions: SavedAction[] = Array.from({ length: 5 }, (_, index) => ({
  id: `action-${index + 1}`,
  question_id: `q${index + 1}`,
  title: `실행 액션 ${index + 1}`,
  owner_label: "대표",
  completion_evidence: `완료 증거 ${index + 1}`,
  service_tag: index === 0 ? "legal" : "market",
  urgency: index < 2 ? "P0" : "P1"
}));

const completeContext: GtmFounderContext = {
  offeringType: "product",
  offeringName: "제품 A",
  offeringSummary: "제조 현장의 불량을 줄이는 제품",
  customerProblem: "불량 원인을 늦게 발견합니다.",
  coreValue: "불량 탐지 시간을 줄입니다.",
  currentAlternative: "수기 검사",
  differentiation: "실시간 분석",
  deliveryModel: "수출",
  revenueModel: "제품 판매",
  expectedPrice: "개당 100달러",
  annualPurchaseFrequency: "연 2회",
  initialReachableCustomers: "현지 유통사 20곳",
  threeYearSalesCapacity: "3년간 1,000개",
  validationEvidence: "고객 인터뷰",
  targetCountry: "싱가포르",
  targetCustomer: "현지 중견 제조사",
  resources: "대표 1명, 제품 100개",
  deadline: "2026-10-30",
  constraints: "예산은 확인 필요"
};

describe("AI GTM assistant safeguards", () => {
  it("uses an object root required by OpenAI structured outputs", () => {
    const format = zodTextFormat(assistantResponseSchema, "gtm_assistant_turn");

    expect(format.schema).toMatchObject({ type: "object" });
    expect(JSON.stringify(format.schema)).not.toContain('"format":"uri"');
    expect(JSON.stringify(format.schema)).not.toContain("next_question");
  });

  it("keeps structured market-sizing evidence compatible with OpenAI output schemas", () => {
    const format = zodTextFormat(marketSizingEvidenceResponseSchema, "gtm_market_sizing_evidence");

    expect(format.schema).toMatchObject({ type: "object" });
    expect(JSON.stringify(format.schema)).toContain("beachhead");
    expect(JSON.stringify(format.schema)).not.toContain('"LAM"');
  });

  it("requires categorized multi-source market and competitor research", () => {
    const schema = JSON.stringify(zodTextFormat(marketResearchResponseSchema, "gtm_market_research").schema);

    expect(schema).toContain("customer_behavior");
    expect(schema).toContain("marketPresence");
    expect(schema).toContain("contradictions");
    expect(schema).toContain("sources");
  });

  it("turns saved diagnostic actions into a bounded 30·60·90 day plan", () => {
    const plan = buildDeterministicPlan(actions, new Date("2026-08-05T00:00:00Z"));

    expect(plan.items).toHaveLength(5);
    expect(plan.items.map((item) => item.horizon)).toEqual([30, 30, 60, 60, 90]);
    expect(plan.items[0]).toMatchObject({
      expertRequired: true,
      sourceActionItemId: "action-1",
      sources: [{ kind: "diagnosis", title: "55문항 준비도 진단" }]
    });
  });

  it("flags paid pilots and first orders for expert matching", () => {
    const plan = buildDeterministicPlan([{
      ...actions[1],
      question_id: "pmf-paid-conversion",
      title: "유료 PoC나 첫 주문을 만든다",
      service_tag: "gtm"
    }]);

    expect(plan.items[0]).toMatchObject({
      horizon: 90,
      expertRequired: true,
      serviceTag: "gtm"
    });
  });

  it("normalizes an under-flagged AI plan before saving", () => {
    const plan = buildDeterministicPlan(actions);
    const validated = validatePlanDraft({
      ...plan,
      items: [{
        ...plan.items[1],
        title: "현지 고객과 유료 PoC를 진행한다",
        expertRequired: false,
        expertReason: "",
        handoffBrief: "",
        serviceTag: "gtm"
      }]
    });

    expect(validated.items[0]).toMatchObject({
      expertRequired: true,
      serviceTag: "gtm"
    });
  });

  it("moves a model-generated paid pilot item to the 90-day horizon", () => {
    const plan = buildDeterministicPlan(actions);
    const validated = validatePlanDraft({
      ...plan,
      items: [{
        ...plan.items[0],
        questionId: "pmf-paid-conversion",
        horizon: 30
      }]
    }, [30, 60, 90]);

    expect(validated.items[0].horizon).toBe(90);
  });

  it("keeps deterministic and model plans inside the allowed horizons", () => {
    const plan = buildDeterministicPlan(actions, new Date("2026-08-05T00:00:00Z"), [60]);
    expect(plan.items.every((item) => item.horizon === 60)).toBe(true);
    expect(() => validatePlanDraft({ ...plan, items: [{ ...plan.items[0], horizon: 30 }] }, [60]))
      .toThrow("허용되지 않은 계획 기간");
  });

  it("does not allow a sellability verdict before all 55 questions are available", () => {
    expect(() => finalizeMarketResearch({
      scope: "market_preresearch",
      targetCountry: "일본",
      targetCustomer: "중견 제조사",
      offeringName: "제품 A",
      executiveSummary: "시장 사전조사",
      trends: [{
        category: "demand",
        title: "추세",
        finding: "확인",
        implication: "수요를 검증한다",
        confidence: "medium",
        freshness: "current",
        sources: [{ title: "공식 자료", url: "https://example.com/trend", publisher: "기관", publishedAt: null, checkedAt: "2026-08-13", kind: "government" }]
      }],
      marketSizingEvidence: {
        methodologyVersion: "market-sizing-v1",
        currency: "USD",
        referenceYear: 2026,
        marketDefinition: { included: "목표 고객", excluded: "기타 시장", annualRevenueUnit: "연간 고객 지출" },
        tam: {
          status: "insufficient_evidence",
          bottomUp: { customerCount: null, annualRevenuePerCustomer: null, formula: "고객 수 × 연간 고객 지출", customerCountSources: [], annualRevenuePerCustomerSources: [] },
          topDownPaths: [], cagrPercent: null, assumptions: [], evidenceGaps: ["고객 수"], sensitivityDrivers: []
        },
        sam: { status: "insufficient_evidence", filters: [], regulationPrerequisite: "", assumptions: [], evidenceGaps: ["시장 비율"], sensitivityDrivers: [] },
        som: { status: "insufficient_evidence", horizonYears: 3, sharePercent: null, capacityRevenue: null, shareSources: [], capacitySources: [], assumptions: [], evidenceGaps: ["판매 역량"], sensitivityDrivers: [] },
        beachhead: {
          status: "insufficient_evidence", segment: "초기 목표 고객", customerCount: null, annualRevenuePerCustomer: null, customerCountSources: [], annualRevenuePerCustomerSources: [],
          cohesion: { buysSimilarProducts: false, similarSalesCycle: false, wordOfMouthPotential: false, notes: "" },
          expansionPath: [], assumptions: [], evidenceGaps: ["직접 접근 가능 고객 수"], sensitivityDrivers: []
        }
      },
      competitors: [{
        name: "대안 A",
        type: "alternative",
        marketPresence: "local",
        pricePositioning: "중가",
        targetCustomer: "현지 고객",
        valueProposition: "대안 가치",
        channels: ["리테일"],
        strengths: ["인지도"],
        weaknesses: ["차별성"],
        relevance: "대안",
        differentiationGap: "확인 필요",
        confidence: "medium",
        freshness: "current",
        sources: [{ title: "공식 자료", url: "https://example.com/company", publisher: "기관", publishedAt: null, checkedAt: "2026-08-13", kind: "company" }]
      }],
      contradictions: [],
      sellability: { available: true, verdict: "promising", summary: "판정", evidenceGaps: [] },
      nextExperiments: ["고객 인터뷰"],
      limitations: ["사전조사"]
    })).toThrow("준비 3단계 전에는");
  });

  it("rejects unsafe source URLs after model parsing", () => {
    const plan = buildDeterministicPlan(actions, new Date("2026-08-05T00:00:00Z"));
    plan.items[0].sources[0].url = "javascript:alert(1)";

    expect(() => validatePlanDraft(plan)).toThrow("근거 URL은 HTTP(S) 주소여야 합니다.");
  });

  it("removes common personal identifiers before model or search use", () => {
    expect(
      sanitizeFounderText("kyeon@tansley.kr 010-1234-5678 고객 A와 일본 진출")
    ).toBe("[이메일] [전화번호] 고객 A와 일본 진출");
  });

  it("only enables web search for target-country facts that can change", () => {
    expect(shouldUseWebSearch("일본", "최신 인증 규정과 세율을 확인해줘")).toBe(true);
    expect(shouldUseWebSearch("일본", "우리 팀의 목표를 정리해줘")).toBe(false);
    expect(shouldUseWebSearch("", "최신 인증 규정")).toBe(false);
  });

  it("treats an explicit unknown as resolved so it is not asked again", () => {
    expect(classifyFounderContextValue("확인필요")).toBe("unknown_confirmed");
    expect(classifyFounderContextValue("아직 모릅니다.")).toBe("unknown_confirmed");
    expect(classifyFounderContextValue("대표 1명, 제품 100개")).toBe("answered");
    expect(classifyFounderContextValue(" ")).toBe("missing");
  });

  it("asks only the first missing field and never repeats an answered key", () => {
    const context = { ...completeContext, resources: "", deadline: "" };
    const first = selectFounderQuestion(context, []);

    expect(first?.questionKey).toBe("resources");

    const messages: GtmAssistantMessage[] = [
      { role: "assistant", questionKey: "resources", content: first!.question, status: "asked" },
      { role: "user", questionKey: "resources", content: "확인 필요", status: "unknown_confirmed" }
    ];
    const second = selectFounderQuestion({ ...context, resources: "확인 필요" }, messages);

    expect(second?.questionKey).toBe("deadline");
  });

  it("stops clarification after three unique questions and proceeds with assumptions", () => {
    const context = {
      ...completeContext,
      offeringSummary: "",
      customerProblem: "",
      coreValue: "",
      resources: ""
    };
    const messages: GtmAssistantMessage[] = ["offeringSummary", "customerProblem", "coreValue"].map(
      (questionKey) => ({
        role: "assistant" as const,
        questionKey,
        content: `질문 ${questionKey}`,
        status: "asked" as const
      })
    );

    expect(selectFounderQuestion(context, messages)).toBeNull();
  });

  it("restores only a structured unanswered question", () => {
    const messages: GtmAssistantMessage[] = [
      { role: "assistant", content: "예전 자유 질문" },
      { role: "assistant", questionKey: "resources", content: "가용 자원을 알려주세요.", status: "asked" }
    ];

    expect(getPendingFounderQuestion({ ...completeContext, resources: "" }, messages)?.questionKey)
      .toBe("resources");
    expect(getPendingFounderQuestion(completeContext, messages)).toBeNull();
  });
});
