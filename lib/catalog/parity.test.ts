import { describe, expect, it } from "vitest";
import { AI_AGENT_SERVICES, getAiAgentServices } from "@/lib/ai-agent-services";
import { CATALOG_PRODUCTS, getCatalogServices } from "@/lib/catalog";
import type { ServiceOffering } from "@/lib/types";

/**
 * 이관 대조. 값을 동결한 채 카탈로그를 만들었으므로 id·가격·태그·문구·규칙이
 * 기존 정의와 전 항목 동일해야 한다. 값이 바뀌는 것은 다음 커밋이며,
 * 그때 이 테스트를 신규 값 기준으로 교체한다.
 */
describe("catalog parity with the previous definition", () => {
  it("keeps the same ids, prices, tags, and included agents", () => {
    expect(CATALOG_PRODUCTS.map(({ id, price, tags, includedAgentIds }) => ({ id, price, tags, includedAgentIds })))
      .toEqual(AI_AGENT_SERVICES.map(({ id, price, tags, includedAgentIds }) => ({ id, price, tags, includedAgentIds })));
  });

  for (const locale of ["ko", "en"] as const) {
    it(`renders identical ${locale} offerings`, () => {
      const strip = ({ tier, tierLabel, area, ...rest }: ServiceOffering) => rest;
      expect(getCatalogServices(locale).map(strip)).toEqual(getAiAgentServices(locale).map(strip));
    });
  }
});
