"use server";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface PasswordState { ok: boolean; message: string }

export async function requestPasswordReset(
  _state: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, message: "올바른 이메일을 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "인증 환경이 연결되지 않았습니다." };
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password/update")}`
  });
  return { ok: true, message: "가입된 주소라면 비밀번호 재설정 메일을 보냈습니다." };
}

export async function updatePassword(
  _state: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const parsed = z.object({
    password: z.string().min(10).max(72),
    passwordConfirm: z.string()
  }).refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"]
  }).safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm")
  });
  if (!parsed.success) return { ok: false, message: "10자 이상의 같은 비밀번호를 입력해 주세요." };
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "인증 환경이 연결되지 않았습니다." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: "비밀번호를 변경하지 못했습니다. 재설정 링크를 다시 요청해 주세요." };
  return { ok: true, message: "비밀번호를 변경했습니다. 새 비밀번호로 로그인해 주세요." };
}
