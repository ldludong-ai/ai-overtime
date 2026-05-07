create table if not exists public.experiment2_responses (
  id bigint generated always as identity primary key,
  participant_id text not null unique,
  condition text not null,
  consent text,
  started_at timestamptz,
  finished_at timestamptz,
  profile jsonb not null default '{}'::jsonb,
  mediator jsonb not null default '{}'::jsonb,
  posttest jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  click_log jsonb not null default '[]'::jsonb,
  assistant_click_log jsonb not null default '[]'::jsonb,
  text_snapshots jsonb not null default '[]'::jsonb,
  draft_text text,
  final_text text,
  payload jsonb not null,
  submitted_at timestamptz not null default now()
);

alter table public.experiment2_responses enable row level security;

drop policy if exists "allow anonymous experiment inserts" on public.experiment2_responses;

create policy "allow anonymous experiment inserts"
on public.experiment2_responses
for insert
to anon
with check (true);
