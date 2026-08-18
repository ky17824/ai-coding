"use client";

import { useActionState } from "react";
import {
  changePassword,
  deleteAccount,
  updateProfile,
  type AccountState
} from "@/app/account/actions";
import type { Locale } from "@/lib/i18n";

const initialState: AccountState = { ok: false, message: "" };

function Message({ state }: { state: AccountState }) {
  return state.message ? <p className={state.ok ? "form-success" : "field-error"} role="status">{state.message}</p> : null;
}

export function AccountProfileForm({
  profile,
  onboarding = false,
  next = "/dashboard",
  locale
}: {
  profile: { displayName: string; companyName: string; jobTitle: string; maskedPhone: string; marketingOptIn: boolean };
  onboarding?: boolean;
  next?: string;
  locale: Locale;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  const en = locale === "en";
  return (
    <form action={action} className="provider-form panel">
      <input type="hidden" name="locale" value={locale} />
      {onboarding && <><input type="hidden" name="onboarding" value="1" /><input type="hidden" name="next" value={next} /></>}
      <label><span>{en ? "Name" : "이름"}</span><input name="displayName" defaultValue={profile.displayName} required /></label>
      <label><span>{en ? "Company" : "회사명"}</span><input name="companyName" defaultValue={profile.companyName} required /></label>
      <label><span>{en ? "Job title" : "직위"}</span><input name="jobTitle" defaultValue={profile.jobTitle} required /></label>
      <label>
        <span>{en ? "Mobile phone" : "휴대전화"}</span>
        <input name="phone" type="tel" placeholder={en ? "+1 415 555 0123" : "010-1234-5678"} required={onboarding} />
        {!onboarding && <small>{en ? `Enter a new number only to change it. Current number: ${profile.maskedPhone || "Not provided"}` : `변경할 때만 새 번호를 입력하세요. 현재 번호: ${profile.maskedPhone || "미등록"}`}</small>}
      </label>
      <label className="completion-check"><input name="marketingOptIn" type="checkbox" defaultChecked={profile.marketingOptIn} /><span>{en ? "Receive product and marketing emails" : "마케팅·제품 안내 메일 수신"}</span></label>
      {onboarding && (
        <div className="consent-list">
          <label><input name="agreeTerms" type="checkbox" required /><span>{en ? "[Required] I agree to the Terms of Service" : "[필수] 이용약관 동의"}</span></label>
          <label><input name="agreePrivacy" type="checkbox" required /><span>{en ? "[Required] I agree to the collection and use of my personal information" : "[필수] 개인정보 수집·이용 동의"}</span></label>
        </div>
      )}
      <button className="button button--primary" disabled={pending}>{pending ? (en ? "Saving…" : "저장 중…") : onboarding ? (en ? "Save and continue" : "정보 저장하고 계속") : (en ? "Save profile" : "프로필 저장")}</button>
      <Message state={state} />
    </form>
  );
}

export function PasswordForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(changePassword, initialState);
  const en = locale === "en";
  return (
    <form action={action} className="provider-form panel">
      <input type="hidden" name="locale" value={locale} />
      <h2>{en ? "Password" : "비밀번호"}</h2>
      <label><span>{en ? "New password (at least 10 characters)" : "새 비밀번호 (10자 이상)"}</span><input name="password" type="password" autoComplete="new-password" required /></label>
      <label><span>{en ? "Confirm new password" : "새 비밀번호 확인"}</span><input name="passwordConfirm" type="password" autoComplete="new-password" required /></label>
      <button className="button button--ghost" disabled={pending}>{pending ? (en ? "Updating…" : "변경 중…") : (en ? "Change password" : "비밀번호 변경")}</button>
      <Message state={state} />
    </form>
  );
}

export function AccountDangerZone({ email, locale }: { email: string; locale: Locale }) {
  const [state, action, pending] = useActionState(deleteAccount, initialState);
  const en = locale === "en";
  return (
    <form action={action} className="provider-form panel danger-zone">
      <input type="hidden" name="locale" value={locale} />
      <h2>{en ? "Close account" : "계정 탈퇴"}</h2>
      <p>{en ? "Your personal information will be anonymized and you will no longer be able to sign in. Order and settlement records will be retained when required by law." : "개인정보는 익명화되고 로그인할 수 없게 됩니다. 주문·정산 기록은 법정 보존 목적으로 남습니다."}</p>
      <label><span>{en ? `Enter ${email} to confirm` : `확인을 위해 ${email} 입력`}</span><input name="email" type="email" autoComplete="off" required /></label>
      <button className="button button--ghost" disabled={pending}>{pending ? (en ? "Closing…" : "처리 중…") : (en ? "Close account" : "계정 탈퇴")}</button>
      <Message state={state} />
    </form>
  );
}
