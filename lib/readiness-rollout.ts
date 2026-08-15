import type { SurveyVersion } from "@/lib/intake-questions";

export function getNewAssessmentSurveyVersion(): SurveyVersion {
  return process.env.READINESS_V5_ENABLED === "true" ? "5.0" : "4.0";
}
