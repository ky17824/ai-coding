import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.stubGlobal("React", React);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));

import { AiAgentWorkspace, type ServiceInputSpec } from "@/components/ai-agent-workspace";

const source = readFileSync(new URL("./ai-agent-workspace.tsx", import.meta.url), "utf8");

const baseRun = {
  order_id: "o1",
  status: "intake" as const,
  intake: { objective: "미국 진출 여부", targetCountry: "미국" },
  input_audit: [],
  reference_files: [],
  clarification_round: 0,
  pending_questions: [],
  assumptions: [],
  report: null,
  generation_count: 0
};

const services: ServiceInputSpec[] = [
  { id: "ai-market-intelligence", title: "심층 시장 조사", label: "비교할 후보 국가", fileHint: "자체 판매 데이터" },
  { id: "ai-entry-requirements", title: "규제 요건 조사", label: "소재·성분·용도", fileHint: "사양서·성분표" },
  { id: "ai-partner-research", title: "파트너·생태계 조사", label: "파트너 역할과 우선 도시" }
];

const render = (props: Partial<React.ComponentProps<typeof AiAgentWorkspace>> = {}) =>
  renderToStaticMarkup(<AiAgentWorkspace initialRun={baseRun as never} locale="ko" {...props} />);

const count = (markup: string, pattern: RegExp) => (markup.match(pattern) ?? []).length;

describe("AI 전문가 입력 화면의 상품별 특화 칸", () => {
  it("포함 전문가 수만큼 특화 textarea를 공통 8칸 뒤에 추가한다", () => {
    // 상세 페이지가 약속한 "필요 정보"가 결제 후 화면에서 사라지던 문제. 진출 설계는 8+7이 된다.
    expect(count(render(), /<textarea/g)).toBe(8);
    const markup = render({ serviceInputs: services });
    expect(count(markup, /<textarea/g)).toBe(11);
    expect(markup).toContain('class="ai-service-inputs"');
    // 라벨은 상품명, 보조문구는 필요정보 문장 — 어느 보고서로 가는 답인지 보이게.
    expect(markup).toContain("규제 요건 조사");
    expect(markup).toContain("소재·성분·용도");
    // 모름 체크박스는 보조기술이 필드명과 함께 읽는다.
    expect(markup).toContain('aria-label="규제 요건 조사 — 모름 — 유사 사례로 추론"');
    expect(markup).toContain('aria-label="이번 업무로 내릴 결정 — 모름 — 유사 사례로 추론"');
  });

  it("첨부 안내에 상품별 유용한 자료와 PDF 변환 팁을 붙인다", () => {
    const markup = render({ serviceInputs: services });
    expect(markup).toContain("규제 요건 조사: 사양서·성분표");
    expect(markup).toContain("PDF로 내보내");
    expect(render()).not.toContain("이 서비스에 유용한 자료");
  });

  it("검토 화면의 가정 배너는 service:<id>를 상품명으로 보여 준다", () => {
    const markup = render({
      serviceInputs: services,
      initialRun: { ...baseRun, status: "ready", assumptions: [{ field: "service:ai-entry-requirements", basis: "analog_case_required" }, { field: "resources", basis: "analog_case_required" }] } as never
    });
    expect(markup).toContain("규제 요건 조사 · 가용 예산·인력·기간");
    expect(markup).not.toContain("service:ai-entry-requirements");
  });

  it("입력 검토 화면에 특화 항목을 감사 pill과 함께 보여 준다", () => {
    const markup = render({
      serviceInputs: services,
      initialRun: {
        ...baseRun,
        status: "ready",
        intake: { ...baseRun.intake, serviceInputs: { "ai-entry-requirements": "스테인리스, 식품 접촉용" } },
        input_audit: [{ field: "service:ai-entry-requirements", status: "confirmed", reason: "user_provided" }, { field: "service:ai-market-intelligence", status: "unclear", reason: "analog_case_required" }]
      } as never
    });
    expect(markup).toContain("스테인리스, 식품 접촉용");
    expect(count(markup, /ai-intake-review__service/g)).toBe(3);
    expect(markup).toContain("ai-audit--confirmed");
    expect(markup).toContain("ai-audit--unclear");
  });

  it("제출 페이로드에 특화 답변을 intake.serviceInputs로, 모름은 unknownFields에 service:<id>로 싣는다", () => {
    // 이벤트 없는 정적 렌더라 클릭은 못 하지만, 서버 스키마(intakeSchema.serviceInputs)와의 계약은 여기서 고정한다.
    expect(source).toContain("intake: { ...intake, serviceInputs: serviceAnswers, unknownFields }");
    expect(source).toContain("const serviceField = (id: string) => `service:${id}`;");
  });
});
