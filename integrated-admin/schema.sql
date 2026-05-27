-- Integrated Admin (IA) Schema
-- Stores IA-managed merchandise CMS structures for DepED USIS.
-- Convention: module-prefixed table names (merch_*).

begin;

-- =========================================================
-- Categories
-- =========================================================
create table if not exists merch_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- Products
-- =========================================================
create table if not exists merch_order_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null unique,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists idx_merch_order_periods_active on merch_order_periods(is_active);
create index if not exists idx_merch_order_periods_dates on merch_order_periods(start_date, end_date);

create table if not exists merch_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  description text,
  category_id uuid references merch_categories(id) on update cascade on delete set null,
  price numeric(12,2) not null check (price >= 0),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  is_preorder boolean not null default false,
  order_period_id uuid references merch_order_periods(id) on update cascade on delete set null,
  pre_order_cutoff_date date,
  available_sizes text[] not null default '{}'::text[],
  size_stock_json jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merch_products_category on merch_products(category_id);
create index if not exists idx_merch_products_published on merch_products(is_published);
create index if not exists idx_merch_products_order_period on merch_products(order_period_id);

-- =========================================================
-- Product Media
-- =========================================================
create table if not exists merch_product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references merch_products(id) on update cascade on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_merch_media_product on merch_product_media(product_id);
create unique index if not exists uq_merch_media_primary_per_product
  on merch_product_media(product_id)
  where is_primary = true;

-- =========================================================
-- Stock Movement Audit
-- =========================================================
create table if not exists merch_stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references merch_products(id) on update cascade on delete cascade,
  movement_type text not null check (movement_type in ('initial', 'adjustment', 'restock', 'sale', 'return')),
  qty_delta integer not null,
  qty_after integer not null check (qty_after >= 0),
  reason text,
  reference_no text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_merch_stock_movements_product on merch_stock_movements(product_id);
create index if not exists idx_merch_stock_movements_created_at on merch_stock_movements(created_at desc);

