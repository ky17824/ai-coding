import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isLocale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  localeFromPath,
  localizedPath,
  stripLocalePath
} from "@/lib/i18n";

const protectedPrefixes = [
  "/assessment",
  "/dashboard",
  "/journey",
  "/orders",
  "/provider",
  "/admin",
  "/account"
];

export async function middleware(request: NextRequest) {
  const savedLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const validSavedLocale = savedLocale && isLocale(savedLocale) ? savedLocale : null;
  const preferredLocale = validSavedLocale
    ?? localeFromAcceptLanguage(request.headers.get("accept-language"));

  if (request.nextUrl.pathname === "/" && preferredLocale === "en") {
    const redirect = NextResponse.redirect(new URL(`/en${request.nextUrl.search}`, request.url));
    if (!validSavedLocale) redirect.cookies.set(LOCALE_COOKIE, "en", { maxAge: 31536000, path: "/", sameSite: "lax" });
    return redirect;
  }

  const locale = localeFromPath(request.nextUrl.pathname);
  const appPath = stripLocalePath(request.nextUrl.pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-borderless-locale", locale);
  const rewriteUrl = locale === "en" && request.nextUrl.pathname !== "/en"
    ? new URL(`${appPath}${request.nextUrl.search}`, request.url)
    : null;
  const createResponse = () => {
    const response = rewriteUrl
      ? NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
    if (request.nextUrl.pathname === "/" && !validSavedLocale) {
      response.cookies.set(LOCALE_COOKIE, preferredLocale, { maxAge: 31536000, path: "/", sameSite: "lax" });
    }
    return response;
  };
  const isProtected = protectedPrefixes.some((prefix) =>
    appPath.startsWith(prefix)
  );
  if (!isProtected) return createResponse();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    if (process.env.NODE_ENV === "development") return createResponse();
    return NextResponse.redirect(new URL(localizedPath("/signin", locale), request.url));
  }

  let response = createResponse();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = createResponse();
        cookies.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      }
    }
  });
  const startedAt = performance.now();
  const { data } = await supabase.auth.getClaims();
  const authTiming = `auth;dur=${(performance.now() - startedAt).toFixed(1)}`;
  if (!data?.claims?.sub) {
    const signIn = new URL(localizedPath("/signin", locale), request.url);
    signIn.searchParams.set(
      "returnTo",
      `${request.nextUrl.pathname}${request.nextUrl.search}`
    );
    const redirect = NextResponse.redirect(signIn);
    redirect.headers.set("Server-Timing", authTiming);
    return redirect;
  }
  response.headers.set("Server-Timing", authTiming);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"]
};
