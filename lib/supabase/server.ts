import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          values: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            values.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot write response cookies.
          }
        }
      }
    }
  );
}

export function createSupabaseAdminClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
}

export const requireUser = cache(async function requireUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async function getCurrentProfile() {
  const user = await requireUser();
  const admin = user ? createSupabaseAdminClient() : null;
  if (!user || !admin) return { user, profile: null };
  const { data: profile } = await admin.from("profiles")
    .select("organization_id,display_name,role,job_title,phone_enc,marketing_opt_in,terms_agreed_at,privacy_agreed_at,deleted_at,created_at")
    .eq("id", user.id)
    .maybeSingle();
  return { user, profile };
});
