export function canonicalResearchUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, "");
}

/**
 * 값이 객체가 아니라 URL 문자열 자체인 인용 자리.
 *
 * aiPublicResearchSchema.findings[].sourceUrls와 aiAgentReportSchema.findings[].sourceUrls는
 * 문자열 배열이다. 예전 구현은 `url` 키를 가진 객체만 모았기 때문에 이 배열을 통째로
 * 놓쳤고, 결과적으로 각 발견 항목에 붙는 출처는 검증 대상이 아니었다.
 */
const URL_STRING_ARRAY_KEYS = new Set(["sourceUrls"]);

export function collectCitedUrls(value: unknown, result = new Set<string>(), parentKey?: string): Set<string> {
  // 배열 안으로 들어가도 부모 키를 유지한다. sourceUrls의 항목인지 알아야 하기 때문이다.
  if (Array.isArray(value)) value.forEach((entry) => collectCitedUrls(entry, result, parentKey));
  else if (typeof value === "string") {
    if (parentKey && URL_STRING_ARRAY_KEYS.has(parentKey) && /^https?:\/\//i.test(value)) result.add(canonicalResearchUrl(value));
  }
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => {
    if (key === "url" && typeof entry === "string" && /^https?:\/\//i.test(entry)) result.add(canonicalResearchUrl(entry));
    else collectCitedUrls(entry, result, key);
  });
  return result;
}

export function collectAllowedResearchUrls(outputs: unknown[], approvedSources: unknown[]) {
  const result = new Set<string>();
  const add = (url: unknown) => { if (typeof url === "string" && /^https?:\/\//i.test(url)) result.add(canonicalResearchUrl(url)); };
  for (const output of outputs) {
    if (!Array.isArray(output)) continue;
    for (const item of output) {
      if (!item || typeof item !== "object") continue;
      const type = (item as { type?: string }).type;
      if (type === "web_search_call") {
        // search → action.sources; open_page / find → action.url. All are URLs the tool actually returned.
        const action = (item as { action?: { url?: string; sources?: { url?: string }[] } }).action;
        add(action?.url);
        for (const source of action?.sources ?? []) add(source.url);
      } else if (type === "message") {
        // url_citation annotations are pages the model actually read.
        for (const content of (item as { content?: { annotations?: { url?: string }[] }[] }).content ?? []) {
          for (const annotation of content.annotations ?? []) add(annotation.url);
        }
      }
    }
  }
  for (const source of approvedSources) {
    const url = source && typeof source === "object" ? (source as { source_url?: unknown }).source_url : null;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) result.add(canonicalResearchUrl(url));
  }
  return result;
}

export function researchQuotaDecision(
  count: number,
  methodologyVersion: unknown,
  attemptedAt: unknown,
  sizingMethodologyVersion: unknown,
  sizingAttemptedAt: unknown
) {
  if (count < 3) return "reserve" as const;
  if (!attemptedAt && methodologyVersion !== "market-research-v2") return "legacy_upgrade" as const;
  if (methodologyVersion === "market-research-v2" && sizingMethodologyVersion !== "market-sizing-v3-top-down" && !sizingAttemptedAt) return "top_down_upgrade" as const;
  return "limit" as const;
}

/**
 * Remove source objects whose `url` was not returned by search, in place, anywhere in the tree.
 * Callers decide what to do with entries left without sources; sizing already degrades to evidence gaps.
 */
export function stripUnverifiedSources<T>(value: T, allowed: Set<string>, dropped: string[] = []): T {
  if (Array.isArray(value)) {
    const kept = value.filter((entry) => {
      // 항목이 URL 문자열 자체인 경우(sourceUrls)와 url 키를 가진 객체인 경우를 모두 본다.
      const url = typeof entry === "string" ? entry
        : entry && typeof entry === "object" ? (entry as { url?: unknown }).url : null;
      if (typeof url === "string" && /^https?:\/\//i.test(url) && !allowed.has(canonicalResearchUrl(url))) {
        dropped.push(url);
        return false;
      }
      return true;
    });
    value.length = 0;
    (value as unknown[]).push(...kept.map((entry) => stripUnverifiedSources(entry, allowed, dropped)));
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) stripUnverifiedSources(entry, allowed, dropped);
  }
  return value;
}
