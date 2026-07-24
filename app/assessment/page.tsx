import type { Metadata } from "next";
import { AssessmentForm } from "@/components/assessment-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "해외 진출 준비도 진단"
};

export default function AssessmentPage() {
  return (
    <main className="app-page">
      <SiteHeader compact />
      <div className="app-container">
        <AssessmentForm />
      </div>
    </main>
  );
}
