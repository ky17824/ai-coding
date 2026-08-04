import {
  createCipheriv,
  createDecipheriv,
  randomBytes
} from "node:crypto";

function encryptionKey() {
  const value = process.env.PII_ENCRYPTION_KEY;
  const key = value ? Buffer.from(value, "base64") : Buffer.alloc(0);
  if (key.length !== 32) {
    throw new Error("PII_ENCRYPTION_KEY must be a 32-byte base64 value");
  }
  return key;
}

export function normalizePhone(raw: string) {
  const compact = raw.trim().replace(/[\s()-]/g, "");
  if (/^010\d{8}$/.test(compact)) return `+82${compact.slice(1)}`;
  if (/^\+8210\d{8}$/.test(compact)) return compact;
  throw new Error("올바른 한국 휴대전화 번호를 입력해 주세요.");
}

export function encryptPhone(raw: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(normalizePhone(raw), "utf8"),
    cipher.final()
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64")
  ].join(":");
}

export function decryptPhone(value: string) {
  const [version, iv, tag, ciphertext, extra] = value.split(":");
  if (version !== "v1" || !iv || !tag || !ciphertext || extra) {
    throw new Error("지원하지 않는 전화번호 암호문입니다.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}

export function maskPhone(raw: string) {
  const normalized = normalizePhone(raw);
  return `010-****-${normalized.slice(-4)}`;
}

export function formatPhone(raw: string) {
  const normalized = normalizePhone(raw);
  return `010-${normalized.slice(-8, -4)}-${normalized.slice(-4)}`;
}
