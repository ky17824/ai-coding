"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
  const inviteCode = String(formData.get("inviteCode") ?? "").trim();
  const allowedCodes = (process.env.INVITE_CODES ?? "")
    .split(",")
    .map((code) => code.trim())
    .filter(Boolean);

  if (!email || !email.includes("@")) {
    return { ok: false, message: "올바른 업무용 이메일을 입력해 주세요." };
  }
  if (!inviteCode || !allowedCodes.includes(inviteCode)) {
    return { ok: false, message: "유효하지 않은 비공개 베타 초대 코드입니다." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      message: "인증 환경이 아직 연결되지 않았습니다. 로컬 데모를 이용해 주세요."
    };
  }

  const cookieStore = await cookies();
  cookieStore.set("gtm-invite", inviteCode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60,
    path: "/"
  });
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      data: { invite_code: inviteCode },
      emailRedirectTo: `${origin}/auth/callback`
    }
  });

  if (error) return { ok: false, message: "로그인 링크를 보내지 못했습니다." };
  return {
    ok: true,
    message: "이메일로 로그인 링크를 보냈습니다. 15분 안에 확인해 주세요."
  };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}
