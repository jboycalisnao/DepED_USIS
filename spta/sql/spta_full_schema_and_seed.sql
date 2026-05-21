-- SPTA Master SQL File
-- This file is the single SQL source for SPTA schema + seed entries.

-- =========================================================
-- SPTA Core Config
-- =========================================================

create table if not exists public.spta_system_config (
  id bigint primary key default 1,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- SPTA Financial Transactions
-- =========================================================

create table if not exists public.spta_financial_transactions (
  id text primary key,
  txn_date date not null,
  amount numeric(12,2) not null check (amount >= 0),
  txn_type text not null check (txn_type in ('Collection','Expense','Adjustment','Allocation','Reallocation')),
  category text not null,
  status text not null default 'Posted' check (status in ('Posted','Pending','Cancelled')),
  particulars text not null default '',
  learner_id text null,
  learner_name text null,
  payee text null,
  reference_no text null,
  disbursement_code text null,
  fiscal_year int null,
  quarter text null check (quarter in ('Q1','Q2','Q3','Q4')),
  liquidation_status text null,
  liquidation_date date null,
  audit_status text null,
  activity_id text null,
  is_deficit boolean not null default false,
  to_category text null,
  source text null,
  recorded_by text null,
  grade_section text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_spta_txn_date on public.spta_financial_transactions (txn_date);
create index if not exists idx_spta_txn_type on public.spta_financial_transactions (txn_type);
create index if not exists idx_spta_txn_learner_id on public.spta_financial_transactions (learner_id);
create index if not exists idx_spta_txn_fiscal_year on public.spta_financial_transactions (fiscal_year);

-- =========================================================
-- Quarter Date Configuration per School Year
-- =========================================================

create table if not exists public.spta_quarter_configurations (
  id uuid primary key default gen_random_uuid(),
  school_year text not null unique, -- e.g. 2025-2026

  q1_start date not null,
  q1_end   date not null,
  q2_start date not null,
  q2_end   date not null,
  q3_start date not null,
  q3_end   date not null,
  q4_start date not null,
  q4_end   date not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint spta_q1_valid check (q1_start <= q1_end),
  constraint spta_q2_valid check (q2_start <= q2_end),
  constraint spta_q3_valid check (q3_start <= q3_end),
  constraint spta_q4_valid check (q4_start <= q4_end)
);

create or replace function public.spta_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_spta_quarter_configurations_updated_at on public.spta_quarter_configurations;
create trigger trg_spta_quarter_configurations_updated_at
before update on public.spta_quarter_configurations
for each row execute function public.spta_set_updated_at();

drop trigger if exists trg_spta_system_config_updated_at on public.spta_system_config;
create trigger trg_spta_system_config_updated_at
before update on public.spta_system_config
for each row execute function public.spta_set_updated_at();

drop trigger if exists trg_spta_financial_transactions_updated_at on public.spta_financial_transactions;
create trigger trg_spta_financial_transactions_updated_at
before update on public.spta_financial_transactions
for each row execute function public.spta_set_updated_at();

insert into public.spta_quarter_configurations (
  school_year,
  q1_start, q1_end,
  q2_start, q2_end,
  q3_start, q3_end,
  q4_start, q4_end
) values (
  '2025-2026',
  '2025-08-01', '2025-10-31',
  '2025-11-01', '2026-01-31',
  '2026-02-01', '2026-04-30',
  '2026-05-01', '2026-07-31'
)
on conflict (school_year) do update
set
  q1_start = excluded.q1_start,
  q1_end   = excluded.q1_end,
  q2_start = excluded.q2_start,
  q2_end   = excluded.q2_end,
  q3_start = excluded.q3_start,
  q3_end   = excluded.q3_end,
  q4_start = excluded.q4_start,
  q4_end   = excluded.q4_end;
