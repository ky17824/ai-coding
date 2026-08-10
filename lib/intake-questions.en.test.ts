import { describe, expect, it } from "vitest";
import {
  INTAKE_ITEMS,
  INTAKE_QUESTIONS,
  INTAKE_STAGES,
  getIntakeItems,
  getIntakeQuestions,
  getIntakeStages
} from "@/lib/intake-questions";
import { calculateReadiness } from "@/lib/readiness";

describe("English intake catalog", () => {
  it("keeps every scoring identifier and provides four answer choices", () => {
    const english = getIntakeQuestions("en");
    expect(english).toHaveLength(55);
    expect(english.map(({ id }) => id)).toEqual(INTAKE_QUESTIONS.map(({ id }) => id));
    expect(english.every(({ options }) => options.length === 4)).toBe(true);
    expect(english.map(({ weight, critical }) => ({ weight, critical }))).toEqual(
      INTAKE_QUESTIONS.map(({ weight, critical }) => ({ weight, critical }))
    );
  });

  it("translates all stage, item, question, follow-up, option, and action copy", () => {
    const text = [
      ...getIntakeStages("en").flatMap(({ label, phase, intro, unlocks }) => [label, phase, intro, unlocks]),
      ...getIntakeItems("en").flatMap(({ label, owner }) => [label, owner]),
      ...getIntakeQuestions("en").flatMap(({ question, options, followUp, action }) => [question, ...options, followUp, action])
    ].join(" ");
    expect(text).not.toMatch(/[가-힣]/);
    expect(getIntakeStages("en")).toHaveLength(INTAKE_STAGES.length);
    expect(getIntakeItems("en")).toHaveLength(INTAKE_ITEMS.length);
  });

  it("keeps scoring identical across locales", () => {
    const answers = INTAKE_QUESTIONS.map(({ id }) => ({
      questionId: id,
      level: 3 as const,
      evidence: { kind: "note" as const, value: "Verified example" }
    }));
    const market = {
      targetCountry: "United States",
      targetCustomerSegment: "Mid-market manufacturers",
      confirmed: true
    };
    const korean = calculateReadiness(answers, market, "ko");
    const english = calculateReadiness(answers, market, "en");
    expect({ score: english.overallScore, domains: english.domainScores, stages: english.stages.map(({ passed }) => passed) })
      .toEqual({ score: korean.overallScore, domains: korean.domainScores, stages: korean.stages.map(({ passed }) => passed) });
  });
});
