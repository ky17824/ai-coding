import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  if (!tokenHash) {
    return NextResponse.redirect(new URL("/signin?error=confirmation", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } =
    (await supabase?.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink"
    })) ?? { error: new Error("Supabase is not configured") };

  return NextResponse.redirect(
    new URL(error ? "/signin?error=confirmation" : "/admin", url.origin)
  );
}
