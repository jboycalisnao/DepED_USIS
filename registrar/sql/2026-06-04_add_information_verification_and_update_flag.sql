-- Add registrar control for public enrollment verification/update edits.

create table if not exists registrar_enrollment_form_schedule (
  id integer primary key default 1,
  enabled boolean not null default true,
  use_date_range boolean not null default false,
  start_date date,
  end_date date,
  information_verification_and_update_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table if exists registrar_enrollment_form_schedule
  add column if not exists information_verification_and_update_enabled boolean not null default false;

create index if not exists idx_registrar_enrollment_form_schedule_enabled
  on registrar_enrollment_form_schedule(enabled);

drop trigger if exists trg_registrar_enrollment_form_schedule_updated_at on registrar_enrollment_form_schedule;
create trigger trg_registrar_enrollment_form_schedule_updated_at
before update on registrar_enrollment_form_schedule
for each row execute function set_updated_at();
