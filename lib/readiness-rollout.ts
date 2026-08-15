import { createHmac, timingSafeEqual } from "node:crypto";
import type { SurveyVersion } from "@/lib/intake-questions";

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

function signingSecret() {
  const secret = process.env.READINESS_SURVEY_TOKEN_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "readiness-local-development";
  throw new Error("A server signing secret is required for readiness assessments.");
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function getNewAssessmentSurveyVersion(): SurveyVersion {
  return process.env.READINESS_V5_ENABLED === "true" ? "5.0" : "4.0";
}

export function issueSurveyVersionToken(version: SurveyVersion, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ version, expiresAt: now + TOKEN_TTL_MS })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifySurveyVersionToken(token: string, now = Date.now()): SurveyVersion | null {
  const [payload, supplied, extra] = token.split(".");
  if (!payload || !supplied || extra) return null;
  const expected = signature(payload);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { version?: unknown; expiresAt?: unknown };
    return (value.version === "4.0" || value.version === "5.0") && typeof value.expiresAt === "number" && value.expiresAt >= now
      ? value.version
      : null;
  } catch {
    return null;
  }
}
