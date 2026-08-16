import type { Locale } from "@/lib/i18n";
import { z } from "zod";

export type AdminUserRole = "startup" | "provider" | "admin";
export type AdminAccountPurpose = "primary" | "recovery" | null;
export type AdminUserStatus = "active" | "email_unconfirmed" | "deleted";

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  organizationName: string | null;
  role: AdminUserRole;
  adminPurpose: AdminAccountPurpose;
  providers: string[];
  status: AdminUserStatus;
  createdAt: string;
  lastSignInAt: string | null;
}

const adminRoleChangeSchema = z.object({
  targetUserId: z.string().uuid(),
  role: z.enum(["startup", "provider", "admin"]),
  adminPurpose: z.preprocess((value) => value === "" ? null : value, z.enum(["primary", "recovery"]).nullable()),
  reason: z.string().trim().min(10).max(500),
  confirmed: z.literal("on")
}).superRefine((value, context) => {
  if (value.role === "admin" && value.adminPurpose === null) {
    context.addIssue({ code: "custom", path: ["adminPurpose"], message: "admin_purpose_required" });
  }
  if (value.role !== "admin" && value.adminPurpose !== null) {
    context.addIssue({ code: "custom", path: ["adminPurpose"], message: "purpose_requires_admin" });
  }
});

export function parseAdminRoleChange(input: unknown) {
  return adminRoleChangeSchema.safeParse(input);
}

export function normalizeAuthProviders(identities: Array<{ provider?: string | null }> | null | undefined) {
  return [...new Set((identities ?? []).map((identity) => identity.provider?.trim().toLowerCase()).filter((provider): provider is string => Boolean(provider)))].sort();
}

export function filterAdminUsers(
  users: AdminUserRow[],
  filters: { q?: string; role?: string; status?: string; purpose?: string; sort?: string }
) {
  const q = (filters.q ?? "").trim().slice(0, 120).toLowerCase();
  return users.filter((user) =>
    (!q || [user.email, user.displayName, user.organizationName ?? ""].some((value) => value.toLowerCase().includes(q))) &&
    (!filters.role || user.role === filters.role) &&
    (!filters.status || user.status === filters.status) &&
    (!filters.purpose || (filters.purpose === "unspecified" ? user.role === "admin" && !user.adminPurpose : user.adminPurpose === filters.purpose))
  ).sort((a, b) => {
    if (filters.sort === "name") return a.displayName.localeCompare(b.displayName);
    if (filters.sort === "created") return b.createdAt.localeCompare(a.createdAt);
    return (b.lastSignInAt ?? "").localeCompare(a.lastSignInAt ?? "");
  });
}

export function roleChangeErrorMessage(code: string | undefined, locale: Locale) {
  const en = locale === "en";
  const messages: Record<string, [string, string]> = {
    admin_required: ["관리자 권한이 필요합니다.", "Admin access is required."],
    target_not_found: ["사용자를 찾을 수 없거나 탈퇴한 계정입니다.", "The user does not exist or the account is closed."],
    self_change_forbidden: ["현재 로그인한 계정의 권한은 다른 관리자가 변경해야 합니다.", "Another administrator must change the current account."],
    no_change: ["변경할 권한이나 관리자 용도가 없습니다.", "There is no role or administrator-purpose change to apply."],
    last_admin: ["마지막 활성 관리자는 해제할 수 없습니다. 먼저 다른 관리자를 지정해 주세요.", "You cannot remove the last active administrator. Assign another administrator first."],
    closure_in_progress: ["탈퇴 처리 중인 계정은 권한을 변경할 수 없습니다.", "You cannot change access while account closure is in progress."],
    invalid_admin_purpose: ["관리자 계정 용도를 다시 확인해 주세요.", "Review the administrator account purpose."],
    invalid_reason: ["변경 사유를 10자 이상 500자 이하로 작성해 주세요.", "Provide a reason between 10 and 500 characters."]
  };
  const message = code ? messages[code] : undefined;
  return message ? message[en ? 1 : 0] : en
    ? "We couldn't change this user's access. Please try again."
    : "사용자 권한을 변경하지 못했습니다. 다시 시도해 주세요.";
}
