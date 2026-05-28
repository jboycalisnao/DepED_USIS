-- DepED USIS Attendance Module Schema
-- Uses module-prefixed table names per repository convention.

create extension if not exists "pgcrypto";

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  learner_id text not null,
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
