import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./gtm-assistant.tsx", import.meta.url), "utf8");

describe("AI GTM assistant optional early-stage inputs", () => {
  it("marks all six optional research inputs in both languages", () => {
    for (const label of [
      "Expected price or annual contract value (Optional)",
      "Annual purchase frequency or term (Optional)",
      "Initially reachable customers (Optional)",
      "Three-year sales capacity (Optional)",
      "Current validation evidence (Optional)",
      "Constraints (Optional)",
      "예상 가격·연간 계약금액 (선택)",
      "연간 구매 빈도·계약기간 (선택)",
      "초기에 직접 접근 가능한 고객 수 (선택)",
      "3년 판매·공급 가능 범위 (선택)",
      "현재 검증 근거 (선택)",
      "제약 (선택)"
    ]) expect(source).toContain(label);

    expect(source.match(/선택 · 모르시면 비워 두세요/g)).toHaveLength(4);
    expect(source.match(/Optional · Leave blank if unknown/g)).toHaveLength(4);
    expect(source.match(/선택 · 알고 있는 사실만 적고, 모르시면 비워 두세요/g)).toHaveLength(2);
    expect(source.match(/Optional · Enter only known facts, or leave blank if unknown/g)).toHaveLength(2);
  });

  it("requires research to be rerun after constraints change", () => {
    expect(source).toContain("researchDisplayConstraints");
    expect(source).toContain("researchDisplayConstraints.trim() === context.constraints.trim()");
    expect(source).toContain("setResearchDisplayConstraints(context.constraints)");
  });
});
