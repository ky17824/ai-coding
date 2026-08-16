import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "components/admin-role-form.tsx"), "utf8");

describe("AdminRoleForm", () => {
  it("explains every reason the submit button is disabled", () => {
    // 세 가지 사유로 비활성화되는데 unchanged만 안내가 없어, 승격 직후 화면이
    // 성공 메시지와 죽은 버튼을 동시에 보여줬다.
    expect(source).toContain("const disabled = Boolean(disabledReason) || pending || unchanged");
    expect(source).toContain("blockedHint");
    expect(source).toContain("admin-role-form__hint");
    // disabledReason은 배너, pending은 버튼 문구가 이미 알려준다.
    expect(source).toContain('role="alert"');
    expect(source).toContain('"변경 중…"');
  });

  it("distinguishes a role change from a purpose-only change in the hint", () => {
    expect(source).toContain("관리자 용도를 다른 값으로 바꾸면");
    expect(source).toContain("새 역할을 다른 값으로 바꾸면");
    expect(source).toContain("Pick a different administrator purpose");
    expect(source).toContain("Pick a different role");
  });

  it("keeps the hint out of the way when the button is usable", () => {
    // 버튼이 눌리는 상태에서 안내가 남으면 오히려 혼란스럽다.
    expect(source).toContain("disabledReason || pending || !unchanged");
  });
});
