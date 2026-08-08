import type { GtmPlanItem, GtmPlanStatus } from "./types";

interface DownloadableGtmPlan {
  assessment: {
    score: number;
    status: string;
    gateMessages: string[];
  };
  founderContext: Record<string, string>;
  planStatus: GtmPlanStatus;
  summary: string;
  assumptions: string[];
  generatedBy: string;
  items: GtmPlanItem[];
}

const planStatusLabel: Record<GtmPlanStatus, string> = {
  draft: "초안",
  active: "승인됨",
  superseded: "대체됨",
  completed: "완료"
};

const itemStatusLabel: Record<GtmPlanItem["status"], string> = {
  not_started: "진행 전",
  in_progress: "진행 중",
  completed: "완료",
  blocked: "막힘"
};

const contextLabels: Record<string, string> = {
  targetCountry: "목표 국가",
  targetCustomer: "목표 고객",
  resources: "가용 자원",
  deadline: "목표 기한",
  constraints: "제약 조건"
};

function sourceLine(source: GtmPlanItem["sources"][number]) {
  const checkedAt = source.checkedAt ? ` · 확인일 ${source.checkedAt}` : "";
  const kind = source.kind === "diagnosis" ? "진단" : source.kind === "vault" ? "내부 자료" : "웹";
  const title = source.title.replace(/[\[\]]/g, "");
  const linkedTitle = source.url?.match(/^https?:\/\//)
    ? `[${title}](${source.url})`
    : title;
  return `  - ${linkedTitle} · ${kind}${checkedAt}`;
}

function itemSection(item: GtmPlanItem, index: number) {
  const lines = [
    `### ${index + 1}. [${item.priority}] ${item.title}`,
    "",
    `- 상태: ${itemStatusLabel[item.status]}`,
    `- 담당: ${item.ownerLabel}`,
    `- 기한: ${item.dueDate}`,
    `- 실행 이유: ${item.rationale}`,
    `- 완료 근거: ${item.completionEvidence}`,
    `- 의존 관계: ${item.dependencies.join(" · ") || "없음"}`,
    `- 리스크: ${item.riskNote || "없음"}`,
    `- 전문가 확인: ${item.expertRequired ? `필요${item.expertReason ? ` — ${item.expertReason}` : ""}` : "불필요"}`
  ];
  if (item.serviceTag) lines.push(`- 전문가 분야: ${item.serviceTag}`);
  if (item.handoffBrief) lines.push(`- 전문가 전달 메모: ${item.handoffBrief}`);
  lines.push("- 근거:", ...item.sources.map(sourceLine));
  return lines.join("\n");
}

export function buildGtmPlanMarkdown(
  plan: DownloadableGtmPlan,
  exportedAt = new Date()
) {
  const generatedBy = plan.generatedBy === "deterministic-fallback"
    ? "진단 액션 기반 기본 계획"
    : `AI GTM 어시스턴트 (${plan.generatedBy})`;
  const context = Object.entries(contextLabels)
    .filter(([key]) => plan.founderContext[key]?.trim())
    .map(([key, label]) => `- ${label}: ${plan.founderContext[key].trim()}`);
  const assumptions = plan.assumptions.length > 0
    ? plan.assumptions.map((assumption) => `- ${assumption}`)
    : ["- 명시된 가정이 없습니다."];
  const gates = plan.assessment.gateMessages.length > 0
    ? plan.assessment.gateMessages.map((message) => `- ${message}`)
    : ["- 현재 표시된 선결 조건이 없습니다."];
  const horizons = ([30, 60, 90] as const).flatMap((horizon) => {
    const items = plan.items.filter((item) => item.horizon === horizon);
    if (items.length === 0) return [];
    return [
      `## ${horizon}일 계획`,
      "",
      items.map(itemSection).join("\n\n"),
      ""
    ];
  });

  return [
    "# Borderless AI GTM 실행 계획",
    "",
    `> 다운로드 날짜: ${exportedAt.toISOString().slice(0, 10)}`,
    `> 계획 상태: ${planStatusLabel[plan.planStatus]}`,
    `> 준비도: ${plan.assessment.score}점 · ${plan.assessment.status}`,
    `> 작성 방식: ${generatedBy}`,
    "",
    "## 계획 요약",
    "",
    plan.summary,
    "",
    "## 창업자 실행 조건",
    "",
    ...(context.length > 0 ? context : ["- 입력된 실행 조건이 없습니다."]),
    "",
    "## 전제와 가정",
    "",
    ...assumptions,
    "",
    "## 선결 조건",
    "",
    ...gates,
    "",
    ...horizons,
    "",
    "---",
    "Borderless에서 현재 화면의 계획을 내려받았습니다. 실행 전 최신 정보와 전문가 확인 필요 항목을 다시 검토하세요.",
    ""
  ].join("\n");
}

export function buildGtmPlanFilename(
  targetCountry: string,
  exportedAt = new Date()
) {
  const scope = targetCountry
    .normalize("NFKC")
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 40) || "plan";
  return `borderless-gtm-plan-${scope}-${exportedAt.toISOString().slice(0, 10)}.md`;
}
