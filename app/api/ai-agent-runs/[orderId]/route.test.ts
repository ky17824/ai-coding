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
  it("패키지 상품은 조사·보고서 단계를 high effort로 승격한다(분류 단계는 그대로)", () => {
    // 020 이전 동작(4b19b47)은 research·report 모두 package면 high였다 — 라우팅 도입으로
    // final_report만 승격되던 회귀를 다시 두 단계로 되돌린다. classification은 원래도
    // 항상 medium이라 이 조건에 들어가면 안 된다.
    expect(source).toContain('(stage === "public_research" || stage === "final_report") && service.productKind === "package" ? "high" : route.effort');
    expect(source).not.toContain('stage === "classification" && service.productKind === "package"');
  });
  it("실패한 단계의 usage도 실행 합계에 반영한다", () => {
    expect(source).toContain("error instanceof StageError ? error.usage : EMPTY_USAGE");
  });
  it("예약 실패가 활성 설정 없음 때문이면 사용자 재생성 횟수를 탓하지 않고 서버에 남긴다", () => {
    // reserve_ai_agent_generation은 활성 라우팅 설정이 없을 때도 null을 반환해서(022 §3)
    // '이미 생성 중/재생성 한도 소진' 메시지와 구분이 안 된다. 활성 설정 존재 여부를 따로
    // 조회해서 실제 원인일 때만 다른 메시지 + 서버 로그를 남긴다.
    expect(source).toContain('.from("ai_model_routing_configs")');
    expect(source).toContain('.eq("status", "active")');
    expect(source).toContain("no active model routing config");
    expect(source).toContain("AI 모델 설정이 없어 보고서를 생성할 수 없습니다");
  });
  it("실패 기록 RPC 쓰기가 실패해도 조용히 넘어가지 않는다", () => {
    // 예약 스냅샷/공급자 키 사전 검사 두 곳과 catch 블록, 세 실패 경로 모두 같은
    // recordFailure 하나만 거친다 — fail_ai_agent_generation 쓰기 자체가 실패하면
    // 실행이 이유 없이 generating에 묶이는 사고(020)를 다시 만들지 않기 위해서다.
    expect((source.match(/recordFailure\(/g) ?? []).length).toBe(3);
    expect(source).toContain("if (error || !data) console.error(\"[ai-agent-run] failure handling did not persist\"");
  });
});
