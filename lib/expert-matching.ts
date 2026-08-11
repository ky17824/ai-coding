const REGULATED_WORK = /legal|law|tax|privacy|regulat|certif|contract|payment|정산|법|세무|인증|규제|개인정보|계약/i;
const FIELD_EXECUTION = /\b(?:poc|proof of concept|paid pilot|pilot|first order)\b|유료\s*(?:poc|실증)|첫\s*주문|현지\s*(?:고객|파트너)|고객\s*검증|파트너\s*(?:발굴|확보)/i;

const TAG_ALIASES: [RegExp, string][] = [
  [/compliance|legal|law|tax|privacy|regulat|certif|contract|payment|법|세무|규제|인증|계약|정산/i, "compliance"],
  [/unit-economics|finance|pricing|cost|재무|가격|비용/i, "unit-economics"],
  [/market-validation|market-testing|customer-validation|시장|고객\s*검증/i, "market-validation"],
  [/leadership|organization|조직|리더십/i, "leadership"],
  [/funding|지원사업|바우처/i, "funding"],
  [/gtm|sales|poc|pilot|order|파트너|주문/i, "gtm"]
];

export type ExpertSupportReason = "regulated" | "field_execution" | "explicit" | null;

export function matchExpertSupport({
  title,
  serviceTag,
  expertRequired = false
}: {
  title: string;
  serviceTag: string;
  expertRequired?: boolean;
}) {
  const text = `${serviceTag} ${title}`;
  const reason: ExpertSupportReason = REGULATED_WORK.test(text)
    ? "regulated"
    : FIELD_EXECUTION.test(text)
      ? "field_execution"
      : expertRequired
        ? "explicit"
        : null;
  const tag = TAG_ALIASES.find(([pattern]) => pattern.test(serviceTag))?.[1]
    || TAG_ALIASES.find(([pattern]) => pattern.test(title))?.[1]
    || serviceTag
    || "gtm";

  return { recommended: expertRequired || reason !== null, reason, tag };
}
