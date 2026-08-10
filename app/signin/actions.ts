"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { appOrigin, dashboardPathForRole, safeNextPath } from "@/lib/auth";
import { isLocale, localizedPath, type Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SignInState {
  message: string;
  ok: boolean;
}

export async function requestMagicLink(
  _state: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rawLocale = String(formData.get("locale") ?? "ko");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ko";
  const en = locale === "en";
  const next = safeNextPath(String(formData.get("next") ?? ""), localizedPath("/dashboard", locale));

  if (!email || !email.includes("@")) {
    return { ok: false, message: en ? "Enter a valid work email address." : "올바른 업무용 이메일을 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      message: en ? "Authentication is not configured yet." : "인증 환경이 아직 연결되지 않았습니다. 로컬 데모를 이용해 주세요."
    };
  }

  const origin = appOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(localizedPath(next, locale))}`
    }
  });

  if (error) return { ok: false, message: en ? "We could not send the sign-in link." : "로그인 링크를 보내지 못했습니다." };
  return {
    ok: true,
    message: en ? "We sent a sign-in link to your email. Open it within 15 minutes." : "이메일로 로그인 링크를 보냈습니다. 15분 안에 확인해 주세요."
  };
}

export async function signInWithPassword(
  _state: SignInState,
  formData: FormData
): Promise<SignInState> {
  const rawLocale = String(formData.get("locale") ?? "ko");
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "ko";
  const en = locale === "en";
  const parsed = z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1).max(72),
    next: z.string().optional()
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined
  });
  if (!parsed.success) {
    return { ok: false, message: en ? "The email or password is incorrect." : "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: en ? "Authentication is not configured." : "인증 환경이 연결되지 않았습니다." };
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });
  if (error || !data.user) {
    return { ok: false, message: en ? "The email or password is incorrect." : "이메일 또는 비밀번호가 올바르지 않습니다." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role,deleted_at")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profile?.deleted_at) {
    await supabase.auth.signOut();
    return { ok: false, message: en ? "This account has been closed." : "탈퇴한 계정입니다." };
  }
  redirect(safeNextPath(parsed.data.next, localizedPath(dashboardPathForRole(profile?.role), locale)));
}

export async function signOut(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  const locale = String(formData.get("locale") ?? "ko");
  redirect(localizedPath("/", isLocale(locale) ? locale : "ko"));
}
