-- Enable learner portal profile self-service edits for guardian, parent, contact, and address fields.

create table if not exists registrar_enrollment_form_schedule (
  id integer primary key default 1,
  enabled boolean not null default true,
  use_date_range boolean not null default false,
  start_date date,
  end_date date,
  information_verification_and_update_enabled boolean not null default false,
  learner_profile_editing_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table if exists registrar_enrollment_form_schedule
  add column if not exists learner_profile_editing_enabled boolean not null default false;

insert into registrar_enrollment_form_schedule (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists trg_registrar_enrollment_form_schedule_updated_at on registrar_enrollment_form_schedule;
create trigger trg_registrar_enrollment_form_schedule_updated_at
before update on registrar_enrollment_form_schedule
for each row execute function set_updated_at();
