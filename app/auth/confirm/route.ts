import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/auth";
import { localeFromPath, localizedPath } from "@/lib/i18n";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));
  const locale = localeFromPath(next);
  const allowed: EmailOtpType[] = ["signup", "recovery", "magiclink", "email"];
  if (!tokenHash || !allowed.includes(type as EmailOtpType)) {
    return NextResponse.redirect(new URL(`${localizedPath("/signin", locale)}?error=confirmation`, url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } =
    (await supabase?.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType
    })) ?? { error: new Error("Supabase is not configured") };

  return NextResponse.redirect(
    new URL(
      error
        ? `${localizedPath("/signin", locale)}?error=confirmation`
        : `/auth/callback?next=${encodeURIComponent(next)}`,
      url.origin
    )
  );
}
