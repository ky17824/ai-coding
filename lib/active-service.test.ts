import { describe, expect, it } from "vitest";
import { describeActiveService, selectActiveServices, toActiveServiceRow, type ActiveServiceRow } from "@/lib/active-service";

const NOW = Date.parse("2026-08-18T12:00:00Z");
const row = (over: Partial<ActiveServiceRow> = {}): ActiveServiceRow => ({
  id: "o1", title: "심층 시장조사", status: "generating", pendingQuestions: 0,
  attemptStartedAt: "2026-08-18T11:56:30Z", completedAt: null, updatedAt: "2026-08-18T11:57:00Z", ...over
});

describe("진행 중 서비스 — 상태 문구", () => {
  it("여섯 상태를 다음 할 일 문구와 톤으로 옮긴다", () => {
    expect(describeActiveService(row({ status: "intake" }), "ko", NOW)).toEqual({ tone: "muted", label: "입력 대기" });
    expect(describeActiveService(row({ status: "clarifying", pendingQuestions: 2 }), "ko", NOW)).toEqual({ tone: "warn", label: "답변 필요 2건" });
    expect(describeActiveService(row({ status: "ready" }), "ko", NOW)).toEqual({ tone: "warn", label: "가정 확인 필요" });
    expect(describeActiveService(row({ status: "generating" }), "ko", NOW)).toEqual({ tone: "live", label: "보고서 작성 중 3분" });
    expect(describeActiveService(row({ status: "completed" }), "ko", NOW)).toEqual({ tone: "done", label: "보고서 완료" });
    expect(describeActiveService(row({ status: "failed" }), "ko", NOW)).toEqual({ tone: "danger", label: "다시 시도 필요" });
  });

  it("작성 중 경과는 현재 시도의 실제 시작 시각에서만 나온다 — 모르면 분을 적지 않는다", () => {
    expect(describeActiveService(row({ attemptStartedAt: null }), "ko", NOW).label).toBe("보고서 작성 중");
    expect(describeActiveService(row({ status: "generating" }), "en", NOW).label).toBe("Writing report · 3 min");
    expect(describeActiveService(row({ status: "clarifying", pendingQuestions: 1 }), "en", NOW).label).toBe("1 answer needed");
    expect(describeActiveService(row({ status: "clarifying", pendingQuestions: 0 }), "ko", NOW).label).toBe("답변 필요");
    // 시계가 어긋나 미래 시각이 오면 음수 대신 0분.
    expect(describeActiveService(row({ attemptStartedAt: "2026-08-18T12:30:00Z" }), "ko", NOW).label).toBe("보고서 작성 중 0분");
  });
});

describe("진행 중 서비스 — 선택", () => {
  it("완료 후 14일이 지난 것만 빼고 최근순으로 정렬한다", () => {
    const fresh = row({ id: "fresh", status: "completed", completedAt: "2026-08-10T00:00:00Z", updatedAt: "2026-08-10T00:00:00Z" });
    const stale = row({ id: "stale", status: "completed", completedAt: "2026-07-20T00:00:00Z", updatedAt: "2026-07-20T00:00:00Z" });
    const live = row({ id: "live", updatedAt: "2026-08-18T11:57:00Z" });
    const oldFailed = row({ id: "old-failed", status: "failed", updatedAt: "2026-06-01T00:00:00Z" });
    expect(selectActiveServices([stale, fresh, oldFailed, live], NOW).map((r) => r.id)).toEqual(["live", "fresh", "old-failed"]);
  });

  it("완료 시각이 없는 completed는 신뢰하지 않고 뺀다", () => {
    expect(selectActiveServices([row({ status: "completed", completedAt: null })], NOW)).toEqual([]);
  });
});

describe("진행 중 서비스 — DB 행 변환", () => {
  it("주문 스냅샷 제목과 실행 상태, 현재 시도 시작 시각을 뽑는다", () => {
    const converted = toActiveServiceRow({
      id: "o9",
      service_snapshot: { title: "심층 시장조사" },
      ai_agent_runs: [{
        status: "generating", pending_questions: [], started_at: "2026-08-16T17:17:52Z", completed_at: null, updated_at: "2026-08-18T11:57:00Z",
        generation_stage_log: [
          { stage: "context", at: "2026-08-18T09:27:53Z", attempt: "a1" }, { stage: "research", at: "2026-08-18T09:27:56Z", attempt: "a1" },
          { stage: "context", at: "2026-08-18T11:56:30Z", attempt: "a2" }
        ]
      }]
    });
    expect(converted).toMatchObject({ id: "o9", title: "심층 시장조사", status: "generating", attemptStartedAt: "2026-08-18T11:56:30Z" });
  });

  it("스테이지 로그가 없으면 시도 시작 시각을 모른다고 두고(started_at은 첫 시도 값이라 안 씀), 상태나 제목이 없으면 버린다", () => {
    expect(toActiveServiceRow({ id: "o1", service_snapshot: { title: "t" }, ai_agent_runs: { status: "generating", started_at: "2026-08-16T10:00:00Z", updated_at: "2026-08-18T10:00:00Z" } })?.attemptStartedAt).toBeNull();
    expect(toActiveServiceRow({ id: "o2", service_snapshot: { title: "t" }, ai_agent_runs: { status: "weird" } })).toBeNull();
    expect(toActiveServiceRow({ id: "o3", service_snapshot: {}, ai_agent_runs: { status: "intake" } })).toBeNull();
    expect(toActiveServiceRow({ id: "o4", service_snapshot: { title: "t" }, ai_agent_runs: [] })).toBeNull();
    // 로그 원소가 null이어도 던지지 않는다 — 헤더는 모든 페이지에 있다.
    expect(toActiveServiceRow({ id: "o5", service_snapshot: { title: "t" }, ai_agent_runs: { status: "generating", updated_at: "x", generation_stage_log: [null, 3, { stage: "context", at: "2026-08-18T11:00:00Z" }] } })).toMatchObject({ attemptStartedAt: "2026-08-18T11:00:00Z", updatedAt: "1970-01-01T00:00:00.000Z" });
    expect(toActiveServiceRow({ id: "o6", service_snapshot: "not-an-object", ai_agent_runs: { status: "intake" } })).toBeNull();
  });
});
