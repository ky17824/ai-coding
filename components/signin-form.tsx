"use client";

import { useActionState } from "react";
import { requestMagicLink, type SignInState } from "@/app/signin/actions";

const initialState: SignInState = { ok: false, message: "" };

export function SignInForm() {
  const [state, action, pending] = useActionState(
    requestMagicLink,
    initialState
  );

  return (
    <form action={action} className="signin-form">
      <label>
        <span>업무용 이메일</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="founder@company.com"
          required
        />
      </label>
      <button
        className="button button--primary button--full"
        type="submit"
        disabled={pending}
      >
        {pending ? "링크 보내는 중…" : "이메일로 로그인"}
      </button>
      {state.message && (
        <p className={state.ok ? "form-success" : "field-error"} role="status">
          {state.message}
        </p>
      )}
      <small>
        로그인 링크를 요청하면 개인정보처리방침과 비공개 베타 이용약관에
        동의한 것으로 간주합니다.
      </small>
    </form>
  );
}
