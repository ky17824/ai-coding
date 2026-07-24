"use client";

import { useActionState, useState } from "react";
import {
  createServiceOffering,
  type ProviderActionState
} from "@/app/provider/actions";

const initialState: ProviderActionState = { ok: false, message: "" };

export function ServiceOfferingForm() {
  const [type, setType] = useState<"mentoring" | "consulting">("mentoring");
  const [state, action, pending] = useActionState(
    createServiceOffering,
    initialState
  );

  return (
    <form action={action} className="provider-form panel">
      <h2>표준 서비스 등록</h2>
      <label>
        <span>유형</span>
        <select
          name="type"
          value={type}
          onChange={(event) =>
            setType(event.target.value as "mentoring" | "consulting")
          }
        >
          <option value="mentoring">1:1 멘토링</option>
          <option value="consulting">컨설팅 패키지</option>
        </select>
      </label>
      <label>
        <span>서비스명</span>
        <input name="title" minLength={5} maxLength={140} required />
      </label>
      <label>
        <span>범위와 대상</span>
        <textarea name="description" rows={5} minLength={30} required />
      </label>
      <label>
        <span>가격</span>
        <input name="priceKrw" type="number" min={10000} step={1000} required />
      </label>
      <label>
        <span>{type === "mentoring" ? "진행 시간(분)" : "제공 기간(일)"}</span>
        {type === "mentoring" ? (
          <select name="duration">
            <option value="60">60분</option>
            <option value="90">90분</option>
          </select>
        ) : (
          <input name="duration" type="number" min={1} max={365} required />
        )}
      </label>
      {type === "mentoring" && (
        <label>
          <span>첫 예약 가능 일정</span>
          <input name="firstSlot" type="datetime-local" required />
        </label>
      )}
      <label>
        <span>결과물·마일스톤</span>
        <textarea
          name="deliverables"
          rows={5}
          placeholder="한 줄에 하나씩 입력하세요."
          required
        />
      </label>
      <label>
        <span>추천 태그</span>
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
        {pending ? "등록 중…" : "서비스 등록"}
      </button>
      {state.message && (
        <p className={state.ok ? "form-success" : "field-error"} role="status">
          {state.message}
        </p>
      )}
    </form>
  );
}
