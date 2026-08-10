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
  error: { code?: string; status?: number } | null
) {
  if (!error) return null;
  if (error.status === 429 || error.code === "over_email_send_rate_limit") {
    return "메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error.code === "email_address_not_authorized") {
    return "현재 메일 발송 설정으로 이 주소에 보낼 수 없습니다. 관리자에게 문의해 주세요.";
  }
  return "비밀번호 재설정 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function authErrorMessage(code?: string | null) {
  if (!code) return null;
  const messages: Record<string, string> = {
    oauth_cancelled: "소셜 인증이 완료되지 않았습니다. 다시 시도하거나 이메일로 로그인해 주세요.",
    email_required: "소셜 계정에서 이메일 제공에 동의한 뒤 다시 시도하거나 이메일로 가입해 주세요.",
    configuration: "현재 소셜 로그인을 사용할 수 없습니다. 이메일 로그인을 이용해 주세요.",
    deleted: "탈퇴한 계정입니다. 다른 이메일로 가입해 주세요.",
    onboarding: "계정 정보를 준비하지 못했습니다. 잠시 후 다시 로그인해 주세요.",
    callback: "인증을 완료하지 못했습니다. 다시 시도하거나 이메일로 로그인해 주세요."
  };
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
