import { beforeEach, describe, expect, it } from "vitest";
import { INTAKE_QUESTIONS } from "@/lib/intake-questions";
import {
  PENDING_KEY,
  clearPending,
  loadPending,
  savePending
} from "@/lib/pending-assessment";
import type { ReadinessAnswer } from "@/lib/types";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const answers = (): ReadinessAnswer[] =>
  INTAKE_QUESTIONS.map((question) => ({ questionId: question.id, level: 2 }));

describe("pending assessment", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: new MemoryStorage()
    });
  });

  it("round trips and clears answers", () => {
    savePending(answers());
    expect(loadPending()).toEqual(answers());
    clearPending();
    expect(loadPending()).toBeNull();
  });

  it("rejects incomplete answers", () => {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(answers().slice(1)));
    expect(loadPending()).toBeNull();
  });

  it("rejects unknown and duplicate question ids", () => {
    const unknown = answers();
    unknown[0] = { questionId: "unknown", level: 2 };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(unknown));
    expect(loadPending()).toBeNull();

    const duplicate = answers();
    duplicate[0] = duplicate[1];
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(duplicate));
    expect(loadPending()).toBeNull();
  });

  it("rejects invalid levels and JSON", () => {
    const invalid = answers();
    invalid[0] = { ...invalid[0], level: 0 as 1 };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(invalid));
    expect(loadPending()).toBeNull();
    sessionStorage.setItem(PENDING_KEY, "{");
    expect(loadPending()).toBeNull();
  });
});
