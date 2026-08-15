import { beforeEach, describe, expect, it, vi } from "vitest";

const createQuery = (result: { data: unknown; error: unknown }) => {
  const query: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order"]) query[method] = () => query;
  query.single = () => Promise.resolve(result);
  query.maybeSingle = () => Promise.resolve(result);
  query.limit = () => Promise.resolve(result);
  query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return query;
};

let failureTable = "";
const admin = {
  from(table: string) {
    const data = table === "profiles"
      ? { organization_id: "org-1" }
      : table === "gtm_plans"
        ? { id: "plan-1", organization_id: "org-1", assessment_id: "assessment-1" }
        : table === "gtm_plan_items"
          ? []
          : table === "assessments"
            ? { survey_version: "5.0", sales_motion: "direct" }
            : [];
    return createQuery({ data, error: table === failureTable ? { message: "database unavailable" } : null });
  }
};

vi.mock("@/lib/i18n-server", () => ({ getRequestLocale: async () => "ko" }));
vi.mock("@/lib/supabase/server", () => ({
  requireUser: async () => ({ id: "user-1" }),
  createSupabaseAdminClient: () => admin
}));

import { buildReferenceIndex, citationNumbers, GET } from "@/app/api/gtm-plans/[id]/export/route";

const get = () => GET(new Request("https://example.com/api/gtm-plans/plan-1/export"), {
  params: Promise.resolve({ id: "plan-1" })
});

describe("market report readiness coverage", () => {
  beforeEach(() => { failureTable = ""; });

  it.each(["assessments", "readiness_answers"])("fails closed when %s cannot be loaded", async (table) => {
    failureTable = table;
    expect((await get()).status).toBe(500);
  });
});

describe("market report citations", () => {
  it("deduplicates references in first-appearance order and rejects unsafe links", () => {
    const source = { title: "A", url: "https://a.example/report", publisher: "A" };
    const index = buildReferenceIndex([
      source,
      { title: "A duplicate", url: "https://a.example/report", publisher: "A" },
      { title: "Unsafe", url: "javascript:alert(1)", publisher: "B" }
    ]);

    expect(index.references.map((entry) => entry.number)).toEqual([1, 2]);
    expect(index.references[0].href).toBe("https://a.example/report");
    expect(index.references[1].href).toBeNull();
    expect(citationNumbers(index, [source, source])).toEqual([1]);
  });
});
