import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "개인정보처리방침 초안" };

export default function PrivacyPage() {
  return (
    <LegalPage kicker="BETA DRAFT" title="개인정보처리방침">
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
        <h2>AI GTM 어시스턴트</h2>
        <p>
          AI에는 계산된 점수, 진단 응답 단계, 선택된 액션, 사용자가 직접 적은
          목표·자원·기한·제약과 승인된 근거만 전달합니다. 이메일과 전화번호는
          전송 전에 제거하며 증빙 원문, 결제·정산 정보는 전달하지 않습니다.
          외부 웹 검색은 목표 국가의 최신 규정 등 변동 정보가 필요할 때만
          사용하고, 생성 결과와 출처·사용량은 조직의 계획 기록으로 저장합니다.
        </p>
      </section>
    </LegalPage>
  );
}
