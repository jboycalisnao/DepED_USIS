-- DepED USIS Attendance Module Schema
-- Uses module-prefixed table names per repository convention.

create extension if not exists "pgcrypto";

alter table if exists public.registrar_learners
  add column if not exists rfid text;

create index if not exists idx_registrar_learners_rfid
  on public.registrar_learners ((upper(trim(rfid))))
  where rfid is not null and trim(rfid) <> '';

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.registrar_learners(id) on update cascade on delete restrict,
  attendance_type text not null check (
    attendance_type in ('AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT', 'UNSCHEDULED')
  ),
  station_no smallint null,
  scanned_uid text null,
  logged_at timestamptz not null default now(),
  source text not null default 'rfid',
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_records_learner_id
  on public.attendance_records (learner_id);

create index if not exists idx_attendance_records_logged_at
  on public.attendance_records (logged_at desc);

create unique index if not exists uq_attendance_records_daily_slot
  on public.attendance_records (
    learner_id,
    attendance_type,
    (timezone('Asia/Manila', logged_at)::date)
  );

comment on table public.attendance_records is
  'Attendance event log for the attendance module.';

-- For existing deployments: normalize legacy learner_id text values to uuid
-- and enforce the foreign key to registrar_learners.
alter table public.attendance_records
  alter column learner_id drop not null;

alter table public.attendance_records
  alter column learner_id type uuid
  using (
    case
      when learner_id is null then null
      when learner_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then learner_id::uuid
      else null
    end
  );

delete from public.attendance_records
where learner_id is null;

delete from public.attendance_records ar
where not exists (
  select 1
  from public.registrar_learners rl
  where rl.id = ar.learner_id
);

alter table public.attendance_records
  drop constraint if exists attendance_records_learner_id_fkey;

alter table public.attendance_records
  add constraint attendance_records_learner_id_fkey
  foreign key (learner_id) references public.registrar_learners(id) on update cascade on delete restrict;

alter table public.attendance_records
  alter column learner_id set not null;

-- Daily learner summary used for historical reporting beyond raw-retention window.
create table if not exists public.attendance_daily_summary (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.registrar_learners(id) on update cascade on delete cascade,
  attendance_date date not null,
  am_in timestamptz null,
  am_out timestamptz null,
  pm_in timestamptz null,
  pm_out timestamptz null,
  unscheduled_count integer not null default 0,
  last_station_no smallint null,
  updated_at timestamptz not null default now(),
  unique (learner_id, attendance_date)
);

create index if not exists idx_attendance_daily_summary_learner_date
  on public.attendance_daily_summary (learner_id, attendance_date desc);

create index if not exists idx_attendance_daily_summary_date
  on public.attendance_daily_summary (attendance_date desc);

-- Monthly section/grade summary for dashboard and trend reporting.
create table if not exists public.attendance_monthly_summary (
  id uuid primary key default gen_random_uuid(),
  summary_month date not null,
  section_id uuid null,
  section_name text null,
  grade_level text null,
  learner_days integer not null default 0,
  expected_slots integer not null default 0,
  present_slots integer not null default 0,
  late_slots integer not null default 0,
  missing_slots integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (summary_month, section_id, grade_level)
);

create index if not exists idx_attendance_monthly_summary_month
  on public.attendance_monthly_summary (summary_month desc);

-- Archive manifest for exported raw logs.
create table if not exists public.attendance_archive_batches (
  id uuid primary key default gen_random_uuid(),
  archive_month date not null,
  from_logged_at timestamptz not null,
  to_logged_at timestamptz not null,
  row_count integer not null,
  file_path text not null,
  checksum_sha256 text not null,
  exported_at timestamptz not null default now(),
  purged_at timestamptz null,
  notes text null
);

create index if not exists idx_attendance_archive_batches_month
  on public.attendance_archive_batches (archive_month desc);

create unique index if not exists uq_attendance_archive_batches_file_path
  on public.attendance_archive_batches (file_path);

-- Refresh daily summary from raw records for the provided date window.
create or replace function public.attendance_refresh_summaries(
  p_start_date date,
  p_end_date date
)
returns void
language plpgsql
as $$
begin
  if p_start_date is null or p_end_date is null then
    raise exception 'attendance_refresh_summaries requires both start and end dates';
  end if;

  if p_start_date > p_end_date then
    raise exception 'attendance_refresh_summaries start date must be <= end date';
  end if;

  insert into public.attendance_daily_summary (
    learner_id,
    attendance_date,
    am_in,
    am_out,
    pm_in,
    pm_out,
    unscheduled_count,
    last_station_no,
    updated_at
  )
  select
    ar.learner_id,
    timezone('Asia/Manila', ar.logged_at)::date as attendance_date,
    min(ar.logged_at) filter (where ar.attendance_type = 'AM_IN') as am_in,
    min(ar.logged_at) filter (where ar.attendance_type = 'AM_OUT') as am_out,
    min(ar.logged_at) filter (where ar.attendance_type = 'PM_IN') as pm_in,
    min(ar.logged_at) filter (where ar.attendance_type = 'PM_OUT') as pm_out,
    count(*) filter (where ar.attendance_type = 'UNSCHEDULED')::integer as unscheduled_count,
    (
      array_remove(array_agg(ar.station_no order by ar.logged_at desc), null)
    )[1] as last_station_no,
    now() as updated_at
  from public.attendance_records ar
  where timezone('Asia/Manila', ar.logged_at)::date between p_start_date and p_end_date
  group by ar.learner_id, timezone('Asia/Manila', ar.logged_at)::date
  on conflict (learner_id, attendance_date) do update set
    am_in = excluded.am_in,
    am_out = excluded.am_out,
    pm_in = excluded.pm_in,
    pm_out = excluded.pm_out,
    unscheduled_count = excluded.unscheduled_count,
    last_station_no = excluded.last_station_no,
    updated_at = now();

  delete from public.attendance_monthly_summary
  where summary_month between date_trunc('month', p_start_date)::date and date_trunc('month', p_end_date)::date;

  insert into public.attendance_monthly_summary (
    summary_month,
    section_id,
    section_name,
    grade_level,
    learner_days,
    expected_slots,
    present_slots,
    late_slots,
    missing_slots,
    updated_at
  )
  select
    date_trunc('month', ds.attendance_date)::date as summary_month,
    rl.section_id,
    rs.name as section_name,
    coalesce(rs.grade_level, rl.grade_level, 'Unknown') as grade_level,
    count(*)::integer as learner_days,
    (count(*) * 4)::integer as expected_slots,
    (
      (count(ds.am_in) + count(ds.am_out) + count(ds.pm_in) + count(ds.pm_out))
    )::integer as present_slots,
    0::integer as late_slots,
    (
      (count(*) * 4) - (count(ds.am_in) + count(ds.am_out) + count(ds.pm_in) + count(ds.pm_out))
    )::integer as missing_slots,
    now()
  from public.attendance_daily_summary ds
  join public.registrar_learners rl on rl.id = ds.learner_id
  left join public.registrar_sections rs on rs.id = rl.section_id
  where ds.attendance_date between p_start_date and p_end_date
  group by
    date_trunc('month', ds.attendance_date)::date,
    rl.section_id,
    rs.name,
    coalesce(rs.grade_level, rl.grade_level, 'Unknown');
end;
$$;
