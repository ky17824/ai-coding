import { afterEach, describe, expect, it } from "vitest";
import {
  getNewAssessmentSurveyVersion,
  issueSurveyVersionToken,
  verifySurveyVersionToken
} from "@/lib/readiness-rollout";

describe("readiness v5 rollout", () => {
  afterEach(() => {
    delete process.env.READINESS_V5_ENABLED;
    delete process.env.READINESS_SURVEY_TOKEN_SECRET;
  });

  it("defaults new assessments to v4", () => {
    expect(getNewAssessmentSurveyVersion()).toBe("4.0");
    process.env.READINESS_V5_ENABLED = "false";
    expect(getNewAssessmentSurveyVersion()).toBe("4.0");
  });

  it("enables v5 only with the server flag", () => {
    process.env.READINESS_V5_ENABLED = "true";
    expect(getNewAssessmentSurveyVersion()).toBe("5.0");
  });

  it("verifies an unmodified server-issued version token", () => {
    process.env.READINESS_SURVEY_TOKEN_SECRET = "test-secret";
    const token = issueSurveyVersionToken("5.0", 1_000);
    expect(verifySurveyVersionToken(token, 2_000)).toBe("5.0");
    expect(verifySurveyVersionToken(`${token}x`, 2_000)).toBeNull();
  });

  it("rejects an expired version token", () => {
    process.env.READINESS_SURVEY_TOKEN_SECRET = "test-secret";
    const token = issueSurveyVersionToken("4.0", 1_000);
    expect(verifySurveyVersionToken(token, 1_000 + 7 * 24 * 60 * 60 * 1_000 + 1)).toBeNull();
  });
});
