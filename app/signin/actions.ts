"use server";

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

  if (!email || !email.includes("@")) {
    return { ok: false, message: "올바른 업무용 이메일을 입력해 주세요." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      ok: false,
      message: "인증 환경이 아직 연결되지 않았습니다. 로컬 데모를 이용해 주세요."
    };
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
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
