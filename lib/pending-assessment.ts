import { validateAssessmentAnswers } from "@/lib/readiness";
import type { ReadinessAnswer } from "@/lib/types";

export const PENDING_KEY = "pending-assessment";

export function savePending(answers: ReadinessAnswer[]) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(answers));
  }
}

export function loadPending(): ReadinessAnswer[] | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
    if (!Array.isArray(value)) return null;
    const answers = value as ReadinessAnswer[];
    return validateAssessmentAnswers(answers).valid ? answers : null;
  } catch {
    return null;
  }
}

export function clearPending() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(PENDING_KEY);
  }
}
