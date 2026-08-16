import { describe, expect, it } from "vitest";
import { normalizeReportTitles, stripLeadingNumber, type AiAgentReport } from "@/lib/ai-agent-report";

describe("보고서 제목의 앞 번호 정리", () => {
  it("숫자·원문자 번호를 떼고 본문은 건드리지 않는다", () => {
    // 목록이 번호를 매기므로 제목의 번호는 "1. 1. …"로 이중 표기됐다(주문 6d76942a).
    expect(stripLeadingNumber("1. 미국 검증 책임자와 예산 상한 지정")).toBe("미국 검증 책임자와 예산 상한 지정");
    expect(stripLeadingNumber("12) Shopify PoC")).toBe("Shopify PoC");
    expect(stripLeadingNumber("③ 후보 3 — OpenAI")).toBe("후보 3 — OpenAI");
    expect(stripLeadingNumber("후보 1 — Shopify")).toBe("후보 1 — Shopify");
    expect(stripLeadingNumber("6주 Go/No-Go 위원회")).toBe("6주 Go/No-Go 위원회");
    expect(stripLeadingNumber("3PL 비교")).toBe("3PL 비교");
  });

  it("findings와 actionPlan 제목만 정리하고 나머지는 그대로 둔다", () => {
    const report = {
      title: "1. 제목", executiveSummary: "1. 요약은 건드리지 않는다",
      findings: [{ title: "1. 발견", summary: "s" }],
      actionPlan: [{ title: "2. 실행", why: "w" }]
    } as unknown as AiAgentReport;
    const out = normalizeReportTitles(report);
    expect(out.findings[0].title).toBe("발견");
    expect(out.actionPlan[0].title).toBe("실행");
    expect(out.title).toBe("1. 제목");
    expect(out.executiveSummary).toBe("1. 요약은 건드리지 않는다");
  });
});
