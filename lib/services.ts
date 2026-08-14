import { aiExpertServicesEnabled, getAiAgentService, getAiAgentServices } from "@/lib/ai-agent-services";
import { getSampleServices } from "@/lib/service-data";
import type { Locale } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ServiceOffering, ServiceType } from "@/lib/types";

interface ServiceRow {
  id: string; provider_id: string; type: ServiceType; title: string; description: string; price_krw: number;
  duration_minutes: number | null; duration_days: number | null; deliverables: string[]; tags: string[];
  provider_profiles: { headline: string; profiles: { display_name: string } | { display_name: string }[] } | { headline: string; profiles: { display_name: string } | { display_name: string }[] }[];
}

function mapService(row: ServiceRow, locale: Locale): ServiceOffering {
  const en = locale === "en";
  const provider = Array.isArray(row.provider_profiles) ? row.provider_profiles[0] : row.provider_profiles;
  const profile = Array.isArray(provider?.profiles) ? provider.profiles[0] : provider?.profiles;
  return {
    id: row.id, providerId: row.provider_id,
    providerName: profile?.display_name ?? (en ? "Approved expert" : "승인 전문가"),
    providerTitle: provider?.headline ?? (en ? "Global expansion expert" : "글로벌 진출 전문가"),
    type: row.type, title: row.title, description: row.description, price: row.price_krw,
    durationLabel: row.type === "mentoring" ? `${row.duration_minutes ?? 60}${en ? " minutes" : "분"}` : `${row.duration_days ?? 1}${en ? " days" : "일"}`,
    tags: row.tags, deliverables: row.deliverables, approved: true, rating: 0, reviewCount: 0
  };
}

async function getHumanServices(locale: Locale) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return process.env.NODE_ENV === "development" ? getSampleServices(locale) : [];
  const { data, error } = await supabase.from("service_offerings")
    .select("id,provider_id,type,title,description,price_krw,duration_minutes,duration_days,deliverables,tags,provider_profiles!inner(headline,profiles!inner(display_name))")
    .eq("is_published", true).limit(50);
  return error || !data?.length ? [] : (data as unknown as ServiceRow[]).map((row) => mapService(row, locale));
}

export async function getPublishedServices(locale: Locale = "ko") {
  return aiExpertServicesEnabled() ? getAiAgentServices(locale) : getHumanServices(locale);
}

export async function getPublishedService(id: string, locale: Locale = "ko") {
  if (aiExpertServicesEnabled()) return getAiAgentService(id, locale);
  const service = (await getHumanServices(locale)).find((item) => item.id === id) ?? null;
  const supabase = await createSupabaseServerClient();
  if (!service || !supabase || !service.providerId || service.id.startsWith("svc-")) return service;
  const { data } = await supabase.from("availability").select("id,starts_at,ends_at").eq("provider_id", service.providerId).gte("starts_at", new Date().toISOString()).order("starts_at").limit(20);
  return { ...service, availableSlots: data?.map((slot) => ({ id: slot.id, startsAt: slot.starts_at, endsAt: slot.ends_at })) ?? [] };
}
