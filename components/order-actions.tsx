"use client";

import { useState } from "react";

export function OrderActions({
  orderId,
  refundable
}: {
  orderId: string;
  refundable: boolean;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function refund() {
    setLoading(true);
    const response = await fetch(`/api/orders/${orderId}/refund`, {
      method: "POST"
    });
    const result = (await response.json()) as { message?: string; status?: string };
    setMessage(
      result.message ??
        (result.status === "refunded" || result.status === "cancelled"
          ? "취소·환불 요청이 완료되었습니다."
          : "요청을 접수했습니다.")
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
          {loading ? "처리 중…" : "취소·환불 요청"}
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
