"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Locale } from "@/lib/i18n";

const providers = {
  kakao: {
    label: "카카오",
    error: "카카오 로그인을 시작하지 못했습니다.",
    className: "button--kakao"
  },
  google: {
    label: "Google",
    error: "Google 로그인을 시작하지 못했습니다.",
    className: "button--google"
  }
} as const;

export type SocialProvider = keyof typeof providers;

export function SocialLoginButton({
  provider,
  next = "/dashboard",
  locale = "ko"
}: {
  provider: SocialProvider;
  next?: string;
  locale?: Locale;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const config = providers[provider];
  const providerLabel = provider === "kakao" && locale === "en" ? "Kakao" : config.label;
  const idleLabel = provider === "kakao"
    ? locale === "en" ? "Login with Kakao" : "카카오 로그인"
    : locale === "en" ? `Continue with ${providerLabel}` : `${providerLabel}로 계속하기`;
  const pendingLabel = locale === "en" ? `Connecting to ${providerLabel}…` : `${providerLabel}로 이동 중…`;

  async function signIn() {
    setError("");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setError(locale === "en" ? "Authentication is not configured." : "인증 환경이 연결되지 않았습니다.");
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
        aria-label={pending ? pendingLabel : idleLabel}
      >
        {provider === "kakao" && !pending ? (
          <>
            <span className="button__kakao-logo" aria-hidden="true">
              <img
                className="button__kakao-logo-source"
                src="/auth/kakao-login-ko-300.png"
                alt=""
                width="300"
                height="45"
              />
            </span>
            <span className="button__kakao-label">{idleLabel}</span>
          </>
        ) : provider === "google" && (
          <img
            className="button__google-logo"
            src="/google-g.svg"
            alt=""
            width="18"
            height="18"
          />
        )}
        {(provider !== "kakao" || pending) && (pending ? pendingLabel : idleLabel)}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}
