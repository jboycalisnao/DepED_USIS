-- SPTA Migration: Link transactions and configured fees to active school year
-- Date: 2026-05-21

-- =========================================================
-- 1) TRANSACTIONS: link each SPTA transaction to school year
-- =========================================================

alter table public.spta_financial_transactions
  add column if not exists school_year text,
  add column if not exists registrar_school_year_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'spta_financial_transactions_school_year_format_chk'
  ) then
    alter table public.spta_financial_transactions
      add constraint spta_financial_transactions_school_year_format_chk
      check (school_year is null or school_year ~ '^[0-9]{4}-[0-9]{4}$');
  end if;
end $$;

update public.spta_financial_transactions t
set
  school_year = sy.label,
  registrar_school_year_id = sy.id::text
from (
  select id, label
  from public.registrar_school_years
  where is_active = true
  order by label desc
  limit 1
) sy
where t.school_year is null;

update public.spta_financial_transactions t
set school_year = (cfg.config->>'schoolYear')
from public.spta_system_config cfg
where cfg.id = 1
  and t.school_year is null
  and coalesce(cfg.config->>'schoolYear', '') <> '';

alter table public.spta_financial_transactions
  alter column school_year set not null;

create index if not exists idx_spta_tx_school_year
  on public.spta_financial_transactions (school_year);

create index if not exists idx_spta_tx_registrar_school_year_id
  on public.spta_financial_transactions (registrar_school_year_id);

-- =========================================================
-- 2) FEES: store fee config per school year
-- =========================================================

create table if not exists public.spta_fee_configurations (
  id bigserial primary key,
  school_year text not null,
  registrar_school_year_id text,
  fee_schedule jsonb not null default '[]'::jsonb,
  contribution_categories jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spta_fee_configurations_school_year_unique unique (school_year),
  constraint spta_fee_configurations_school_year_format_chk
    check (school_year ~ '^[0-9]{4}-[0-9]{4}$')
);

create index if not exists idx_spta_fee_cfg_school_year
  on public.spta_fee_configurations (school_year);

create index if not exists idx_spta_fee_cfg_registrar_school_year_id
  on public.spta_fee_configurations (registrar_school_year_id);

insert into public.spta_fee_configurations (
  school_year,
  registrar_school_year_id,
  fee_schedule,
  contribution_categories
)
select
  coalesce(sy.label, cfg.config->>'schoolYear') as school_year,
  sy.id::text as registrar_school_year_id,
  coalesce(cfg.config->'feeSchedule', '[]'::jsonb) as fee_schedule,
  coalesce(cfg.config->'contributionCategories', '[]'::jsonb) as contribution_categories
from public.spta_system_config cfg
left join lateral (
  select id, label
  from public.registrar_school_years
  where is_active = true
  order by label desc
  limit 1
) sy on true
where cfg.id = 1
  and coalesce(sy.label, cfg.config->>'schoolYear') is not null
on conflict (school_year) do nothing;

-- =========================================================
-- 3) AUTO-LINK NEW TRANSACTIONS TO ACTIVE SCHOOL YEAR
-- =========================================================

create or replace function public.spta_apply_active_school_year_to_tx()
returns trigger
language plpgsql
as $$
declare
  v_sy_id text;
  v_sy_label text;
begin
  select id::text, label
  into v_sy_id, v_sy_label
  from public.registrar_school_years
  where is_active = true
  order by label desc
  limit 1;

  if new.school_year is null or new.school_year = '' then
    new.school_year := v_sy_label;
  end if;

  if new.registrar_school_year_id is null or new.registrar_school_year_id = '' then
    new.registrar_school_year_id := v_sy_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_spta_tx_apply_active_sy on public.spta_financial_transactions;

create trigger trg_spta_tx_apply_active_sy
before insert on public.spta_financial_transactions
for each row
execute function public.spta_apply_active_school_year_to_tx();
