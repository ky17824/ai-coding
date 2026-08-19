"use client";

import { useActionState } from "react";
import { addBetaTesters, setBetaTesterRevoked, type BetaTesterActionState } from "@/app/admin/actions";
import type { Locale } from "@/lib/i18n";

const idle: BetaTesterActionState = { ok: true, message: "" };

/** 이메일 등록 폼. 줄마다 이메일 하나. */
export function BetaTesterInviteForm({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const [state, action, pending] = useActionState(addBetaTesters, idle);
  return (
    <form action={action} className="beta-tester-form panel">
      <input type="hidden" name="locale" value={locale} />
      <label className="ai-intake-field ai-intake-field--wide">
        <span>{en ? "Emails to invite" : "초대할 이메일"}</span>
        <small>{en ? "One per line. They sign up or sign in with this exact email." : "줄마다 하나씩. 테스터는 이 이메일 그대로 가입 또는 로그인해야 합니다."}</small>
        <textarea name="emails" required rows={5} placeholder={"founder@company.com\nceo@startup.co.kr"} />
      </label>
      <div className="beta-tester-form__row">
        <label className="ai-intake-field"><span>{en ? "Free runs each" : "1인 무료 횟수"}</span><input name="maxRuns" type="number" min={0} max={100} defaultValue={3} /></label>
        <label className="ai-intake-field"><span>{en ? "Note (optional)" : "메모(선택)"}</span><input name="note" maxLength={200} placeholder={en ? "e.g. Aug cohort" : "예: 8월 1차 초대"} /></label>
      </div>
      <button type="submit" className="button button--primary" disabled={pending}>{pending ? (en ? "Saving…" : "저장 중…") : (en ? "Register testers" : "테스터 등록")}</button>
      {state.message && <p className={`checkout-status${state.ok ? "" : " checkout-status--error"}`} role="status">{state.message}</p>}
    </form>
  );
}

/** 목록의 해제/복구 버튼. */
export function BetaTesterRevokeButton({ locale, email, revoked }: { locale: Locale; email: string; revoked: boolean }) {
  const en = locale === "en";
  const [state, action, pending] = useActionState(setBetaTesterRevoked, idle);
  return (
    <form action={action} className="beta-tester-revoke">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="revoke" value={revoked ? "false" : "true"} />
      <button type="submit" className="button button--ghost button--small" disabled={pending}>{revoked ? (en ? "Restore" : "복구") : (en ? "Revoke" : "해제")}</button>
      {!state.ok && state.message && <small role="alert">{state.message}</small>}
    </form>
  );
}
