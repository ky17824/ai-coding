import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getRequestLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Draft Cancellation & Refund Policy" : "취소·환불정책 초안" };
}

export default async function RefundsPage() {
  const locale = await getRequestLocale();
  if (locale === "en") {
    return (
      <LegalPage kicker="BETA DRAFT" title="Cancellation & Refund Policy" locale={locale}>
        <section>
          <h2>Before the service begins</h2>
          <p>
            A buyer may request a full refund before the scheduled mentoring session or before consulting work begins. We will cancel both the payment and any expert payout that has not yet been released.
          </p>
        </section>
        <section>
          <h2>After the service begins</h2>
          <p>
            Cancellations, no-shows, and disputes about deliverable quality are not decided automatically. Our operations team reviews the service scope, schedule, agreed milestones, and relevant records from both parties before making a decision.
          </p>
        </section>
        <section>
          <h2>If the expert does not perform</h2>
          <p>
            If an expert cannot provide the service or does not complete the agreed scope, our operations team may issue a full refund or a refund for the unperformed portion after review.
          </p>
        </section>
      </LegalPage>
    );
  }
  return (
    <LegalPage kicker="BETA DRAFT" title="취소·환불정책" locale={locale}>
      <section>
        <h2>서비스 시작 전</h2>
        <p>
          멘토링 예정 시각 또는 컨설팅 착수 전에는 구매자가 전액 환불을
          요청할 수 있습니다. 결제 취소와 미지급 전문가 정산 취소를 함께
          처리합니다.
        </p>
      </section>
      <section>
        <h2>서비스 시작 후</h2>
        <p>
          취소, 노쇼, 결과물 품질 분쟁은 자동으로 판정하지 않습니다.
          운영자가 주문 당시의 서비스 범위, 일정, 단계별 실행목표(Milestone)와 당사자 기록을
          확인해 처리합니다.
        </p>
      </section>
      <section>
        <h2>전문가 귀책</h2>
        <p>
          전문가가 서비스를 제공하지 못했거나 합의된 범위를 이행하지 않은
          경우 운영팀 검토 후 전액 또는 미이행 부분을 환불합니다.
        </p>
      </section>
    </LegalPage>
  );
}
