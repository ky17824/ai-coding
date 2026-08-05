import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const schema = z.object({
  companyName: z.string().min(1).max(120),
  overallScore: z.number().int().min(0).max(100),
  status: z.enum(["기초 정비", "진출 준비", "현장 검증", "실행 가능"]),
  domainScores: z.record(z.string(), z.number().int().min(0).max(100)),
  actions: z
    .array(
      z.object({
        title: z.string().max(180),
        owner: z.string().max(100),
        completionEvidence: z.string().max(300)
      })
    )
    .max(5),
  sources: z
    .array(
      z.object({
        title: z.string().max(200),
        url: z.string().url(),
        claim: z.string().max(500)
      })
    )
    .max(10)
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "설명 입력값을 확인해 주세요." },
      { status: 400 }
    );
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      explanation: `${parsed.data.companyName}의 준비도는 ${parsed.data.overallScore}점, ${parsed.data.status} 단계입니다. 가장 먼저 ${parsed.data.actions[0]?.title ?? "상위 액션"}을 완료 증거와 함께 실행하세요.`,
      generatedBy: "deterministic-fallback"
    });
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: "gpt-5.6-luna",
    store: false,
    safety_identifier: createHash("sha256").update(user.id).digest("hex"),
    instructions:
      "당신은 해외 진출 준비도 결과를 설명하는 한국어 코치입니다. 입력된 점수, 액션, 출처만 설명하세요. 새로운 점수, 서비스, 법률 판단, 수치 또는 사실을 만들지 마세요. 4문장 이내로 현재 위치, 가장 중요한 격차, 다음 행동, 근거의 한계를 순서대로 말하세요.",
    input: JSON.stringify(parsed.data)
  });
  return NextResponse.json({
    explanation: response.output_text,
    generatedBy: "gpt-5.6-luna"
  });
}
