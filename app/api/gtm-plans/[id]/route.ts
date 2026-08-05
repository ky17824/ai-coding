import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({
    action: z.literal("update_item"),
    itemId: z.string().uuid(),
    ownerLabel: z.string().trim().min(1).max(80),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    completionEvidence: z.string().trim().min(1).max(400),
    status: z.enum(["not_started", "in_progress", "completed", "blocked"])
  })
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsed = requestSchema.safeParse(await request.json());
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!parsed.success) {
    return NextResponse.json({ message: "계획 입력값을 확인해 주세요." }, { status: 400 });
  }
  if (!user || !admin) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }
  const { id } = await params;
  const { data: plan } = await admin
    .from("gtm_plans")
    .select("id,organization_id")
    .eq("id", id)
    .maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!plan || plan.organization_id !== profile?.organization_id) {
    return NextResponse.json({ message: "계획을 찾을 수 없습니다." }, { status: 404 });
  }

  if (parsed.data.action === "approve") {
    const { error } = await admin
      .from("gtm_plans")
      .update({ status: "active", approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", id);
    return error
      ? NextResponse.json({ message: "계획을 승인하지 못했습니다." }, { status: 500 })
      : NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("gtm_plan_items")
    .update({
      owner_label: parsed.data.ownerLabel,
      due_date: parsed.data.dueDate,
      completion_evidence: parsed.data.completionEvidence,
      status: parsed.data.status,
      completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq("id", parsed.data.itemId)
    .eq("plan_id", id);
  return error
    ? NextResponse.json({ message: "계획 항목을 저장하지 못했습니다." }, { status: 500 })
    : NextResponse.json({ ok: true });
}
