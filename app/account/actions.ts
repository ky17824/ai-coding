"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth";
import { localizedPath, type Locale } from "@/lib/i18n";
import { encryptPhone } from "@/lib/pii";
import { ensureKakaoUnlinked, kakaoServiceUserId } from "@/lib/kakao";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";

export interface AccountState { ok: boolean; message: string }

const profileSchema = z.object({
  displayName: z.string().trim().min(1).max(40),
  companyName: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().min(1).max(60),
  phone: z.string().trim().max(30),
  marketingOptIn: z.boolean(),
  onboarding: z.boolean(),
  agreeTerms: z.boolean(),
  agreePrivacy: z.boolean(),
  locale: z.enum(["ko", "en"]).default("ko"),
  next: z.string().optional()
});

export async function updateProfile(
  _state: AccountState,
  formData: FormData
): Promise<AccountState> {
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    companyName: formData.get("companyName"),
    jobTitle: formData.get("jobTitle"),
    phone: formData.get("phone") ?? "",
    marketingOptIn: formData.get("marketingOptIn") === "on",
    onboarding: formData.get("onboarding") === "1",
    agreeTerms: formData.get("agreeTerms") === "on",
    agreePrivacy: formData.get("agreePrivacy") === "on",
    locale: formData.get("locale") || "ko",
    next: formData.get("next") || undefined
  });
  if (!parsed.success) return { ok: false, message: formData.get("locale") === "en" ? "Check the profile information and try again." : "프로필 입력값을 확인해 주세요." };
  const locale = parsed.data.locale;
  const en = locale === "en";
  if (parsed.data.onboarding && (!parsed.data.phone || !parsed.data.agreeTerms || !parsed.data.agreePrivacy)) {
    return { ok: false, message: en ? "A mobile phone number and both required consents are required." : "휴대전화와 두 개의 필수 동의가 필요합니다." };
  }
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) return { ok: false, message: en ? "We could not find your organization." : "조직 정보를 찾지 못했습니다." };

  const now = new Date().toISOString();
  let phone: string | undefined;
  try {
    phone = parsed.data.phone ? encryptPhone(parsed.data.phone) : undefined;
  } catch (error) {
    return { ok: false, message: en ? "Check the mobile phone number and try again." : error instanceof Error ? error.message : "휴대전화를 확인해 주세요." };
  }
  const profileUpdate: Record<string, unknown> = {
    display_name: parsed.data.displayName,
    job_title: parsed.data.jobTitle,
    marketing_opt_in: parsed.data.marketingOptIn
  };
  if (phone) profileUpdate.phone_enc = phone;
  if (parsed.data.onboarding) {
    profileUpdate.terms_agreed_at = now;
    profileUpdate.privacy_agreed_at = now;
  }
  const [{ error: profileError }, { error: organizationError }] = await Promise.all([
    admin.from("profiles").update(profileUpdate).eq("id", user.id),
    admin.from("organizations").update({ name: parsed.data.companyName }).eq("id", profile.organization_id)
  ]);
  if (profileError || organizationError) return { ok: false, message: en ? "We could not save your profile." : "프로필을 저장하지 못했습니다." };
  revalidatePath(localizedPath("/account", locale));
  revalidatePath(localizedPath("/dashboard", locale));
  if (parsed.data.onboarding) redirect(safeNextPath(parsed.data.next, localizedPath("/dashboard", locale)));
  return { ok: true, message: en ? "Profile saved." : "프로필을 저장했습니다." };
}

export async function changePassword(
  _state: AccountState,
  formData: FormData
): Promise<AccountState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const parsed = z.object({
    password: z.string().min(10).max(72),
    passwordConfirm: z.string()
  }).refine((value) => value.password === value.passwordConfirm).safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm")
  });
  if (!parsed.success) return { ok: false, message: en ? "Enter the same password in both fields. It must be at least 10 characters." : "10자 이상의 같은 비밀번호를 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: en ? "For security, use the password reset email to change your password." : "보안을 위해 비밀번호 재설정 메일을 이용해 주세요." };
  return { ok: true, message: en ? "Password changed." : "비밀번호를 변경했습니다." };
}

export async function deleteAccount(
  _state: AccountState,
  formData: FormData
): Promise<AccountState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  const supabase = await createSupabaseServerClient();
  if (!user?.email || !admin || !supabase) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const confirmation = String(formData.get("email") ?? "").trim().toLowerCase();
  if (confirmation !== user.email.toLowerCase()) {
    return { ok: false, message: en ? "Enter the email address for this account exactly as shown." : "현재 계정 이메일을 정확히 입력해 주세요." };
  }
  const kakaoIdentity = user.identities?.find((identity) => identity.provider === "kakao");
  if (kakaoIdentity) {
    const serviceUserId = kakaoServiceUserId([kakaoIdentity]);
    if (!serviceUserId) {
      return { ok: false, message: en ? "We could not verify the linked Kakao account, so your account was not closed." : "카카오 연결 정보를 확인하지 못해 탈퇴를 중단했습니다." };
    }
    const unlink = await ensureKakaoUnlinked(serviceUserId, process.env.KAKAO_ADMIN_KEY);
    if (!unlink.ok) {
      return { ok: false, message: en ? "We could not disconnect Kakao, so your account was not closed. Please try again shortly." : "카카오 연결을 해제하지 못해 탈퇴를 중단했습니다. 잠시 후 다시 시도해 주세요." };
    }
  }
  const { error: anonymizeError } = await admin.from("profiles").update({
    display_name: en ? "Deleted user" : "탈퇴한 사용자",
    email: `deleted+${user.id}@removed.invalid`,
    job_title: null,
    phone_enc: null,
    marketing_opt_in: false,
    deleted_at: new Date().toISOString()
  }).eq("id", user.id);
  if (anonymizeError) return { ok: false, message: en ? "We could not anonymize the account." : "계정을 익명화하지 못했습니다." };
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, true);
  if (deleteError) return { ok: false, message: en ? "We could not finish deleting the authentication account. Please try again." : "인증 계정 삭제를 마치지 못했습니다. 다시 시도해 주세요." };
  await supabase.auth.signOut();
  redirect(localizedPath("/", locale));
}
