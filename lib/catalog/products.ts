import type { CatalogProduct } from "./types";

/**
 * 상품·가격의 단일 출처. 화면·결제·여정·보고서는 모두 여기를 읽는다.
 * 가격을 바꿀 일이 있으면 이 파일만 고친다.
 *
 * 문구는 ./copy.ts, 실행 규칙(문항 매핑·완성 지시)은 ./rules.ts에 있다.
 */
const specialists: CatalogProduct[] = [
  {
    id: "ai-market-intelligence", tier: "A", phase: 1, productKind: "specialist", price: 199000,
    tags: ["market-sizing", "target-market", "competition", "market-validation"], area: "시장·경쟁",
    includedAgentIds: ["ai-market-intelligence"]
  },
  {
    id: "ai-customer-validation", tier: "B", phase: 1, productKind: "specialist", price: 129000,
    tags: ["home-pmf", "market-testing", "customer-validation", "market-validation"], area: "고객 검증",
    includedAgentIds: ["ai-customer-validation"]
  },
  {
    id: "ai-local-bmc", tier: "B", phase: 1, productKind: "specialist", price: 199000,
    tags: ["localization", "local-bmc", "bmlc", "lpa"], area: "현지화",
    includedAgentIds: ["ai-local-bmc"]
  },
  {
    id: "ai-market-entry-requirements", tier: "A", phase: 1, productKind: "specialist", price: 249000,
    tags: ["regulation", "compliance", "certification", "market-entry", "legal"], area: "규제",
    includedAgentIds: ["ai-market-entry-requirements"]
  },
  {
    id: "ai-local-ecosystem", tier: "A", phase: 1, productKind: "specialist", price: 249000,
    tags: ["partner", "local-network", "ecosystem", "distribution"], area: "파트너",
    includedAgentIds: ["ai-local-ecosystem"]
  },
  {
    id: "ai-tce-finance", tier: "B", phase: 1, productKind: "specialist", price: 149000,
    tags: ["resources", "tce", "finance", "resource-allocation", "unit-economics"], area: "자금",
    includedAgentIds: ["ai-tce-finance"]
  },
  {
    id: "ai-gtm-operations", tier: "B", phase: 1, productKind: "specialist", price: 149000,
    tags: ["gtm-plan", "local-plan", "local-team", "global-mindset", "gtm", "leadership", "organization"], area: "실행",
    includedAgentIds: ["ai-gtm-operations"]
  }
];

const specialistById = Object.fromEntries(specialists.map((item) => [item.id, item]));
const packageTags = (includedAgentIds: string[]) => [
  "package",
  ...includedAgentIds.flatMap((id) => specialistById[id].tags)
];

const packages: CatalogProduct[] = [
  {
    id: "ai-market-opportunity", tier: "B", phase: 1, productKind: "package", price: 349000,
    includedAgentIds: ["ai-market-intelligence", "ai-customer-validation"], area: "패키지",
    tags: packageTags(["ai-market-intelligence", "ai-customer-validation"])
  },
  {
    id: "ai-local-entry", tier: "B", phase: 1, productKind: "package", price: 649000,
    includedAgentIds: ["ai-local-bmc", "ai-market-entry-requirements", "ai-local-ecosystem"], area: "패키지",
    tags: packageTags(["ai-local-bmc", "ai-market-entry-requirements", "ai-local-ecosystem"])
  },
  {
    id: "ai-execution-plan", tier: "B", phase: 1, productKind: "package", price: 349000,
    includedAgentIds: ["ai-tce-finance", "ai-gtm-operations"], area: "패키지",
    tags: packageTags(["ai-tce-finance", "ai-gtm-operations"])
  },
  {
    id: "ai-comprehensive-entry", tier: "B", phase: 1, productKind: "package", price: 1190000,
    includedAgentIds: ["ai-market-intelligence", "ai-customer-validation", "ai-local-bmc", "ai-market-entry-requirements", "ai-local-ecosystem", "ai-tce-finance", "ai-gtm-operations"],
    area: "패키지",
    tags: packageTags(["ai-market-intelligence", "ai-customer-validation", "ai-local-bmc", "ai-market-entry-requirements", "ai-local-ecosystem", "ai-tce-finance", "ai-gtm-operations"])
  }
];

export const CATALOG_PRODUCTS: CatalogProduct[] = [...specialists, ...packages];
