"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

export function OrderActions({
  orderId,
  refundable,
  reviewOnly = false,
  locale
}: {
  orderId: string;
  refundable: boolean;
  reviewOnly?: boolean;
  locale: Locale;
}) {
  const en = locale === "en";
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function refund() {
    setLoading(true);
    const response = await fetch(`/api/orders/${orderId}/refund`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale })
    });
    const result = (await response.json()) as { message?: string; status?: string };
    setMessage(
      result.message ??
        (result.status === "refunded" || result.status === "cancelled"
          ? en ? "Your cancellation or refund request has been received." : "취소·환불 요청을 접수했습니다."
          : en ? "Your request has been received." : "요청을 접수했습니다.")
    );
    setLoading(false);
  }

  return (
    <div className="order-actions">
      {refundable && (
        <button
          type="button"
          className="button button--ghost"
          onClick={refund}
          disabled={loading}
        >
          {loading ? (en ? "Processing…" : "처리 중…") : reviewOnly ? (en ? "Request refund review" : "환불 검토 요청") : (en ? "Request cancellation or refund" : "취소·환불 요청")}
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
