import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("readiness chart palette", () => {
  it("uses the green brand palette for every response status", () => {
    const statuses = {
      blocker: "blocker",
      deferred: "deferred",
      needs_work: "needs-work",
      passed: "passed",
      strength: "strength"
    };

    for (const [className, token] of Object.entries(statuses)) {
      expect(css).toContain(`--chart-${token}:`);
      expect(css).toMatch(new RegExp(`\\.answer-question-bar--${className}[^}]+var\\(--chart-${token}\\)`));
      expect(css).toMatch(new RegExp(`\\.answer-question-legend--${token}[^}]+var\\(--chart-${token}\\)`));
      expect(css).toMatch(new RegExp(`\\.answer-question-detail--${className}[^}]+var\\(--chart-${token}\\)`));
    }

    for (const legacyColor of ["#e8ad6b", "#b86623", "#8d4c16", "#8b5e3c", "#d4b8a4", "#7b4a15", "#4f2d11"]) {
      expect(css).not.toContain(legacyColor);
    }
  });
});
