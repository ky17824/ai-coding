import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = readFileSync(join(process.cwd(), "app/admin/ai-models/page.tsx"), "utf8");
const form = readFileSync(join(process.cwd(), "components/admin-model-routing-form.tsx"), "utf8");
const actions = readFileSync(join(process.cwd(), "app/admin/actions.ts"), "utf8");
const nav = readFileSync(join(process.cwd(), "components/admin-nav.tsx"), "utf8");
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

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

  it("24시간 요약은 ai_agent_runs.model이 아니라 model_attempts를 집계한다 (실패 실행이 모델을 못 채워 오귀속되는 문제)", () => {
    expect(page).toContain('select("model_attempts")');
    expect(page).not.toContain('select("model")');
    expect(page).toContain("attempt.ok");
  });

  it("서버 액션은 validateRoutes로 다시 검증하고 apply RPC를 부른다", () => {
    expect(actions).toContain("export async function changeModelRouting");
    expect(actions).toContain("export async function rollbackModelRouting");
    expect(actions).toContain("validateRoutes(");
    expect(actions).toContain('rpc("apply_ai_model_routing"');
  });

  it("폼은 바뀐 값이 없으면 버튼을 막고 이유를 보여 준다 — 공통 기본값과 상품 조정 둘 다 diff에 든다", () => {
    expect(form).toContain("admin-role-form__hint");
    expect(form).toContain("diffRouting(");
    expect(form).toContain("diff.stages.length + diff.products.length");
  });

  it("키 미설정 공급자·웹검색 없는 모델은 disabled 옵션이다 (기본값 select와 상품 셀이 같은 옵션 목록을 쓴다)", () => {
    expect(form).toMatch(/keyMissing = [^;]*hasAnthropicKey/);
    expect(form).toContain("disabled={keyMissing || noSearch}");
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

  it("활성 설정이 없을 때는 시드값 그대로도 저장할 수 있어야 한다 (빈 상태 탈출구)", () => {
    // activeVersion이 null이면(활성 설정 없음) draft==activeRoutes(시드값)이어도 unchanged가
    // true가 되면 안 된다 — 그러면 배너는 "아래에서 저장하세요"라면서 버튼은 막혀 있게 된다.
    expect(form).toContain("props.activeVersion !== null && changeCount === 0");
  });

  it("단계 도움말은 aria-describedby로 모델·추론 강도 선택과 연결된다", () => {
    const modelSelect = form.slice(form.indexOf('name={`${stage}.model`}'), form.indexOf("</select>", form.indexOf('name={`${stage}.model`}')));
    const effortSelect = form.slice(form.indexOf('name={`${stage}.effort`}'), form.indexOf("</select>", form.indexOf('name={`${stage}.effort`}')));
    expect(modelSelect).toContain("aria-describedby={`${stage}-help`}");
    expect(effortSelect).toContain("aria-describedby={`${stage}-help`}");
  });

  it("저장/취소 버튼 줄은 320px에서 줄바꿈되어 가로 스크롤을 만들지 않는다", () => {
    expect(css).toMatch(/\.admin-model-routing__actions\s*\{[^}]*flex-wrap:\s*wrap;/s);
  });

  it("단계 번호는 원형 배지가 아니라 'N단계' kicker 텍스트다", () => {
    expect(form).not.toContain("admin-model-routing__index");
    expect(css).not.toContain("admin-model-routing__index");
    expect(form).toContain("`${index + 1}단계`");
    expect(form).toContain("`Stage ${index + 1}`");
  });

  it("단계 카드는 자기 패딩이 있고 admin-section의 48px 마진을 물려받지 않는다", () => {
    expect(css).toMatch(/\.admin-model-routing__stage\s*\{[^}]*padding:/s);
    expect(form).toContain('className="panel admin-model-routing__stage"');
    expect(form).not.toContain("admin-section panel admin-model-routing__stage");
  });

  it("공통 기본값 3단계는 한 줄 3열이고, 각 패널 안에서 모델·추론 강도는 세로로 쌓인다 (2026-08-19 확정 샘플)", () => {
    const stages = css.match(/\.admin-model-routing__stages\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(stages).toMatch(/repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    const fields = css.match(/\.admin-model-routing__fields\s*\{[^}]*\}/s)?.[0] ?? "";
    expect(fields).toMatch(/grid-template-columns:\s*1fr;/);
    expect(form).toContain('className="admin-model-routing__stages"');
  });

  it("편집 폼은 전폭이라 기본값 3열과 상품별 조정 표가 같은 폭이고, .provider-form 패딩을 걷어 상태 칩과 정렬한다", () => {
    expect(css).toMatch(/\.admin-model-routing \.provider-form\s*\{[^}]*padding:\s*0;[^}]*max-width:\s*none;/s);
  });

  it("상품별 조정은 hidden input(product_overrides) JSON 하나로 보내고, 표는 상품 × 3단계 + 최근 30일 열이다", () => {
    expect(form).toContain('name="product_overrides"');
    expect(form).toContain('className="admin-model-routing__table"');
    expect(form).toContain("productStats");
    expect(page).toContain('orders!inner(product_key)');
    expect(page).toContain("aggregateProductStats(");
    expect(page).toContain("product_overrides");
  });
});
