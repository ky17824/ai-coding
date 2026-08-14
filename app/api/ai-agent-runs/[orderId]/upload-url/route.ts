import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg"]);
const maxSize = 4 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size <= 0 || file.size > maxSize || file.name.length > 180) {
    return NextResponse.json({ message: "PDF·PNG·JPG 파일만 4MB 이하로 첨부할 수 있습니다." }, { status: 400 });
  }
  const { orderId } = await params;
  const { data: run } = await admin.from("ai_agent_runs").select("order_id,buyer_id,status,reference_files").eq("order_id", orderId).eq("buyer_id", user.id).maybeSingle();
  if (!run) return NextResponse.json({ message: "AI 주문을 찾을 수 없습니다." }, { status: 404 });
  if (run.status === "generating") return NextResponse.json({ message: "보고서 생성 중에는 파일을 추가할 수 없습니다." }, { status: 409 });
  if ((Array.isArray(run.reference_files) ? run.reference_files.length : 0) >= 3) return NextResponse.json({ message: "참고 파일은 최대 3개까지 첨부할 수 있습니다." }, { status: 409 });
  const extension = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const storagePath = `${user.id}/ai-agent/${orderId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage.from("evidence").upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ message: "파일을 업로드하지 못했습니다." }, { status: 500 });
  const referenceFile = { storagePath, fileName: file.name, mimeType: file.type, sizeBytes: file.size };
  const { data: updated, error } = await admin.rpc("append_ai_agent_reference_file", { p_order_id: orderId, p_buyer_id: user.id, p_file: referenceFile });
  if (error || !updated) {
    await admin.storage.from("evidence").remove([storagePath]);
    return NextResponse.json({ message: "첨부 정보를 저장하지 못했습니다." }, { status: 409 });
  }
  return NextResponse.json({ file: referenceFile, referenceFiles: updated.reference_files });
}
