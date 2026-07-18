-- DepED USIS Attendance Module Schema
-- Uses module-prefixed table names per repository convention.

create extension if not exists "pgcrypto";

alter table if exists public.registrar_learners
  add column if not exists rfid text;

create index if not exists idx_registrar_learners_rfid
  on public.registrar_learners ((upper(trim(rfid))))
  where rfid is not null and trim(rfid) <> '';

create table if not exists public.attendance_settings (
  id smallint primary key default 1 check (id = 1),
  selected_school_year_id text null references public.registrar_school_years(id) on update cascade on delete set null,
  class_day_config jsonb not null default '{
    "sunday": false,
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": true
  }'::jsonb,
  no_class_dates jsonb not null default '[]'::jsonb,
  schedule_config jsonb not null default '{
    "grade7To10": {
      "amIn": { "in": { "start": "05:00", "end": "07:30" }, "lateAfter": "07:30" },
      "amOut": { "in": { "start": "11:30", "end": "12:15" } },
      "pmIn": { "in": { "start": "12:16", "end": "13:00" }, "lateAfter": "13:00" },
      "pmOut": { "in": { "start": "17:00", "end": "19:00" } }
    },
    "grade11": {
      "amIn": { "in": { "start": "05:00", "end": "07:00" }, "lateAfter": "07:00" },
      "amOut": { "in": { "start": "12:00", "end": "23:59" } }
    },
    "grade12": {
      "pmIn": { "in": { "start": "00:00", "end": "12:00" }, "lateAfter": "12:00" },
      "pmOut": { "in": { "start": "17:00", "end": "23:59" } }
    }
  }'::jsonb,
  sms_settings jsonb not null default '{
    "apiKey": "",
    "messageTemplate": "Hello! This is to inform you that your {gender_term} has {action} Leon NHS at {time}. Thank you."
  }'::jsonb,
  sms_recipient_state jsonb not null default '{
    "enabledLearnerIds": []
  }'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.registrar_learners(id) on update cascade on delete restrict,
  attendance_type text not null check (
    attendance_type in ('AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT', 'UNSCHEDULED')
  ),
  is_late boolean not null default false,
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
  add column if not exists is_late boolean not null default false;

alter table if exists public.attendance_settings
  drop constraint if exists attendance_settings_selected_school_year_id_fkey;

alter table if exists public.attendance_settings
  alter column selected_school_year_id type text using selected_school_year_id::text;

alter table if exists public.attendance_settings
  add constraint attendance_settings_selected_school_year_id_fkey
  foreign key (selected_school_year_id) references public.registrar_school_years(id) on update cascade on delete set null;

alter table if exists public.attendance_settings
  add column if not exists sms_settings jsonb not null default '{
    "apiKey": "",
    "messageTemplate": "Hello! This is to inform you that your {gender_term} has {action} Leon NHS at {time}. Thank you."
  }'::jsonb;

alter table if exists public.attendance_settings
  add column if not exists sms_recipient_state jsonb not null default '{
    "enabledLearnerIds": []
  }'::jsonb;

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

insert into public.attendance_settings (
  id,
  selected_school_year_id,
  class_day_config,
  no_class_dates,
  schedule_config,
  sms_settings,
  sms_recipient_state,
  updated_at
)
values (
  1,
  null,
  '{
    "sunday": false,
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": true
  }'::jsonb,
  '[]'::jsonb,
  '{
    "grade7To10": {
      "amIn": { "in": { "start": "05:00", "end": "07:30" }, "lateAfter": "07:30" },
      "amOut": { "in": { "start": "11:30", "end": "12:15" } },
      "pmIn": { "in": { "start": "12:16", "end": "13:00" }, "lateAfter": "13:00" },
      "pmOut": { "in": { "start": "17:00", "end": "19:00" } }
    },
    "grade11": {
      "amIn": { "in": { "start": "05:00", "end": "07:00" }, "lateAfter": "07:00" },
      "amOut": { "in": { "start": "12:00", "end": "23:59" } }
    },
    "grade12": {
      "pmIn": { "in": { "start": "00:00", "end": "12:00" }, "lateAfter": "12:00" },
      "pmOut": { "in": { "start": "17:00", "end": "23:59" } }
    }
  }'::jsonb,
  '{
    "apiKey": "",
    "messageTemplate": "Hello! This is to inform you that your {gender_term} has {action} Leon NHS at {time}. Thank you."
  }'::jsonb,
  '{
    "enabledLearnerIds": []
  }'::jsonb,
  now()
)
on conflict (id) do update set
  selected_school_year_id = excluded.selected_school_year_id,
  class_day_config = excluded.class_day_config,
  no_class_dates = excluded.no_class_dates,
  schedule_config = excluded.schedule_config,
  sms_settings = excluded.sms_settings,
  sms_recipient_state = excluded.sms_recipient_state,
  updated_at = now();

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
  foreign key (learner_id) references public.registrar_learners(id) on update cascade on delete cascade;

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

