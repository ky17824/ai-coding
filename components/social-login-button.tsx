"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const providers = {
  kakao: {
    label: "카카오",
    error: "카카오 로그인을 시작하지 못했습니다.",
    className: "button--kakao"
  },
  google: {
    label: "Google",
    error: "Google 로그인을 시작하지 못했습니다.",
    className: "button--ghost"
  }
} as const;

export type SocialProvider = keyof typeof providers;

export function SocialLoginButton({
  provider,
  next = "/dashboard"
}: {
  provider: SocialProvider;
  next?: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const config = providers[provider];

  async function signIn() {
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setError("인증 환경이 연결되지 않았습니다.");
    setPending(true);
    try {
      const origin = window.location.origin;
      const result = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
        }
      });
      if (result.error) {
        setError(config.error);
        setPending(false);
      }
    } catch {
      setError(config.error);
      setPending(false);
    }
  }

  return (
    <>
      <button
        className={`button ${config.className} button--full`}
        type="button"
        onClick={signIn}
        disabled={pending}
      >
        {pending ? `${config.label}로 이동 중…` : `${config.label}로 계속하기`}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}
