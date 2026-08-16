import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

/** 규칙: docs/design/readiness-chart-encoding.md */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("readiness chart encoding", () => {
  it("maps shade to response level, light to dark, with no step skipped", () => {
    const levels = [1, 2, 3, 4].map((level) => {
      const hex = css.match(new RegExp(`--chart-level-${level}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
      expect(hex, `--chart-level-${level} is missing`).toBeTruthy();
      expect(css).toMatch(new RegExp(`\\.answer-question-bar--level-${level}[^}]+var\\(--chart-level-${level}\\)`));
      return luminance(hex as string);
    });
    // 수준이 오를수록 어두워져야 한다. 하나라도 역전되면 "진할수록 좋다"는 읽기가 깨진다.
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i], `level ${i + 1} must be darker than level ${i}`).toBeLessThan(levels[i - 1]);
    }
  });

  it("keeps gate status off the shade channel and on the outline", () => {
    for (const status of ["blocker", "deferred"]) {
      const rule = css.match(new RegExp(`\\.answer-question-bar--${status}[^}]+}`))?.[0] ?? "";
      expect(rule, `${status} must use an outline`).toMatch(/border:\s*2px (solid|dashed)/);
      // 게이트 상태가 배경을 칠하면 낮은 수준 문항이 가장 진해져 명도 순서가 뒤집힌다.
      expect(rule, `${status} must not repaint the bar`).not.toMatch(/background:/);
    }
  });

  it("keeps the green brand palette in the detail card and drops the legacy tones", () => {
    for (const [className, token] of Object.entries({
      blocker: "blocker", deferred: "deferred", needs_work: "needs-work", passed: "passed", strength: "strength"
    })) {
      expect(css).toContain(`--chart-${token}:`);
      expect(css).toMatch(new RegExp(`\\.answer-question-detail--${className}[^}]+var\\(--chart-${token}\\)`));
    }
    for (const legacyColor of ["#e8ad6b", "#b86623", "#8d4c16", "#8b5e3c", "#d4b8a4", "#7b4a15", "#4f2d11"]) {
      expect(css).not.toContain(legacyColor);
    }
  });
});
