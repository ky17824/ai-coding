import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "이용약관 초안" };

export default function TermsPage() {
  return (
    <LegalPage kicker="BETA DRAFT" title="이용약관">
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
          유효한 초대 코드를 받은 스타트업과 운영팀이 승인한 전문가만
          이용할 수 있습니다. 계정과 조직 데이터는 다른 조직과 공유되지
          않습니다.
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
    </LegalPage>
  );
}
