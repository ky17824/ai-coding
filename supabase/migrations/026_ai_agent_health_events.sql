create table public.ai_agent_health_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  attempt_id uuid,
  stage text not null check (stage in ('preflight', 'reserved', 'classifying', 'researching', 'composing', 'validating', 'persisting', 'completed')),
  level text not null check (level in ('green', 'yellow', 'red')),
  code text not null check (char_length(code) between 1 and 80),
  technical_detail text check (technical_detail is null or char_length(technical_detail) <= 1000),
  created_at timestamptz not null default now()
);

create index ai_agent_health_events_order_idx
  on public.ai_agent_health_events(order_id, created_at desc);

alter table public.ai_agent_health_events enable row level security;

revoke all on public.ai_agent_health_events from public, anon, authenticated;
grant all on public.ai_agent_health_events to service_role;
grant usage, select on sequence public.ai_agent_health_events_id_seq to service_role;
