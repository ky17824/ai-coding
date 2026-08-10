"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
  requireUser
} from "@/lib/supabase/server";
import { localizedPath, type Locale } from "@/lib/i18n";

export interface ProviderActionState {
  ok: boolean;
  message: string;
}

const providerSchema = z.object({
  headline: z.string().trim().min(5).max(120),
  biography: z.string().trim().min(50).max(3000),
  expertise: z.string().trim().min(2).max(500),
  verificationNote: z.string().trim().min(10).max(1000)
});

export async function applyProvider(
  _state: ProviderActionState,
  formData: FormData
): Promise<ProviderActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const parsed = providerSchema.safeParse({
    headline: formData.get("headline"),
    biography: formData.get("biography"),
    expertise: formData.get("expertise"),
    verificationNote: formData.get("verificationNote")
  });
  if (!parsed.success) {
    return { ok: false, message: en ? "Provide more detail about your experience and verification evidence." : "경력과 검증 자료를 더 구체적으로 작성해 주세요." };
  }

  const { error } = await admin.from("provider_profiles").insert({
    user_id: user.id,
    headline: parsed.data.headline,
    biography: parsed.data.biography,
    expertise: parsed.data.expertise
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    verification_note: parsed.data.verificationNote
  });
  if (error?.code === "23505") {
    return { ok: false, message: en ? "You have already submitted an expert application." : "이미 전문가 신청서를 제출했습니다." };
  }
  if (error) return { ok: false, message: en ? "We couldn't save the application." : "신청서를 저장하지 못했습니다." };
  await admin.from("profiles").update({ role: "provider" }).eq("id", user.id);
  revalidatePath(localizedPath("/provider", locale));
  return { ok: true, message: en ? "Application received. Our operations team will review it." : "신청이 접수되었습니다. 관리자 검토를 기다려 주세요." };
}

export async function approveProvider(formData: FormData) {
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  if (!user || !supabase || !admin) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return;
  const providerId = String(formData.get("providerId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!providerId || !["approved", "rejected"].includes(decision)) return;
  await admin
    .from("provider_profiles")
    .update({
      approval_status: decision,
      approved_by: decision === "approved" ? user.id : null,
      approved_at: decision === "approved" ? new Date().toISOString() : null
    })
    .eq("id", providerId)
    .eq("approval_status", "pending");
  revalidatePath("/admin");
}

const serviceSchema = z.object({
  type: z.enum(["mentoring", "consulting"]),
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(30).max(2000),
  priceKrw: z.coerce.number().int().min(10000).max(100000000),
  duration: z.coerce.number().int().positive().max(365),
  deliverables: z.string().trim().min(3).max(2000),
  tags: z.string().trim().min(2).max(500),
  firstSlot: z.string().optional()
});

export async function createServiceOffering(
  _state: ProviderActionState,
  formData: FormData
): Promise<ProviderActionState> {
  const locale: Locale = formData.get("locale") === "en" ? "en" : "ko";
  const en = locale === "en";
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) return { ok: false, message: en ? "Please sign in." : "로그인이 필요합니다." };
  const parsed = serviceSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
    priceKrw: formData.get("priceKrw"),
    duration: formData.get("duration"),
    deliverables: formData.get("deliverables"),
    tags: formData.get("tags"),
    firstSlot: formData.get("firstSlot")
  });
  if (!parsed.success) {
    return { ok: false, message: en ? "Review the service scope, price, and duration." : "서비스 범위, 가격, 기간을 확인해 주세요." };
  }
  if (
    parsed.data.type === "mentoring" &&
    ![60, 90].includes(parsed.data.duration)
  ) {
    return { ok: false, message: en ? "Mentoring sessions must be 60 or 90 minutes." : "멘토링은 60분 또는 90분만 등록할 수 있습니다." };
  }
  const { data: provider } = await admin
    .from("provider_profiles")
    .select("id,approval_status")
    .eq("user_id", user.id)
    .single();
  if (!provider || provider.approval_status !== "approved") {
    return { ok: false, message: en ? "Only approved experts can publish services." : "승인된 전문가만 서비스를 등록할 수 있습니다." };
  }
  const { error } = await admin.from("service_offerings").insert({
    provider_id: provider.id,
    type: parsed.data.type,
    title: parsed.data.title,
    description: parsed.data.description,
    price_krw: parsed.data.priceKrw,
    duration_minutes:
      parsed.data.type === "mentoring" ? parsed.data.duration : null,
    duration_days:
      parsed.data.type === "consulting" ? parsed.data.duration : null,
    deliverables: parsed.data.deliverables
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    milestones:
      parsed.data.type === "consulting"
        ? parsed.data.deliverables
            .split("\n")
            .map((item, index) => ({ order: index + 1, title: item.trim() }))
            .filter((item) => item.title)
        : [],
    tags: parsed.data.tags
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    is_published: true
  });
  if (error) return { ok: false, message: en ? "We couldn't publish the service." : "서비스를 등록하지 못했습니다." };

  if (parsed.data.type === "mentoring" && parsed.data.firstSlot) {
    const startsAt = new Date(parsed.data.firstSlot);
    if (startsAt > new Date()) {
      await admin.from("availability").insert({
        provider_id: provider.id,
        starts_at: startsAt.toISOString(),
        ends_at: new Date(
          startsAt.getTime() + parsed.data.duration * 60 * 1000
        ).toISOString()
      });
    }
  }
  revalidatePath(localizedPath("/provider", locale));
  revalidatePath(localizedPath("/services", locale));
  return { ok: true, message: en ? "Service published." : "서비스가 등록되었습니다." };
}
