import { afterEach, describe, expect, it, vi } from "vitest";
import { getIntakeQuestions } from "@/lib/intake-questions";
import { resolveAssessmentQuestions } from "@/lib/readiness";
import { issueSurveyVersionToken } from "@/lib/readiness-rollout";

vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => null,
  createSupabaseServerClient: async () => null,
  createSupabaseAdminClient: () => null
}));

import { POST } from "@/app/api/assessments/route";

const targetMarket = { targetCountry: "일본", targetCustomerSegment: "도쿄 중견기업", confirmed: true };
const v5EarlyAnswers = () => {
  const all = getIntakeQuestions("ko", "5.0").map((question) => ({ questionId: question.id, level: 2 as const }));
  const required = resolveAssessmentQuestions({
    surveyVersion: "5.0",
    salesMotion: "direct",
    targetMarket,
    answers: all
  }).requiredIds;
  const early = new Set(getIntakeQuestions("ko", "5.0").slice(0, 13).map((question) => question.id));
  return all.filter((answer) => required.includes(answer.questionId) && early.has(answer.questionId));
};
const post = (body: unknown) => POST(new Request("https://example.com/api/assessments", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body)
}));

describe("assessment submission contract", () => {
  afterEach(() => {
    delete process.env.READINESS_V5_ENABLED;
    delete process.env.READINESS_SURVEY_TOKEN_SECRET;
  });

  it("accepts a branch-complete v5 stage before authentication", async () => {
    process.env.READINESS_V5_ENABLED = "true";
    const response = await post({
      answers: v5EarlyAnswers(),
      completedStageId: "early",
      salesMotion: "direct",
      surveyVersion: "5.0",
      targetMarket,
      locale: "ko"
    });
    expect(response.status).toBe(401);
  });

  it("requires v5 metadata and rejects questions outside the active branch", async () => {
    process.env.READINESS_V5_ENABLED = "true";
    expect((await post({ answers: v5EarlyAnswers(), targetMarket, locale: "ko" })).status).toBe(400);
    expect((await post({
      answers: [...v5EarlyAnswers(), { questionId: "partner-actual-work", level: 2 }],
      completedStageId: "early",
      salesMotion: "direct",
      targetMarket,
      locale: "ko"
    })).status).toBe(400);
  });

  it("binds an in-flight form to its rendered survey version", async () => {
    process.env.READINESS_SURVEY_TOKEN_SECRET = "test-secret";
    process.env.READINESS_V5_ENABLED = "true";
    const answers = getIntakeQuestions("ko", "4.0").map((question) => ({ questionId: question.id, level: 2 }));
    const response = await post({ answers, surveyVersionToken: issueSurveyVersionToken("4.0"), targetMarket, locale: "ko" });
    expect(response.status).toBe(401);
  });

  it("rejects a forged survey version binding", async () => {
    process.env.READINESS_SURVEY_TOKEN_SECRET = "test-secret";
    const answers = getIntakeQuestions("ko", "4.0").map((question) => ({ questionId: question.id, level: 2 }));
    const response = await post({ answers, surveyVersionToken: `${issueSurveyVersionToken("4.0")}x`, targetMarket, locale: "ko" });
    expect(response.status).toBe(400);
  });
});
