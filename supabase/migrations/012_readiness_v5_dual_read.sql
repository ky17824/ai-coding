alter table public.assessments
  add column if not exists survey_version text,
  add column if not exists sales_motion text;

update public.assessments
set survey_version = '4.0'
where survey_version is null;

alter table public.assessments
  alter column survey_version set default '4.0',
  alter column survey_version set not null;

alter table public.assessments
  add constraint assessments_survey_version_check
    check (survey_version in ('4.0', '5.0')) not valid,
  add constraint assessments_sales_motion_check
    check (sales_motion is null or sales_motion in ('direct', 'partner', 'hybrid', 'unknown')) not valid,
  add constraint assessments_v5_sales_motion_check
    check (survey_version = '4.0' or sales_motion is not null) not valid;

alter table public.assessments validate constraint assessments_survey_version_check;
alter table public.assessments validate constraint assessments_sales_motion_check;
alter table public.assessments validate constraint assessments_v5_sales_motion_check;
