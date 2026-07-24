# 국가별 진출 규제·실무 가이드

> 웹서치 보강 자료, 조사일 2026-07-22
> 준비도 영역 4(현지화/컴플라이언스)의 국가별 세부 데이터. 법률 자문 대체 불가 — 실제 진출 시 현지 전문가 검증 필요.

## 미국

### 법인 설립
- 실리콘밸리 스타트업의 사실상 표준은 **델라웨어 C-Corporation**: 안정된 회사법·판례, 투자자/주주 권리 보호, 빠르고 저렴한 설립 절차. 외부 투자 유치에 적합.
- **플립(Flip)**: 미국 법인을 지주회사로 세우고 한국 법인을 자회사로 편입하는 지배구조 재편. 미국 VC 투자 유치 목적.
  - 주의: 한번 진행하면 되돌리기 어렵고 비용이 상당함. 주주 설득·합의에만 최소 수개월 → 최소 1년 이상 준비 기간 권장. 역플립 사례도 적지 않음.
- 출처: [법무법인 슈가스퀘어 — 플립과 델라웨어 법인](https://blog.sugar.legal/69286), [디센트 법률사무소 — 한국 스타트업의 미국 플립](https://blog.decentlaw.io/korean-startup-us-flip), [디케이엘 — 미국 법인 설립과 비자 실무](https://dkl.partners/column/%ED%95%9C%EA%B5%AD-%EC%8A%A4%ED%83%80%ED%8A%B8%EC%97%85%EC%9D%98-%EB%AF%B8%EA%B5%AD-%EB%B2%95%EC%9D%B8-%EC%84%A4%EB%A6%BD%EA%B3%BC-%EB%B9%84%EC%9E%90-%EC%B7%A8%EB%93%9D-%EC%8B%A4%EB%AC%B4/)

### 보안 인증 (B2B/엔터프라이즈 필수 관문)
- **SOC 2 Type 1**: 준비 3~5개월, 감사비 $8K~$25K, 툴 포함 1년차 총 $20K~$45K. 당장의 엔터프라이즈 딜 언블록용.
- **SOC 2 Type 2**: 총 9~14개월(관찰 기간 3~12개월 포함), 감사비 $15K~$40K, 1년차 총 $35K~$80K. 장기 엔터프라이즈 관계용.
- 감사비는 전체 비용의 ~40%. 나머지: 자동화 플랫폼(Vanta류) $7.5K~$20K/년, 침투 테스트 $5K~$15K, 내부 엔지니어링 100~200시간.
- **브리지 전략**: Type 1을 먼저 취득해 급한 딜을 닫고, 동시에 Type 2 관찰 기간을 시작.
- 갱신 감사는 초회 대비 20~40% 저렴.
- 출처: [ComplyJet — SOC 2 for Startups (2026)](https://www.complyjet.com/blog/soc-2-for-startups), [Callabo — B2B SaaS 보안 인증 가이드](https://callabo.ai/blog/b2b-saas-enterprise-security-certification-guide)

## 일본

- **APPI(개인정보보호법)**: 일본 소재 개인의 개인정보를 취급하며 일본에 상품/서비스를 제공하면 **역외 적용**. 동의·통지 의무가 서구 시장보다 엄격한 편.
- **ISMAP**: 일본 정부·공공 조달에 참여하려는 클라우드 서비스의 보안 평가 제도. 공공 시장 진입 시 사실상 필수.
- SaaS 기업은 APPI + 분야별 의무 + ISMAP 등 클라우드 보안 표준을 함께 준수해야 함.
- GTM 특성(NotebookLM 자료와 교차): 콜드콜 거부감, 대면 관계망·현지 유력 파트너 통한 신뢰 구축(Partner-led)이 중요.
- 출처: [Nihonium — ISMAP Certification for SaaS](https://nihonium.io/ismap-certification-for-saas-providers-japan/), [Nihonium — 5 Essential SaaS Regulations Japan](https://nihonium.io/5-essential-saas-regulations-japan/), [Law.asia — 일본 개인정보 보호](https://law.asia/ko/japan-data-privacy-laws/)

## 유럽 (EU)

- **GDPR 적정성 결정**: 한국은 EU로부터 적정성 결정을 받아, EU 개인정보를 한국으로 이전할 때 표준계약조항(SCC)·구속력 있는 기업규칙(BCR) 등 추가 안전장치 불필요.
- **주의**: 적정성 결정은 '역외 이전' 메커니즘에 대한 것. EU 개인정보를 직접 수집하는 컨트롤러로서의 GDPR 의무(법적 근거, 정보주체 권리 보장, DPO 등)는 여전히 전부 준수해야 함.
- 출처: [Kim & Chang — GDPR 적정성 결정](https://www.kimchang.com/ko/insights/detail.kc?sch_section=4&idx=23068), [캐치시큐 — GDPR 개념 정리](https://www.catchsecu.com/archives/16491), [개인정보보호위원회 GDPR 가이드북(PDF)](https://www.catchsecu.com/wp-content/uploads/2024/01/%EC%9A%B0%EB%A6%AC_%EA%B8%B0%EC%97%85%EC%9D%84_%EC%9C%84%ED%95%9C_EU_%EC%9D%BC%EB%B0%98_%EA%B0%9C%EC%9D%B8%EC%A0%95%EB%B3%B4%EB%B3%B4%ED%98%B8%EB%B2%95GDPR_%EA%B0%80%EC%9D%B4%EB%93%9C%EB%B6%812022.12._%EA%B0%9C%EC%A0%95.pdf)

## 싱가포르 / 동남아 거점

- **왜 싱가포르**: 법인세 17%, 외국인 100% 지분 허용, 동남아 진출 거점·지주회사 설계·투자 유치에 범용적.
- **법인 형태**: 대부분 자회사(Pte. Ltd.) 선택 — 세제 혜택과 독립성.
- **설립 요건**: 주주 1인 이상(개인/법인, 국적 무관), **싱가포르 거주 이사(Resident Director) 1인 이상**(시민권자/PR/EP·EntrePass 소지자), 자본금 SGD 1+ 부터.
- **기간**: 서류 갖추면 통상 1영업일 내 설립 가능하나, 실무 전체(계좌 개설 포함)는 1~2개월.
- **함정**: 초기 설계가 잘못되면 은행 계좌 개설 지연, Resident Director 요건 미흡으로 규제 리스크 발생.
- 출처: [삼일PwC — 싱가포르 법인설립·조세제도(PDF)](https://www.pwc.com/kr/ko/tax/samilpwc_singapore-incorporation-and-tax-guide.pdf), [디센트 법률사무소 — 싱가포르 법인설립 가이드 (2026)](https://blog.decentlaw.io/singapore-corporation-establishment-guide), [한국법인설립지원센터 — Pte Ltd 가이드 (2026)](https://k-incorp.org/blog/singapore-korea-corp-expansion)

## 플랫폼 반영 시 설계 노트

- 국가별 데이터는 `국가 → {법인설립, 데이터/개인정보, 필수 인증, GTM 특성, 함정}` 구조로 통일하면 대시보드의 "타겟 국가 선택 → 해당 국가 규제 체크리스트 자동 생성"에 바로 쓸 수 있음.
- NotebookLM 추출 체크리스트의 "BMLC 정부/규제 필터" 단계와 연결: 타겟 국가 선택 시 이 파일의 해당 국가 항목이 필터 질문으로 뜨는 구조.
- 우선 4개 권역(미국/일본/EU/싱가포르)으로 시작하고, 사용자 수요에 따라 국가 추가.
