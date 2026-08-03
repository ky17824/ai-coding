"use server";

import { z } from "zod";
import { safeNextPath } from "@/lib/auth";
import { encryptPhone, normalizePhone } from "@/lib/pii";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface SignUpState {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
}

const schema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(10).max(72),
    passwordConfirm: z.string(),
    displayName: z.string().trim().min(1).max(40),
    companyName: z.string().trim().min(1).max(120),
    jobTitle: z.string().trim().min(1).max(60),
    phone: z.string().trim().min(1).max(30),
    agreeTerms: z.literal("on"),
    agreePrivacy: z.literal("on"),
    marketingOptIn: z.boolean(),
    next: z.string().optional()
  })
  .refine((value) => value.password === value.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "비밀번호가 일치하지 않습니다."
  });

export async function signUpWithPassword(
  _state: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
    displayName: formData.get("displayName"),
    companyName: formData.get("companyName"),
    jobTitle: formData.get("jobTitle"),
    phone: formData.get("phone"),
    agreeTerms: formData.get("agreeTerms"),
    agreePrivacy: formData.get("agreePrivacy"),
    marketingOptIn: formData.get("marketingOptIn") === "on",
    next: formData.get("next") || undefined
  });
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    return {
      ok: false,
      message: "입력한 가입 정보를 확인해 주세요.",
      fieldErrors: Object.fromEntries(
        Object.entries(fields).map(([key, messages]) => [key, messages?.[0] ?? ""])
      )
    };
  }

  let phoneEnc: string;
  try {
    normalizePhone(parsed.data.phone);
    phoneEnc = encryptPhone(parsed.data.phone);
  } catch (error) {
    return {
      ok: false,
      message: "입력한 가입 정보를 확인해 주세요.",
      fieldErrors: { phone: error instanceof Error ? error.message : "번호를 확인해 주세요." }
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, message: "인증 환경이 연결되지 않았습니다." };
  const next = safeNextPath(parsed.data.next);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const agreedAt = new Date().toISOString();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      data: {
        display_name: parsed.data.displayName,
        company_name: parsed.data.companyName,
        job_title: parsed.data.jobTitle,
        phone_enc: phoneEnc,
        marketing_opt_in: parsed.data.marketingOptIn,
        terms_agreed_at: agreedAt,
        privacy_agreed_at: agreedAt
      }
    }
  });
  if (error) return { ok: false, message: "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요." };
  return {
    ok: true,
    message: "입력하신 주소로 메일을 보냈습니다. 메일함을 확인해 주세요."
  };
}
