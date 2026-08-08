import { describe, expect, it } from "vitest";
import { recommendServices, SAMPLE_SERVICES } from "@/lib/service-data";

describe("service recommendation", () => {
  it("returns only approved services matching deterministic action tags", () => {
    const service = SAMPLE_SERVICES[0];
    const original = service.approved;
    service.approved = false;
    expect(
      recommendServices(SAMPLE_SERVICES, service.tags)
    ).not.toContainEqual(service);
    service.approved = original;
    expect(recommendServices(SAMPLE_SERVICES, ["compliance"])[0]?.id).toBe(
      "svc-compliance"
    );
  });
});
