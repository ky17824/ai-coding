/**
 * 헤더의 "진행 중 서비스" 알약이 쓰는 순수 로직.
 *
 * 무엇을 보여줄지(selectActiveServices)와 어떻게 부를지(describeActiveService)를 서버 컴포넌트에서
 * 떼어 두어 단위 테스트가 가능하다. 여기서 만드는 값은 전부 서버가 기록한 상태에서 나온다 —
 * 진행 화면과 같은 정직성 원칙이다. "작성 중 N분"도 현재 시도의 실제 시작 시각 기준이다.
 */

export type ActiveRunStatus = "intake" | "clarifying" | "ready" | "generating" | "completed" | "failed";
export type ActiveTone = "muted" | "warn" | "live" | "done" | "danger";

export type ActiveServiceRow = {
  id: string;
  title: string;
  status: ActiveRunStatus;
  pendingQuestions: number;
  /** 현재 시도의 시작 시각(generation_stage_log의 마지막 context 항목). started_at은 첫 시도의 값이라 쓰지 않는다. */
  attemptStartedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

/** 완료 후 이 기간이 지나면 헤더에서 내린다. 보고서를 며칠에 걸쳐 다시 여는 것이 실제 패턴이라 바로 내리지 않는다. */
export const ACTIVE_SERVICE_COMPLETED_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const copy = {
  ko: {
    intake: "입력 대기",
    clarifying: (n: number) => (n > 0 ? `답변 필요 ${n}건` : "답변 필요"),
    ready: "가정 확인 필요",
    generating: (minutes: number | null) => (minutes === null ? "보고서 작성 중" : `보고서 작성 중 ${minutes}분`),
    completed: "보고서 완료",
    failed: "다시 시도 필요",
    more: (n: number) => `AI 전문가 서비스 ${n}건`,
    menuLabel: "진행 중인 AI 전문가 서비스"
  },
  en: {
    intake: "Awaiting input",
    clarifying: (n: number) => (n > 0 ? `${n} answer${n === 1 ? "" : "s"} needed` : "Answers needed"),
    ready: "Confirm assumptions",
    generating: (minutes: number | null) => (minutes === null ? "Writing report" : `Writing report · ${minutes} min`),
    completed: "Report ready",
    failed: "Retry needed",
    more: (n: number) => `${n} AI expert services`,
    menuLabel: "AI expert services in progress"
  }
};

export function activeServiceCopy(locale: "ko" | "en") {
  return copy[locale];
}

/** 헤더에 남길 것만 최근순으로. completed는 14일 이내만. */
export function selectActiveServices(rows: ActiveServiceRow[], now = Date.now()): ActiveServiceRow[] {
  return rows
    .filter((row) => {
      if (row.status !== "completed") return true;
      const completed = row.completedAt ? new Date(row.completedAt).getTime() : NaN;
      return Number.isFinite(completed) && now - completed <= ACTIVE_SERVICE_COMPLETED_TTL_MS;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function describeActiveService(row: ActiveServiceRow, locale: "ko" | "en", now = Date.now()): { tone: ActiveTone; label: string } {
  const c = copy[locale];
  switch (row.status) {
    case "intake": return { tone: "muted", label: c.intake };
    case "clarifying": return { tone: "warn", label: c.clarifying(row.pendingQuestions) };
    case "ready": return { tone: "warn", label: c.ready };
    case "generating": {
      // 헤더는 페이지 렌더 시각의 값이다(페이지 이동마다 새로 계산, 한 페이지 안에서는 고정). 실시간 경과는 작업공간이 보여 준다.
      const began = row.attemptStartedAt ? new Date(row.attemptStartedAt).getTime() : NaN;
      const minutes = Number.isFinite(began) ? Math.max(0, Math.floor((now - began) / 60000)) : null;
      return { tone: "live", label: c.generating(minutes) };
    }
    case "completed": return { tone: "done", label: c.completed };
    case "failed": return { tone: "danger", label: c.failed };
  }
}

/** DB 행(orders + ai_agent_runs 임베드)을 알약 입력으로. 모양이 어긋나면 그 행은 버린다. */
export function toActiveServiceRow(order: {
  id: string;
  service_snapshot: unknown;
  ai_agent_runs: unknown;
}): ActiveServiceRow | null {
  const run = Array.isArray(order.ai_agent_runs) ? order.ai_agent_runs[0] : order.ai_agent_runs;
  if (!run || typeof run !== "object") return null;
  const r = run as { status?: unknown; pending_questions?: unknown; completed_at?: unknown; updated_at?: unknown; generation_stage_log?: unknown };
  const status = r.status;
  if (status !== "intake" && status !== "clarifying" && status !== "ready" && status !== "generating" && status !== "completed" && status !== "failed") return null;
  const snapshot = order.service_snapshot && typeof order.service_snapshot === "object" ? order.service_snapshot as { title?: unknown } : null;
  const title = snapshot && typeof snapshot.title === "string" ? snapshot.title : "";
  if (!title) return null;
  const log = Array.isArray(r.generation_stage_log) ? r.generation_stage_log as Array<{ stage?: unknown; at?: unknown }> : [];
  // jsonb 배열 원소가 null이거나 원시값일 수 있다 — 헤더는 모든 페이지에 있으므로 여기서 던지면 안 된다.
  const lastContext = [...log].reverse().find((entry) => entry?.stage === "context" && typeof entry?.at === "string");
  return {
    id: order.id,
    title,
    status,
    pendingQuestions: Array.isArray(r.pending_questions) ? r.pending_questions.length : 0,
    // started_at은 첫 시도의 시각이 영구히 남는다(010 마이그레이션 coalesce). 재시도 중 그걸 쓰면 경과가 부풀려지므로 로그만 믿는다.
    attemptStartedAt: (lastContext?.at as string | undefined) ?? null,
    completedAt: typeof r.completed_at === "string" ? r.completed_at : null,
    updatedAt: typeof r.updated_at === "string" && Number.isFinite(Date.parse(r.updated_at)) ? r.updated_at : new Date(0).toISOString()
  };
}
