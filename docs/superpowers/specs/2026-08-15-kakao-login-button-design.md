# Kakao 로그인 공식 버튼 적용 설계

## 목표

로그인·회원가입 화면의 녹색 Kakao 버튼을 Kakao Developers가 제공한 공식 로그인 버튼 이미지로 교체한다. 접근성, 로딩·오류 처리와 기존 callback은 유지한다.

## 선택 자산

- 한국어: `kakao_login_medium_wide.png` 300×45와 `kakao_login_large_wide.png` 600×90을 표시 폭에 맞춰 사용한다.
- 영어: Kakao Developers 리소스 페이지의 같은 wide 규격 공식 영문 이미지를 사용한다.
- narrow 자산은 전체 폭 인증 폼과 맞지 않아 사용하지 않는다.

wide 두 자산은 비율이 같으므로 300w/600w width `srcSet`으로 연결하고 큰 원본을 기본값으로 둔다. 브라우저가 표시 폭과 화면 밀도에 맞는 원본을 선택하고 CSS는 원본 비율을 유지한다. 이미지를 늘이거나 자르지 않아 심볼과 글자가 깨지지 않게 한다.

## 구성과 동작

- 기존 `<button>`을 유지해 클릭, 키보드, 비활성화, OAuth callback을 보존한다.
- Supabase Kakao Auth가 기본 요청하는 `account_email`, `profile_image`, `profile_nickname` 동의항목을 Kakao Developers에 설정해 `KOE205`를 방지한다.
- Kakao 버튼 내부에는 공식 이미지만 표시하고 접근 가능한 이름은 locale에 맞게 유지한다.
- 처리 중에는 버튼을 비활성화하고 이미지 위에 짧은 locale별 상태 문구를 표시한다.
- 공통 컴포넌트를 수정하므로 `/signin`, `/signup`에 동일하게 적용한다.
- Google·이메일 인증 흐름은 변경하지 않는다.

## 스타일

- Kakao 이미지는 인증 폼의 전체 폭에서 공식 20:3 비율을 유지한다.
- 버튼 자체의 추가 padding, 녹색 배경, 3D shadow는 제거한다.
- 공통 focus-visible outline, disabled opacity, active scale은 유지한다.
- 620px 이하에서도 이미지가 컨테이너 폭에 맞게 축소되고 글자나 심볼을 줄바꿈하지 않는다.

## 검증

- 한국어·영어 로그인/회원가입에서 올바른 공식 이미지와 accessible name을 확인한다.
- Kakao 버튼 클릭 시 기존 OAuth 시작 동작이 유지되는지 확인한다.
- Vitest, TypeScript, production build를 실행한다.
- 운영 배포 후 `/signin`, `/en/signin`에서 버튼 비율과 OAuth 이동을 확인한다.
