alter table public.assessments
  add column if not exists target_country text,
  add column if not exists target_customer_segment text,
  add column if not exists target_market_confirmed_at timestamptz;

alter table public.gtm_plans
  add column if not exists market_research jsonb not null default '{}'::jsonb,
  add column if not exists market_research_confirmed_at timestamptz,
  add column if not exists market_research_count smallint not null default 0
    check (market_research_count between 0 and 3);
