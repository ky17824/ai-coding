import Image from "next/image";

/**
 * Borderless 마스코트 로고(public/brand-mark.png, 512px 투명 PNG — 원화의 체크무늬 배경을
 * 제거하고 여백을 잘라 저장한 것). 헤더·로그인·가입·비밀번호 페이지가 같은 컴포넌트를 쓴다.
 * 링크에 이미 aria-label(홈)이 있으므로 장식 이미지(alt="")로 둔다.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return <Image src="/brand-mark.png" alt="" width={size} height={size} className={className} priority />;
}
