import { INTAKE_QUESTIONS } from "@/lib/intake-questions";
import type { ReadinessAnswer } from "@/lib/types";

export const PENDING_KEY = "pending-assessment";
const questionIds = new Set(INTAKE_QUESTIONS.map((question) => question.id));

export function savePending(answers: ReadinessAnswer[]) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(answers));
  }
}

export function loadPending(): ReadinessAnswer[] | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? "null");
    if (!Array.isArray(value) || value.length !== questionIds.size) return null;
    const ids = new Set<string>();
    for (const answer of value) {
      if (
        !answer ||
        typeof answer !== "object" ||
        typeof answer.questionId !== "string" ||
        !questionIds.has(answer.questionId) ||
        ids.has(answer.questionId) ||
        ![1, 2, 3, 4].includes(answer.level)
      ) {
        return null;
      }
      ids.add(answer.questionId);
    }
    return value as ReadinessAnswer[];
  } catch {
    return null;
  }
}

export function clearPending() {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(PENDING_KEY);
  }
}
