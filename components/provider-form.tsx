"use client";

import { useActionState } from "react";
import {
  applyProvider,
  type ProviderActionState
} from "@/app/provider/actions";

const initialState: ProviderActionState = { ok: false, message: "" };

export function ProviderForm() {
  const [state, action, pending] = useActionState(applyProvider, initialState);
  return (
    <form action={action} className="provider-form panel">
      <label>
        <span>전문가 한 줄 소개</span>
        <input name="headline" maxLength={120} required />
      </label>
      <label>
        <span>주요 전문분야</span>
        <input
          name="expertise"
          placeholder="시장 검증, B2B SaaS, 일본 GTM"
          maxLength={500}
          required
        />
        <small>쉼표로 구분해 주세요.</small>
      </label>
      <label>
        <span>경력과 제공 가능한 도움</span>
        <textarea name="biography" rows={7} minLength={50} required />
      </label>
      <label>
        <span>검증 자료</span>
        <textarea
          name="verificationNote"
          rows={4}
          placeholder="확인 가능한 경력, 프로젝트, 공개 프로필 링크를 작성하세요."
          minLength={10}
          required
        />
      </label>
      <button
        className="button button--primary"
        type="submit"
        disabled={pending}
      >
        {pending ? "제출 중…" : "전문가 승인 신청"}
      </button>
      {state.message && (
        <p className={state.ok ? "form-success" : "field-error"} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
