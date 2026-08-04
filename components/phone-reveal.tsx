"use client";

import { useState } from "react";
import { revealPhone } from "@/app/admin/actions";

export function PhoneReveal({ profileId }: { profileId: string }) {
  const [value, setValue] = useState("010-****-****");
  const [pending, setPending] = useState(false);
  async function reveal() {
    setPending(true);
    const result = await revealPhone(profileId);
    setValue("phone" in result ? result.phone : result.error);
    setPending(false);
  }
  return <span className="phone-reveal"><strong>{value}</strong><button className="button button--small button--ghost" type="button" disabled={pending} onClick={reveal}>{pending ? "확인 중…" : "번호 보기"}</button></span>;
}
