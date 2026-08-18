import { cache } from "react";
import Link from "next/link";
import { localizedPath, type Locale } from "@/lib/i18n";
import { createSupabaseAdminClient, getCurrentProfile } from "@/lib/supabase/server";
import { ACTIVE_SERVICE_COMPLETED_TTL_MS, activeServiceCopy, describeActiveService, selectActiveServices, toActiveServiceRow, type ActiveServiceRow } from "@/lib/active-service";

/**
 * 헤더의 "진행 중 서비스" 알약. 로그인 사용자의 살아 있는 AI 전문가 주문을 `서비스명 · 상태`로 보여 주고
 * 클릭하면 그 주문의 작업공간으로 간다. 둘 이상이면 <details> 드롭다운(자바스크립트 없음).
 *
 * 서버 컴포넌트다. SiteHeader가 <Suspense fallback={null}>로 감싸므로 조회가 페이지 렌더를 막지 않고,
 * 조회가 실패하면 아무것도 그리지 않는다 — 헤더가 주문 조회 때문에 깨지면 안 된다.
 */
// 데스크톱 nav와 모바일 메뉴 두 곳에 마운트되므로 cache()로 요청당 한 번만 조회한다 — getCurrentProfile과 같은 방식.
const loadActiveServices = cache(async function loadActiveServices(): Promise<ActiveServiceRow[]> {
  const { user } = await getCurrentProfile();
  const admin = user ? createSupabaseAdminClient() : null;
  if (!user || !admin) return [];
  // 서비스 롤 클라이언트라 RLS가 없다 — buyer_id 필터가 유일한 테넌시 경계다(주문 페이지와 같은 방식).
  // 살아 있는 실행만 창(limit)에 세도록 임베드 쪽에서 거른다: !inner + 완료 후 14일 조건.
  const cutoff = new Date(Date.now() - ACTIVE_SERVICE_COMPLETED_TTL_MS).toISOString();
  const { data, error } = await admin
    .from("orders")
    .select("id,service_snapshot,ai_agent_runs!inner(status,pending_questions,completed_at,updated_at,generation_stage_log)")
    .eq("buyer_id", user.id)
    .eq("order_kind", "ai_agent")
    .in("status", ["paid", "service_started", "completed"])
    .or(`status.neq.completed,completed_at.gte.${cutoff}`, { referencedTable: "ai_agent_runs" })
    .order("created_at", { ascending: false })
    // ponytail: 창은 created_at 기준 8건. 살아 있는 서비스가 8건을 넘는 계정이 생기면 그때 늘린다.
    .limit(8);
  if (error || !data) {
    // 식별자·드라이버 메시지는 남기지 않는다 — 코드만으로 페이징에 충분하다(app/api/orders/route.ts와 같은 원칙).
    if (error) console.warn("[header-active-service] query failed", { code: error.code });
    return [];
  }
  return selectActiveServices(data.map(toActiveServiceRow).filter((row): row is ActiveServiceRow => row !== null));
});

function Pill({ row, locale }: { row: ActiveServiceRow; locale: Locale }) {
  const { tone, label } = describeActiveService(row, locale === "en" ? "en" : "ko");
  return (
    <span className={`active-service active-service--${tone}`}>
      <span className="active-service__dot" aria-hidden="true">{tone === "done" ? "✓" : ""}</span>
      <span className="active-service__title">{row.title}</span>
      <span className="active-service__state">· {label}</span>
    </span>
  );
}

export async function HeaderActiveService({ locale, mobile = false }: { locale: Locale; mobile?: boolean }) {
  const rows = await loadActiveServices();
  if (!rows.length) return null;
  const c = activeServiceCopy(locale === "en" ? "en" : "ko");
  const [latest, ...rest] = rows;
  if (!rest.length || mobile) {
    // 모바일 메뉴는 이미 세로 목록이라 드롭다운을 겹치지 않고 알약을 그대로 나열한다.
    return (
      <>
        {(mobile ? rows : [latest]).map((row) => (
          <Link key={row.id} href={localizedPath(`/orders/${row.id}`, locale)} className="active-service-link">
            <Pill row={row} locale={locale} />
          </Link>
        ))}
      </>
    );
  }
  return (
    <details className="active-service-menu">
      {/* summary의 접근 가능한 이름은 알약 텍스트 그대로 둔다 — aria-label로 덮으면 서비스명·상태가 사라진다. */}
      <summary title={c.more(rows.length)}>
        <Pill row={latest} locale={locale} />
        <span className="active-service__count">{locale === "en" ? `+${rest.length}` : `외 ${rest.length}건`}</span>
      </summary>
      {/* 키보드 roving focus가 없는 details 드롭다운이므로 menu 역할을 주장하지 않는다 — 평범한 링크 목록이다. */}
      <div className="active-service-menu__list" role="navigation" aria-label={c.menuLabel}>
        {rows.map((row) => (
          <Link key={row.id} href={localizedPath(`/orders/${row.id}`, locale)} className="active-service-menu__item">
            <Pill row={row} locale={locale} />
          </Link>
        ))}
      </div>
    </details>
  );
}
