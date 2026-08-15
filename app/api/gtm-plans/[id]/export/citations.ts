export type ReportSource = {
  title: string;
  url: string | null;
  publisher: string;
  publishedAt?: string | null;
  checkedAt?: string | null;
  kind?: string;
};

const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]!));

const sourceKey = (source: ReportSource) => source.url || `${source.publisher}:${source.title}`;

const safeHref = (value: string | null) => {
  try {
    const url = new URL(value ?? "");
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};

export function buildReferenceIndex(sources: ReportSource[]) {
  const references: { number: number; source: ReportSource; href: string | null }[] = [];
  const numberByKey = new Map<string, number>();
  for (const source of sources) {
    const key = sourceKey(source);
    if (numberByKey.has(key)) continue;
    const number = references.length + 1;
    numberByKey.set(key, number);
    references.push({ number, source, href: safeHref(source.url) });
  }
  return { references, numberByKey };
}

export function citationNumbers(index: ReturnType<typeof buildReferenceIndex>, sources: ReportSource[]) {
  return [...new Set(sources.map(sourceKey).map((key) => index.numberByKey.get(key)).filter((number): number is number => number !== undefined))];
}

export const renderCitationLinks = (index: ReturnType<typeof buildReferenceIndex>, sources: ReportSource[]) =>
  citationNumbers(index, sources).map((number) => `<a class="citation" href="#ref-${number}">[${number}]</a>`).join(" ");

export const renderBibliography = (index: ReturnType<typeof buildReferenceIndex>, formatKind = (kind: string) => kind) =>
  `<ol>${index.references.map(({ number, source, href }) => `<li id="ref-${number}">${href ? `<a href="${escapeHtml(href)}">${escapeHtml(source.title)}</a>` : escapeHtml(source.title)}${source.publisher ? ` · ${escapeHtml(source.publisher)}` : ""}${source.publishedAt ? ` · ${escapeHtml(source.publishedAt)}` : ""}${source.checkedAt ? ` · ${escapeHtml(source.checkedAt)}` : ""}${source.kind ? ` · ${escapeHtml(formatKind(source.kind))}` : ""}</li>`).join("")}</ol>`;
