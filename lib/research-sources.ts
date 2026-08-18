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

// OpenAI Responses(output[])와 Anthropic Messages(content[]) 두 모양을 모두 받는다. GTM 어시스턴트가 OpenAI 모양으로 이 함수를 쓴다.
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
      } else if (type === "web_search_tool_result") {
        // Anthropic: 도구가 실제로 반환한 결과. content가 오류 객체이면 배열이 아니다.
        const content = (item as { content?: unknown }).content;
        if (Array.isArray(content)) for (const hit of content) add((hit as { url?: string }).url);
      } else if (type === "text") {
        // Anthropic: 모델이 실제로 읽고 인용한 페이지.
        for (const citation of (item as { citations?: { url?: string }[] }).citations ?? []) add(citation.url);
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


/**
 * 조사 단계 구조화 출력의 URL 자리를 정리한다. 실측(2026-08-19, 주문 2f8aaf21 규제 조사): Luna가 findings의
 * sourceUrls에 URL 대신 출처 제목·법령 번호("21 CFR 701.3")를 적어 zod가 단계 전체를 거절했다 — 65초짜리
 * 조사가 통째로 버려졌다. 정보 손실 없이 살릴 수 있는 것만 살린다:
 *   - sources[].title과 정확히(대소문자·공백 무시) 같은 문자열 → 그 출처의 URL로 치환
 *   - 그 밖의 비URL 문자열 → 버림. URL이 하나도 안 남는 발견은 뺀다(근거 없는 발견은 남기지 않는다).
 *   - sources[]에서 url이 URL이 아닌 항목 → 버림.
 * 모양이 스키마와 아예 다르면 손대지 않는다 — zod가 원래 오류를 내게 둔다.
 */
export function sanitizeResearchOutput(raw: unknown): { cleaned: unknown; dropped: { findings: number; values: string[] } } {
  const dropped = { findings: 0, values: [] as string[] };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { cleaned: raw, dropped };
  const input = raw as { findings?: unknown; sources?: unknown };
  if (!Array.isArray(input.findings) || !Array.isArray(input.sources)) return { cleaned: raw, dropped };
  const isHttp = (value: unknown): value is string => typeof value === "string" && /^https?:\/\/\S+$/i.test(value);
  const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  const byTitle = new Map<string, string>();
  const sources = input.sources.filter((source) => {
    const url = (source as { url?: unknown } | null)?.url;
    if (isHttp(url)) {
      const title = (source as { title?: unknown }).title;
      if (typeof title === "string" && title.trim()) byTitle.set(norm(title), url);
      return true;
    }
    if (typeof url === "string") dropped.values.push(url);
    return false;
  });
  const findings = input.findings.flatMap((finding) => {
    const urls = (finding as { sourceUrls?: unknown } | null)?.sourceUrls;
    if (!Array.isArray(urls)) return [finding];
    const kept: string[] = [];
    for (const value of urls) {
      if (isHttp(value)) { kept.push(value); continue; }
      const mapped = typeof value === "string" ? byTitle.get(norm(value)) : undefined;
      if (mapped) kept.push(mapped);
      else if (typeof value === "string") dropped.values.push(value);
    }
    if (!kept.length) { dropped.findings += 1; return []; }
    return [{ ...(finding as object), sourceUrls: [...new Set(kept)] }];
  });
  return { cleaned: { ...(raw as object), findings, sources }, dropped };
}
