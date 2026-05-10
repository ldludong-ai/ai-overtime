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
