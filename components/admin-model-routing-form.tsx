"use client";

import { Fragment, useActionState, useMemo, useState } from "react";
import { changeModelRouting, rollbackModelRouting, type ModelRoutingActionState } from "@/app/admin/actions";
import { MODEL_CATALOG, MODEL_KEYS, isModelOptionVisible, type Effort, type ModelKey } from "@/lib/ai-models/catalog";
import { STAGES, STAGE_LABEL, diffRouting, type ProductOverrides, type Routes, type Stage, type StageRoute } from "@/lib/ai-models/routing";
import type { Locale } from "@/lib/i18n";

const initial: ModelRoutingActionState = { ok: false, message: "" };

const STAGE_HELP = {
  ko: {
    classification: "제출 정보와 준비도 진단을 분류하고 조사 범위를 정합니다. 가벼운 모델로 충분합니다.",
    public_research: "웹검색으로 근거를 모읍니다. 웹검색이 없는 모델은 고를 수 없습니다.",
    final_report: "근거를 엮어 결론·가정·실행계획을 씁니다. 품질에 가장 큰 영향을 줍니다."
  },
  en: {
    classification: "Classifies the input and readiness assessment and sets the research scope. A light model is enough.",
    public_research: "Gathers evidence with web search. Models without web search cannot be chosen.",
    final_report: "Turns the evidence into conclusions, assumptions, and an action plan. The biggest lever on quality."
  }
} as const;
const EFFORT_LABEL = { ko: { low: "낮음", medium: "보통", high: "높음" }, en: { low: "Low", medium: "Medium", high: "High" } } as const;

export type RoutableProduct = { id: string; title: string; kind: "specialist" | "package" };
export type ProductStat = { runs: number; successRate: number | null; avgSeconds: number | null; avgCostUsd: number | null };

