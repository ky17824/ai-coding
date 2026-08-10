"use server";

import { z } from "zod";
import { appOrigin, passwordResetErrorMessage } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n";

export interface PasswordState { ok: boolean; message: string }

export async function requestPasswordReset(
  _state: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const rawLocale = String(formData.get("locale") ?? "ko");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ko";
  const en = locale === "en";
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, message: en ? "Enter a valid email address." : "올바른 이메일을 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: en ? "Authentication is not configured." : "인증 환경이 연결되지 않았습니다." };
  const origin = appOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(localizedPath("/reset-password/update", locale))}`
  });
  const errorMessage = passwordResetErrorMessage(error, locale);
  if (errorMessage) return { ok: false, message: errorMessage };
  return { ok: true, message: en ? "If the address is registered, a password reset email is on its way." : "가입된 주소라면 비밀번호 재설정 메일을 보냈습니다." };
}

export async function updatePassword(
  _state: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const rawLocale = String(formData.get("locale") ?? "ko");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ko";
  const en = locale === "en";
  const parsed = z.object({
    password: z.string().min(10).max(72),
    passwordConfirm: z.string()
  }).refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"]
  }).safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm")
  });
  if (!parsed.success) return { ok: false, message: en ? "Enter the same password twice. It must be at least 10 characters." : "10자 이상의 같은 비밀번호를 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: en ? "Authentication is not configured." : "인증 환경이 연결되지 않았습니다." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: en ? "We could not update your password. Request a new reset link." : "비밀번호를 변경하지 못했습니다. 재설정 링크를 다시 요청해 주세요." };
  return { ok: true, message: en ? "Password updated. Sign in with your new password." : "비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요." };
}