-- =========================================================
-- Learner Merch Orders
-- =========================================================
create table if not exists merch_orders (
  id uuid primary key default gen_random_uuid(),
  reference_no text unique,
  learner_id uuid,
  learner_lrn text,
  learner_name text,
  order_status text not null default 'Pending' check (order_status in ('Pending', 'Approved', 'Rejected', 'Fulfilled')),
  order_source text not null default 'learner_portal' check (order_source in ('learner_portal', 'integrated_admin')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merch_orders_created_at on merch_orders(created_at desc);
create index if not exists idx_merch_orders_status on merch_orders(order_status);
create unique index if not exists uq_merch_orders_reference_no on merch_orders(reference_no);

create table if not exists merch_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references merch_orders(id) on update cascade on delete cascade,
  product_id uuid not null references merch_products(id) on update cascade on delete restrict,
  quantity integer not null check (quantity > 0),
  selected_size text,
  created_at timestamptz not null default now()
);

create index if not exists idx_merch_order_items_order on merch_order_items(order_id);
create index if not exists idx_merch_order_items_product on merch_order_items(product_id);

-- =========================================================
-- Order Payment Records
-- =========================================================
create table if not exists merch_order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references merch_orders(id) on update cascade on delete cascade,
  transaction_no text not null unique,
  payment_amount numeric(12,2) not null check (payment_amount > 0),
  receipt_no text,
  payment_method text not null default 'cash' check (payment_method in ('cash', 'gcash', 'bank_transfer', 'other')),
  payment_notes text,
  payment_status text not null default 'posted' check (payment_status in ('posted', 'voided')),
  paid_at timestamptz not null default now(),
  posted_by text,
  voided_at timestamptz,
  voided_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_merch_order_payments_order on merch_order_payments(order_id);
create index if not exists idx_merch_order_payments_paid_at on merch_order_payments(paid_at desc);
create index if not exists idx_merch_order_payments_status on merch_order_payments(payment_status);
create unique index if not exists uq_merch_order_payments_transaction_no on merch_order_payments(transaction_no);
create unique index if not exists uq_merch_order_payments_receipt_no
  on merch_order_payments(receipt_no)
  where receipt_no is not null and btrim(receipt_no) <> '';

-- =========================================================
-- Order Status Audit Trail
-- =========================================================
create table if not exists merch_order_status_audit (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references merch_orders(id) on update cascade on delete cascade,
  from_status text,
  to_status text not null check (to_status in ('Pending', 'Approved', 'Rejected', 'Fulfilled')),
  changed_source text not null check (changed_source in ('learner_portal', 'integrated_admin')),
  changed_by text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_merch_order_status_audit_order on merch_order_status_audit(order_id);
create index if not exists idx_merch_order_status_audit_created_at on merch_order_status_audit(created_at desc);

-- =========================================================
-- IA Merchandise Audit Logs
-- =========================================================
create table if not exists merch_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('category', 'product', 'media', 'stock')),
  entity_id uuid,
  action text not null check (action in ('create', 'update', 'delete', 'publish', 'unpublish', 'stock_change')),
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists idx_merch_audit_entity on merch_audit_logs(entity_type, entity_id);
create index if not exists idx_merch_audit_created_at on merch_audit_logs(created_at desc);

-- =========================================================
-- Coordinator Learner-based Operation Credentials
-- =========================================================
create table if not exists coordinator_learner_operation_credentials (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references registrar_learners(id) on update cascade on delete set null,
  learner_lrn text not null,
  section_id text not null,
  operation_key text not null,
  position_title text not null,
  is_active boolean not null default true,
  granted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (learner_lrn, section_id, operation_key)
);

create index if not exists idx_coord_learner_ops_section on coordinator_learner_operation_credentials(section_id);
create index if not exists idx_coord_learner_ops_operation on coordinator_learner_operation_credentials(operation_key);
create index if not exists idx_coord_learner_ops_active on coordinator_learner_operation_credentials(is_active);
create index if not exists idx_coord_learner_ops_learner_id on coordinator_learner_operation_credentials(learner_id);

-- =========================================================
-- Coordinator Module Access (DB-backed)
-- =========================================================
create table if not exists coordinator_module_access (
  account_id uuid primary key references usis_core_coordinators(id) on update cascade on delete cascade,
  modules text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coordinator_module_access_modules
  on coordinator_module_access using gin (modules);

-- =========================================================
-- Coordinator Departments
-- =========================================================
create table if not exists coordinator_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coordinator_departments_active on coordinator_departments(is_active);

create table if not exists coordinator_account_departments (
  account_id uuid primary key references usis_core_coordinators(id) on update cascade on delete cascade,
  department_id uuid not null references coordinator_departments(id) on update cascade on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coordinator_account_departments_department on coordinator_account_departments(department_id);

-- =========================================================
-- Registrar Section Subjects (managed in IA)
-- =========================================================
create table if not exists registrar_section_subjects (
  id uuid primary key default gen_random_uuid(),
  section_id text not null references registrar_sections(id) on update cascade on delete cascade,
  subject_code text not null,
  subject_title text not null,
  is_core boolean not null default true,
  program_scope text not null default 'regular',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, subject_code)
);

create index if not exists idx_registrar_section_subjects_section on registrar_section_subjects(section_id);
create index if not exists idx_registrar_section_subjects_scope on registrar_section_subjects(program_scope);

-- =========================================================
-- Registrar Subject Schedule Presets (program-based templates managed in IA)
-- =========================================================
create table if not exists registrar_subject_schedule_presets (
  id uuid primary key default gen_random_uuid(),
  grade_level text not null,
  program_scope text not null default 'regular' check (program_scope in ('regular', 'special_program_ste', 'senior_high_school')),
  program_name text,
  strand text,
  slot_label text not null,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  room text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table registrar_subject_schedule_presets
  add column if not exists program_name text;

create index if not exists idx_registrar_subject_schedule_presets_scope
  on registrar_subject_schedule_presets(program_scope, grade_level);
create index if not exists idx_registrar_subject_schedule_presets_strand
  on registrar_subject_schedule_presets(strand);
create unique index if not exists uq_registrar_subject_schedule_presets_unique
  on registrar_subject_schedule_presets(grade_level, program_scope, coalesce(strand, ''), day_of_week, start_time, end_time, slot_label);

-- =========================================================
-- Registrar Section Subject Schedules (managed in IA)
-- =========================================================
create table if not exists registrar_section_subject_schedules (
  id uuid primary key default gen_random_uuid(),
  section_id text not null references registrar_sections(id) on update cascade on delete cascade,
  preset_id uuid references registrar_subject_schedule_presets(id) on update cascade on delete set null,
  section_name text not null,
  subject_code text not null,
  subject_title text not null,
  day_of_week text not null,
  start_time text not null,
  end_time text not null,
  room text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, subject_code, day_of_week, start_time, end_time)
);

create index if not exists idx_registrar_section_subject_schedules_section on registrar_section_subject_schedules(section_id);
create index if not exists idx_registrar_section_subject_schedules_day on registrar_section_subject_schedules(day_of_week);

-- =========================================================
-- Registrar Subject Management (grade-level catalog managed in IA)
-- =========================================================
create table if not exists registrar_subject_management (
  id uuid primary key default gen_random_uuid(),
  grade_level text not null,
  program_scope text not null default 'regular' check (program_scope in ('regular', 'special_program_ste', 'senior_high_school')),
  strand text,
  subject_code text not null,
  subject_title text not null,
  subject_type text not null default 'core' check (subject_type in ('core', 'elective')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_registrar_subject_management_scope on registrar_subject_management(program_scope, grade_level);
create index if not exists idx_registrar_subject_management_strand on registrar_subject_management(strand);
create unique index if not exists uq_registrar_subject_management_unique
  on registrar_subject_management(grade_level, program_scope, coalesce(strand, ''), subject_code);

-- normalize legacy learner_id text values and enforce FK to registrar_learners
alter table coordinator_learner_operation_credentials
  alter column learner_id type uuid
  using (
    case
      when learner_id is null then null
      when learner_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then learner_id::uuid
      else null
    end
  );

alter table coordinator_learner_operation_credentials
  drop constraint if exists coordinator_learner_operation_credentials_learner_id_fkey;

alter table coordinator_learner_operation_credentials
  add constraint coordinator_learner_operation_credentials_learner_id_fkey
  foreign key (learner_id) references registrar_learners(id) on update cascade on delete set null;

-- =========================================================
-- updated_at Trigger Utility
-- =========================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_merch_categories_updated_at on merch_categories;
create trigger trg_merch_categories_updated_at
before update on merch_categories
for each row execute function set_updated_at();

drop trigger if exists trg_merch_order_periods_updated_at on merch_order_periods;
create trigger trg_merch_order_periods_updated_at
before update on merch_order_periods
for each row execute function set_updated_at();

drop trigger if exists trg_merch_products_updated_at on merch_products;
create trigger trg_merch_products_updated_at
before update on merch_products
for each row execute function set_updated_at();

drop trigger if exists trg_merch_orders_updated_at on merch_orders;
create trigger trg_merch_orders_updated_at
before update on merch_orders
for each row execute function set_updated_at();

drop trigger if exists trg_merch_order_payments_updated_at on merch_order_payments;
create trigger trg_merch_order_payments_updated_at
before update on merch_order_payments
for each row execute function set_updated_at();

drop trigger if exists trg_coordinator_learner_operation_credentials_updated_at on coordinator_learner_operation_credentials;
create trigger trg_coordinator_learner_operation_credentials_updated_at
before update on coordinator_learner_operation_credentials
for each row execute function set_updated_at();

drop trigger if exists trg_coordinator_module_access_updated_at on coordinator_module_access;
create trigger trg_coordinator_module_access_updated_at
before update on coordinator_module_access
for each row execute function set_updated_at();

drop trigger if exists trg_coordinator_departments_updated_at on coordinator_departments;
create trigger trg_coordinator_departments_updated_at
before update on coordinator_departments
for each row execute function set_updated_at();

drop trigger if exists trg_coordinator_account_departments_updated_at on coordinator_account_departments;
create trigger trg_coordinator_account_departments_updated_at
before update on coordinator_account_departments
for each row execute function set_updated_at();

drop trigger if exists trg_registrar_section_subjects_updated_at on registrar_section_subjects;
create trigger trg_registrar_section_subjects_updated_at
before update on registrar_section_subjects
for each row execute function set_updated_at();

drop trigger if exists trg_registrar_section_subject_schedules_updated_at on registrar_section_subject_schedules;
create trigger trg_registrar_section_subject_schedules_updated_at
before update on registrar_section_subject_schedules
for each row execute function set_updated_at();

drop trigger if exists trg_registrar_subject_schedule_presets_updated_at on registrar_subject_schedule_presets;
create trigger trg_registrar_subject_schedule_presets_updated_at
before update on registrar_subject_schedule_presets
for each row execute function set_updated_at();

drop trigger if exists trg_registrar_subject_management_updated_at on registrar_subject_management;
create trigger trg_registrar_subject_management_updated_at
before update on registrar_subject_management
for each row execute function set_updated_at();

-- =========================================================
-- Published Product View (for merch frontend)
-- =========================================================
create or replace view merch_published_products as
select
  p.id,
  p.sku,
  p.name,
  p.slug,
  p.description,
  p.price,
  p.stock_qty,
  p.sort_order,
  p.is_preorder,
  p.order_period_id,
  p.pre_order_cutoff_date,
  op.label as order_period_label,
  op.start_date as order_period_start_date,
  op.end_date as order_period_end_date,
  p.available_sizes,
  p.is_featured,
  c.name as category_name,
  m.public_url as primary_image_url
from merch_products p
left join merch_categories c on c.id = p.category_id
left join merch_order_periods op on op.id = p.order_period_id
left join lateral (
  select public_url
  from merch_product_media mm
  where mm.product_id = p.id
  order by mm.is_primary desc, mm.sort_order asc, mm.created_at asc
  limit 1
) m on true
where p.is_published = true
order by p.sort_order asc, p.created_at desc;

commit;
