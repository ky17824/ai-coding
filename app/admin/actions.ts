"use server";

import { revalidatePath } from "next/cache";
import {
  parseAdminRoleChange,
  roleChangeErrorMessage
} from "@/lib/admin-users";
import { decryptPhone, formatPhone } from "@/lib/pii";
import type { Locale } from "@/lib/i18n";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";

export interface AdminRoleActionState {
  ok: boolean;
  message: string;
}

export async function changeUserRole(
  _state: AdminRoleActionState,
  formData: FormData
): Promise<AdminRoleActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const parsed = parseAdminRoleChange({
    targetUserId: formData.get("targetUserId"),
    role: formData.get("role"),
    adminPurpose: formData.get("adminPurpose"),
    reason: formData.get("reason"),
    confirmed: formData.get("confirmed")
  });
  if (!parsed.success) return { ok: false, message: en ? "Review the role, administrator purpose, confirmation, and reason." : "역할, 관리자 용도, 확인 항목과 변경 사유를 확인해 주세요." };

  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const { data: actor } = await supabase.from("profiles").select("role,deleted_at").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin" || actor.deleted_at) return { ok: false, message: roleChangeErrorMessage("admin_required", locale) };

  const { error } = await supabase.rpc("manage_user_role", {
    p_target_user_id: parsed.data.targetUserId,
    p_new_role: parsed.data.role,
    p_admin_purpose: parsed.data.adminPurpose,
    p_reason: parsed.data.reason
  });
  if (error) return { ok: false, message: roleChangeErrorMessage(error.message, locale) };

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${parsed.data.targetUserId}`);
  revalidatePath("/en/admin/users");
  revalidatePath(`/en/admin/users/${parsed.data.targetUserId}`);
  return { ok: true, message: en ? "Access changed and recorded in the audit history." : "권한을 변경하고 감사 이력에 기록했습니다." };
}

export async function revealPhone(
  profileId: string,
  locale: Locale = "ko"
): Promise<{ phone: string } | { error: string }> {
  const en = locale === "en";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!user || !supabase || !admin) return { error: en ? "Please sign in." : "로그인이 필요합니다." };
  const { data: actor } = await supabase.from("profiles").select("role,deleted_at").eq("id", user.id).single();
  if (actor?.role !== "admin" || actor.deleted_at) return { error: en ? "Admin access is required." : "관리자 권한이 필요합니다." };
  const { data: subject } = await admin.from("profiles").select("phone_enc").eq("id", profileId).single();
  if (!subject?.phone_enc) return { error: en ? "No phone number is on file." : "등록된 전화번호가 없습니다." };
  const { error } = await admin.from("pii_access_log").insert({ actor_id: user.id, subject_id: profileId, field: "phone" });
  if (error) return { error: en ? "We couldn't record this access." : "열람 기록을 남기지 못했습니다." };
  try {
    return { phone: formatPhone(decryptPhone(subject.phone_enc)) };
  } catch {
    return { error: en ? "We couldn't decrypt the phone number." : "전화번호를 복호화하지 못했습니다." };
  }
}
