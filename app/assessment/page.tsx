import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssessmentForm } from "@/components/assessment-form";
import { SiteHeader } from "@/components/site-header";
import { createSupabaseAdminClient, requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "글로벌 진출 준비도 진단"
};

export default async function AssessmentPage({
  searchParams
}: {
  searchParams: Promise<{ new?: string; resume?: string }>;
}) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  if (user && query.new !== "1" && query.resume !== "1") {
    const admin = createSupabaseAdminClient();
    const { data: profile } = admin
      ? await admin.from("profiles")
          .select("role,organization_id")
          .eq("id", user.id)
          .single()
      : { data: null };
    const { data: previousAssessment } = profile?.role === "startup" && profile.organization_id
      ? await admin!.from("assessments")
          .select("id")
          .eq("organization_id", profile.organization_id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };
    if (previousAssessment) redirect("/dashboard");
  }
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container">
        <AssessmentForm isSignedIn={Boolean(user)} resume={query.resume === "1"} />
      </div>
    </main>
  );
}
