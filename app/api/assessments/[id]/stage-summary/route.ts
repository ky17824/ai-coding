import { NextResponse } from "next/server";
import { getRequestLocale } from "@/lib/i18n-server";
import { ensureStageSummary } from "@/lib/stage-summary-service";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const locale = await getRequestLocale();
  const en = locale === "en";
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) {
    return NextResponse.json({ message: en ? "Please sign in." : "로그인이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await admin.from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.organization_id) {
    return NextResponse.json({ message: en ? "We couldn't find your organization." : "조직 정보를 찾을 수 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const result = await ensureStageSummary({
    admin,
    assessmentId: id,
    organizationId: profile.organization_id,
    locale
  });
  if (result.status === "failed") {
    return NextResponse.json({
      ...result,
      message: en ? "We couldn't create the assessment summary." : "진단 총평을 생성하지 못했습니다."
    }, { status: 503 });
  }
  return NextResponse.json(result);
}

