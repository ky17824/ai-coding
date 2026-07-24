import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

const schema = z.object({
  orderId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(10).max(2000)
});

export async function POST(request: Request) {
  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  if (!user || !admin) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { message: "평점과 10자 이상의 후기를 입력해 주세요." },
      { status: 400 }
    );
  }
  const { data: order } = await admin
    .from("orders")
    .select("id,buyer_id,provider_id,status")
    .eq("id", parsed.data.orderId)
    .single();
  if (!order || order.buyer_id !== user.id || order.status !== "completed") {
    return NextResponse.json(
      { message: "완료된 본인 주문에만 후기를 작성할 수 있습니다." },
      { status: 403 }
    );
  }
  const { data: existing } = await admin
    .from("reviews")
    .select("id,rating,body")
    .eq("order_id", order.id)
    .maybeSingle();
  if (existing) {
    await admin.from("review_revisions").insert({
      review_id: existing.id,
      rating: existing.rating,
      body: existing.body,
      revised_by: user.id
    });
    const { error } = await admin
      .from("reviews")
      .update({
        rating: parsed.data.rating,
        body: parsed.data.body,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ message: "후기를 수정하지 못했습니다." }, { status: 500 });
    }
    return NextResponse.json({ reviewId: existing.id, updated: true });
  }
  const { data: review, error } = await admin
    .from("reviews")
    .insert({
      order_id: order.id,
      author_id: user.id,
      provider_id: order.provider_id,
      rating: parsed.data.rating,
      body: parsed.data.body
    })
    .select("id")
    .single();
  if (error || !review) {
    return NextResponse.json({ message: "후기를 저장하지 못했습니다." }, { status: 500 });
  }
  return NextResponse.json({ reviewId: review.id });
}
