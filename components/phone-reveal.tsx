"use client";

import { useState } from "react";
import { revealPhone } from "@/app/admin/actions";
import type { Locale } from "@/lib/i18n";

export function PhoneReveal({ profileId, locale = "ko" }: { profileId: string; locale?: Locale }) {
  const en = locale === "en";
  const [value, setValue] = useState("010-****-****");
  const [pending, setPending] = useState(false);
  async function reveal() {
    setPending(true);
    const result = await revealPhone(profileId, locale);
    setValue("phone" in result ? result.phone : result.error);
    setPending(false);
  }
  return <span className="phone-reveal"><strong>{value}</strong><button className="button button--small button--ghost" type="button" disabled={pending} onClick={reveal}>{pending ? (en ? "Checking…" : "확인 중…") : (en ? "Reveal" : "번호 보기")}</button></span>;
}
