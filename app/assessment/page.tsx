import type { Metadata } from "next";
import { AssessmentForm } from "@/components/assessment-form";
import { SiteHeader } from "@/components/site-header";
import { getPublishedServices } from "@/lib/services";
import { requireUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "해외 진출 준비도 진단"
};

export default async function AssessmentPage({
  searchParams
}: {
  searchParams: Promise<{ resume?: string }>;
}) {
  const [user, query, services] = await Promise.all([
    requireUser(),
    searchParams,
    getPublishedServices()
  ]);
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container">
        <AssessmentForm
          availableServices={services}
          isSignedIn={Boolean(user)}
          resume={query.resume === "1"}
        />
      </div>
    </main>
  );
}
