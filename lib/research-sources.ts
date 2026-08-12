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
  for (const output of outputs) {
    if (!Array.isArray(output)) continue;
    for (const item of output) {
      if (!item || typeof item !== "object" || (item as { type?: string }).type !== "web_search_call") continue;
      const sources = (item as { action?: { sources?: { url?: string }[] } }).action?.sources ?? [];
      for (const source of sources) {
        if (typeof source.url === "string" && /^https?:\/\//i.test(source.url)) result.add(canonicalResearchUrl(source.url));
      }
    }
  }
  for (const source of approvedSources) {
    const url = source && typeof source === "object" ? (source as { source_url?: unknown }).source_url : null;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) result.add(canonicalResearchUrl(url));
  }
  return result;
}

export function researchQuotaDecision(count: number, methodologyVersion: unknown, attemptedAt: unknown) {
  if (count < 3) return "reserve" as const;
  if (!attemptedAt && methodologyVersion !== "market-research-v2") return "legacy_upgrade" as const;
  return "limit" as const;
}
