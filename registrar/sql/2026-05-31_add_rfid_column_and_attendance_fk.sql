-- Add RFID storage column to learners table
alter table if exists public.registrar_learners
  add column if not exists rfid text;

create index if not exists idx_registrar_learners_rfid
  on public.registrar_learners ((upper(trim(rfid))))
  where rfid is not null and trim(rfid) <> '';

-- Ensure attendance learner reference stays wired to registrar_learners
alter table public.attendance_records
  drop constraint if exists attendance_records_learner_id_fkey;

alter table public.attendance_records
  add constraint attendance_records_learner_id_fkey
  foreign key (learner_id)
  references public.registrar_learners(id)
  on update cascade
  on delete restrict;

