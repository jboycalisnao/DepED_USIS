begin;

create table if not exists registrar_enrollment_announcements (
  id uuid primary key default gen_random_uuid(),
  announcement_key text not null unique,
  title text not null,
  message text not null,
  audience text not null default 'enrollment' check (audience = 'enrollment'),
  is_active boolean not null default true,
  is_pinned boolean not null default false,
  is_highlighted boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_registrar_enrollment_announcements_active
  on registrar_enrollment_announcements(is_active, is_pinned, sort_order);

insert into registrar_enrollment_announcements (
  announcement_key,
  title,
  message,
  audience,
  is_active,
  is_pinned,
  is_highlighted,
  sort_order
)
select
  'information-verification-and-update-default',
  'Information Verification and Update',
  'All learners who submitted their enrolment online shall check the information submitted and update if needed.',
  'enrollment',
  true,
  true,
  true,
  0
where not exists (
  select 1
  from registrar_enrollment_announcements
  where announcement_key = 'information-verification-and-update-default'
);

drop trigger if exists trg_registrar_enrollment_announcements_updated_at on registrar_enrollment_announcements;
create trigger trg_registrar_enrollment_announcements_updated_at
before update on registrar_enrollment_announcements
for each row execute function set_updated_at();

commit;
