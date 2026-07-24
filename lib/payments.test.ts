import { describe, expect, it } from "vitest";
import { reconcilePaymentEvent } from "@/lib/payments";

describe("payment reconciliation", () => {
  it("ignores duplicate webhooks without changing order state", () => {
    expect(
      reconcilePaymentEvent({
        duplicate: true,
        orderAmountKrw: 180000,
        paidAmountKrw: 180000,
        currentStatus: "paid",
        paymentStatus: "PAID"
      })
    ).toEqual({ action: "ignore", nextStatus: "paid" });
  });

  it("marks an amount mismatch as a dispute", () => {
    expect(
      reconcilePaymentEvent({
        duplicate: false,
        orderAmountKrw: 180000,
        paidAmountKrw: 1000,
        currentStatus: "pending",
        paymentStatus: "PAID"
      }).nextStatus
    ).toBe("disputed");
  });

  it("cancels settlement eligibility after a verified refund", () => {
    expect(
      reconcilePaymentEvent({
        duplicate: false,
        orderAmountKrw: 180000,
        paidAmountKrw: 180000,
        currentStatus: "paid",
        paymentStatus: "CANCELLED"
      }).nextStatus
    ).toBe("refunded");
  });
});
