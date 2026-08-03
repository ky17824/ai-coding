"use client";

import { useActionState } from "react";
import {
  changePassword,
  deleteAccount,
  updateProfile,
  type AccountState
} from "@/app/account/actions";

const initialState: AccountState = { ok: false, message: "" };

function Message({ state }: { state: AccountState }) {
  return state.message ? <p className={state.ok ? "form-success" : "field-error"} role="status">{state.message}</p> : null;
}

export function AccountProfileForm({
  profile,
  onboarding = false,
  next = "/dashboard"
}: {
  profile: { displayName: string; companyName: string; jobTitle: string; maskedPhone: string; marketingOptIn: boolean };
  onboarding?: boolean;
  next?: string;
}) {
  const [state, action, pending] = useActionState(updateProfile, initialState);
  return (
    <form action={action} className="provider-form panel">
      {onboarding && <><input type="hidden" name="onboarding" value="1" /><input type="hidden" name="next" value={next} /></>}
      <label><span>이름</span><input name="displayName" defaultValue={profile.displayName} required /></label>
      <label><span>회사명</span><input name="companyName" defaultValue={profile.companyName} required /></label>
      <label><span>직위</span><input name="jobTitle" defaultValue={profile.jobTitle} required /></label>
      <label>
        <span>휴대전화</span>
        <input name="phone" type="tel" placeholder={profile.maskedPhone || "010-1234-5678"} required={onboarding} />
        {!onboarding && <small>변경할 때만 새 번호를 입력하세요. 현재 번호: {profile.maskedPhone || "미등록"}</small>}
      </label>
      <label className="completion-check"><input name="marketingOptIn" type="checkbox" defaultChecked={profile.marketingOptIn} /><span>마케팅·제품 안내 메일 수신</span></label>
      {onboarding && (
        <div className="consent-list">
          <label><input name="agreeTerms" type="checkbox" required /><span>[필수] 이용약관 동의</span></label>
          <label><input name="agreePrivacy" type="checkbox" required /><span>[필수] 개인정보 수집·이용 동의</span></label>
        </div>
      )}
      <button className="button button--primary" disabled={pending}>{pending ? "저장 중…" : onboarding ? "정보 저장하고 계속" : "프로필 저장"}</button>
      <Message state={state} />
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialState);
  return (
    <form action={action} className="provider-form panel">
      <h2>비밀번호</h2>
      <label><span>새 비밀번호 (10자 이상)</span><input name="password" type="password" autoComplete="new-password" required /></label>
      <label><span>새 비밀번호 확인</span><input name="passwordConfirm" type="password" autoComplete="new-password" required /></label>
      <button className="button button--ghost" disabled={pending}>{pending ? "변경 중…" : "비밀번호 변경"}</button>
      <Message state={state} />
    </form>
  );
}

export function AccountDangerZone({ email }: { email: string }) {
  const [state, action, pending] = useActionState(deleteAccount, initialState);
  return (
    <form action={action} className="provider-form panel danger-zone">
      <h2>계정 탈퇴</h2>
      <p>개인정보는 익명화되고 로그인할 수 없게 됩니다. 주문·정산 기록은 법정 보존 목적으로 남습니다.</p>
      <label><span>확인을 위해 {email} 입력</span><input name="email" type="email" autoComplete="off" required /></label>
      <button className="button button--ghost" disabled={pending}>{pending ? "처리 중…" : "계정 탈퇴"}</button>
      <Message state={state} />
    </form>
  );
}
