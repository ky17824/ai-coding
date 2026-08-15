"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { signUpWithPassword, type SignUpState } from "@/app/signup/actions";
import { SocialLoginButton } from "@/components/social-login-button";
import { getPendingAnswerCount } from "@/lib/pending-assessment";
import { localizedPath, type Locale } from "@/lib/i18n";

const initialState: SignUpState = { ok: false, message: "" };

export function SignupForm({
  next,
  googleEnabled,
  kakaoEnabled,
  locale
}: {
  next: string;
  googleEnabled: boolean;
  kakaoEnabled: boolean;
  locale: Locale;
}) {
  const c = locale === "en"
    ? {
        saved: (count: number) => `${count} assessment answers are saved in this tab.`,
        or: "or",
        fields: [
          ["email", "Email", "email", "email"],
          ["password", "Password (10+ characters)", "password", "new-password"],
          ["passwordConfirm", "Confirm password", "password", "new-password"],
          ["displayName", "Name", "text", "name"],
          ["companyName", "Company", "text", "organization"],
          ["jobTitle", "Job title", "text", "organization-title"],
          ["phone", "Mobile phone", "tel", "tel"]
        ],
        required: "Required", optional: "Optional", terms: "Terms of Service", privacy: "Privacy consent",
        marketing: "Receive product and marketing updates", pending: "Creating account…", submit: "Create account with email"
      }
    : {
        saved: (count: number) => `이 탭에 진단 응답 ${count}개를 보관하고 있습니다.`,
        or: "또는",
        fields: [
          ["email", "이메일", "email", "email"],
          ["password", "비밀번호 (10자 이상)", "password", "new-password"],
          ["passwordConfirm", "비밀번호 확인", "password", "new-password"],
          ["displayName", "이름", "text", "name"],
          ["companyName", "회사명", "text", "organization"],
          ["jobTitle", "직위", "text", "organization-title"],
          ["phone", "휴대전화", "tel", "tel"]
        ],
        required: "필수", optional: "선택", terms: "이용약관", privacy: "개인정보 수집·이용",
        marketing: "마케팅 정보 수신", pending: "가입 처리 중…", submit: "이메일로 가입하기"
      };
  const [state, action, pending] = useActionState(signUpWithPassword, initialState);
  const [assessmentAnswerCount, setAssessmentAnswerCount] = useState(0);
  useEffect(() => setAssessmentAnswerCount(getPendingAnswerCount()), []);

  return (
    <div className="signin-form">
      {assessmentAnswerCount > 0 && (
        <p className="notice-banner" role="status">
          {c.saved(assessmentAnswerCount)}
        </p>
      )}
      {(googleEnabled || kakaoEnabled) && (
        <>
          {kakaoEnabled && <SocialLoginButton provider="kakao" next={next} locale={locale} />}
          {googleEnabled && <SocialLoginButton provider="google" next={next} locale={locale} />}
          <div className="form-divider"><span>{c.or}</span></div>
        </>
      )}
      <form action={action} className="signin-form">
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="locale" value={locale} />
        {c.fields.map(([name, label, type, autoComplete]) => (
          <label key={name}>
            <span>{label}</span>
            <input name={name} type={type} autoComplete={autoComplete} required />
            {state.fieldErrors?.[name] && <small className="field-error">{state.fieldErrors[name]}</small>}
          </label>
        ))}
        <div className="consent-list">
          <label><input name="agreeTerms" type="checkbox" required /> <span>[{c.required}] <Link href={localizedPath("/legal/terms", locale)}>{c.terms}</Link></span></label>
          <label><input name="agreePrivacy" type="checkbox" required /> <span>[{c.required}] <Link href={localizedPath("/legal/privacy", locale)}>{c.privacy}</Link></span></label>
          <label><input name="marketingOptIn" type="checkbox" /> <span>[{c.optional}] {c.marketing}</span></label>
        </div>
        <button className="button button--primary button--full" disabled={pending}>
          {pending ? c.pending : c.submit}
        </button>
        {state.message && <p className={state.ok ? "form-success" : "field-error"} role="status">{state.message}</p>}
      </form>
    </div>
  );
}
