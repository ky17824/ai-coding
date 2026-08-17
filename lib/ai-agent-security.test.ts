import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = ["010_paid_ai_expert_services.sql", "011_paid_ai_expert_contract.sql"]
  .map((name) => readFileSync(`supabase/migrations/${name}`, "utf8")).join("\n");
const orderRoute = readFileSync("app/api/orders/route.ts", "utf8");
const runRoute = readFileSync("app/api/ai-agent-runs/[orderId]/route.ts", "utf8");
const uploadRoute = readFileSync("app/api/ai-agent-runs/[orderId]/upload-url/route.ts", "utf8");
const aiAgentReportLib = readFileSync("lib/ai-agent-report.ts", "utf8");
const workspace = readFileSync("components/ai-agent-workspace.tsx", "utf8");

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
    const webCall = runRoute.slice(runRoute.indexOf("const researchResponse"), runRoute.indexOf("const reportResponse"));
    expect(webCall).toContain("publicBrief");
    expect(webCall).not.toContain("privateContext");
    expect(webCall).not.toContain("privateFileInputs");
    expect(webCall).toContain("max_tool_calls: 8");
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
    // Task 6), but the route must still be the thing that applies it to the classification call.
    expect(aiAgentReportLib).toContain('z.literal("UNSPECIFIED")');
    expect(runRoute).toContain("zodTextFormat(publicClassificationSchema");
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
