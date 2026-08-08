import type { GtmPlanItem, GtmPlanStatus } from "./types";

interface DownloadableGtmPlan {
  assessment: {
    score: number;
    status: string;
    domainScores: Record<string, number>;
    gateMessages: string[];
    priorityActions: {
      title: string;
      priority: string;
      completionEvidence: string;
    }[];
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

const readinessStages = [
  { id: "early", label: "극초기", description: "목표 국가·가치제안·투입 자원을 정리하는 단계" },
  { id: "preparing", label: "준비중", description: "현지 시장·규제·고객 가설을 실제로 시험하는 단계" },
  { id: "ready", label: "준비완료", description: "계약·인력·운영 체계를 갖추고 진입을 실행하는 단계" }
] as const;

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeHttpUrl(url: string | null) {
  return url && /^https?:\/\//i.test(url) ? escapeHtml(url) : "";
}

function list(items: string[], empty: string, className = "clean-list") {
  const values = items.length > 0 ? items : [empty];
  return `<ul class="${className}">${values.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function scoreInterpretation(score: number) {
  if (score >= 80) return "실행 경험과 확인 가능한 증거가 전반적으로 축적된 상태입니다. 다만 단계별 필수 조건은 총점과 별도로 확인해야 합니다.";
  if (score >= 50) return "일부 준비 활동은 실행됐지만, 반복성과 외부 확인 증거를 더 쌓아야 다음 단계의 의사결정 위험을 낮출 수 있습니다.";
  return "현재는 시장·고객·자원 가설을 명확히 하고 작은 실행 증거를 만드는 데 집중할 구간입니다.";
}

function readinessSection(plan: DownloadableGtmPlan) {
  const stages = readinessStages.map((stage) => {
    const score = Math.max(0, Math.min(100, Number(plan.assessment.domainScores[stage.id]) || 0));
    const signal = score >= 80 ? "정량 기준 충족" : score >= 60 ? "보완 후 재확인" : "기초 증거 보강";
    return `<article class="stage-card">
      <div class="stage-heading"><div><span>${escapeHtml(stage.label)}</span><p>${escapeHtml(stage.description)}</p></div><strong>${score}%</strong></div>
      <div class="bar" role="img" aria-label="${escapeHtml(stage.label)} 준비도 ${score}퍼센트"><span style="width:${score}%"></span></div>
      <small>${signal} · 단계 통과 기준은 80%이며 필수 문항을 별도로 충족해야 합니다.</small>
    </article>`;
  }).join("");
  const gates = plan.assessment.gateMessages.length > 0
    ? `<div class="callout callout--warning"><strong>먼저 해결할 선결 조건</strong>${list(plan.assessment.gateMessages, "현재 표시된 선결 조건이 없습니다.")}</div>`
    : `<div class="callout callout--success"><strong>현재 단계의 선결 조건을 통과했습니다.</strong><p>다음 실행에서도 완료 근거와 최신 현지 정보를 계속 확인하세요.</p></div>`;
  const actions = plan.assessment.priorityActions.length > 0
    ? `<div class="priority-actions">${plan.assessment.priorityActions.map((action, index) => `<article>
        <span>${escapeHtml(action.priority)} · ${String(index + 1).padStart(2, "0")}</span>
        <h3>${escapeHtml(action.title)}</h3>
        <p><strong>완료 판단:</strong> ${escapeHtml(action.completionEvidence)}</p>
      </article>`).join("")}</div>`
    : `<p class="empty-copy">현재 단계에서 추가로 생성된 우선 액션이 없습니다.</p>`;

  return `<section id="diagnosis">
    <div class="section-title"><span>01 · READINESS DIAGNOSIS</span><h2>진단 결과와 해석</h2></div>
    <div class="explanation">
      <h3>이 점수는 무엇을 의미하나요?</h3>
      <p>55개 문항에서 ‘실행 사례가 있음’ 또는 ‘반복·외부 확인됨’으로 답한 항목의 가중치를 합산한 100점 지표입니다. 성공 가능성을 예측하는 점수가 아니라, 현재 보유한 실행 증거의 범위를 보여줍니다.</p>
      <p><strong>${escapeHtml(plan.assessment.status)}</strong>은 순서대로 통과해야 하는 단계 중 지금 집중할 구간입니다. ${escapeHtml(scoreInterpretation(plan.assessment.score))}</p>
    </div>
    <div class="stage-grid">${stages}</div>
    ${gates}
    <div class="subsection-heading"><span>DIAGNOSIS PRIORITIES</span><h3>진단에서 도출된 우선 액션</h3><p>점수가 낮거나 필수 조건에 해당하는 항목 중 지금 단계에서 먼저 보완할 과제입니다.</p></div>
    ${actions}
  </section>`;
}

function sourceList(sources: GtmPlanItem["sources"]) {
  if (sources.length === 0) return `<p class="source-empty">연결된 근거가 없습니다. 실행 전에 내부 자료나 최신 외부 근거를 추가하세요.</p>`;
  return `<ul class="source-list">${sources.map((source) => {
    const url = safeHttpUrl(source.url);
    const title = escapeHtml(source.title);
    const linkedTitle = url ? `<a href="${url}" target="_blank" rel="noreferrer">${title}</a>` : title;
    const kind = source.kind === "diagnosis" ? "진단" : source.kind === "vault" ? "내부 자료" : "웹";
    return `<li><span>${escapeHtml(kind)}</span><div>${linkedTitle}${source.checkedAt ? `<small>확인일 ${escapeHtml(source.checkedAt)}</small>` : ""}</div></li>`;
  }).join("")}</ul>`;
}

function planItem(item: GtmPlanItem, index: number) {
  return `<article class="plan-card">
    <header><div><span class="priority priority--${item.priority === "P0" ? "p0" : "p1"}">${escapeHtml(item.priority)}</span><span class="item-number">ACTION ${String(index + 1).padStart(2, "0")}</span></div><span class="status">${escapeHtml(itemStatusLabel[item.status])}</span></header>
    <h3>${escapeHtml(item.title)}</h3>
    <p class="rationale">${escapeHtml(item.rationale)}</p>
    <dl class="item-meta">
      <div><dt>담당</dt><dd>${escapeHtml(item.ownerLabel)}</dd></div>
      <div><dt>기한</dt><dd>${escapeHtml(item.dueDate || "미정")}</dd></div>
      <div class="wide"><dt>완료 판단</dt><dd>${escapeHtml(item.completionEvidence)}</dd></div>
      <div class="wide"><dt>의존 관계</dt><dd>${escapeHtml(item.dependencies.join(" · ") || "없음")}</dd></div>
      <div class="wide"><dt>주요 리스크</dt><dd>${escapeHtml(item.riskNote || "별도 기록 없음")}</dd></div>
    </dl>
    ${item.expertRequired ? `<div class="expert-note"><strong>전문가 확인 필요</strong><p>${escapeHtml(item.expertReason || "현지 규정 또는 전문 판단이 필요한 항목입니다.")}</p>${item.handoffBrief ? `<p><b>전달 메모:</b> ${escapeHtml(item.handoffBrief)}</p>` : ""}</div>` : ""}
    <div class="sources"><strong>판단 근거</strong>${sourceList(item.sources)}</div>
  </article>`;
}

function planSection(plan: DownloadableGtmPlan) {
  const generatedBy = plan.generatedBy === "deterministic-fallback"
    ? "저장된 진단 액션을 일정과 책임 기준으로 재구성한 기본 계획입니다. AI 연결 없이 생성됐으므로 창업자 검토와 보완이 특히 중요합니다."
    : "AI GTM 어시스턴트가 진단 결과, 창업자가 입력한 시장 조건, 대화에서 확인한 제약을 함께 반영해 만든 계획입니다. 현재 화면에서 수정한 담당·기한·상태·완료 기준도 포함합니다.";
  const context = Object.entries(contextLabels)
    .filter(([key]) => plan.founderContext[key]?.trim())
    .map(([key, label]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(plan.founderContext[key].trim())}</dd></div>`)
    .join("");
  const horizons = ([30, 60, 90] as const).map((horizon) => {
    const items = plan.items.filter((item) => item.horizon === horizon);
    return `<section class="horizon"><div class="horizon-heading"><span>${horizon}</span><div><h3>${horizon}일 실행안</h3><p>${horizon === 30 ? "가설과 필수 조건을 확인하고 즉시 막히는 위험을 줄입니다." : horizon === 60 ? "현지 고객·파트너와 실행 결과를 만들고 학습을 반영합니다." : "반복 가능한 방식으로 정리하고 다음 투자·확대 결정을 준비합니다."}</p></div></div>${items.length > 0 ? `<div class="plan-grid">${items.map(planItem).join("")}</div>` : `<p class="empty-copy">이 기간에 배정된 실행 항목이 없습니다.</p>`}</section>`;
  }).join("");

  return `<section id="plan">
    <div class="section-title"><span>02 · AI GTM EXECUTION PLAN</span><h2>AI와 함께 만든 실행 계획</h2></div>
    <div class="explanation"><h3>이 계획은 어떻게 만들어졌나요?</h3><p>${escapeHtml(generatedBy)}</p><p>이 문서는 실행을 위한 의사결정 초안입니다. 시장·법률·세무·규제 사실은 출처의 확인일과 전문가 확인 표시를 기준으로 다시 검토해야 합니다.</p></div>
    <div class="summary-quote"><span>PLAN SUMMARY</span><p>${escapeHtml(plan.summary || "저장된 계획 요약이 없습니다.")}</p></div>
    <div class="two-column">
      <div><div class="subsection-heading"><span>FOUNDER CONTEXT</span><h3>계획에 반영한 실행 조건</h3></div><dl class="context-list">${context || "<div><dt>입력</dt><dd>저장된 실행 조건이 없습니다.</dd></div>"}</dl></div>
      <div><div class="subsection-heading"><span>ASSUMPTIONS</span><h3>검증이 필요한 전제</h3></div>${list(plan.assumptions, "명시된 가정이 없습니다.")}</div>
    </div>
    ${horizons}
  </section>`;
}

export function buildGtmPlanHtml(
  plan: DownloadableGtmPlan,
  exportedAt = new Date()
) {
  const date = exportedAt.toISOString().slice(0, 10).replaceAll("-", ".");
  const target = plan.founderContext.targetCountry?.trim() || "목표 시장";
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Borderless AI GTM 실행 보고서 · ${escapeHtml(target)}</title>
  <style>
    :root{--ink:#10221b;--muted:#5d6c65;--green:#1d7b4c;--dark:#0e3b2b;--mint:#e7f3ec;--paper:#f3f5f1;--line:#dce4de;--warning:#fff4dc;--warning-ink:#7a4b00;--red:#a33737}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font-family:Pretendard,"Noto Sans KR",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;word-break:keep-all}.toolbar{position:sticky;top:0;z-index:10;display:flex;justify-content:flex-end;gap:10px;max-width:1080px;margin:auto;padding:12px 24px;background:rgba(243,245,241,.94);backdrop-filter:blur(8px)}button{border:0;border-radius:9px;padding:11px 16px;background:var(--dark);color:#fff;font:inherit;font-weight:800;cursor:pointer}.report{max-width:1080px;margin:0 auto 48px;background:#fff;box-shadow:0 18px 60px rgba(16,34,27,.1)}.cover{min-height:440px;padding:70px 72px;background:linear-gradient(135deg,var(--dark),#175a41);color:#fff;display:flex;flex-direction:column;justify-content:space-between}.brand{font-size:13px;font-weight:900;letter-spacing:.18em}.cover h1{max-width:720px;margin:26px 0 16px;font-size:52px;line-height:1.08;letter-spacing:-.045em}.cover .lead{max-width:660px;margin:0;color:#d9ebe1;font-size:19px}.cover-meta{display:flex;flex-wrap:wrap;gap:28px;border-top:1px solid rgba(255,255,255,.25);padding-top:22px}.cover-meta span{display:block;color:#b9d5c6;font-size:11px;letter-spacing:.12em}.cover-meta strong{display:block;margin-top:3px;font-size:16px}main{padding:0 72px 72px}.snapshot{display:grid;grid-template-columns:1.3fr repeat(3,1fr);gap:1px;margin:-44px 0 72px;background:var(--line);border:1px solid var(--line);border-radius:14px;overflow:hidden;position:relative}.snapshot>div{min-height:122px;padding:24px;background:#fff}.snapshot span,.section-title>span,.subsection-heading>span,.summary-quote>span{display:block;color:var(--green);font-size:11px;font-weight:900;letter-spacing:.13em}.snapshot strong{display:block;margin-top:8px;font-size:26px;line-height:1.2}.snapshot .score strong{font-size:46px;color:var(--dark)}.snapshot small{display:block;margin-top:6px;color:var(--muted)}section[id]{scroll-margin-top:74px;margin-top:76px}.section-title{padding-bottom:22px;border-bottom:2px solid var(--ink);margin-bottom:28px}.section-title h2{margin:6px 0 0;font-size:34px;line-height:1.2;letter-spacing:-.035em}.explanation{padding:24px 28px;border-left:4px solid var(--green);background:#f6faf7;margin-bottom:28px}.explanation h3{margin:0 0 10px;font-size:19px}.explanation p{margin:8px 0;color:#34473e}.stage-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.stage-card{border:1px solid var(--line);border-radius:12px;padding:20px}.stage-heading{display:flex;justify-content:space-between;gap:16px}.stage-heading span{font-weight:900}.stage-heading p{margin:4px 0 0;color:var(--muted);font-size:13px;line-height:1.45}.stage-heading strong{font-size:28px;color:var(--green)}.bar{height:9px;margin:18px 0 12px;border-radius:20px;background:#e9eeea;overflow:hidden}.bar span{display:block;height:100%;border-radius:inherit;background:var(--green)}.stage-card small{color:var(--muted);font-size:11px}.callout{margin:20px 0;padding:22px 24px;border-radius:12px}.callout strong{font-size:17px}.callout p{margin:5px 0 0}.callout--warning{background:var(--warning);color:var(--warning-ink)}.callout--success{background:var(--mint);color:var(--dark)}.clean-list{margin:10px 0 0;padding-left:20px}.clean-list li+li{margin-top:7px}.subsection-heading{margin:34px 0 16px}.subsection-heading h3{margin:4px 0;font-size:21px}.subsection-heading p{margin:0;color:var(--muted)}.priority-actions{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.priority-actions article{padding:20px;border:1px solid var(--line);border-radius:12px}.priority-actions span{color:var(--red);font-size:11px;font-weight:900}.priority-actions h3{margin:7px 0 10px;font-size:17px}.priority-actions p{margin:0;color:var(--muted);font-size:13px}.summary-quote{margin:26px 0;padding:30px 34px;background:var(--dark);color:#fff;border-radius:14px}.summary-quote span{color:#a8d4bd}.summary-quote p{margin:8px 0 0;font-size:22px;font-weight:750;line-height:1.5}.two-column{display:grid;grid-template-columns:1fr 1fr;gap:34px}.context-list{margin:0}.context-list div{display:grid;grid-template-columns:100px 1fr;gap:14px;padding:11px 0;border-bottom:1px solid var(--line)}dt{color:var(--muted);font-size:12px;font-weight:800}dd{margin:0;font-weight:650}.horizon{margin-top:54px}.horizon-heading{display:flex;align-items:center;gap:18px;margin-bottom:18px}.horizon-heading>span{display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:var(--mint);color:var(--green);font-size:23px;font-weight:900}.horizon-heading h3{margin:0;font-size:24px}.horizon-heading p{margin:3px 0 0;color:var(--muted)}.plan-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.plan-card{padding:24px;border:1px solid var(--line);border-radius:14px;break-inside:avoid}.plan-card header{display:flex;justify-content:space-between;gap:12px}.plan-card header>div{display:flex;gap:8px;align-items:center}.priority,.status,.item-number{display:inline-flex;padding:4px 8px;border-radius:20px;font-size:10px;font-weight:900;letter-spacing:.06em}.priority--p0{background:#fce9e9;color:var(--red)}.priority--p1{background:var(--mint);color:var(--green)}.item-number{padding-left:0;color:var(--muted)}.status{background:#edf0ed;color:#45554e}.plan-card h3{margin:14px 0 8px;font-size:19px;line-height:1.38}.rationale{margin:0 0 18px;color:#42534b;font-size:14px}.item-meta{display:grid;grid-template-columns:1fr 1fr;margin:0;border-top:1px solid var(--line)}.item-meta div{padding:10px 0;border-bottom:1px solid var(--line)}.item-meta div:nth-child(even):not(.wide){padding-left:14px;border-left:1px solid var(--line)}.item-meta .wide{grid-column:1/-1}.item-meta dd{font-size:13px;margin-top:2px}.expert-note{margin-top:16px;padding:14px 16px;background:var(--warning);border-radius:9px;color:var(--warning-ink)}.expert-note p{margin:4px 0;font-size:12px}.sources{margin-top:17px}.sources>strong{font-size:12px}.source-list{list-style:none;padding:0;margin:8px 0 0}.source-list li{display:flex;gap:9px;align-items:flex-start;margin-top:6px;font-size:11px}.source-list li>span{flex:none;padding:2px 6px;border-radius:4px;background:var(--mint);color:var(--green);font-weight:800}.source-list a{color:var(--dark);font-weight:750}.source-list small{display:block;color:var(--muted)}.source-empty,.empty-copy{color:var(--muted);font-size:13px}.report-footer{margin-top:74px;padding-top:22px;border-top:1px solid var(--line);color:var(--muted);font-size:12px}.report-footer strong{color:var(--ink)}
    @media(max-width:760px){.toolbar{padding:10px 16px}.report{margin:0}.cover{min-height:400px;padding:48px 28px}.cover h1{font-size:38px}main{padding:0 22px 48px}.snapshot{grid-template-columns:1fr 1fr;margin-top:-30px}.snapshot .score{grid-column:1/-1}.stage-grid,.priority-actions,.two-column,.plan-grid{grid-template-columns:1fr}.section-title h2{font-size:29px}.item-meta{grid-template-columns:1fr}.item-meta div:nth-child(even):not(.wide){padding-left:0;border-left:0}.item-meta div{grid-column:1/-1}}
    @media print{@page{size:A4;margin:14mm}body{background:#fff;font-size:10.5pt}.toolbar{display:none}.report{max-width:none;margin:0;box-shadow:none}.cover{min-height:245mm;padding:28mm 18mm;break-after:page;-webkit-print-color-adjust:exact;print-color-adjust:exact}.cover h1{font-size:34pt}main{padding:0}.snapshot{margin:0 0 18mm;break-inside:avoid}.snapshot>div{min-height:auto;padding:12px}.stage-grid,.priority-actions,.plan-grid{grid-template-columns:1fr 1fr}.plan-card,.stage-card,.callout,.summary-quote,.explanation{break-inside:avoid}.section-title{break-after:avoid}section[id]{margin-top:14mm}.horizon{break-before:auto}.horizon-heading{break-after:avoid}a{color:inherit;text-decoration:none}}
  </style>
</head>
<body>
  <div class="toolbar" aria-label="보고서 도구"><button type="button" onclick="window.print()">인쇄 또는 PDF 저장</button></div>
  <article class="report">
    <header class="cover">
      <div><div class="brand">BORDERLESS · GLOBAL GTM</div><h1>AI GTM<br>실행 보고서</h1><p class="lead">준비도 진단에서 발견한 핵심 과제를 30·60·90일 실행 계획으로 연결한 의사결정 문서입니다.</p></div>
      <div class="cover-meta"><div><span>TARGET MARKET</span><strong>${escapeHtml(target)}</strong></div><div><span>REPORT DATE</span><strong>${date}</strong></div><div><span>PLAN STATUS</span><strong>${escapeHtml(planStatusLabel[plan.planStatus])}</strong></div></div>
    </header>
    <main>
      <section class="snapshot" aria-label="핵심 요약">
        <div class="score"><span>GLOBAL READINESS</span><strong>${escapeHtml(plan.assessment.score)}점</strong><small>실행 증거 가중 합계 / 100</small></div>
        <div><span>CURRENT STAGE</span><strong>${escapeHtml(plan.assessment.status)}</strong><small>지금 집중할 준비 단계</small></div>
        <div><span>PLAN STATUS</span><strong>${escapeHtml(planStatusLabel[plan.planStatus])}</strong><small>${plan.items.length}개 실행 항목</small></div>
        <div><span>GATE CHECK</span><strong>${plan.assessment.gateMessages.length}건</strong><small>먼저 확인할 선결 조건</small></div>
      </section>
      ${readinessSection(plan)}
      ${planSection(plan)}
      <footer class="report-footer"><strong>보고서 사용 안내</strong><p>이 보고서는 진단 응답과 AI 공동계획을 실행 가능한 형태로 정리한 자료이며 성공을 보장하거나 법률·세무·규제 자문을 대신하지 않습니다. 외부 정보는 출처와 확인일을 검토하고, ‘전문가 확인 필요’ 항목은 실행 전에 현지 전문가와 확인하세요.</p><p>Generated by Borderless AI GTM Assistant · ${date}</p></footer>
    </main>
  </article>
</body>
</html>`;
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
  return `borderless-gtm-report-${scope}-${exportedAt.toISOString().slice(0, 10)}.html`;
}
