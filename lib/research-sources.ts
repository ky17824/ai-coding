export function canonicalResearchUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, "");
}

export function collectCitedUrls(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((entry) => collectCitedUrls(entry, result));
  else if (value && typeof value === "object") Object.entries(value).forEach(([key, entry]) => {
    if (key === "url" && typeof entry === "string" && /^https?:\/\//i.test(entry)) result.add(canonicalResearchUrl(entry));
    else collectCitedUrls(entry, result);
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
  if (methodologyVersion === "market-research-v2" && sizingMethodologyVersion !== "market-sizing-v2" && !sizingAttemptedAt) return "sizing_upgrade" as const;
  return "limit" as const;
}

/**
 * Remove source objects whose `url` was not returned by search, in place, anywhere in the tree.
 * Callers decide what to do with entries left without sources; sizing already degrades to evidence gaps.
 */
export function stripUnverifiedSources<T>(value: T, allowed: Set<string>, dropped: string[] = []): T {
  if (Array.isArray(value)) {
    const kept = value.filter((entry) => {
      const url = entry && typeof entry === "object" ? (entry as { url?: unknown }).url : null;
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
