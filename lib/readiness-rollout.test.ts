import { afterEach, describe, expect, it } from "vitest";
import { getNewAssessmentSurveyVersion } from "@/lib/readiness-rollout";

describe("readiness v5 rollout", () => {
  afterEach(() => delete process.env.READINESS_V5_ENABLED);

  it("defaults new assessments to v4", () => {
    expect(getNewAssessmentSurveyVersion()).toBe("4.0");
    process.env.READINESS_V5_ENABLED = "false";
    expect(getNewAssessmentSurveyVersion()).toBe("4.0");
  });

  it("enables v5 only with the server flag", () => {
    process.env.READINESS_V5_ENABLED = "true";
    expect(getNewAssessmentSurveyVersion()).toBe("5.0");
  });
});
