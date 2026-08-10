"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type PasswordState
} from "@/app/reset-password/actions";
import type { Locale } from "@/lib/i18n";

const initialState: PasswordState = { ok: false, message: "" };

function Message({ state }: { state: PasswordState }) {
  return state.message ? <p className={state.ok ? "form-success" : "field-error"} role="status">{state.message}</p> : null;
}

export function ResetRequestForm({ locale }: { locale: Locale }) {
  const c = locale === "en"
    ? { email: "Email", pending: "Sending…", submit: "Send reset email" }
    : { email: "이메일", pending: "전송 중…", submit: "재설정 메일 받기" };
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <form action={action} className="signin-form">
      <input type="hidden" name="locale" value={locale} />
      <label><span>{c.email}</span><input name="email" type="email" autoComplete="email" required /></label>
      <button className="button button--primary button--full" disabled={pending}>{pending ? c.pending : c.submit}</button>
      <Message state={state} />
    </form>
  );
}

export function PasswordUpdateForm({ locale }: { locale: Locale }) {
  const c = locale === "en"
    ? { password: "New password (10+ characters)", confirm: "Confirm new password", pending: "Updating…", submit: "Update password" }
    : { password: "새 비밀번호 (10자 이상)", confirm: "새 비밀번호 확인", pending: "변경 중…", submit: "비밀번호 변경" };
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return (
    <form action={action} className="signin-form">
      <input type="hidden" name="locale" value={locale} />
      <label><span>{c.password}</span><input name="password" type="password" autoComplete="new-password" required /></label>
      <label><span>{c.confirm}</span><input name="passwordConfirm" type="password" autoComplete="new-password" required /></label>
      <button className="button button--primary button--full" disabled={pending}>{pending ? c.pending : c.submit}</button>
      <Message state={state} />
    </form>
  );
}
