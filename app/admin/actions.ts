"use server";

import { revalidatePath } from "next/cache";
import { BETA_FREE_RUNS, MAX_BETA_TESTERS, normalizeBetaEmail } from "@/lib/beta-testers";
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
import { validateRoutes, validateProductOverrides, routesSchema, type OverridesValidationError, type RoutesValidationError } from "@/lib/ai-models/routing";
import { listCatalogProducts } from "@/lib/catalog";

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
  unknown_product: { ko: "상품별 조정에 알 수 없는 상품이 있습니다.", en: "A product override names an unknown product." },
  unchanged: { ko: "바뀐 값이 없습니다.", en: "Nothing changed." },
  admin_required: { ko: "관리자 권한이 필요합니다.", en: "Administrator access is required." }
};

function routingErrorMessage(error: OverridesValidationError | RoutesValidationError | string, en: boolean): string {
  const entry = ROUTING_ERROR_MESSAGES[error];
  if (entry) return en ? entry.en : entry.ko;
  return en ? "The change could not be saved." : "설정을 저장하지 못했습니다.";
}

type RoutingAdminGate = { ok: true; userId: string } | { ok: false; message: string };

/**
 * 관리자 확인은 항상 ai_model_routing_configs를 읽기 전에 끝난다. 순서를 바꾸면 비관리자가
 * "그 버전이 없습니다" vs "관리자 권한이 필요합니다" 메시지 차이로 버전 존재 여부를 추측할 수 있다
 * (privileged 테이블에 대한 존재 여부 오라클). 두 액션 모두 DB를 읽기 전에 이 함수부터 부른다.
 */
async function requireRoutingAdmin(en: boolean): Promise<RoutingAdminGate> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const { data: actor } = await supabase.from("profiles").select("role,deleted_at").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin" || actor.deleted_at) return { ok: false, message: routingErrorMessage("admin_required", en) };
  return { ok: true, userId: user.id };
}

/** 상품별 조정을 받을 수 있는 상품 — 지금 노출된 AI 전문가 상품(전문가 7 + 패키지 2). */
function routableProductIds(): string[] {
  return listCatalogProducts().filter((product) => product.includedAgentIds.length > 0).map((product) => product.id);
}

async function applyRouting(routesInput: unknown, overridesInput: unknown, reason: string, locale: Locale): Promise<ModelRoutingActionState> {
  const en = locale === "en";
  // 호출자(rollbackModelRouting)가 이미 이 게이트를 통과했더라도 다시 확인한다 — 방어적 이중 확인.
  const gate = await requireRoutingAdmin(en);
  if (!gate.ok) return { ok: false, message: gate.message };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  if (reason.trim().length < 10) return { ok: false, message: en ? "Write a reason of at least 10 characters." : "변경 사유를 10자 이상 적어 주세요." };

  // 클라이언트가 이미 검증했더라도 제출된 값은 신뢰하지 않는다. 서버가 다시 본다.
  const validated = validateRoutes(routesInput, {
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY)
  });
  if (!validated.ok) return { ok: false, message: routingErrorMessage(validated.error, en) };
  const validatedOverrides = validateProductOverrides(overridesInput ?? {}, {
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY)
  }, routableProductIds());
  if (!validatedOverrides.ok) return { ok: false, message: routingErrorMessage(validatedOverrides.error, en) };

  const { data: active } = await admin.from("ai_model_routing_configs").select("routes,product_overrides").eq("status", "active").maybeSingle();
  const current = routesSchema.safeParse(active?.routes);
  const currentOverrides = active?.product_overrides && typeof active.product_overrides === "object" ? active.product_overrides : {};
  if (current.success
    && JSON.stringify(current.data) === JSON.stringify(validated.routes)
    && JSON.stringify(currentOverrides) === JSON.stringify(validatedOverrides.overrides)) {
    return { ok: false, message: routingErrorMessage("unchanged", en) };
  }

  const { data: version, error } = await admin.rpc("apply_ai_model_routing", {
    p_routes: validated.routes,
    p_product_overrides: validatedOverrides.overrides,
    p_reason: reason.trim(),
    p_actor: gate.userId
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
  // 상품별 조정은 폼의 hidden input에 JSON으로 실린다. 없으면 조정 없음, 깨졌으면 모양 오류.
  const raw = formData.get("product_overrides");
  let overrides: unknown = {};
  if (typeof raw === "string" && raw.trim()) {
    try { overrides = JSON.parse(raw); } catch { return { ok: false, message: routingErrorMessage("invalid_shape", locale === "en") }; }
  }
  return applyRouting(routes, overrides, String(formData.get("reason") ?? ""), locale);
}

export async function rollbackModelRouting(_state: ModelRoutingActionState, formData: FormData): Promise<ModelRoutingActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  // 게이트를 먼저 통과시킨다. 버전 조회를 먼저 하면 "그 버전이 없습니다" vs "관리자 권한이
  // 필요합니다" 메시지 차이로 비관리자가 버전 존재 여부를 알아낼 수 있다.
  const gate = await requireRoutingAdmin(en);
  if (!gate.ok) return { ok: false, message: gate.message };
  const admin = createSupabaseAdminClient();
  const version = Number(formData.get("version"));
  if (!admin || !Number.isInteger(version)) return { ok: false, message: en ? "Invalid version." : "버전이 올바르지 않습니다." };
  const { data: row } = await admin.from("ai_model_routing_configs").select("routes,product_overrides").eq("version", version).maybeSingle();
  if (!row) return { ok: false, message: en ? "That version does not exist." : "그 버전이 없습니다." };
  // 폼에 다른 필드가 실려 있어도 무시한다 — routes·overrides는 오직 저장된 버전 스냅샷에서만 온다.
  return applyRouting(row.routes, row.product_overrides ?? {}, String(formData.get("reason") ?? ""), locale);
}

