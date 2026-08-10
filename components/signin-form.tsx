"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestMagicLink,
  signInWithPassword,
  type SignInState
} from "@/app/signin/actions";
import { SocialLoginButton } from "@/components/social-login-button";
import { localizedPath, type Locale } from "@/lib/i18n";

const initialState: SignInState = { ok: false, message: "" };

export function SignInForm({
  next,
  googleEnabled,
  kakaoEnabled,
  locale
}: {
  next: string;
  googleEnabled: boolean;
  kakaoEnabled: boolean;
  locale: Locale;
}) {
  const c = locale === "en"
    ? {
        or: "or", email: "Email", password: "Password", signingIn: "Signing in…",
        signIn: "Sign in", forgot: "Forgot your password? →", magic: "Sign in with an email link",
        workEmail: "Work email", sending: "Sending link…", send: "Send sign-in link",
        noAccount: "New to Borderless?", signUp: "Create an account"
      }
    : {
        or: "또는", email: "이메일", password: "비밀번호", signingIn: "로그인 중…",
        signIn: "로그인", forgot: "비밀번호 찾기 →", magic: "비밀번호 없이 이메일 링크로 로그인",
        workEmail: "업무용 이메일", sending: "링크 보내는 중…", send: "로그인 링크 받기",
        noAccount: "계정이 없나요?", signUp: "가입하기"
      };
  const [passwordState, passwordAction, passwordPending] = useActionState(
    signInWithPassword,
    initialState
  );
  const [magicState, magicAction, magicPending] = useActionState(
    requestMagicLink,
    initialState
  );

  return (
    <div className="signin-form">
      {(googleEnabled || kakaoEnabled) && (
        <>
          {kakaoEnabled && <SocialLoginButton provider="kakao" next={next} locale={locale} />}
          {googleEnabled && <SocialLoginButton provider="google" next={next} locale={locale} />}
          <div className="form-divider"><span>{c.or}</span></div>
        </>
      )}
      <form action={passwordAction} className="signin-form">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="locale" value={locale} />
        <label><span>{c.email}</span><input name="email" type="email" autoComplete="email" required /></label>
        <label><span>{c.password}</span><input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="button button--primary button--full" disabled={passwordPending}>
          {passwordPending ? c.signingIn : c.signIn}
        </button>
        {passwordState.message && <p className="field-error" role="status">{passwordState.message}</p>}
        <Link className="text-link" href={localizedPath("/reset-password", locale)}>{c.forgot}</Link>
      </form>
      <details className="magic-link-panel">
        <summary>{c.magic}</summary>
        <form action={magicAction} className="signin-form">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="locale" value={locale} />
          <label><span>{c.workEmail}</span><input name="email" type="email" autoComplete="email" required /></label>
          <button className="button button--ghost button--full" disabled={magicPending}>
            {magicPending ? c.sending : c.send}
          </button>
          {magicState.message && <p className={magicState.ok ? "form-success" : "field-error"} role="status">{magicState.message}</p>}
        </form>
      </details>
      <p className="auth-switch">{c.noAccount} <Link href={`${localizedPath("/signup", locale)}?next=${encodeURIComponent(next)}`}>{c.signUp}</Link></p>
    </div>
  );
}
