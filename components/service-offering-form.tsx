"use client";

import { useActionState, useState } from "react";
import {
  createServiceOffering,
  type ProviderActionState
} from "@/app/provider/actions";
import type { Locale } from "@/lib/i18n";

const initialState: ProviderActionState = { ok: false, message: "" };

export function ServiceOfferingForm({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const [type, setType] = useState<"mentoring" | "consulting">("mentoring");
  const [state, action, pending] = useActionState(
    createServiceOffering,
    initialState
  );

  return (
    <form action={action} className="provider-form panel">
      <input type="hidden" name="locale" value={locale} />
      <h2>{en ? "Create a standardized service" : "표준 서비스 등록"}</h2>
      <label>
        <span>{en ? "Type" : "유형"}</span>
        <select
          name="type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as "mentoring" | "consulting")
          }
        >
          <option value="mentoring">{en ? "1:1 mentoring" : "1:1 멘토링"}</option>
          <option value="consulting">{en ? "Consulting package" : "컨설팅 패키지"}</option>
        </select>
      </label>
      <label>
        <span>{en ? "Service name" : "서비스명"}</span>
        <input name="title" minLength={5} maxLength={140} required />
      </label>
      <label>
        <span>{en ? "Scope and audience" : "범위와 대상"}</span>
        <textarea name="description" rows={5} minLength={30} required />
      </label>
      <label>
        <span>{en ? "Price (KRW)" : "가격"}</span>
        <input name="priceKrw" type="number" min={10000} step={1000} required />
      </label>
      <label>
        <span>{type === "mentoring" ? (en ? "Session length (minutes)" : "진행 시간(분)") : (en ? "Engagement length (days)" : "제공 기간(일)")}</span>
        {type === "mentoring" ? (
          <select name="duration">
            <option value="60">60 {en ? "minutes" : "분"}</option>
            <option value="90">90 {en ? "minutes" : "분"}</option>
          </select>
        ) : (
          <input name="duration" type="number" min={1} max={365} required />
        )}
      </label>
      {type === "mentoring" && (
        <label>
          <span>{en ? "First available appointment" : "첫 예약 가능 일정"}</span>
          <input name="firstSlot" type="datetime-local" required />
        </label>
      )}
      <label>
        <span>{en ? "Deliverables and milestones" : "결과물·단계별 실행목표(Milestone)"}</span>
        <textarea
          name="deliverables"
          rows={5}
          placeholder={en ? "Enter one item per line." : "한 줄에 하나씩 입력하세요."}
          required
        />
      </label>
      <label>
        <span>{en ? "Service tags" : "추천 태그"}</span>
        <input
          name="tags"
          placeholder="market-validation, gtm"
          required
        />
      </label>
      <button
        className="button button--primary"
        type="submit"
        disabled={pending}
      >
        {pending ? (en ? "Publishing…" : "등록 중…") : (en ? "Publish service" : "서비스 등록")}
      </button>
      {state.message && (
        <p className={state.ok ? "form-success" : "field-error"} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
