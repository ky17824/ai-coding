import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decryptPhone, encryptPhone, maskPhone, normalizePhone } from "@/lib/pii";

const originalKey = process.env.PII_ENCRYPTION_KEY;

describe("phone PII", () => {
  beforeAll(() => {
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.PII_ENCRYPTION_KEY;
    else process.env.PII_ENCRYPTION_KEY = originalKey;
  });

  it("normalizes supported Korean mobile formats", () => {
    for (const value of [
      "010-1234-5678",
      "010 1234 5678",
      "+82 10 1234 5678",
      "+821012345678"
    ]) {
      expect(normalizePhone(value)).toBe("+821012345678");
    }
  });

  it("rejects malformed numbers", () => {
    expect(() => normalizePhone("123")).toThrow("휴대전화");
  });

  it("uses a fresh IV for every encryption", () => {
    expect(encryptPhone("010-1234-5678")).not.toBe(
      encryptPhone("010-1234-5678")
    );
  });

  it("round trips the normalized number", () => {
    expect(decryptPhone(encryptPhone("010-1234-5678"))).toBe(
      "+821012345678"
    );
  });

  it("rejects tampered ciphertext", () => {
    const parts = encryptPhone("010-1234-5678").split(":");
    parts[2] = `${parts[2][0] === "A" ? "B" : "A"}${parts[2].slice(1)}`;
    expect(() => decryptPhone(parts.join(":"))).toThrow();
  });

  it("masks the middle digits", () => {
    expect(maskPhone("+821012345678")).toBe("010-****-5678");
  });

  it("requires a 32-byte key", () => {
    delete process.env.PII_ENCRYPTION_KEY;
    expect(() => encryptPhone("010-1234-5678")).toThrow(
      "PII_ENCRYPTION_KEY"
    );
    process.env.PII_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
  });
});
