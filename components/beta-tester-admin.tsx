"use client";

import { useActionState } from "react";
import { deleteBetaTester, inviteBetaTester, resetBetaTesterRuns, type BetaTesterActionState } from "@/app/admin/actions";
import type { Locale } from "@/lib/i18n";

const idle: BetaTesterActionState = { ok: true, message: "" };

export type BetaTesterSlotData = {
  email: string;
  createdAt: string;
  maxRuns: number;
  usedRuns: number;
  account: "none" | "active" | "closed";
};

function Status({ state }: { state: BetaTesterActionState }) {
  return state.message ? <p className={`checkout-status${state.ok ? "" : " checkout-status--error"}`} role="status">{state.message}</p> : null;
}

/** 빈 슬롯: 이메일 하나 입력 → 초대. */
export function BetaTesterEmptySlot({ locale, index }: { locale: Locale; index: number }) {
  const en = locale === "en";
  const [state, action, pending] = useActionState(inviteBetaTester, idle);
  return (
    <form action={action} className="beta-slot beta-slot--empty panel">
      <input type="hidden" name="locale" value={locale} />
      <span className="beta-slot__index">{index + 1}</span>
      <label className="beta-slot__field">
        <span className="sr-only">{en ? `Email for slot ${index + 1}` : `${index + 1}번 슬롯 이메일`}</span>
        <input name="email" type="email" required placeholder={en ? "founder@company.com" : "founder@company.com"} />
      </label>
      <button type="submit" className="button button--primary button--small" disabled={pending}>{pending ? (en ? "Inviting…" : "초대 중…") : (en ? "Invite" : "초대")}</button>
      <Status state={state} />
    </form>
  );
}

/** 채워진 슬롯: 상태 + 무료 횟수 리셋 + 삭제. */
export function BetaTesterFilledSlot({ locale, index, tester }: { locale: Locale; index: number; tester: BetaTesterSlotData }) {
  const en = locale === "en";
  const [resetState, resetAction, resetPending] = useActionState(resetBetaTesterRuns, idle);
  const [deleteState, deleteAction, deletePending] = useActionState(deleteBetaTester, idle);
  const exhausted = tester.usedRuns >= tester.maxRuns;
  const accountText = tester.account === "active" ? (en ? "Signed up" : "가입 완료") : tester.account === "closed" ? (en ? "Closed" : "탈퇴") : (en ? "Not signed up yet" : "미가입");
  return (
    <article className="beta-slot panel">
      <span className="beta-slot__index">{index + 1}</span>
      <div className="beta-slot__body">
        <strong>{tester.email}</strong>
        <small>{accountText} · {en ? "Invited" : "초대"} {new Date(tester.createdAt).toLocaleDateString(en ? "en-US" : "ko-KR")}</small>
        <span className={`pill ${exhausted ? "ai-audit--missing" : "ai-audit--confirmed"}`}>{en ? `Used ${tester.usedRuns} / free ${tester.maxRuns}` : `사용 ${tester.usedRuns} / 무료 ${tester.maxRuns}`}{exhausted ? (en ? " · exhausted" : " · 소진") : ""}</span>
      </div>
      <div className="beta-slot__actions">
        <form action={resetAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="email" value={tester.email} />
          <button type="submit" className="button button--ghost button--small" disabled={resetPending}>{en ? "Reset free runs" : "무료 횟수 리셋"}</button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="email" value={tester.email} />
          <button type="submit" className="button button--ghost button--small beta-slot__delete" disabled={deletePending}>{en ? "Delete" : "삭제"}</button>
        </form>
      </div>
      <Status state={resetState.message ? resetState : deleteState} />
    </article>
  );
}