-- Monthly learner tap archive used by the learner portal attendance service.
create table if not exists public.attendance_monthly_taps (
  id uuid primary key default gen_random_uuid(),
  learner_id text not null references public.registrar_learners(id) on update cascade on delete cascade,
  attendance_month date not null,
  day_01 jsonb not null default '[]'::jsonb,
  day_02 jsonb not null default '[]'::jsonb,
  day_03 jsonb not null default '[]'::jsonb,
  day_04 jsonb not null default '[]'::jsonb,
  day_05 jsonb not null default '[]'::jsonb,
  day_06 jsonb not null default '[]'::jsonb,
  day_07 jsonb not null default '[]'::jsonb,
  day_08 jsonb not null default '[]'::jsonb,
  day_09 jsonb not null default '[]'::jsonb,
  day_10 jsonb not null default '[]'::jsonb,
  day_11 jsonb not null default '[]'::jsonb,
  day_12 jsonb not null default '[]'::jsonb,
  day_13 jsonb not null default '[]'::jsonb,
  day_14 jsonb not null default '[]'::jsonb,
  day_15 jsonb not null default '[]'::jsonb,
  day_16 jsonb not null default '[]'::jsonb,
  day_17 jsonb not null default '[]'::jsonb,
  day_18 jsonb not null default '[]'::jsonb,
  day_19 jsonb not null default '[]'::jsonb,
  day_20 jsonb not null default '[]'::jsonb,
  day_21 jsonb not null default '[]'::jsonb,
  day_22 jsonb not null default '[]'::jsonb,
  day_23 jsonb not null default '[]'::jsonb,
  day_24 jsonb not null default '[]'::jsonb,
  day_25 jsonb not null default '[]'::jsonb,
  day_26 jsonb not null default '[]'::jsonb,
  day_27 jsonb not null default '[]'::jsonb,
  day_28 jsonb not null default '[]'::jsonb,
  day_29 jsonb not null default '[]'::jsonb,
  day_30 jsonb not null default '[]'::jsonb,
  day_31 jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (learner_id, attendance_month)
);

create index if not exists idx_attendance_monthly_taps_learner_month
  on public.attendance_monthly_taps (learner_id, attendance_month desc);

create index if not exists idx_attendance_monthly_taps_month
  on public.attendance_monthly_taps (attendance_month desc);

-- Archive manifest for exported raw logs.
create table if not exists public.attendance_archive_batches (
  id uuid primary key default gen_random_uuid(),
  archive_month date not null,
  from_logged_at timestamptz not null,
  to_logged_at timestamptz not null,
  row_count integer not null,
  file_path text not null,
  checksum_sha256 text not null,
  sheet_id text null,
  sheet_url text null,
  sheet_tab text not null default 'Archive',
  archive_source text not null default 'selected_range',
  archive_reason text null,
  learner_count integer not null default 0,
  source_row_count integer not null default 0,
  summary_payload jsonb not null default '[]'::jsonb,
  exported_at timestamptz not null default now(),
  purged_at timestamptz null,
  notes text null
);

create index if not exists idx_attendance_archive_batches_month
  on public.attendance_archive_batches (archive_month desc);

create unique index if not exists uq_attendance_archive_batches_file_path
  on public.attendance_archive_batches (file_path);

create table if not exists public.attendance_archive_learner_summaries (
  id uuid primary key default gen_random_uuid(),
  archive_batch_id uuid not null references public.attendance_archive_batches(id) on update cascade on delete cascade,
  learner_id text not null references public.registrar_learners(id) on update cascade on delete cascade,
  learner_name text null,
  learner_lrn text null,
  archive_month date not null,
  from_logged_at timestamptz not null,
  to_logged_at timestamptz not null,
  row_count integer not null,
  am_in_count integer not null default 0,
  am_out_count integer not null default 0,
  pm_in_count integer not null default 0,
  pm_out_count integer not null default 0,
  unscheduled_count integer not null default 0,
  first_logged_at timestamptz not null,
  last_logged_at timestamptz not null,
  sheet_id text null,
  sheet_url text null,
  sheet_tab text not null default 'Archive',
  archived_at timestamptz not null default now(),
  notes text null,
  unique (archive_batch_id, learner_id)
);

create index if not exists idx_attendance_archive_learner_summaries_learner
  on public.attendance_archive_learner_summaries (learner_id, archived_at desc);

create index if not exists idx_attendance_archive_learner_summaries_batch
  on public.attendance_archive_learner_summaries (archive_batch_id, learner_id);

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
