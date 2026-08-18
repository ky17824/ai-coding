// AI 전문가 서비스 사용자 화면의 한글 표기가 상세 화면(lib/catalog/copy.ts)과 다시 어긋나지 않게 잡는 검사
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// 결제 후 입력·출력 화면과 그 화면에 뜨는 서버 메시지를 그리는 파일들.
// 모델 지시문·스키마 값이 든 lib/ai-agent-report.ts는 사용자 문장(clarificationQuestions)만 따로 본다.
const USER_FACING = [
  "components/ai-agent-workspace.tsx",
  "components/ai-generation-flow.tsx",
  "lib/market-sizing-view.ts",
  "lib/catalog/copy.ts",
  "app/orders/[id]/page.tsx",
  "app/api/ai-agent-runs/[orderId]/route.ts",
  "app/api/ai-agent-runs/[orderId]/upload-url/route.ts",
  "lib/ai-agent-report.ts",
  "lib/catalog/rules.ts"
];

// 상세 화면이 이미 쓰는 표기 → 나머지 화면도 같은 표기여야 한다(2026-08-18 감수 #1~7).
const BANNED: Array<[RegExp, string]> = [
  [/유사사례/, "유사 사례"],
  [/필요정보/, "필요 정보"],
  [/추가질문|추가정보/, "추가 질문 / 추가 정보"],
  [/목표국가|목표고객|핵심고객/, "목표 국가 / 목표 고객 / 핵심 고객"],
  [/시장규모/, "시장 규모"],
  [/실행계획/, "실행 계획"],
  [/계획기한/, "계획 기한"],
  [/사람 검증/, "전문가 검증"],
  [/새로고침/, "새로 고침"]
];

/** 주석 줄과 `ko-copy-lint: allow` 표시가 있는 줄(옛→새 표기 사전)만 뺀다. 모델 지시문(프롬프트)도 검사한다 — 모델이 지시문 어휘를 보고서 본문에 그대로 쓰기 때문이다. */
function codeLines(source: string) {
  return source.split("\n").filter((line) => !/^\s*(\/\/|\/?\*)/.test(line) && !line.includes("ko-copy-lint: allow"));
}

describe("AI 전문가 서비스 한글 표기 통일", () => {
  for (const file of USER_FACING) {
    it(`${file} 에 금지 표기가 없다`, () => {
      const lines = codeLines(readFileSync(join(process.cwd(), file), "utf8"));
      for (const [pattern, expected] of BANNED) {
        const hit = lines.find((line) => pattern.test(line));
        expect(hit, `${pattern} → "${expected}"\n${hit ?? ""}`).toBeUndefined();
      }
    });
  }

  it("추가 질문 문장은 입력 화면과 같은 항목명(INTAKE_FIELD_LABEL)을 쓴다", () => {
    const report = readFileSync(join(process.cwd(), "lib/ai-agent-report.ts"), "utf8");
    expect(report).toContain("INTAKE_FIELD_LABEL[field]");
    expect(report).not.toContain("const intakeLabels");
  });
});
