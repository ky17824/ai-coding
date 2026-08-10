"use client";

import { useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";

interface CheckoutButtonProps {
  serviceId: string;
  title: string;
  amount: number;
  type: "mentoring" | "consulting";
  availableSlots?: { id: string; startsAt: string; endsAt: string }[];
}

export function CheckoutButton({
  serviceId,
  title,
  amount,
  type,
  availableSlots = []
}: CheckoutButtonProps) {
  const [status, setStatus] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slotId, setSlotId] = useState(availableSlots[0]?.id ?? "");

  async function checkout() {
    if (!agreed) {
      setStatus("서비스 범위와 취소·환불 정책에 동의해 주세요.");
      return;
    }
    if (type === "mentoring" && !slotId) {
      setStatus("예약 가능한 멘토링 일정을 선택해 주세요.");
      return;
    }
    setLoading(true);
    setStatus("");

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          serviceId,
          availabilityId: type === "mentoring" ? slotId : null,
          scheduledAt:
            type === "mentoring"
              ? availableSlots.find((slot) => slot.id === slotId)?.startsAt
              : null,
          termsAccepted: true
        })
      });
      const order = (await orderResponse.json()) as {
        orderId?: string;
        paymentId?: string;
        amount?: number;
        message?: string;
        demo?: boolean;
      };
      if (!orderResponse.ok || !order.orderId || !order.paymentId) {
        throw new Error(order.message ?? "주문을 생성하지 못했습니다.");
      }

      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
      if (!storeId || !channelKey || order.demo) {
        setStatus(
          `테스트 주문 ${order.orderId}이 생성되었습니다. PortOne 키를 연결하면 실제 결제창이 열립니다.`
        );
        return;
      }

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId: order.paymentId,
        orderName: title,
        totalAmount: order.amount ?? amount,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
        redirectUrl: `${window.location.origin}/orders/${order.orderId}`,
        customData: { orderId: order.orderId }
      });

      if (!response) {
        setStatus("결제창을 열지 못했습니다.");
      } else if (response.code) {
        setStatus(response.message ?? "결제가 완료되지 않았습니다. 다시 시도해 주세요.");
      } else {
        window.location.href = `/orders/${order.orderId}`;
      }
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "결제를 시작하지 못했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="checkout-box">
      {type === "mentoring" && (
        <label className="slot-field">
          <span>예약 일정</span>
          <select
            value={slotId}
            onChange={(event) => setSlotId(event.target.value)}
          >
            {!availableSlots.length && (
              <option value="">예약 가능한 일정이 없습니다</option>
            )}
            {availableSlots.map((slot) => (
              <option value={slot.id} key={slot.id}>
                {new Intl.DateTimeFormat("ko-KR", {
                  dateStyle: "long",
                  timeStyle: "short"
                }).format(new Date(slot.startsAt))}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="terms-check">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span>
          서비스 범위, 판매자 정보, 서비스 시작 전 전액 환불 정책에
          동의합니다.
        </span>
      </label>
      <button
        type="button"
        className="button button--primary button--full"
        onClick={checkout}
        disabled={loading}
      >
        {loading ? "결제 준비 중…" : "예약 및 결제하기"}
      </button>
      {status && (
        <p className="checkout-status" role="status">
          {status}
        </p>
      )}
      <small>
        Borderless는 통신판매중개자이며, 서비스 제공 당사자는 해당
        전문가입니다. 카드정보는 PortOne·결제대행 서비스(Payment Gateway) 결제창에서 처리됩니다.
      </small>
    </div>
  );
}
