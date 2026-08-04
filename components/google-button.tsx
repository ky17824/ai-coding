"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function GoogleButton({ next = "/dashboard" }: { next?: string }) {
  const [error, setError] = useState("");
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true") return null;

  async function signIn() {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return setError("인증 환경이 연결되지 않았습니다.");
    const origin = window.location.origin;
    const result = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      }
    });
    if (result.error) setError("구글 로그인을 시작하지 못했습니다.");
  }

  return (
    <>
      <button className="button button--ghost button--full" type="button" onClick={signIn}>
        Google로 계속하기
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}
