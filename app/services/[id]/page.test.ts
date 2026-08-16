import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

/** 규칙: docs/design/service-detail-block-convention.md */
describe("service detail block convention", () => {
  it("puts every block body in a list, never a bare paragraph", () => {
    const blocks = source.match(/<div className="detail-block[^"]*">.*?<\/div>/gs) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    for (const block of blocks) {
      const title = block.match(/<h2>\{en \? "([^"]+)"/)?.[1] ?? block.slice(0, 60);
      expect(block, `${title} has a bare <p>`).not.toContain("<p>");
      expect(block, `${title} has no list`).toMatch(/<ul>|<ol>/);
    }
  });

  it("numbers only 진행 방식 and bullets everything else", () => {
    expect(source.match(/<ol>/g), "only 진행 방식 is ordered").toHaveLength(2); // AI 분기 + 사람 분기
    expect(source).toContain('"How it works" : "진행 방식"');
  });

  it("titles the limits block as a noun phrase and gives it no special styling", () => {
    // 블록은 전부 같은 모양이다. 배경 박스는 블록 흐름을 끊어 오히려 눈에 거슬린다.
    expect(source).not.toContain("detail-block--boundary");
    expect(source).toContain('{en ? "Limits of this service" : "이 서비스의 한계"}');
    // 이전 제목들이 되살아나면 실패한다.
    expect(source).not.toContain("전문가 검증");
    expect(source).not.toContain("결론 내리지 않는 것");
  });

  it("renders block bodies from the catalog rather than branching in the view", () => {
    for (const field of ["service.deliverables", "service.requiredInputs", "service.humanVerification", "service.refundPolicy"]) {
      expect(source, field).toContain(field);
    }
  });
});