// ---------------------------------------------------------------------------
// 베타 테스터 초대. 이메일을 등록하면 그 계정은 심층 시장 조사를 max_runs(3)회 결제 없이 실행한다.
// 판정·과금 우회는 lib/beta-testers.ts와 027 RPC가 하고, 여기는 목록 편집만 한다.
// ---------------------------------------------------------------------------
export interface BetaTesterActionState {
  ok: boolean;
  message: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminActor = { error: string } | { user: { id: string }; supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>> };
async function requireAdminActor(locale: Locale): Promise<AdminActor> {
  const en = locale === "en";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) return { error: en ? "Please sign in." : "로그인이 필요합니다." };
  const { data: actor } = await supabase.from("profiles").select("role,deleted_at").eq("id", user.id).maybeSingle();
  if (actor?.role !== "admin" || actor.deleted_at) return { error: roleChangeErrorMessage("admin_required", locale) ?? (en ? "Administrator access is required." : "관리자 권한이 필요합니다.") };
  return { user, supabase };
}

function revalidateBetaTesters() {
  revalidatePath("/admin/beta-testers");
  revalidatePath("/en/admin/beta-testers");
}

export async function inviteBetaTester(_state: BetaTesterActionState, formData: FormData): Promise<BetaTesterActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const email = normalizeBetaEmail(String(formData.get("email") ?? ""));
  if (!EMAIL.test(email)) return { ok: false, message: en ? "Enter a valid email." : "올바른 이메일을 입력해 주세요." };
  const actor = await requireAdminActor(locale);
  if ("error" in actor) return { ok: false, message: actor.error };
  // 슬롯 상한. 삭제로 자리를 비운 뒤 다시 초대한다. RLS(is_admin)가 실제 쓰기 권한을 막는다.
  const { count } = await actor.supabase.from("beta_testers").select("email", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_BETA_TESTERS) return { ok: false, message: en ? `All ${MAX_BETA_TESTERS} slots are in use. Delete a tester first.` : `슬롯 ${MAX_BETA_TESTERS}개가 모두 사용 중입니다. 먼저 한 명을 삭제해 주세요.` };
  const { error } = await actor.supabase.from("beta_testers").insert({ email, max_runs: BETA_FREE_RUNS, invited_by: actor.user.id });
  if (error) return { ok: false, message: error.code === "23505" ? (en ? "This email is already invited." : "이미 초대된 이메일입니다.") : (en ? "We couldn't save the tester." : "베타 테스터를 저장하지 못했습니다.") };
  revalidateBetaTesters();
  return { ok: true, message: en ? "Invited. Send them the sign-up link; free runs unlock when they sign in with this email." : "초대했습니다. 가입 안내는 직접 보내 주세요. 이 이메일로 로그인하면 무료 이용이 열립니다." };
}

export async function deleteBetaTester(_state: BetaTesterActionState, formData: FormData): Promise<BetaTesterActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const email = normalizeBetaEmail(String(formData.get("email") ?? ""));
  if (!EMAIL.test(email)) return { ok: false, message: en ? "Invalid email." : "이메일이 올바르지 않습니다." };
  const actor = await requireAdminActor(locale);
  if ("error" in actor) return { ok: false, message: actor.error };
  const { error } = await actor.supabase.from("beta_testers").delete().eq("email", email);
  if (error) return { ok: false, message: en ? "We couldn't delete the tester." : "베타 테스터를 삭제하지 못했습니다." };
  revalidateBetaTesters();
  return { ok: true, message: en ? "Deleted. The slot is free." : "삭제했습니다. 슬롯이 비었습니다." };
}

export async function resetBetaTesterRuns(_state: BetaTesterActionState, formData: FormData): Promise<BetaTesterActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const email = normalizeBetaEmail(String(formData.get("email") ?? ""));
  if (!EMAIL.test(email)) return { ok: false, message: en ? "Invalid email." : "이메일이 올바르지 않습니다." };
  const actor = await requireAdminActor(locale);
  if ("error" in actor) return { ok: false, message: actor.error };
  // 사용 횟수는 주문에서 세므로 기준 시각만 옮긴다(028). 과거 주문은 남는다.
  const { error } = await actor.supabase.from("beta_testers").update({ quota_started_at: new Date().toISOString(), max_runs: BETA_FREE_RUNS }).eq("email", email);
  if (error) return { ok: false, message: en ? "We couldn't reset the runs." : "무료 횟수를 리셋하지 못했습니다." };
  revalidateBetaTesters();
  return { ok: true, message: en ? `Free runs reset to ${BETA_FREE_RUNS}.` : `무료 횟수를 ${BETA_FREE_RUNS}회로 리셋했습니다.` };
}
