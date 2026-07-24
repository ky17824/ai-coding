import { describe, expect, it } from "vitest";
import { calculateSettlement, canTransitionOrder } from "@/lib/orders";

describe("order rules", () => {
  it("calculates a fixed 15% platform fee in whole won", () => {
    expect(calculateSettlement(180000)).toEqual({
      grossAmountKrw: 180000,
      platformFeeKrw: 27000,
      providerAmountKrw: 153000
    });
  });

  it("rejects invalid monetary inputs", () => {
    expect(() => calculateSettlement(-1)).toThrow();
    expect(() => calculateSettlement(1.5)).toThrow();
  });

  it("allows only explicit order state transitions", () => {
    expect(canTransitionOrder("pending", "paid")).toBe(true);
    expect(canTransitionOrder("paid", "service_started")).toBe(true);
    expect(canTransitionOrder("completed", "refunded")).toBe(false);
    expect(canTransitionOrder("pending", "completed")).toBe(false);
  });
});
