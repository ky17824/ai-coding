alter table public.assessments
  add column stage_summary jsonb,
  add column stage_summary_locale text check (stage_summary_locale in ('ko', 'en')),
  add column stage_summary_model text,
  add column stage_summary_generated_at timestamptz,
  add column stage_summary_status text not null default 'pending'
    check (stage_summary_status in ('pending', 'generating', 'complete', 'failed'));

create index assessments_stage_summary_pending_idx
  on public.assessments (completed_at desc)
  where stage_summary_status in ('pending', 'failed');
