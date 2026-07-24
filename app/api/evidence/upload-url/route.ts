import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient, requireUser } from "@/lib/supabase/server";

const schema = z.object({
  answerId: z.string().uuid(),
  fileName: z.string().min(1).max(180),
  mimeType: z.enum(["application/pdf", "image/png", "image/jpeg"]),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  if (!user || !supabase) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "PDF·PNG·JPG 파일만 10MB 이하로 첨부할 수 있습니다." },
      { status: 400 }
    );
  }

  const { data: answer } = await supabase
    .from("readiness_answers")
    .select("id,assessments!inner(created_by)")
    .eq("id", parsed.data.answerId)
    .single();
  const assessment = Array.isArray(answer?.assessments)
    ? answer.assessments[0]
    : answer?.assessments;
  if (!answer || assessment?.created_by !== user.id) {
    return NextResponse.json({ message: "접근 권한이 없습니다." }, { status: 403 });
  }

  const extension =
    parsed.data.mimeType === "application/pdf"
      ? "pdf"
      : parsed.data.mimeType === "image/png"
        ? "png"
        : "jpg";
  const storagePath = `${user.id}/${randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage
    .from("evidence")
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    return NextResponse.json(
      { message: "첨부 링크를 만들지 못했습니다." },
      { status: 500 }
    );
  }
  const { error: metadataError } = await supabase.from("evidence_files").insert({
    answer_id: parsed.data.answerId,
    owner_id: user.id,
    storage_path: storagePath,
    file_name: parsed.data.fileName,
    mime_type: parsed.data.mimeType,
    size_bytes: parsed.data.sizeBytes
  });
  if (metadataError) {
    return NextResponse.json(
      { message: "첨부 메타데이터를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
  return NextResponse.json({
    path: storagePath,
    token: data.token,
    signedUrl: data.signedUrl
  });
}
