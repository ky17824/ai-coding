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
import { validateRoutes, routesSchema, type RoutesValidationError } from "@/lib/ai-models/routing";

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

export interface ModelRoutingActionState {
  ok: boolean;
  message: string;
  version?: number;
}

const ROUTING_ERROR_MESSAGES: Record<string, { ko: string; en: string }> = {
  invalid_shape: { ko: "설정 형식이 올바르지 않습니다.", en: "The configuration shape is invalid." },
  unknown_model: { ko: "허용 목록에 없는 모델입니다.", en: "That model is not on the allowed list." },
  unsupported_effort: { ko: "선택한 추론 강도를 그 모델이 지원하지 않습니다.", en: "That model does not support the chosen reasoning level." },
  no_web_search: { ko: "공개 자료 조사에는 웹검색이 있는 모델이 필요합니다.", en: "Public research needs a model with web search." },
  provider_key_missing: { ko: "그 공급자의 API 키가 설정되지 않았습니다.", en: "That provider's API key is not configured." },
  unchanged: { ko: "바뀐 값이 없습니다.", en: "Nothing changed." },
  admin_required: { ko: "관리자 권한이 필요합니다.", en: "Administrator access is required." }
};

function routingErrorMessage(error: RoutesValidationError | string, en: boolean): string {
  const entry = ROUTING_ERROR_MESSAGES[error];
  if (entry) return en ? entry.en : entry.ko;
  return en ? "The change could not be saved." : "설정을 저장하지 못했습니다.";
}

async function applyRouting(routesInput: unknown, reason: string, locale: Locale): Promise<ModelRoutingActionState> {
  const en = locale === "en";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!user || !supabase || !admin) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const { data: actor } = await supabase.from("profiles").select("role,deleted_at").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin" || actor.deleted_at) return { ok: false, message: routingErrorMessage("admin_required", en) };
  if (reason.trim().length < 10) return { ok: false, message: en ? "Write a reason of at least 10 characters." : "변경 사유를 10자 이상 적어 주세요." };

  // 클라이언트가 이미 검증했더라도 제출된 값은 신뢰하지 않는다. 서버가 다시 본다.
  const validated = validateRoutes(routesInput, {
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY)
  });
  if (!validated.ok) return { ok: false, message: routingErrorMessage(validated.error, en) };

  const { data: active } = await admin.from("ai_model_routing_configs").select("routes").eq("status", "active").maybeSingle();
  const current = routesSchema.safeParse(active?.routes);
  if (current.success && JSON.stringify(current.data) === JSON.stringify(validated.routes)) {
    return { ok: false, message: routingErrorMessage("unchanged", en) };
  }

  const { data: version, error } = await admin.rpc("apply_ai_model_routing", {
    p_routes: validated.routes,
    p_reason: reason.trim(),
    p_actor: user.id
  });
  if (error) {
    return {
      ok: false,
      message: error.code === "23505"
        ? (en ? "Another administrator just applied a new version. Refresh and check again." : "다른 관리자가 방금 새 설정을 적용했습니다. 새로고침 후 다시 확인해 주세요.")
        : routingErrorMessage(error.message, en)
    };
  }

  revalidatePath("/admin/ai-models");
  revalidatePath("/en/admin/ai-models");
  return { ok: true, version: Number(version), message: en ? `Applied v${version}. New runs will use it.` : `새 설정 v${version}를 적용했습니다. 새 실행부터 사용됩니다.` };
}

export async function changeModelRouting(_state: ModelRoutingActionState, formData: FormData): Promise<ModelRoutingActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const routes = {
    classification: { model: formData.get("classification.model"), effort: formData.get("classification.effort") },
    public_research: { model: formData.get("public_research.model"), effort: formData.get("public_research.effort") },
    final_report: { model: formData.get("final_report.model"), effort: formData.get("final_report.effort") }
  };
  return applyRouting(routes, String(formData.get("reason") ?? ""), locale);
}

export async function rollbackModelRouting(_state: ModelRoutingActionState, formData: FormData): Promise<ModelRoutingActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const admin = createSupabaseAdminClient();
  const version = Number(formData.get("version"));
  if (!admin || !Number.isInteger(version)) return { ok: false, message: en ? "Invalid version." : "버전이 올바르지 않습니다." };
  const { data: row } = await admin.from("ai_model_routing_configs").select("routes").eq("version", version).maybeSingle();
  if (!row) return { ok: false, message: en ? "That version does not exist." : "그 버전이 없습니다." };
  return applyRouting(row.routes, String(formData.get("reason") ?? ""), locale);
}
