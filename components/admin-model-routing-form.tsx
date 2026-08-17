"use client";

import { useActionState, useMemo, useState } from "react";
import { changeModelRouting, rollbackModelRouting, type ModelRoutingActionState } from "@/app/admin/actions";
import { MODEL_CATALOG, MODEL_KEYS, isModelOptionVisible, type Effort, type ModelKey } from "@/lib/ai-models/catalog";
import { STAGES, STAGE_LABEL, diffRoutes, type Routes, type Stage } from "@/lib/ai-models/routing";
import type { Locale } from "@/lib/i18n";

const initial: ModelRoutingActionState = { ok: false, message: "" };

const STAGE_HELP = {
  ko: {
    classification: "제출 정보와 준비도 진단을 분류하고 조사 범위를 정합니다.",
    public_research: "웹검색으로 근거를 모읍니다. 웹검색이 없는 모델은 고를 수 없습니다. 패키지 상품은 여기 설정과 무관하게 이 단계를 자동으로 '높음'으로 실행합니다.",
    final_report: "패키지 상품은 여기 설정과 무관하게 이 단계를 자동으로 '높음'으로 실행합니다."
  },
  en: {
    classification: "Classifies the input and readiness assessment and sets the research scope.",
    public_research: "Gathers evidence with web search. Models without web search cannot be chosen. Package products always run this stage at 'high', regardless of this setting.",
    final_report: "Package products always run this stage at 'high', regardless of this setting."
  }
} as const;
const EFFORT_LABEL = { ko: { low: "낮음", medium: "보통", high: "높음" }, en: { low: "Low", medium: "Medium", high: "High" } } as const;

export function AdminModelRoutingForm(props: {
  locale: Locale;
  activeVersion: number | null;
  activeRoutes: Routes;
  activeMeta: { at: string; by: string } | null;
  hasOpenAiKey: boolean;
  hasAnthropicKey: boolean;
  generatingCount: number;
  last24h: { total: number; byModel: Array<{ label: string; ok: number; failed: number }> };
  history: Array<{ version: number; status: "active" | "superseded"; at: string; by: string; summary: string }>;
}) {
  const { locale, activeRoutes, hasOpenAiKey, hasAnthropicKey } = props;
  const en = locale === "en";
  const [draft, setDraft] = useState<Routes>(activeRoutes);
  const [state, action, pending] = useActionState(changeModelRouting, initial);
  const [rollbackState, rollbackAction, rollbackPending] = useActionState(rollbackModelRouting, initial);
  const changes = useMemo(() => diffRoutes(activeRoutes, draft), [activeRoutes, draft]);
  // 활성 설정이 없으면(신규 배포 직후 등) draft는 시드값과 같아 diff가 비어도 저장할 게 있다.
  // 이 "바뀐 값 없음" 가드는 활성 설정이 있을 때만 적용한다.
  const unchanged = props.activeVersion !== null && changes.length === 0;
  const fmt = (iso: string) => new Intl.DateTimeFormat(en ? "en-US" : "ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  const setStage = (stage: Stage, patch: Partial<{ model: ModelKey; effort: Effort }>) =>
    setDraft((current) => {
      const next = { ...current[stage], ...patch };
      if (patch.model && !MODEL_CATALOG[patch.model].efforts.includes(next.effort)) next.effort = "medium";
      return { ...current, [stage]: next };
    });

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
        {STAGES.map((stage, index) => (
          <section key={stage} className="admin-section panel admin-model-routing__stage">
            <h2><span className="admin-model-routing__index" aria-hidden="true">{index + 1}</span>{STAGE_LABEL[locale][stage]}</h2>
            <div className="admin-model-routing__fields">
              <label>
                <span>{en ? "Model" : "모델"}</span>
                <select
                  name={`${stage}.model`}
                  value={draft[stage].model}
                  onChange={(event) => setStage(stage, { model: event.target.value as ModelKey })}
                  disabled={pending}
                  aria-describedby={`${stage}-help`}
                >
                  {MODEL_KEYS.filter((key) => isModelOptionVisible(MODEL_CATALOG[key], key === activeRoutes[stage].model)).map((key) => {
                    const spec = MODEL_CATALOG[key];
                    const noSearch = stage === "public_research" && !spec.webSearch;
                    const deprecated = Boolean(spec.deprecatedAt);
                    const suffix = (spec.provider === "openai" && !hasOpenAiKey) || (spec.provider === "anthropic" && !hasAnthropicKey)
                      ? (en ? " (key missing)" : " (키 미설정)")
                      : noSearch
                        ? (en ? " (no web search)" : " (웹검색 없음)")
                        : deprecated
                          ? (en ? " (no longer supported)" : " (지원 종료)")
                          : "";
                    return (
                      <option
                        key={key}
                        value={key}
                        disabled={(spec.provider === "openai" && !hasOpenAiKey) || (spec.provider === "anthropic" && !hasAnthropicKey) || noSearch}
                      >
                        {spec.label}{suffix}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label>
                <span>{en ? "Reasoning" : "추론 강도"}</span>
                <select
                  name={`${stage}.effort`}
                  value={draft[stage].effort}
                  onChange={(event) => setStage(stage, { effort: event.target.value as Effort })}
                  disabled={pending}
                  aria-describedby={`${stage}-help`}
                >
                  {MODEL_CATALOG[draft[stage].model].efforts.map((effort) => (
                    <option key={effort} value={effort}>{EFFORT_LABEL[locale][effort]}</option>
                  ))}
                </select>
              </label>
            </div>
            <small id={`${stage}-help`}>{STAGE_HELP[locale][stage]}</small>
          </section>
        ))}

        <div className="notice-banner">
          <strong>{en ? "Effect" : "변경 영향"}</strong>
          <ul>
            <li>
              {en
                ? `Applies to new runs. ${props.generatingCount} run(s) in progress finish with the current settings.`
                : `새 실행부터 적용됩니다. 진행 중 ${props.generatingCount}건은 지금 설정으로 끝납니다.`}
            </li>
            {changes.map((change) => (
              <li key={change.stage}>
                {STAGE_LABEL[locale][change.stage]}: {MODEL_CATALOG[change.from.model].label} · {EFFORT_LABEL[locale][change.from.effort]} → {MODEL_CATALOG[change.to.model].label} · {EFFORT_LABEL[locale][change.to.effort]}
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
          <button type="button" className="button button--ghost" onClick={() => setDraft(activeRoutes)} disabled={pending || unchanged}>
            {en ? "Discard" : "변경 취소"}
          </button>
          <button type="submit" className="button button--primary" disabled={pending || unchanged}>
            {pending ? (en ? "Applying…" : "적용 중…") : (en ? "Apply new settings" : "새 설정 적용")}
          </button>
        </div>
        {unchanged && !pending && (
          <small className="admin-role-form__hint" role="status">
            {en ? "Change a model or reasoning level to enable this." : "모델이나 추론 강도를 바꾸면 버튼이 활성화됩니다."}
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
                          <button type="submit" className="button button--small" disabled={rollbackPending}>
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
