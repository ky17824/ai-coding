import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AdminNav } from "@/components/admin-nav";
import { AdminModelRoutingForm } from "@/components/admin-model-routing-form";
import { localizedPath } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n-server";
import { modelLabel } from "@/lib/ai-models/catalog";
import { describeRouting, routesSchema, SEED_ROUTES, validateProductOverrides, type ProductOverrides, type Routes } from "@/lib/ai-models/routing";
import { aggregateProductStats, type ProductRunRow } from "@/lib/ai-models/product-stats";
import { listCatalogProducts } from "@/lib/catalog";
import { PRODUCT_COPY } from "@/lib/catalog/copy";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "AI models" : "AI 모델" };
}

type CreatorName = { display_name: string } | { display_name: string }[] | null;

function creatorName(value: CreatorName, fallback: string): string {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.display_name ?? fallback;
}

type RoutingConfigRow = {
  version: number;
  status: "active" | "superseded";
  routes: unknown;
  product_overrides: unknown;
  reason: string | null;
  created_at: string;
  created_by: string | null;
  profiles: CreatorName;
};

export default async function AdminAiModelsPage() {
  const [{ user: actor, profile }, locale] = await Promise.all([getCurrentProfile(), getRequestLocale()]);
  const en = locale === "en";
  if (!actor || profile?.role !== "admin" || profile.deleted_at) redirect(localizedPath("/dashboard", locale));
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured");

  const [{ data: configs }, { data: recentRuns }, { count: generating }, { data: monthRuns }] = await Promise.all([
    admin
      .from("ai_model_routing_configs")
      .select("version,status,routes,product_overrides,reason,created_at,created_by,profiles(display_name)")
      .order("version", { ascending: false })
      .limit(20),
    admin.from("ai_agent_runs").select("model_attempts").gte("updated_at", new Date(Date.now() - 86_400_000).toISOString()),
    admin.from("ai_agent_runs").select("order_id", { count: "exact", head: true }).eq("status", "generating"),
    // 상품별 실측(최근 30일). 상품은 orders.product_key에만 있어 임베드로 붙인다.
    admin
      .from("ai_agent_runs")
      .select("status,completed_at,generation_stage_log,model_attempts,orders!inner(product_key)")
      .in("status", ["completed", "failed"])
      .gte("updated_at", new Date(Date.now() - 30 * 86_400_000).toISOString())
      .limit(500)
  ]);

  const rows = (configs ?? []) as RoutingConfigRow[];
  const active = rows.find((row) => row.status === "active");
  const activeRoutes: Routes | null = active
    ? (routesSchema.safeParse(active.routes).success ? routesSchema.parse(active.routes) : null)
    : null;
  // 상품별 조정을 받을 수 있는 상품 = 지금 노출된 AI 전문가 상품(전문가 7 + 패키지 2).
  const routableProducts = listCatalogProducts().filter((product) => product.includedAgentIds.length > 0);
  const productIds = routableProducts.map((product) => product.id);
  const overridesOf = (value: unknown): ProductOverrides => {
    // 저장된 값은 서버 액션이 검증했지만, 카탈로그에서 빠진 상품이 남아 있을 수 있어 화면에는 아는 것만 올린다.
    const parsed = validateProductOverrides(value ?? {}, { hasOpenAiKey: true, hasAnthropicKey: true }, productIds);
    return parsed.ok ? parsed.overrides : {};
  };
  const activeOverrides = active ? overridesOf(active.product_overrides) : {};
  const productStats = aggregateProductStats((monthRuns ?? []) as ProductRunRow[]);

  // ai_agent_runs.model은 fail_ai_agent_generation이 절대 채우지 않아 실패한 실행은 전부
  // 시드 모델로 잘못 잡힌다(§4.3). model_attempts는 성공·실패 모두 단계별로 남으므로 이걸 센다.
  const byModel = new Map<string, { ok: number; failed: number }>();
  for (const run of recentRuns ?? []) {
    const attempts = Array.isArray(run.model_attempts) ? run.model_attempts : [];
    for (const attempt of attempts) {
      if (!attempt || typeof attempt !== "object" || typeof attempt.model !== "string") continue;
      const bucket = byModel.get(attempt.model) ?? { ok: 0, failed: 0 };
      if (attempt.ok) bucket.ok += 1; else bucket.failed += 1;
      byModel.set(attempt.model, bucket);
    }
  }

  const systemLabel = en ? "system" : "시스템";
  // API 키 값 자체는 절대 클라이언트로 보내지 않는다. 설정되어 있는지 여부(boolean)만 넘긴다.
  const keyStatus = {
    hasOpenAiKey: Boolean(process.env.OPENAI_API_KEY),
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY)
  };

  return (
    <main className="app-page">
      <SiteHeader compact locale={locale} />
      <div className="app-container">
        <AdminNav locale={locale} />
        <span className="page-kicker">ADMIN</span>
        <h1 className="page-title">{en ? "AI models" : "AI 모델"}</h1>
        <p className="page-description">
          {en
            ? "Sets which model each stage of the AI expert service uses — shared defaults, plus per-product overrides where a product needs more. Changes apply to new runs."
            : "AI 전문가 서비스가 단계별로 어떤 모델을 쓰는지 정합니다. 공통 기본값을 두고, 상품마다 필요한 단계만 조정합니다. 바꾸면 새 실행부터 적용됩니다."}
        </p>
        {!activeRoutes && (
          <p className="notice-banner notice-banner--error" role="alert">
            {en
              ? "There is no active configuration, so new runs are refused. Save one below."
              : "활성 설정이 없어 새 실행이 거절됩니다. 아래에서 저장하세요."}
          </p>
        )}
        <AdminModelRoutingForm
          locale={locale}
          activeVersion={active?.version ?? null}
          activeRoutes={activeRoutes ?? SEED_ROUTES}
          activeOverrides={activeOverrides}
          products={routableProducts.map((product) => ({ id: product.id, title: PRODUCT_COPY[product.id]?.title[locale] ?? product.id, kind: product.productKind }))}
          productStats={productStats}
          activeMeta={active ? { at: active.created_at, by: creatorName(active.profiles, systemLabel) } : null}
          hasOpenAiKey={keyStatus.hasOpenAiKey}
          hasAnthropicKey={keyStatus.hasAnthropicKey}
          generatingCount={generating ?? 0}
          last24h={{
            total: [...byModel.values()].reduce((sum, counts) => sum + counts.ok + counts.failed, 0),
            byModel: [...byModel.entries()].map(([model, counts]) => ({ label: modelLabel(model), ...counts }))
          }}
          history={rows.map((row) => ({
            version: row.version,
            status: row.status,
            at: row.created_at,
            by: creatorName(row.profiles, systemLabel),
            summary: routesSchema.safeParse(row.routes).success ? describeRouting(routesSchema.parse(row.routes), overridesOf(row.product_overrides), locale) : "—"
          }))}
        />
      </div>
    </main>
  );
}
