import { describe, expect, it, vi } from "vitest";
import { questionsOfStage } from "@/lib/readiness";
import { ensureStageSummary } from "@/lib/stage-summary-service";
import type { ReadinessAnswer } from "@/lib/types";

const summary = {
  headline: "실행 기반을 먼저 확정해야 하는 준비 단계입니다",
  overview: "글로벌 진출의 필요성은 확인했지만 책임자와 예산 기준이 충분히 정리되지 않았습니다. 지금은 실행 전에 내부 의사결정 기반을 만드는 것이 우선입니다.",
  whyItMatters: "책임과 비용 기준 없이 진출하면 검증 업무가 지연되고 예상 밖 비용에도 중단 결정을 내리기 어렵습니다. 이는 시간과 자원의 반복 손실로 이어질 수 있습니다.",
  priorityActions: [{
    title: "진출 책임자와 예산을 확정하세요",
    reason: "책임자와 비용 상한이 있어야 검증 과제가 국내 업무에 밀리지 않고 의사결정이 이어집니다.",
    direction: "경영진 회의에서 담당자, 주당 투입 시간, 총비용 상한을 문서로 합의합니다."
  }],
  nextMilestone: "담당자와 예산, 중단 기준을 문서로 합의하면 다음 단계의 시장 검증을 시작할 수 있습니다."
};

const answers: ReadinessAnswer[] = questionsOfStage("early").map((question) => ({
  questionId: question.id,
  level: 3,
  evidence: question.critical ? { kind: "note", value: "확인 기록" } : undefined
}));

function createAdmin(initial: Record<string, unknown>, reserveAllowed = true) {
  const row = { ...initial };
  const updates: Record<string, unknown>[] = [];
  return {
    row,
    updates,
    from(table: string) {
      if (table === "readiness_answers") {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null })
          })
        };
      }
      return {
        select: () => {
          const chain = {
            eq: () => chain,
            maybeSingle: async () => ({ data: { ...row }, error: null })
          };
          return chain;
        },
        update(patch: Record<string, unknown>) {
          updates.push(patch);
          const isReservation = patch.stage_summary_status === "generating";
          const apply = () => {
            if (!isReservation || reserveAllowed) Object.assign(row, patch);
          };
          const result = async () => {
            apply();
            return { data: null, error: null };
          };
          const chain = {
            eq: () => chain,
            in: () => chain,
            is: () => chain,
            select: () => chain,
            maybeSingle: async () => {
              if (!reserveAllowed) return { data: null, error: null };
              apply();
              return { data: { id: row.id }, error: null };
            },
            then(resolve: (value: { data: null; error: null }) => unknown) {
              return result().then(resolve);
            }
          };
          return chain;
        }
      };
    }
  };
}

describe("stage summary persistence", () => {
  it("returns a stored complete summary without generating again", async () => {
    const admin = createAdmin({
      id: "assessment-1",
      stage_summary: summary,
      stage_summary_status: "complete"
    });
    const generate = vi.fn();

    const result = await ensureStageSummary({
      admin: admin as never,
      assessmentId: "assessment-1",
      organizationId: "org-1",
      locale: "ko",
      generate
    });

    expect(result).toEqual({ status: "complete", summary });
    expect(generate).not.toHaveBeenCalled();
    expect(admin.updates).toHaveLength(0);
  });

  it("reserves generation and stores one successful summary", async () => {
    const admin = createAdmin({
      id: "assessment-1",
      stage_summary: null,
      stage_summary_status: "pending"
    });
    const generate = vi.fn().mockResolvedValue(summary);

    const result = await ensureStageSummary({
      admin: admin as never,
      assessmentId: "assessment-1",
      organizationId: "org-1",
      locale: "ko",
      answers,
      generate
    });

    expect(result).toEqual({ status: "complete", summary });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(admin.row).toMatchObject({
      stage_summary: summary,
      stage_summary_status: "complete",
      stage_summary_model: "gpt-5.6-sol",
      stage_summary_locale: "ko"
    });
  });

  it("does not generate when another request won the reservation", async () => {
    const admin = createAdmin({
      id: "assessment-1",
      stage_summary: null,
      stage_summary_status: "pending"
    }, false);
    const generate = vi.fn();

    const result = await ensureStageSummary({
      admin: admin as never,
      assessmentId: "assessment-1",
      organizationId: "org-1",
      locale: "ko",
      answers,
      generate
    });

    expect(result).toEqual({ status: "generating", summary: null });
    expect(generate).not.toHaveBeenCalled();
  });

  it("marks only the summary as failed when Sol fails", async () => {
    const admin = createAdmin({
      id: "assessment-1",
      stage_summary: null,
      stage_summary_status: "pending"
    });
    const generate = vi.fn().mockRejectedValue(new Error("model unavailable"));

    const result = await ensureStageSummary({
      admin: admin as never,
      assessmentId: "assessment-1",
      organizationId: "org-1",
      locale: "ko",
      answers,
      generate
    });

    expect(result).toEqual({ status: "failed", summary: null });
    expect(admin.row).toMatchObject({ stage_summary: null, stage_summary_status: "failed" });
  });
});
