import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./route.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../../../supabase/migrations/013_ai_agent_readiness_snapshot.sql", import.meta.url), "utf8");

describe("paid AI readiness snapshot", () => {
  it("binds readiness once before generation and loads only the bound assessment", () => {
    expect(source).toContain('rpc("bind_ai_agent_readiness_snapshot"');
    expect(source).toContain("completed_at",);
    expect(source).toContain("order.created_at");
    expect(source).toContain("readiness.assessmentId");
    expect(source).not.toContain("latestAssessment");
  });

  it("binds legacy correction runs once without breaking old application instances", () => {
    expect(migration).toContain("for update");
    expect(migration).toContain("not (scope_snapshot ? 'readiness')");
    expect(migration).not.toContain("and generation_count = 0");
    expect(migration).not.toContain("not (locked_run.scope_snapshot ? 'readiness')");
  });
});

describe("model routing", () => {
  it("모델 상수를 코드에 고정하지 않는다", () => {
    expect(source).not.toMatch(/const MODEL = "gpt-5\.6-sol"/);
    expect(source).not.toContain("calculateSolCostUsd");
  });
  it("스냅샷을 파싱해 실패하면 예약을 실패 처리한다", () => {
    expect(source).toContain("routesSchema.safeParse(reserved.model_route_snapshot)");
    expect(source).toContain('"invalid_model_route_snapshot"');
  });
  it("공급자로 어댑터를 고른다", () => {
    expect(source).toContain('spec.provider === "anthropic" ? anthropicAdapter(spec.model) : openaiAdapter(spec.model)');
  });
  it("완료·실패 RPC에 모델과 시도 기록을 넘긴다", () => {
    expect(source).toContain("p_model_attempts: attempts");
    expect(source).toContain("p_model: finalModel");
  });
  it("각 단계 전에 남은 예산을 본다", () => {
    // ensureBudget은 runStage 안에 한 번만 있고(중복 대신 재사용), classification·
    // public_research·final_report 세 단계 모두 runStage를 통해서만 어댑터를 부른다 —
    // 그래서 예산 검사를 셋 다 통과한다. 소스에서 ensureBudget( 호출 자체를 3번
    // 반복해서 세는 것보다 이 쪽이 실제 보장하는 성질에 더 가깝다.
    expect(source).toContain("ensureBudget(stage)");
    expect((source.match(/runStage\("(classification|public_research|final_report)"/g) ?? []).length).toBe(3);
  });
  it("패키지 상품은 최종 보고서만 high effort로 승격한다", () => {
    expect(source).toContain('stage === "final_report" && service.productKind === "package" ? "high" : route.effort');
  });
  it("실패한 단계의 usage도 실행 합계에 반영한다", () => {
    expect(source).toContain("error instanceof StageError ? error.usage : EMPTY_USAGE");
  });
});
