export type Copy = { ko: string; en: string };
export type CopyList = { ko: string[]; en: string[] };

/**
 * 개입 계층. 가격 정책이 갈리는 기준은 "사람이 필요한가"가 아니라
 * "그 사람의 인건비를 우리가 부담하는가"이다.
 * A·B는 고객 자신이 개입하므로 우리 원가가 0이고 할인이 가능하다.
 * C·D·M은 인건비가 원가이므로 할인 대신 제공 시간을 줄인다.
 */
export type Tier = "A" | "B" | "C" | "D" | "M";

/** 1 = 1차 출시(AI 전용), 2 = 2차 개편(전문가 결합). 2는 노출 플래그가 켜져야 판매된다. */
export type Phase = 1 | 2;

export type LaborRole = "customs" | "local" | "gtm" | "mentor";

export interface LaborUnit {
  role: LaborRole;
  hours: number;
}

export interface CatalogProduct {
  id: string;
  tier: Tier;
  phase: Phase;
  productKind: "specialist" | "package";
  /** 공급가(원). 부가세는 별도이며 결제 시점에 더한다. */
  price: number;
  /** 라우팅 키. 진단 액션의 service_tag와 맞물리므로 표시 목적으로 바꾸지 않는다. */
  tags: string[];
  /** 화면 필터용 표시 facet. tags와 달리 자유롭게 바꿔도 라우팅에 영향이 없다. */
  area: string;
  includedAgentIds: string[];
  /** C·D·M 전용. 인건비 구성을 데이터로 들고 있어야 단가 변동 시 가격을 재계산할 수 있다. */
  labor?: LaborUnit[];
  /** 인건비가 아닌 몫(원). 전문가 정산에서 제외된다. */
  aiPortion?: number;
}

/** 전문가 시간당 단가(원). 실제 섭외 계약 전까지는 가정값이다. */
export const LABOR_RATES: Record<LaborRole, number> = {
  customs: 200000,
  local: 200000,
  gtm: 150000,
  mentor: 100000
};

/** 사람 상품의 플랫폼 수수료율. lib/orders.ts의 정률과 같은 값이다. */
export const PLATFORM_FEE_RATE = 0.15;
