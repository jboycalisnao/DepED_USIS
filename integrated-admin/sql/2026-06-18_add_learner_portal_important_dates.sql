-- Learner portal important dates managed by Integrated Admin.

create table if not exists ia_learner_portal_important_dates (
  id uuid primary key default gen_random_uuid(),
  date_key text not null unique,
  title text not null,
  details text not null,
  due_date date,
  is_active boolean not null default true,
  is_pinned boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ia_learner_portal_important_dates_active
  on ia_learner_portal_important_dates(is_active, is_pinned, sort_order, due_date);

drop trigger if exists trg_ia_learner_portal_important_dates_updated_at on ia_learner_portal_important_dates;
create trigger trg_ia_learner_portal_important_dates_updated_at
before update on ia_learner_portal_important_dates
for each row execute function set_updated_at();
