"use client";

import { useActionState, useState } from "react";
import {
  changeUserRole,
  type AdminRoleActionState
} from "@/app/admin/actions";
import type { AdminAccountPurpose, AdminUserRole } from "@/lib/admin-users";
import type { Locale } from "@/lib/i18n";

const initialState: AdminRoleActionState = { ok: false, message: "" };

export function AdminRoleForm({
  locale,
  targetUserId,
  currentRole,
  currentPurpose,
  canDemote,
  disabledReason
}: {
  locale: Locale;
  targetUserId: string;
  currentRole: AdminUserRole;
  currentPurpose: AdminAccountPurpose;
  canDemote: boolean;
  disabledReason?: string;
}) {
  const en = locale === "en";
  const [role, setRole] = useState<AdminUserRole>(currentRole);
  const [purpose, setPurpose] = useState<AdminAccountPurpose>(currentPurpose);
  const [state, action, pending] = useActionState(changeUserRole, initialState);
  const unchanged = role === currentRole && (role !== "admin" || purpose === currentPurpose);
  const disabled = Boolean(disabledReason) || pending || unchanged;
  // 버튼이 왜 눌리지 않는지 화면에 남긴다. disabledReason과 pending은 각각 배너와 버튼 문구가
  // 알려주지만, unchanged는 아무 단서가 없어 죽은 버튼으로만 보였다.
  const blockedHint = disabledReason || pending || !unchanged
    ? null
    : role === "admin" && currentRole === "admin"
      ? en ? "Pick a different administrator purpose to enable this." : "관리자 용도를 다른 값으로 바꾸면 버튼이 활성화됩니다."
      : en ? "Pick a different role to enable this." : "새 역할을 다른 값으로 바꾸면 버튼이 활성화됩니다.";

  return (
    <form action={action} className="provider-form admin-role-form">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <label>
        <span>{en ? "New role" : "새 역할"}</span>
        <select name="role" value={role} onChange={(event) => setRole(event.target.value as AdminUserRole)} disabled={Boolean(disabledReason) || pending}>
          <option value="startup" disabled={currentRole === "admin" && !canDemote}>{en ? "Founder" : "창업자"}</option>
          <option value="provider" disabled={currentRole === "admin" && !canDemote}>{en ? "Expert" : "전문가"}</option>
          <option value="admin">{en ? "Administrator" : "관리자"}</option>
        </select>
      </label>
      {role === "admin" ? (
        <label>
          <span>{en ? "Administrator purpose" : "관리자 계정 용도"}</span>
          <select name="adminPurpose" value={purpose ?? ""} onChange={(event) => setPurpose(event.target.value as Exclude<AdminAccountPurpose, null>)} required disabled={Boolean(disabledReason) || pending}>
            <option value="" disabled>{en ? "Select a purpose" : "용도를 선택해 주세요"}</option>
            <option value="primary">{en ? "Primary administrator" : "주 관리자"}</option>
            <option value="recovery">{en ? "Recovery administrator" : "복구 관리자"}</option>
          </select>
        </label>
      ) : <input type="hidden" name="adminPurpose" value="" />}
      <label>
        <span>{en ? "Reason for change" : "변경 사유"}</span>
        <textarea name="reason" minLength={10} maxLength={500} rows={4} required disabled={Boolean(disabledReason) || pending} />
        <small>{en ? "This reason is retained in the immutable audit history." : "변경 사유는 수정할 수 없는 감사 이력에 보관됩니다."}</small>
      </label>
      <label className="admin-role-confirmation">
        <input type="checkbox" name="confirmed" required disabled={Boolean(disabledReason) || pending} />
        <span>{en ? "I understand that this change affects platform access." : "이 변경이 플랫폼 접근 권한에 영향을 준다는 것을 확인했습니다."}</span>
      </label>
      {disabledReason && <p className="notice-banner notice-banner--error" role="alert">{disabledReason}</p>}
      {!disabledReason && currentRole === "admin" && !canDemote && <p className="notice-banner" role="status">{en ? "This is the last active administrator. Assign another administrator before changing this account to a different role." : "마지막 활성 관리자 계정입니다. 다른 관리자를 먼저 지정한 뒤 역할을 변경할 수 있습니다."}</p>}
      <button className="button button--primary" type="submit" disabled={disabled}>
        {pending ? (en ? "Changing…" : "변경 중…") : (en ? "Change access" : "권한 변경")}
      </button>
      {blockedHint && <small className="admin-role-form__hint" role="status">{blockedHint}</small>}
      {state.message && <p className={state.ok ? "form-success" : "field-error"} role="status">{state.message}</p>}
    </form>
  );
}
