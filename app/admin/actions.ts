"use server";

import { decryptPhone, formatPhone } from "@/lib/pii";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";

export async function revealPhone(
  profileId: string
): Promise<{ phone: string } | { error: string }> {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!user || !supabase || !admin) return { error: "로그인이 필요합니다." };
  const { data: actor } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (actor?.role !== "admin") return { error: "관리자 권한이 필요합니다." };
  const { data: subject } = await admin.from("profiles").select("phone_enc").eq("id", profileId).single();
  if (!subject?.phone_enc) return { error: "등록된 전화번호가 없습니다." };
  const { error } = await admin.from("pii_access_log").insert({ actor_id: user.id, subject_id: profileId, field: "phone" });
  if (error) return { error: "열람 기록을 남기지 못했습니다." };
  try {
    return { phone: formatPhone(decryptPhone(subject.phone_enc)) };
  } catch {
    return { error: "전화번호를 복호화하지 못했습니다." };
  }
}
