import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = ["010_paid_ai_expert_services.sql", "011_paid_ai_expert_contract.sql"]
  .map((name) => readFileSync(`supabase/migrations/${name}`, "utf8")).join("\n");
const orderRoute = readFileSync("app/api/orders/route.ts", "utf8");
const runRoute = readFileSync("app/api/ai-agent-runs/[orderId]/route.ts", "utf8");
const uploadRoute = readFileSync("app/api/ai-agent-runs/[orderId]/upload-url/route.ts", "utf8");
const aiAgentReportLib = readFileSync("lib/ai-agent-report.ts", "utf8");
const workspace = readFileSync("components/ai-agent-workspace.tsx", "utf8");
// Task 8이 실제 모델 호출을 어댑터로 옮겼다. 웹검색 호출 자체와 그 스키마 사용은
// 이제 여기(공급자별 어댑터)에 있고, 라우트는 무엇을 보낼지만 정한다.
const openaiAdapter = readFileSync("lib/ai-models/openai.ts", "utf8");

describe("paid AI service security contract", () => {
  it("keeps order and AI-run writes server-only", () => {
    expect(migration).toContain("revoke insert, update, delete on public.orders from authenticated");
    expect(migration).toContain("revoke insert, update, delete on public.ai_agent_runs from authenticated");
    expect(orderRoute).not.toContain('supabase.from("orders").insert');
    expect(orderRoute.match(/admin\.from\("orders"\)\.insert/g)).toHaveLength(2);
  });

  it("uses payment reconciliation, leases, and attempt-qualified completion", () => {
    expect(migration).toContain("create or replace function public.reconcile_ai_payment");
    expect(migration).toContain("lease_expires_at");
    expect(migration).toContain("generation_attempt_id = p_attempt_id");
    expect(migration).toContain("locked_order.status not in ('paid', 'completed')");
    expect(migration).toContain("if not found then");
    expect(migration).toContain("return 'refund_review'");
    expect(migration).toContain("elsif p_payment_status = 'PARTIAL_CANCELLED'");
    expect(migration).toContain("if locked_order.status in ('service_started', 'completed') then");
  });

  it("sends only the anonymized brief to the web-enabled call", () => {
    // Task 8: 모델 호출은 어댑터로 옮겨졌지만, 라우트가 research 단계에 어떤 필드를
    // 넘기는지는 여전히 여기서 봐야 한다 — privateContext, 그리고 서명 URL이 붙은 첨부
    // 파일(referenceFiles, writeReport에만 넘어가야 한다)이 새지 않는지.
    // ResearchInput 타입 자체에 files 필드가 없어 구조적으로도 막혀 있지만, 이 테스트는
    // 그 타입을 누군가 넓히거나 as로 우회해도 걸리도록 소스 문자열로 다시 본다.
    const webCall = runRoute.slice(runRoute.indexOf('runStage("public_research"'), runRoute.indexOf("const publicEvidence"));
    expect(webCall).toContain("publicBrief");
    expect(webCall).not.toContain("privateContext");
    expect(webCall).not.toContain("referenceFiles");
    // 웹검색 총 호출 상한 자체는 이제 OpenAI 어댑터 안에 있다.
    expect(openaiAdapter).toContain("max_tool_calls: 8");
  });

  it("loads the complete assessment for Gate priority and keeps attachments private", () => {
    const answerQuery = runRoute.slice(runRoute.indexOf('from("readiness_answers")'), runRoute.indexOf("const questions"));
    expect(answerQuery).not.toContain('.in("question_id"');
    expect(uploadRoute).toContain('.eq("buyer_id", user.id)');
    expect(uploadRoute).toContain('.from("evidence")');
    expect(uploadRoute).toContain('rpc("append_ai_agent_reference_file"');
    expect(migration).toContain("create or replace function public.append_ai_agent_reference_file");
    expect(runRoute).toContain("Changing the offering, target country, or core customer requires a new order.");
    expect(runRoute).toContain("reference_file_missing");
    // publicClassificationSchema lives in lib/ai-agent-report.ts now (moved out of the route in
    // Task 6). Task 8 then moved the classification call itself into the OpenAI adapter, so that's
    // the thing that must still apply the schema to the call's structured-output format.
    expect(aiAgentReportLib).toContain('z.literal("UNSPECIFIED")');
    expect(openaiAdapter).toContain("zodTextFormat(publicClassificationSchema");
  });

  it("does not present a failed correction as a new report", () => {
    expect(runRoute).toContain("correctionFailed: true");
    expect(runRoute).toContain("const { data: failed, error: failError }");
    expect(runRoute).toContain("if (failError || !failed)");
    expect(workspace).toContain("if (result.correctionFailed)");
    expect(workspace).toContain("initialRun.error_message ? c.correctionFailed");
    expect(workspace).toContain('role="alert"');
  });
});
