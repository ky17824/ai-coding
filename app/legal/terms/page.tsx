import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getRequestLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Draft Terms of Service" : "이용약관 초안" };
}

export default async function TermsPage() {
  const locale = await getRequestLocale();
  if (locale === "en") {
    return (
      <LegalPage kicker="BETA DRAFT" title="Terms of Service" locale={locale}>
        <section>
          <h2>1. Our role</h2>
          <p>
            Borderless is an online marketplace that connects startups with mentors and consultants. Each expert is responsible for delivering the services they offer. The expert&apos;s identity and the scope of work are shown before an order is placed.
          </p>
        </section>
        <section>
          <h2>2. Private beta access</h2>
          <p>
            The private beta is available only to startups that have verified their email address and experts approved by our operations team. We do not share your account or organization data with other organizations.
          </p>
        </section>
        <section>
          <h2>3. Limits of assessments and recommendations</h2>
          <p>
            Readiness results and recommended actions are general business-planning resources. They are not legal, tax, investment, or other professional advice. Consult a qualified professional in the applicable jurisdiction before acting on matters that require professional judgment.
          </p>
        </section>
        <section>
          <h2>4. Accounts and account closure</h2>
          <p>
            You can update your profile and marketing preferences or close your account from My Account. Closing an account immediately ends sign-in access. Order and settlement records required to complete transactions or meet legal retention obligations remain associated only with an anonymized identifier.
          </p>
        </section>
      </LegalPage>
    );
  }
  return (
    <LegalPage kicker="BETA DRAFT" title="이용약관" locale={locale}>
      <section>
        <h2>1. 서비스의 역할</h2>
        <p>
          Borderless는 스타트업과 멘토·컨설턴트를 연결하는
          통신판매중개자입니다. 각 전문가가 서비스 제공 당사자이며, 주문
          화면에서 전문가 신원과 제공 범위를 확인할 수 있습니다.
        </p>
      </section>
      <section>
        <h2>2. 비공개 베타</h2>
        <p>
          이메일 인증을 완료한 스타트업과 운영팀이 승인한 전문가만 이용할 수
          있습니다. 계정과 조직 데이터는 다른 조직과 공유되지 않습니다.
        </p>
      </section>
      <section>
        <h2>3. 진단과 추천의 한계</h2>
        <p>
          준비도 결과와 액션은 경영 의사결정을 돕는 참고자료이며 법률·세무·
          투자 자문이 아닙니다. 전문 판단이 필요한 항목은 해당 관할의
          전문가 확인이 필요합니다.
        </p>
      </section>
      <section>
        <h2>4. 계정과 탈퇴</h2>
        <p>
          사용자는 마이페이지에서 프로필과 수신 동의를 변경하고 계정을
          탈퇴할 수 있습니다. 탈퇴 시 로그인은 즉시 중단되며 거래 이행과
          법정 보존에 필요한 주문·정산 기록은 익명화된 식별자로 유지됩니다.
        </p>
      </section>
    </LegalPage>
  );
}
