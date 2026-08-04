"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { signUpWithPassword, type SignUpState } from "@/app/signup/actions";
import { GoogleButton } from "@/components/google-button";
import { loadPending } from "@/lib/pending-assessment";

const initialState: SignUpState = { ok: false, message: "" };

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signUpWithPassword, initialState);
  const [hasAssessment, setHasAssessment] = useState(false);
  useEffect(() => setHasAssessment(Boolean(loadPending())), []);

  return (
    <div className="signin-form">
      {hasAssessment && (
        <p className="notice-banner" role="status">진단 응답 55개를 이 탭에 보관 중입니다.</p>
      )}
      <GoogleButton next={next} />
      <div className="form-divider"><span>또는</span></div>
      <form action={action} className="signin-form">
        <input type="hidden" name="next" value={next} />
        {[
          ["email", "이메일", "email", "email"],
          ["password", "비밀번호 (10자 이상)", "password", "new-password"],
          ["passwordConfirm", "비밀번호 확인", "password", "new-password"],
          ["displayName", "이름", "text", "name"],
          ["companyName", "회사명", "text", "organization"],
          ["jobTitle", "직위", "text", "organization-title"],
          ["phone", "휴대전화", "tel", "tel"]
        ].map(([name, label, type, autoComplete]) => (
          <label key={name}>
            <span>{label}</span>
            <input name={name} type={type} autoComplete={autoComplete} required />
            {state.fieldErrors?.[name] && <small className="field-error">{state.fieldErrors[name]}</small>}
          </label>
        ))}
        <div className="consent-list">
          <label><input name="agreeTerms" type="checkbox" required /> <span>[필수] <Link href="/legal/terms">이용약관</Link> 동의</span></label>
          <label><input name="agreePrivacy" type="checkbox" required /> <span>[필수] <Link href="/legal/privacy">개인정보 수집·이용</Link> 동의</span></label>
          <label><input name="marketingOptIn" type="checkbox" /> <span>[선택] 마케팅 정보 수신</span></label>
        </div>
        <button className="button button--primary button--full" disabled={pending}>
          {pending ? "가입 처리 중…" : "이메일로 가입하기"}
        </button>
        {state.message && <p className={state.ok ? "form-success" : "field-error"} role="status">{state.message}</p>}
      </form>
    </div>
  );
}
