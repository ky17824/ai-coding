import type { CatalogProduct } from "./types";

/**
 * 상품·가격의 단일 출처. 화면·결제·여정·보고서는 모두 여기를 읽는다.
 * 가격을 바꿀 일이 있으면 이 파일만 고친다.
 *
 * 문구는 ./copy.ts, 실행 규칙(문항 매핑·완성 지시)은 ./rules.ts에 있다.
 *
 * 가격 정책 (docs/plans/2026-08-16-상품-2단계-개편-마스터플랜.md)
 * - A·B(AI 전용): 낱개 50,000원 균일. 인트로 유입 가격이며 정액 원가로 인해 이보다 낮출 수 없다.
 * - C·D·M(전문가 결합): 인건비가 원가이므로 할인하지 않는다. 가격 = AI 몫 + 인건비 ÷ 0.85.
 */
const INTRO_PRICE = 50000;

const specialists: CatalogProduct[] = [
  {
    id: "ai-market-intelligence", tier: "A", phase: 1, productKind: "specialist", price: INTRO_PRICE,
    tags: ["market-sizing", "target-market", "competition", "market-validation"], area: "시장·경쟁",
    includedAgentIds: ["ai-market-intelligence"]
  },
  {
    id: "ai-entry-requirements", tier: "A", phase: 1, productKind: "specialist", price: INTRO_PRICE,
    tags: ["regulation", "compliance", "certification", "market-entry", "legal"], area: "규제",
    includedAgentIds: ["ai-entry-requirements"]
  },
  {
    id: "ai-partner-research", tier: "A", phase: 1, productKind: "specialist", price: INTRO_PRICE,
    tags: ["partner", "local-network", "ecosystem", "distribution"], area: "파트너",
    includedAgentIds: ["ai-partner-research"]
  },
  {
    id: "ai-customer-validation", tier: "B", phase: 1, productKind: "specialist", price: INTRO_PRICE,
    tags: ["home-pmf", "market-testing", "customer-validation", "market-validation"], area: "고객 검증",
    includedAgentIds: ["ai-customer-validation"]
  },
  {
    id: "ai-local-bmc", tier: "B", phase: 1, productKind: "specialist", price: INTRO_PRICE,
    tags: ["localization", "local-bmc", "bmlc", "lpa"], area: "현지화",
    includedAgentIds: ["ai-local-bmc"]
  },
  {
    id: "ai-tce-finance", tier: "B", phase: 1, productKind: "specialist", price: INTRO_PRICE,
    tags: ["resources", "tce", "finance", "resource-allocation", "unit-economics"], area: "자금",
    includedAgentIds: ["ai-tce-finance"]
  },
  {
    id: "ai-gtm-operations", tier: "B", phase: 1, productKind: "specialist", price: INTRO_PRICE,
    tags: ["gtm-plan", "local-plan", "local-team", "global-mindset", "gtm", "leadership", "organization"], area: "실행",
    includedAgentIds: ["ai-gtm-operations"]
  }
];

const specialistById = Object.fromEntries(specialists.map((item) => [item.id, item]));
const packageTags = (includedAgentIds: string[]) => [
  "package",
  ...includedAgentIds.flatMap((id) => specialistById[id].tags)
];

const feasibilityAgents = ["ai-market-intelligence", "ai-entry-requirements", "ai-partner-research"];
const entryDesignAgents = [...feasibilityAgents, "ai-customer-validation", "ai-local-bmc", "ai-tce-finance", "ai-gtm-operations"];

const packages: CatalogProduct[] = [
  {
    id: "pkg-feasibility", tier: "A", phase: 1, productKind: "package", price: 119000,
    includedAgentIds: feasibilityAgents, area: "패키지", tags: packageTags(feasibilityAgents)
  },
  {
    id: "pkg-entry-design", tier: "B", phase: 1, productKind: "package", price: 249000,
    includedAgentIds: entryDesignAgents, area: "패키지", tags: packageTags(entryDesignAgents)
  }
];

/**
 * 2차 개편 상품. 전문가 공급이 확보되기 전에는 노출되지 않는다
 * (`humanExpertProductsEnabled()`가 꺼져 있으면 목록·상세·결제 어디에서도 도달 불가).
 * 인건비는 묶어도 줄지 않으므로 이 계층에는 패키지를 두지 않는다.
 */
const expertProducts: CatalogProduct[] = [
  {
    id: "hx-classification", tier: "C", phase: 2, productKind: "specialist", price: 410000,
    tags: ["regulation", "compliance", "certification", "legal"], area: "규제",
    includedAgentIds: ["ai-entry-requirements"], labor: [{ role: "customs", hours: 1.5 }], aiPortion: INTRO_PRICE
  },
  {
    id: "hx-classification-plus", tier: "C", phase: 2, productKind: "specialist", price: 760000,
    tags: ["regulation", "compliance", "certification", "legal"], area: "규제",
    includedAgentIds: ["ai-entry-requirements"], labor: [{ role: "customs", hours: 3 }], aiPortion: INTRO_PRICE
  },
  {
    id: "hx-gtm-review", tier: "C", phase: 2, productKind: "specialist", price: 410000,
    tags: ["gtm-plan", "gtm", "local-plan"], area: "실행",
    includedAgentIds: ["ai-gtm-operations"], labor: [{ role: "gtm", hours: 2 }], aiPortion: INTRO_PRICE
  },
  {
    id: "hx-partner-verify", tier: "D", phase: 2, productKind: "specialist", price: 480000,
    tags: ["partner", "local-network", "ecosystem"], area: "파트너",
    includedAgentIds: [], labor: [{ role: "local", hours: 2 }]
  },
  {
    id: "hx-partner-intro", tier: "D", phase: 2, productKind: "specialist", price: 950000,
    tags: ["partner", "local-network", "distribution"], area: "파트너",
    includedAgentIds: [], labor: [{ role: "local", hours: 4 }]
  },
  {
    id: "hx-interview", tier: "D", phase: 2, productKind: "specialist", price: 710000,
    tags: ["customer-validation", "market-testing"], area: "고객 검증",
    includedAgentIds: [], labor: [{ role: "local", hours: 3 }]
  },
  {
    id: "hx-mentor-1h", tier: "M", phase: 2, productKind: "specialist", price: 120000,
    tags: ["gtm", "leadership", "organization"], area: "실행",
    includedAgentIds: [], labor: [{ role: "mentor", hours: 1 }]
  },
  {
    id: "hx-mentor-2h", tier: "M", phase: 2, productKind: "specialist", price: 240000,
    tags: ["gtm", "leadership", "organization"], area: "실행",
    includedAgentIds: [], labor: [{ role: "mentor", hours: 2 }]
  }
];

export const CATALOG_PRODUCTS: CatalogProduct[] = [...specialists, ...packages, ...expertProducts];

/**
 * 지금 판매 중인 상품. 여기 없는 1차 상품은 목록·상세에 "8월 말 출시 예정"으로 회색 표시되고
 * 유료 주문이 막힌다(관리자 베타 테스트는 계속 가능). 출시할 때 id를 한 줄 추가한다.
 * 2026-08-18: 심층 시장 조사만 프론티어 모델(Fable 5) 실행이 검증돼 먼저 연다.
 */
export const LAUNCHED_PRODUCT_IDS = new Set(["ai-market-intelligence"]);

/** 화면 필터에 쓰는 준비도 영역. 순서가 곧 노출 순서다. */
export const CATALOG_AREAS = ["시장·경쟁", "고객 검증", "현지화", "규제", "파트너", "자금", "실행"];
