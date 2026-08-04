import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const allowed: EmailOtpType[] = ["signup", "recovery", "magiclink", "email"];
  if (!tokenHash || !allowed.includes(type as EmailOtpType)) {
    return NextResponse.redirect(new URL("/signin?error=confirmation", url.origin));
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
        ? "/signin?error=confirmation"
        : `/auth/callback?next=${encodeURIComponent(safeNextPath(url.searchParams.get("next")))}`,
      url.origin
    )
  );
}
