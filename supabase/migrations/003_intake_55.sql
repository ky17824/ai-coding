-- 진단 문항을 15개 0~3레벨에서 55개 1~4단계로 교체한다.
-- 3단계 응답에 증빙을 강제하던 제약도 없앤다. 서술은 선택 사항이 됐다.

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.readiness_answers'::regclass and contype = 'c'
  loop
    execute format('alter table public.readiness_answers drop constraint %I', c.conname);
  end loop;
end $$;

-- ponytail: not valid 로 기존 0~3레벨 응답을 남겨둔다.
-- 옛 응답을 새 척도로 읽어야 하면 그때 백필하거나 지운다.
alter table public.readiness_answers
  add constraint readiness_answers_level_check check (level between 1 and 4) not valid;