export function AdminModelRoutingForm(props: {
  locale: Locale;
  activeVersion: number | null;
  activeRoutes: Routes;
  activeOverrides: ProductOverrides;
  activeMeta: { at: string; by: string } | null;
  hasOpenAiKey: boolean;
  hasAnthropicKey: boolean;
  generatingCount: number;
  last24h: { total: number; byModel: Array<{ label: string; ok: number; failed: number }> };
  products: RoutableProduct[];
  productStats: Record<string, ProductStat>;
  history: Array<{ version: number; status: "active" | "superseded"; at: string; by: string; summary: string }>;
}) {
  const { locale, activeRoutes, activeOverrides, hasOpenAiKey, hasAnthropicKey } = props;
  const en = locale === "en";
  const [draft, setDraft] = useState<Routes>(activeRoutes);
  const [overrides, setOverrides] = useState<ProductOverrides>(activeOverrides);
  // 표에서 "조정" 상태로 열려 있는 셀. 저장 전까지는 로컬 상태일 뿐이다.
  const [editing, setEditing] = useState<{ productId: string; stage: Stage } | null>(null);
  const [state, action, pending] = useActionState(changeModelRouting, initial);
  const [rollbackState, rollbackAction, rollbackPending] = useActionState(rollbackModelRouting, initial);
  const diff = useMemo(() => diffRouting({ routes: activeRoutes, overrides: activeOverrides }, { routes: draft, overrides }), [activeRoutes, activeOverrides, draft, overrides]);
  const changeCount = diff.stages.length + diff.products.length;
  // 활성 설정이 없으면(신규 배포 직후 등) draft는 시드값과 같아 diff가 비어도 저장할 게 있다.
  // 이 "바뀐 값 없음" 가드는 활성 설정이 있을 때만 적용한다.
  const unchanged = props.activeVersion !== null && changeCount === 0;
  const fmt = (iso: string) => new Intl.DateTimeFormat(en ? "en-US" : "ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const productTitle = (id: string) => props.products.find((product) => product.id === id)?.title ?? id;
  const routeLabel = (route: StageRoute) => `${MODEL_CATALOG[route.model].label} · ${EFFORT_LABEL[locale][route.effort]}`;

  const setStage = (stage: Stage, patch: Partial<{ model: ModelKey; effort: Effort }>) =>
    setDraft((current) => {
      const next = { ...current[stage], ...patch };
      if (patch.model && !MODEL_CATALOG[patch.model].efforts.includes(next.effort)) next.effort = "medium";
      return { ...current, [stage]: next };
    });

  const setOverride = (productId: string, stage: Stage, patch: Partial<{ model: ModelKey; effort: Effort }> | null) =>
    setOverrides((current) => {
      const stages = { ...(current[productId] ?? {}) };
      if (patch === null) {
        delete stages[stage];
      } else {
        // 조정을 시작하면 그 시점의 기본값(draft)에서 출발한다 — 빈 칸이 아니라 "지금 값"을 바꾸는 느낌.
        const base = stages[stage] ?? draft[stage];
        const next = { ...base, ...patch };
        if (patch.model && !MODEL_CATALOG[patch.model].efforts.includes(next.effort)) next.effort = "medium";
        stages[stage] = next;
      }
      const nextAll = { ...current, [productId]: stages };
      if (!Object.keys(stages).length) delete nextAll[productId];
      return nextAll;
    });

  const modelOptions = (stage: Stage, current: ModelKey) =>
    MODEL_KEYS.filter((key) => isModelOptionVisible(MODEL_CATALOG[key], key === current)).map((key) => {
      const spec = MODEL_CATALOG[key];
      const noSearch = stage === "public_research" && !spec.webSearch;
      const keyMissing = (spec.provider === "openai" && !hasOpenAiKey) || (spec.provider === "anthropic" && !hasAnthropicKey);
      const suffix = keyMissing ? (en ? " (key missing)" : " (키 미설정)") : noSearch ? (en ? " (no web search)" : " (웹검색 없음)") : spec.deprecatedAt ? (en ? " (no longer supported)" : " (지원 종료)") : "";
      return <option key={key} value={key} disabled={keyMissing || noSearch}>{spec.label}{suffix}</option>;
    });

  const groups: Array<{ kind: RoutableProduct["kind"]; label: string; note?: string }> = [
    { kind: "specialist", label: en ? "Specialists" : "전문가" },
    { kind: "package", label: en ? "Packages" : "패키지", note: en ? "Packages ran research and report at 'high' by default; that now lives here as an override." : "패키지의 조사·보고서 '높음' 고정값이 여기 오버라이드로 옮겨졌습니다." }
  ];

  const stat = (id: string) => {
    const s = props.productStats[id];
    if (!s || s.runs === 0) return "—";
    const pct = s.successRate === null ? "—" : `${Math.round(s.successRate * 100)}%`;
    const min = s.avgSeconds === null ? "—" : `${(s.avgSeconds / 60).toFixed(1)}${en ? "m" : "분"}`;
    const cost = s.avgCostUsd === null ? "—" : `$${s.avgCostUsd.toFixed(2)}`;
    return en ? `${s.runs} runs · ${pct} · ${min} · ${cost}` : `${s.runs}건 · ${pct} · ${min} · ${cost}`;
  };

  return (
    <div className="admin-model-routing">
      <section className="admin-model-routing__status" aria-label={en ? "Status" : "상태"}>
        <span className={`admin-chip ${hasOpenAiKey ? "admin-chip--admin" : "admin-chip--warning"}`}>
          OpenAI {en ? "key" : "키"} · {hasOpenAiKey ? "✓ " + (en ? "set" : "설정됨") : "✕ " + (en ? "missing" : "미설정")}
        </span>
        <span className={`admin-chip ${hasAnthropicKey ? "admin-chip--admin" : "admin-chip--warning"}`}>
          Anthropic {en ? "key" : "키"} · {hasAnthropicKey ? "✓ " + (en ? "set" : "설정됨") : "✕ " + (en ? "missing" : "미설정")}
        </span>
        <span className="admin-chip">{en ? "Active" : "활성 설정"} · {props.activeVersion ? `v${props.activeVersion}` : "—"}</span>
        <span className="admin-chip">{en ? "Last change" : "최근 변경"} · {props.activeMeta ? `${props.activeMeta.by} · ${fmt(props.activeMeta.at)}` : "—"}</span>
      </section>

      <p className="admin-model-routing__recent">
        {en ? "Last 24 hours" : "최근 24시간"} · {en ? `${props.last24h.total} attempts` : `시도 ${props.last24h.total}건`}
        {props.last24h.byModel.map((row) => (
          <span key={row.label}>
            {" "}· {row.label} {en ? `${row.ok} ok` : `성공 ${row.ok}건`}
            {row.failed > 0 && (en ? `, ${row.failed} failed` : ` · 실패 ${row.failed}건`)}
          </span>
        ))}
        {" · "}{en ? `${props.generatingCount} in progress` : `진행 중 ${props.generatingCount}건`}
      </p>

      <form action={action} className="provider-form admin-role-form">
        <input type="hidden" name="locale" value={locale} />
        {/* 상품별 조정은 폼 필드 수십 개 대신 JSON 하나로 보낸다. 서버가 validateProductOverrides로 다시 본다. */}
        <input type="hidden" name="product_overrides" value={JSON.stringify(overrides)} readOnly />

        <div className="admin-model-routing__heading admin-model-routing__section-heading">
          <span className="page-kicker">{en ? "Shared defaults" : "공통 기본값"}</span>
          <h2>{en ? "Defaults every product follows" : "모든 상품이 따르는 기본 설정"}</h2>
          <small>{en ? "Cells left blank in the product table below use these values." : "아래 상품별 조정에서 비워 둔 칸은 이 값을 씁니다."}</small>
        </div>
        <div className="admin-model-routing__stages">
          {STAGES.map((stage, index) => (
            <section key={stage} className="panel admin-model-routing__stage">
              <div className="admin-model-routing__heading">
                <span className="page-kicker">{en ? `Stage ${index + 1}` : `${index + 1}단계`}</span>
                <h2>{STAGE_LABEL[locale][stage]}</h2>
              </div>
              <div className="admin-model-routing__fields">
                <label>
                  <span>{en ? "Model" : "모델"}</span>
                  <select name={`${stage}.model`} value={draft[stage].model} onChange={(event) => setStage(stage, { model: event.target.value as ModelKey })} disabled={pending} aria-describedby={`${stage}-help`}>
                    {modelOptions(stage, activeRoutes[stage].model)}
                  </select>
                </label>
                <label>
                  <span>{en ? "Reasoning" : "추론 강도"}</span>
                  <select name={`${stage}.effort`} value={draft[stage].effort} onChange={(event) => setStage(stage, { effort: event.target.value as Effort })} disabled={pending} aria-describedby={`${stage}-help`}>
                    {MODEL_CATALOG[draft[stage].model].efforts.map((effort) => (
                      <option key={effort} value={effort}>{EFFORT_LABEL[locale][effort]}</option>
                    ))}
                  </select>
                </label>
              </div>
              <small id={`${stage}-help`}>{STAGE_HELP[locale][stage]}</small>
            </section>
          ))}
        </div>

        <section className="panel admin-model-routing__products">
          <div className="admin-model-routing__heading">
            <span className="page-kicker">{en ? "Per-product overrides" : "상품별 조정"}</span>
            <h2>{en ? `${props.products.filter((p) => p.kind === "specialist").length} specialists · ${props.products.filter((p) => p.kind === "package").length} packages` : `전문가 ${props.products.filter((p) => p.kind === "specialist").length}종 · 패키지 ${props.products.filter((p) => p.kind === "package").length}종`}</h2>
            <small>{en ? "Click a cell to give that product and stage a different model or reasoning level. The right column is the last 30 days: runs · success · avg. time · avg. model cost." : "칸을 클릭해 그 상품·단계만 다른 모델이나 추론 강도로 바꿉니다. 오른쪽은 최근 30일 실측(실행 수 · 성공률 · 평균 완주 시간 · 평균 모델 비용)입니다."}</small>
          </div>
          <div className="admin-model-routing__legend" aria-hidden="true">
            <span><i className="admin-model-routing__swatch admin-model-routing__swatch--inherit" />{en ? "Follows default" : "기본값 따름"}</span>
            <span><i className="admin-model-routing__swatch admin-model-routing__swatch--over" />{en ? "Overridden" : "조정됨"}</span>
          </div>
          <div className="table-scroll">
            <table className="admin-model-routing__table">
              <thead>
                <tr>
                  <th>{en ? "Product" : "상품"}</th>
                  {STAGES.map((stage) => <th key={stage}>{STAGE_LABEL[locale][stage]}</th>)}
                  <th className="admin-model-routing__stat">{en ? "Last 30 days" : "최근 30일"}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <Fragment key={group.kind}>
                    <tr className="admin-model-routing__group">
                      <td colSpan={STAGES.length + 2}>{group.label}{group.note && <span> — {group.note}</span>}</td>
                    </tr>
                    {props.products.filter((product) => product.kind === group.kind).map((product) => (
                      <tr key={product.id}>
                        <td><strong>{product.title}</strong></td>
                        {STAGES.map((stage) => {
                          const over = overrides[product.id]?.[stage];
                          const isEditing = editing?.productId === product.id && editing.stage === stage;
                          if (isEditing) {
                            const value = over ?? draft[stage];
                            return (
                              <td key={stage}>
                                <span className="admin-model-routing__cell-edit">
                                  <select aria-label={`${product.title} · ${STAGE_LABEL[locale][stage]} · ${en ? "model" : "모델"}`} value={value.model} onChange={(event) => setOverride(product.id, stage, { model: event.target.value as ModelKey })} disabled={pending}>
                                    {modelOptions(stage, value.model)}
                                  </select>
                                  <select aria-label={`${product.title} · ${STAGE_LABEL[locale][stage]} · ${en ? "reasoning" : "추론 강도"}`} value={value.effort} onChange={(event) => setOverride(product.id, stage, { effort: event.target.value as Effort })} disabled={pending}>
                                    {MODEL_CATALOG[value.model].efforts.map((effort) => <option key={effort} value={effort}>{EFFORT_LABEL[locale][effort]}</option>)}
                                  </select>
                                  <button type="button" className="button button--ghost button--small" onClick={() => setEditing(null)}>{en ? "Done" : "완료"}</button>
                                </span>
                                {!over && <small className="admin-model-routing__hint">{en ? "Change a value to override; otherwise it keeps following the default." : "값을 바꾸면 조정됩니다. 그대로 두면 계속 기본값을 따릅니다."}</small>}
                              </td>
                            );
                          }
                          if (over) {
                            return (
                              <td key={stage}>
                                <span className="admin-model-routing__over">
                                  <button type="button" className="admin-model-routing__over-main" onClick={() => setEditing({ productId: product.id, stage })} disabled={pending}>
                                    <b>{MODEL_CATALOG[over.model].label}</b> · {EFFORT_LABEL[locale][over.effort]}
                                  </button>
                                  <span className="admin-model-routing__badge">{en ? "overridden" : "조정됨"}</span>
                                  <button type="button" className="admin-model-routing__reset" onClick={() => { setOverride(product.id, stage, null); setEditing(null); }} disabled={pending}>{en ? "use default" : "기본값으로"}</button>
                                </span>
                              </td>
                            );
                          }
                          return (
                            <td key={stage}>
                              <button type="button" className="admin-model-routing__inherit" onClick={() => setEditing({ productId: product.id, stage })} disabled={pending} title={en ? "Override this stage for this product" : "이 상품의 이 단계만 조정"}>
                                {en ? "Follows default" : "기본값 따름"}<small>{routeLabel(draft[stage])}</small>
                              </button>
                            </td>
                          );
                        })}
                        <td className="admin-model-routing__stat">{stat(product.id)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="notice-banner">
          <strong>{en ? "Effect" : "변경 영향"}</strong>
          <ul>
            <li>
              {en
                ? `Applies to new runs. ${props.generatingCount} run(s) in progress finish with the current settings.`
                : `새 실행부터 적용됩니다. 진행 중 ${props.generatingCount}건은 지금 설정으로 끝납니다.`}
            </li>
            {diff.stages.map((change) => (
              <li key={change.stage}>
                {STAGE_LABEL[locale][change.stage]}: {routeLabel(change.from)} → {routeLabel(change.to)}
              </li>
            ))}
            {diff.products.map((change) => (
              <li key={`${change.productId}-${change.stage}`}>
                {productTitle(change.productId)} · {STAGE_LABEL[locale][change.stage]}: {change.from ? routeLabel(change.from) : (en ? `default (${routeLabel(draft[change.stage])})` : `기본값(${routeLabel(draft[change.stage])})`)} → {change.to ? routeLabel(change.to) : (en ? `default (${routeLabel(draft[change.stage])})` : `기본값(${routeLabel(draft[change.stage])})`)}
              </li>
            ))}
          </ul>
        </div>

        <label>
          <span>{en ? "Reason for change" : "변경 사유"}</span>
          <textarea name="reason" minLength={10} maxLength={500} rows={3} required disabled={pending} />
          <small>{en ? "Kept in the audit history." : "감사 이력에 남습니다."}</small>
        </label>
        <div className="admin-model-routing__actions">
          <button type="button" className="button button--ghost" onClick={() => { setDraft(activeRoutes); setOverrides(activeOverrides); setEditing(null); }} disabled={pending || unchanged}>
            {en ? "Discard" : "변경 취소"}
          </button>
          <button type="submit" className="button button--primary" disabled={pending || unchanged}>
            {pending ? (en ? "Applying…" : "적용 중…") : (en ? `Apply new settings${changeCount ? ` (${changeCount})` : ""}` : `새 설정 적용${changeCount ? ` (변경 ${changeCount}건)` : ""}`)}
          </button>
        </div>
        {unchanged && !pending && (
          <small className="admin-role-form__hint" role="status">
            {en ? "Change a model, reasoning level, or a product cell to enable this." : "모델·추론 강도나 상품 칸을 바꾸면 버튼이 활성화됩니다."}
          </small>
        )}
        {state.message && <p className={state.ok ? "form-success" : "field-error"} role={state.ok ? "status" : "alert"}>{state.message}</p>}
      </form>

      <section className="admin-section">
        <h2>{en ? "Previous settings" : "이전 설정"}</h2>
        <div className="table-scroll panel">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{en ? "Version" : "버전"}</th>
                <th>{en ? "When" : "일시"}</th>
                <th>{en ? "By" : "변경자"}</th>
                <th>{en ? "Summary" : "요약"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {props.history.map((row) => (
                <tr key={row.version}>
                  <td>v{row.version}</td>
                  <td>{fmt(row.at)}</td>
                  <td>{row.by}</td>
                  <td>{row.summary}</td>
                  <td>
                    {row.status === "active" ? (
                      <span className="admin-chip admin-chip--admin">{en ? "current" : "현재"}</span>
                    ) : (
                      <details>
                        <summary className="button button--ghost button--small">{en ? "Restore this" : "이 설정으로 되돌리기"}</summary>
                        <form action={rollbackAction} className="provider-form">
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="version" value={row.version} />
                          <p>{en ? `Restores "${row.summary}" as a new version.` : `"${row.summary}"을(를) 새 버전으로 적용합니다.`}</p>
                          <label>
                            <span>{en ? "Reason" : "사유"}</span>
                            <textarea name="reason" minLength={10} maxLength={500} rows={2} required disabled={rollbackPending} />
                          </label>
                          <button type="submit" className="button button--primary button--small" disabled={rollbackPending}>
                            {rollbackPending ? (en ? "Restoring…" : "되돌리는 중…") : (en ? "Confirm" : "확인")}
                          </button>
                        </form>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rollbackState.message && (
          <p className={rollbackState.ok ? "form-success" : "field-error"} role={rollbackState.ok ? "status" : "alert"}>
            {rollbackState.message}
          </p>
        )}
      </section>
    </div>
  );
}
