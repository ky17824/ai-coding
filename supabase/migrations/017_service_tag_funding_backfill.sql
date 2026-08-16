-- 저장된 `funding` 액션 태그를 실제 상품이 가진 태그로 옮긴다.
--
-- lib/expert-matching.ts가 `funding`을 내보냈지만 이를 가진 상품이 없어,
-- 해당 액션의 "AI 전문가 사용" 링크는 전체 목록 폴백으로 조용히 빠졌다.
-- 별칭만 고치면 앞으로 만들어질 액션만 해결되므로 기존 행도 함께 옮긴다.

update public.gtm_plan_items
set service_tag = 'unit-economics'
where service_tag = 'funding';

update public.action_items
set service_tag = 'unit-economics'
where service_tag = 'funding';
