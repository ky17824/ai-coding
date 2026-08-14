import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { getRequestLocale } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getRequestLocale()) === "en" ? "Draft Privacy Policy" : "개인정보처리방침 초안" };
}

export default async function PrivacyPage() {
  const locale = await getRequestLocale();
  if (locale === "en") {
    return (
      <LegalPage kicker="BETA DRAFT" title="Privacy Policy" locale={locale}>
        <section>
          <h2>Information we process</h2>
          <p>
            We process the information needed to provide the service, including your name, sign-in email, company, job title, phone number, assessment responses, evidence you submit, order and payment status, and expert credentials and settlement identifiers. Borderless does not store card details.
          </p>
        </section>
        <section>
          <h2>Retention and deletion</h2>
          <p>
            Phone numbers are encrypted at the application layer, and administrative access is logged. When you close your account, we anonymize your profile. Order, payment, and settlement records are segregated and retained only for the period required by applicable law, then deleted.
          </p>
        </section>
        <section>
          <h2>How we use and protect information</h2>
          <p>
            We use this information to provide organization-specific dashboards, approve experts, fulfill transactions, and handle refunds and disputes. Evidence is stored privately and is available only to its owner and authorized operators through expiring links.
          </p>
        </section>
        <section>
          <h2>Social sign-in</h2>
          <p>
            If you sign in with Google or Kakao, Supabase Authentication processes the provider account identifier and the email address and basic profile information you authorize. Borderless uses a separate user UUID internally. When a Kakao-linked account is closed, we first request that Kakao disconnect the service from that account.
          </p>
        </section>
        <section>
          <h2>AI services</h2>
          <p>
            For the AI-GTM Assistant, we send calculated scores, response levels, selected actions, goals, resources, deadlines, constraints, and approved source material to OpenAI. For a paid AI expert service, files you explicitly attach are also sent privately to OpenAI through an expiring link for report generation. Attached files are not provided to public web search. OpenAI requests use storage disabled; Borderless retains the attachment in its private evidence storage and the generated report with the order record until account deletion or the applicable legal retention period. Do not attach information that you are not authorized to disclose. Payment and settlement details are not sent to the AI model.
          </p>
        </section>
      </LegalPage>
    );
  }
  return (
    <LegalPage kicker="BETA DRAFT" title="개인정보처리방침" locale={locale}>
      <section>
        <h2>수집하는 정보</h2>
        <p>
          이름, 로그인 이메일, 회사명, 직위, 휴대전화, 진단 응답, 사용자가
          제출한 증빙, 주문·결제 상태, 전문가 경력과 정산 식별정보를 서비스
          제공에 필요한 범위에서 처리합니다. 카드정보는 플랫폼이 저장하지 않습니다.
        </p>
      </section>
      <section>
        <h2>보관과 삭제</h2>
        <p>
          휴대전화는 애플리케이션 계층에서 암호화해 저장하고 관리자 열람에는
          감사 기록을 남깁니다. 계정 탈퇴 시 프로필은 익명화하며, 주문·결제·
          정산 기록은 관련 법령상 의무 기간 동안 분리 보관한 뒤 삭제합니다.
        </p>
      </section>
      <section>
        <h2>이용 목적과 접근</h2>
        <p>
          조직별 대시보드, 전문가 승인, 거래 이행, 환불·분쟁 처리에
          사용합니다. 증빙은 비공개 저장소에 보관하고 소유자와 승인된
          운영자만 만료 링크로 접근합니다.
        </p>
      </section>
      <section>
        <h2>소셜 로그인</h2>
        <p>
          Google 또는 카카오 로그인을 선택하면 해당 제공자의 계정 식별정보와
          동의한 이메일·기본 프로필을 Supabase 인증을 통해 처리합니다. 내부
          서비스 식별자는 별도의 사용자 UUID를 사용하며, 계정 탈퇴 시 연결된
          카카오 계정의 서비스 연결 해제를 먼저 요청합니다.
        </p>
      </section>
      <section>
        <h2>AI 서비스</h2>
        <p>
          AI GTM 어시스턴트에는 계산된 점수, 진단 응답 단계, 선택된 액션,
          목표·자원·기한·제약과 승인된 근거를 OpenAI에 전달합니다. 유료 AI 전문가
          서비스에서 사용자가 직접 첨부한 파일은 보고서 생성을 위해 만료 링크로
          OpenAI에 비공개 전송되며 공개 웹 검색에는 제공하지 않습니다. OpenAI 요청은
          저장 비활성화로 처리하고, 첨부 원문은 Borderless의 비공개 증빙 저장소에,
          생성 보고서는 주문 기록에 계정 삭제 또는 관련 법정 보관기간까지 보관합니다.
          공개 권한이 없는 자료는 첨부하지 않아야 하며 결제·정산 정보는 AI 모델에
          전달하지 않습니다.
        </p>
      </section>
    </LegalPage>
  );
}
