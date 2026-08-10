import type { Locale } from "@/lib/i18n";

export function dashboardPathForRole(role?: string | null) {
  return role === "admin" ? "/admin" : "/dashboard";
}

export function appOrigin() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function passwordResetErrorMessage(
  error: { code?: string; status?: number } | null,
  locale: Locale = "ko"
) {
  if (!error) return null;
  const en = locale === "en";
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return en
      ? "Too many emails have been requested. Please wait a few minutes and try again."
      : "메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error.code === "email_address_not_authorized") {
    return en
      ? "We cannot send to this address with the current email configuration. Please contact support."
      : "현재 메일 발송 설정으로 이 주소에 보낼 수 없습니다. 관리자에게 문의해 주세요.";
  }
  return en
    ? "We could not send the password reset email. Please try again in a few minutes."
    : "비밀번호 재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function authErrorMessage(code?: string | null, locale: Locale = "ko") {
  if (!code) return null;
  const ko: Record<string, string> = {
    oauth_cancelled: "소셜 인증이 완료되지 않았습니다. 다시 시도하거나 이메일로 로그인해 주세요.",
    email_required: "소셜 계정에서 이메일 제공에 동의한 뒤 다시 시도하거나 이메일로 가입해 주세요.",
    configuration: "현재 소셜 로그인을 사용할 수 없습니다. 이메일 로그인을 이용해 주세요.",
    deleted: "탈퇴한 계정입니다. 다른 이메일로 가입해 주세요.",
    onboarding: "계정 정보를 준비하지 못했습니다. 잠시 후 다시 로그인해 주세요.",
    callback: "인증을 완료하지 못했습니다. 다시 시도하거나 이메일로 로그인해 주세요."
  };
  const en: Record<string, string> = {
    oauth_cancelled: "Social sign-in was not completed. Try again or sign in with email.",
    email_required: "Allow access to your email address, then try again, or create an account with email.",
    configuration: "Social sign-in is temporarily unavailable. Please sign in with email.",
    deleted: "This account has been closed. Please use a different email address.",
    onboarding: "We could not finish setting up your account. Please try signing in again.",
    callback: "We could not complete authentication. Try again or sign in with email."
  };
  const messages = locale === "en" ? en : ko;
  return messages[code] ?? messages.callback;
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
