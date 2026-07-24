import type { OrderStatus } from "@/lib/types";

export function reconcilePaymentEvent(input: {
  duplicate: boolean;
  orderAmountKrw: number;
  paidAmountKrw: number;
  currentStatus: OrderStatus;
  paymentStatus: string;
}): { action: "ignore" | "update"; nextStatus: OrderStatus } {
  if (input.duplicate) {
    return { action: "ignore", nextStatus: input.currentStatus };
  }
  if (input.orderAmountKrw !== input.paidAmountKrw) {
    return { action: "update", nextStatus: "disputed" };
  }
  if (input.paymentStatus === "PAID") {
    return { action: "update", nextStatus: "paid" };
  }
  if (
    input.paymentStatus === "CANCELLED" ||
    input.paymentStatus === "PARTIAL_CANCELLED"
  ) {
    return { action: "update", nextStatus: "refunded" };
  }
  return { action: "ignore", nextStatus: input.currentStatus };
}
