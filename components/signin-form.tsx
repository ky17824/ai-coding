"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  requestMagicLink,
  signInWithPassword,
  type SignInState
} from "@/app/signin/actions";
import { GoogleButton } from "@/components/google-button";

const initialState: SignInState = { ok: false, message: "" };

export function SignInForm({ next }: { next: string }) {
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
      <GoogleButton next={next} />
      <div className="form-divider"><span>또는</span></div>
      <form action={passwordAction} className="signin-form">
        <input type="hidden" name="next" value={next} />
        <label><span>이메일</span><input name="email" type="email" autoComplete="email" required /></label>
        <label><span>비밀번호</span><input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="button button--primary button--full" disabled={passwordPending}>
          {passwordPending ? "로그인 중…" : "로그인"}
        </button>
        {passwordState.message && <p className="field-error" role="status">{passwordState.message}</p>}
        <Link className="text-link" href="/reset-password">비밀번호 찾기 →</Link>
      </form>
      <details className="magic-link-panel">
        <summary>비밀번호 없이 이메일 링크로 로그인</summary>
        <form action={magicAction} className="signin-form">
          <input type="hidden" name="next" value={next} />
          <label><span>업무용 이메일</span><input name="email" type="email" autoComplete="email" required /></label>
          <button className="button button--ghost button--full" disabled={magicPending}>
            {magicPending ? "링크 보내는 중…" : "로그인 링크 받기"}
          </button>
          {magicState.message && <p className={magicState.ok ? "form-success" : "field-error"} role="status">{magicState.message}</p>}
        </form>
      </details>
      <p className="auth-switch">계정이 없나요? <Link href={`/signup?next=${encodeURIComponent(next)}`}>가입하기</Link></p>
    </div>
  );
}
