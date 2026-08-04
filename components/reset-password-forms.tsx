"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type PasswordState
} from "@/app/reset-password/actions";

const initialState: PasswordState = { ok: false, message: "" };

function Message({ state }: { state: PasswordState }) {
  return state.message ? <p className={state.ok ? "form-success" : "field-error"} role="status">{state.message}</p> : null;
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="signin-form">
      <label><span>이메일</span><input name="email" type="email" autoComplete="email" required /></label>
      <button className="button button--primary button--full" disabled={pending}>{pending ? "전송 중…" : "재설정 메일 받기"}</button>
      <Message state={state} />
    </form>
  );
}

export function PasswordUpdateForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="signin-form">
      <label><span>새 비밀번호 (10자 이상)</span><input name="password" type="password" autoComplete="new-password" required /></label>
      <label><span>새 비밀번호 확인</span><input name="passwordConfirm" type="password" autoComplete="new-password" required /></label>
      <button className="button button--primary button--full" disabled={pending}>{pending ? "변경 중…" : "비밀번호 변경"}</button>
      <Message state={state} />
    </form>
  );
}
