export function dashboardPathForRole(role?: string | null) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function appOrigin() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function safeNextPath(value?: string | null, fallback = "/dashboard") {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\")
  ) {
    return fallback;
  }
  try {
    const url = new URL(value, "https://app.invalid");
    if (url.origin !== "https://app.invalid") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
