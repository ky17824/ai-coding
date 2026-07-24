import type { OrderStatus } from "@/lib/types";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled", "disputed"],
  paid: ["service_started", "refunded", "disputed"],
  service_started: ["completed", "disputed"],
  completed: [],
  cancelled: [],
  refunded: [],
  disputed: ["refunded", "completed"]
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return transitions[from].includes(to);
}

export function calculateSettlement(amountKrw: number) {
  if (!Number.isSafeInteger(amountKrw) || amountKrw <= 0) {
    throw new Error("결제 금액은 0보다 큰 원 단위 정수여야 합니다.");
  }
  const platformFeeKrw = Math.round(amountKrw * 0.15);
  return {
    grossAmountKrw: amountKrw,
    platformFeeKrw,
    providerAmountKrw: amountKrw - platformFeeKrw
  };
}
