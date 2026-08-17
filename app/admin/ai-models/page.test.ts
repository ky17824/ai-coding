import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/admin/ai-models/page.tsx"), "utf8");
const form = readFileSync(join(process.cwd(), "components/admin-model-routing-form.tsx"), "utf8");
const actions = readFileSync(join(process.cwd(), "app/admin/actions.ts"), "utf8");
const nav = readFileSync(join(process.cwd(), "components/admin-nav.tsx"), "utf8");

describe("/admin/ai-models", () => {
  it("관리자만 들어온다 (사용자 관리와 같은 검사)", () => {
    expect(page).toContain('role !== "admin"');
    expect(page).toContain("deleted_at");
  });

  it("API 키 값은 어디에도 넣지 않고 설정 여부만 넘긴다", () => {
    expect(page).toContain("hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY)");
    expect(page).toContain("hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY)");
    expect(page).not.toMatch(/process\.env\.(OPENAI|ANTHROPIC)_API_KEY[^)]*\}/);
  });

  it("프로필 조인은 full_name이 아니라 display_name을 쓴다 (컬럼명이 다르면 500)", () => {
    expect(page).toContain("profiles(display_name)");
    expect(page).not.toContain("full_name");
  });

  it("메뉴에 AI 모델 항목이 있다", () => {
    expect(nav).toContain('"/admin/ai-models"');
  });

  it("서버 액션은 validateRoutes로 다시 검증하고 apply RPC를 부른다", () => {
    expect(actions).toContain("export async function changeModelRouting");
    expect(actions).toContain("export async function rollbackModelRouting");
    expect(actions).toContain("validateRoutes(");
    expect(actions).toContain('rpc("apply_ai_model_routing"');
  });

  it("폼은 바뀐 값이 없으면 버튼을 막고 이유를 보여 준다", () => {
    expect(form).toContain("admin-role-form__hint");
    expect(form).toContain("diffRoutes(");
  });

  it("키 미설정 공급자·웹검색 없는 모델은 disabled 옵션이다", () => {
    expect(form).toMatch(/disabled=\{[^}]*hasAnthropicKey[^}]*\}/);
    expect(form).toContain('stage === "public_research" && !spec.webSearch');
  });

  it("조사 카드와 보고서 카드 모두 패키지 승격 규칙을 알려준다", () => {
    const packageMentions = (form.match(/패키지/g) ?? []).length;
    expect(packageMentions).toBeGreaterThanOrEqual(2);
  });

  it("deprecated 모델은 저장된 값일 때만 드롭다운에 보인다", () => {
    expect(form).toContain("isModelOptionVisible");
    expect(form).toContain("deprecatedAt");
  });
});
