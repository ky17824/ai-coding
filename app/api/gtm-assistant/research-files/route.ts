import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { inspectResearchFile, marketResearchDocumentSchema } from "@/lib/gtm-research-documents";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

const deleteSchema = z.object({
  assessmentId: z.string().uuid(),
  documentId: z.string().uuid()
});

function unavailable() {
  return process.env.AI_GTM_RESEARCH_UPLOADS_ENABLED !== "true";
}

async function contextFor(assessmentId: string) {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) return { error: NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 }) } as const;
  const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
  if (!profile?.organization_id) return { error: NextResponse.json({ message: "조직 정보를 찾을 수 없습니다." }, { status: 403 }) } as const;
  const { data: assessment } = await admin.from("assessments").select("id").eq("id", assessmentId)
    .eq("organization_id", profile.organization_id).maybeSingle();
  if (!assessment) return { error: NextResponse.json({ message: "진단 결과를 찾을 수 없습니다." }, { status: 404 }) } as const;
  return { admin, assessment, profile, user } as const;
}

async function openPlan(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  assessmentId: string,
  organizationId: string,
  userId: string
) {
  const { data: existing } = await admin.from("gtm_plans")
    .select("id,created_by,market_research_documents")
    .eq("assessment_id", assessmentId).in("status", ["draft", "active"]).maybeSingle();
  if (existing) return existing;
  const { data: created } = await admin.from("gtm_plans").insert({
    organization_id: organizationId,
    assessment_id: assessmentId,
    created_by: userId,
    market_research_count: 0
  }).select("id,created_by,market_research_documents").maybeSingle();
  if (created) return created;
  const { data: raced } = await admin.from("gtm_plans")
    .select("id,created_by,market_research_documents")
    .eq("assessment_id", assessmentId).in("status", ["draft", "active"]).maybeSingle();
  return raced;
}

export async function POST(request: Request) {
  if (unavailable()) return NextResponse.json({ message: "자료 첨부 기능을 사용할 수 없습니다." }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const assessmentId = form?.get("assessmentId");
  const file = form?.get("file");
  if (typeof assessmentId !== "string" || !z.string().uuid().safeParse(assessmentId).success || !(file instanceof File) || file.name.length > 180) {
    return NextResponse.json({ message: "PDF·PNG·JPG 파일만 4MB 이하로 첨부할 수 있습니다." }, { status: 400 });
  }
  let inspected: Awaited<ReturnType<typeof inspectResearchFile>>;
  try {
    inspected = await inspectResearchFile(file);
  } catch {
    return NextResponse.json({ message: "PDF·PNG·JPG 파일만 4MB 이하로 첨부할 수 있습니다." }, { status: 400 });
  }
  const context = await contextFor(assessmentId);
  if ("error" in context) return context.error;
  const plan = await openPlan(context.admin, assessmentId, context.profile.organization_id, context.user.id);
  if (!plan || plan.created_by !== context.user.id) {
    return NextResponse.json({ message: "이 계획에는 자료를 첨부할 수 없습니다." }, { status: 403 });
  }

  const id = randomUUID();
  const bytes = Buffer.from(await file.arrayBuffer());
  const storagePath = `${context.user.id}/gtm-research/${assessmentId}/${id}.${inspected.extension}`;
  const document = marketResearchDocumentSchema.parse({
    id,
    displayName: file.name,
    mimeType: inspected.mimeType,
    size: inspected.size,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    storagePath,
    status: "uploaded",
    evidence: null,
    errorMessage: null,
    createdAt: new Date().toISOString()
  });
  const { error: uploadError } = await context.admin.storage.from("evidence").upload(storagePath, bytes, {
    contentType: inspected.mimeType,
    upsert: false
  });
  if (uploadError) return NextResponse.json({ message: "자료를 업로드하지 못했습니다." }, { status: 500 });

  const { data: documents, error } = await context.admin.rpc("append_gtm_research_document", {
    p_plan_id: plan.id,
    p_user_id: context.user.id,
    p_document: document
  });
  if (error || !documents) {
    await context.admin.storage.from("evidence").remove([storagePath]);
    return NextResponse.json({ message: "자료는 최대 3개까지 첨부할 수 있습니다." }, { status: 409 });
  }
  return NextResponse.json({ planId: plan.id, documents });
}

export async function DELETE(request: Request) {
  if (unavailable()) return NextResponse.json({ message: "자료 첨부 기능을 사용할 수 없습니다." }, { status: 404 });
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "삭제할 자료를 확인해 주세요." }, { status: 400 });
  const context = await contextFor(parsed.data.assessmentId);
  if ("error" in context) return context.error;
  const plan = await openPlan(context.admin, parsed.data.assessmentId, context.profile.organization_id, context.user.id);
  if (!plan || plan.created_by !== context.user.id) return NextResponse.json({ message: "자료를 찾을 수 없습니다." }, { status: 404 });

  const { data: removed, error } = await context.admin.rpc("remove_gtm_research_document", {
    p_plan_id: plan.id,
    p_user_id: context.user.id,
    p_document_id: parsed.data.documentId
  });
  const document = marketResearchDocumentSchema.safeParse(removed);
  if (error || !document.success) return NextResponse.json({ message: "자료를 삭제하지 못했습니다." }, { status: 409 });
  if (document.data.storagePath) {
    const { error: storageError } = await context.admin.storage.from("evidence").remove([document.data.storagePath]);
    if (storageError) {
      const restored = { ...document.data, status: "uploaded", evidence: null, errorMessage: null } as const;
      const { error: restoreError } = await context.admin.rpc("append_gtm_research_document", {
        p_plan_id: plan.id,
        p_user_id: context.user.id,
        p_document: restored
      });
      return NextResponse.json({ message: restoreError ? "자료 상태를 복구하지 못했습니다. 운영팀에 문의해 주세요." : "원본 자료를 삭제하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
    }
  }
  const { data: refreshed } = await context.admin.from("gtm_plans").select("market_research_documents").eq("id", plan.id).single();
  return NextResponse.json({ documents: refreshed?.market_research_documents ?? [] });
}
