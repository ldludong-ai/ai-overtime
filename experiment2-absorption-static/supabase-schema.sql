create table if not exists public.experiment2_absorption_responses (
  id bigint generated always as identity primary key,
  participant_id text not null,
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

create index if not exists experiment2_absorption_responses_participant_id_idx
on public.experiment2_absorption_responses (participant_id);

create index if not exists experiment2_absorption_responses_submitted_at_idx
on public.experiment2_absorption_responses (submitted_at);

alter table public.experiment2_absorption_responses enable row level security;

drop policy if exists "allow anonymous experiment absorption inserts" on public.experiment2_absorption_responses;

create policy "allow anonymous experiment absorption inserts"
on public.experiment2_absorption_responses
for insert
to anon
with check (true);

create table if not exists public.experiment2_credit_records (
  id bigint generated always as identity primary key,
  participant_id text not null,
  student_id text not null,
  condition text,
  finished_at timestamptz,
  experiment_version text,
  submitted_at timestamptz not null default now()
);

create index if not exists experiment2_credit_records_participant_id_idx
on public.experiment2_credit_records (participant_id);

create index if not exists experiment2_credit_records_student_id_idx
on public.experiment2_credit_records (student_id);

alter table public.experiment2_credit_records enable row level security;

drop policy if exists "allow anonymous experiment credit inserts" on public.experiment2_credit_records;

create policy "allow anonymous experiment credit inserts"
on public.experiment2_credit_records
for insert
to anon
with check (true);
