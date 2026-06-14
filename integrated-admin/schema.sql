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
-- Registrar Public Enrollment Submission Reference
-- =========================================================
alter table if exists public.registrar_public_enrollment_submissions
  add column if not exists submission_reference_id text;

create index if not exists idx_registrar_public_enroll_submission_reference_id
  on public.registrar_public_enrollment_submissions using btree (submission_reference_id);

-- =========================================================
-- Registrar Enrollment Module School Year Settings
-- =========================================================
create table if not exists registrar_enrollment_module_settings (
  id integer primary key default 1,
  use_manual_school_year_override boolean not null default false,
  manual_school_year_id text references registrar_school_years(id) on update cascade on delete set null,
  updated_at timestamptz not null default now(),
  check (id = 1)
);

alter table if exists registrar_enrollment_module_settings
  add column if not exists use_manual_school_year_override boolean not null default false;

alter table if exists registrar_enrollment_module_settings
  add column if not exists manual_school_year_id text;

create index if not exists idx_registrar_enrollment_module_settings_override
  on registrar_enrollment_module_settings(use_manual_school_year_override);

alter table registrar_enrollment_module_settings
  drop constraint if exists registrar_enrollment_module_settings_manual_school_year_id_fkey;

alter table registrar_enrollment_module_settings
  add constraint registrar_enrollment_module_settings_manual_school_year_id_fkey
  foreign key (manual_school_year_id) references registrar_school_years(id) on update cascade on delete set null;

-- =========================================================
-- Registrar Enrollment Form Schedule
-- =========================================================
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

-- =========================================================
-- Registrar Enrollment Announcements
-- =========================================================
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

-- =========================================================
-- Registrar Enrollment Confirmation Email Settings and Queue
-- =========================================================
create table if not exists registrar_enrollment_email_settings (
  school_id text primary key,
  is_enabled boolean not null default false,
  apps_script_web_app_url text,
  apps_script_bearer_token text,
  status_page_base_url text not null default 'https://enroll.leonnhs.edu.ph/submission-status',
  from_display_name text not null default 'DepED USIS Registrar',
  reply_to_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_registrar_enrollment_email_settings_enabled
  on registrar_enrollment_email_settings(is_enabled);

alter table if exists registrar_enrollment_email_settings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'registrar_enrollment_email_settings'
      and policyname = 'Registrar enrollment email settings select'
  ) then
    create policy "Registrar enrollment email settings select"
      on public.registrar_enrollment_email_settings
      for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'registrar_enrollment_email_settings'
      and policyname = 'Registrar enrollment email settings insert'
  ) then
    create policy "Registrar enrollment email settings insert"
      on public.registrar_enrollment_email_settings
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'registrar_enrollment_email_settings'
      and policyname = 'Registrar enrollment email settings update'
  ) then
    create policy "Registrar enrollment email settings update"
      on public.registrar_enrollment_email_settings
      for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

create table if not exists registrar_enrollment_email_queue (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references registrar_public_enrollment_submissions(id) on update cascade on delete cascade,
  school_id text,
  recipient_email text not null,
  recipient_name text,
  lrn text,
  submission_reference_id text not null,
  status_lookup_url text not null,
  email_subject text not null,
  email_html text not null,
  send_status text not null default 'pending' check (send_status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id)
);

create index if not exists idx_registrar_enrollment_email_queue_status
  on registrar_enrollment_email_queue(send_status, created_at);

alter table if exists registrar_enrollment_email_queue enable row level security;

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
-- Coordinator IA Page Catalog and Access
-- =========================================================
create table if not exists coordinator_ia_pages (
  page_key text primary key,
  page_label text not null,
  page_group text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_coordinator_ia_pages_group on coordinator_ia_pages(page_group);
create index if not exists idx_coordinator_ia_pages_active on coordinator_ia_pages(is_active);

create table if not exists coordinator_account_ia_page_access (
  account_id uuid not null references usis_core_coordinators(id) on update cascade on delete cascade,
  page_key text not null references coordinator_ia_pages(page_key) on update cascade on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id, page_key)
);

create index if not exists idx_coordinator_account_ia_page_access_page_key
  on coordinator_account_ia_page_access(page_key);

insert into coordinator_ia_pages (page_key, page_label, page_group, is_active, sort_order)
values
  ('ia.coordinator.departments', 'Departments', 'Coordinator', true, 10),
  ('ia.coordinator.teaching_non_teaching', 'Teaching & Non-Teaching', 'Coordinator', true, 20),
  ('ia.coordinator.learner_credentials', 'Learner-based Credentials', 'Coordinator', true, 30),
  ('ia.grades_subjects.subjects', 'Subjects', 'Grades & Subjects', true, 10),
  ('ia.grades_subjects.grades', 'Grades', 'Grades & Subjects', true, 20),
  ('ia.grades_subjects.subject_management', 'Subject Management', 'Grades & Subjects', true, 30),
  ('ia.grades_subjects.time_slots', 'Time Slots', 'Grades & Subjects', true, 40),
  ('ia.merch.merchandise_control', 'Merchandise Control', 'Merch', true, 10),
  ('ia.merch.orders', 'Orders', 'Merch', true, 20),
  ('ia.merch.payment', 'Payment', 'Merch', true, 30),
  ('ia.merch.order_counts', 'Order Counts', 'Merch', true, 40),
  ('ia.portal_controls', 'Portal Controls', 'Portal Controls', true, 10),
  ('ia.election.admin_console', 'Admin Console', 'Election', true, 10),
  ('ia.election.dashboard', 'Dashboard', 'Election', true, 20),
  ('ia.election.candidates', 'Candidates', 'Election', true, 30),
  ('ia.election.voters', 'Voters', 'Election', true, 40),
  ('ia.election.organization', 'Organization', 'Election', true, 50),
  ('ia.election.settings', 'Settings', 'Election', true, 60)
on conflict (page_key) do update
set
  page_label = excluded.page_label,
  page_group = excluded.page_group,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

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
  department_id uuid not null references coordinator_departments(id) on update cascade on delete restrict,
  subject_code text not null,
  subject_title text not null,
  teacher_account_id uuid references usis_core_coordinators(id) on update cascade on delete set null,
  teacher_name text,
  is_core boolean not null default true,
  program_scope text not null default 'regular',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, subject_code)
);

alter table registrar_section_subjects
  add column if not exists department_id uuid;

alter table registrar_section_subjects
  add column if not exists teacher_account_id uuid;

alter table registrar_section_subjects
  add column if not exists teacher_name text;

alter table registrar_section_subjects
  drop constraint if exists registrar_section_subjects_department_id_fkey;

alter table registrar_section_subjects
  add constraint registrar_section_subjects_department_id_fkey
  foreign key (department_id) references coordinator_departments(id) on update cascade on delete restrict;

alter table registrar_section_subjects
  drop constraint if exists registrar_section_subjects_teacher_account_id_fkey;

alter table registrar_section_subjects
  add constraint registrar_section_subjects_teacher_account_id_fkey
  foreign key (teacher_account_id) references usis_core_coordinators(id) on update cascade on delete set null;

create index if not exists idx_registrar_section_subjects_section on registrar_section_subjects(section_id);
create index if not exists idx_registrar_section_subjects_scope on registrar_section_subjects(program_scope);
create index if not exists idx_registrar_section_subjects_department on registrar_section_subjects(department_id);
create index if not exists idx_registrar_section_subjects_teacher on registrar_section_subjects(teacher_account_id);

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
  teacher_account_id uuid references usis_core_coordinators(id) on update cascade on delete set null,
  teacher_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, subject_code, day_of_week, start_time, end_time)
);

create index if not exists idx_registrar_section_subject_schedules_section on registrar_section_subject_schedules(section_id);
create index if not exists idx_registrar_section_subject_schedules_day on registrar_section_subject_schedules(day_of_week);
create index if not exists idx_registrar_section_subject_schedules_teacher on registrar_section_subject_schedules(teacher_account_id);

alter table registrar_section_subject_schedules
  add column if not exists teacher_account_id uuid;

alter table registrar_section_subject_schedules
  add column if not exists teacher_name text;

alter table registrar_section_subject_schedules
  drop constraint if exists registrar_section_subject_schedules_teacher_account_id_fkey;

alter table registrar_section_subject_schedules
  add constraint registrar_section_subject_schedules_teacher_account_id_fkey
  foreign key (teacher_account_id) references usis_core_coordinators(id) on update cascade on delete set null;

-- =========================================================
-- Registrar Subject Management (grade-level catalog managed in IA)
-- =========================================================
create table if not exists registrar_subject_management (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references coordinator_departments(id) on update cascade on delete restrict,
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

alter table registrar_subject_management
  add column if not exists department_id uuid;

alter table registrar_subject_management
  drop constraint if exists registrar_subject_management_department_id_fkey;

alter table registrar_subject_management
  add constraint registrar_subject_management_department_id_fkey
  foreign key (department_id) references coordinator_departments(id) on update cascade on delete restrict;

create index if not exists idx_registrar_subject_management_scope on registrar_subject_management(program_scope, grade_level);
create index if not exists idx_registrar_subject_management_strand on registrar_subject_management(strand);
create index if not exists idx_registrar_subject_management_department on registrar_subject_management(department_id);
create unique index if not exists uq_registrar_subject_management_unique
  on registrar_subject_management(grade_level, program_scope, coalesce(strand, ''), subject_code);

-- =========================================================
-- IA Portal Controls (module maintenance/soon-open gating)
-- =========================================================
create table if not exists ia_portal_controls (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  module_label text not null,
  is_enabled boolean not null default false,
  mode text not null default 'maintenance' check (mode in ('live', 'maintenance', 'soon_open')),
  message_source text not null default 'preset' check (message_source in ('preset', 'custom')),
  preset_key text,
  title_text text not null default 'Portal Under Maintenance',
  body_text text not null default 'This module is currently under maintenance. Please check back shortly.',
  icon_name text not null default 'construction',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ia_portal_controls_enabled on ia_portal_controls(is_enabled);
create index if not exists idx_ia_portal_controls_mode on ia_portal_controls(mode);

-- =========================================================
-- Learner Portal Help Desk Tickets
-- =========================================================
create table if not exists learner_portal_help_tickets (
  id uuid primary key default gen_random_uuid(),
  reference_no text not null unique,
  learner_id text references public.registrar_learners(id) on update cascade on delete set null,
  learner_lrn text not null,
  learner_name text not null,
  grade_level text,
  section text,
  category text not null,
  subject text not null,
  details text not null,
  contact_no text,
  status text not null default 'Open' check (status in ('Open', 'In Review', 'Resolved', 'Closed')),
  source text not null default 'learner_portal' check (source in ('learner_portal', 'integrated_admin')),
  assigned_coordinator_id uuid references usis_core_coordinators(id) on update cascade on delete set null,
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learner_portal_help_tickets_learner_id
  on learner_portal_help_tickets(learner_id);
create index if not exists idx_learner_portal_help_tickets_status
  on learner_portal_help_tickets(status);
create index if not exists idx_learner_portal_help_tickets_category
  on learner_portal_help_tickets(category);
create index if not exists idx_learner_portal_help_tickets_created_at
  on learner_portal_help_tickets(created_at desc);

-- =========================================================
-- Learner Portal Help Ticket Audit Trail
-- =========================================================
create table if not exists learner_portal_help_ticket_audit (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references learner_portal_help_tickets(id) on update cascade on delete cascade,
  action text not null check (action in ('insert', 'update', 'status_change')),
  previous_status text,
  new_status text,
  previous_admin_notes text,
  new_admin_notes text,
  changed_by_coordinator_id uuid references usis_core_coordinators(id) on update cascade on delete set null,
  changed_source text not null default 'integrated_admin' check (changed_source in ('learner_portal', 'integrated_admin')),
  created_at timestamptz not null default now()
);

create index if not exists idx_learner_portal_help_ticket_audit_ticket_id
  on learner_portal_help_ticket_audit(ticket_id);
create index if not exists idx_learner_portal_help_ticket_audit_created_at
  on learner_portal_help_ticket_audit(created_at desc);

create or replace function set_learner_portal_help_ticket_audit()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into learner_portal_help_ticket_audit (
      ticket_id,
      action,
      previous_status,
      new_status,
      previous_admin_notes,
      new_admin_notes,
      changed_by_coordinator_id,
      changed_source
    ) values (
      new.id,
      'insert',
      null,
      new.status,
      null,
      new.admin_notes,
      new.assigned_coordinator_id,
      new.source
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    insert into learner_portal_help_ticket_audit (
      ticket_id,
      action,
      previous_status,
      new_status,
      previous_admin_notes,
      new_admin_notes,
      changed_by_coordinator_id,
      changed_source
    ) values (
      new.id,
      case
        when old.status is distinct from new.status then 'status_change'
        else 'update'
      end,
      old.status,
      new.status,
      old.admin_notes,
      new.admin_notes,
      new.assigned_coordinator_id,
      new.source
    );
    return new;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_learner_portal_help_ticket_audit on learner_portal_help_tickets;
create trigger trg_learner_portal_help_ticket_audit
after insert or update on learner_portal_help_tickets
for each row execute function set_learner_portal_help_ticket_audit();

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

drop trigger if exists trg_registrar_enrollment_form_schedule_updated_at on registrar_enrollment_form_schedule;
create trigger trg_registrar_enrollment_form_schedule_updated_at
before update on registrar_enrollment_form_schedule
for each row execute function set_updated_at();

drop trigger if exists trg_registrar_enrollment_module_settings_updated_at on registrar_enrollment_module_settings;
create trigger trg_registrar_enrollment_module_settings_updated_at
before update on registrar_enrollment_module_settings
for each row execute function set_updated_at();

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

drop trigger if exists trg_coordinator_ia_pages_updated_at on coordinator_ia_pages;
create trigger trg_coordinator_ia_pages_updated_at
before update on coordinator_ia_pages
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

drop trigger if exists trg_ia_portal_controls_updated_at on ia_portal_controls;
create trigger trg_ia_portal_controls_updated_at
before update on ia_portal_controls
for each row execute function set_updated_at();

drop trigger if exists trg_registrar_enrollment_email_settings_updated_at on registrar_enrollment_email_settings;
create trigger trg_registrar_enrollment_email_settings_updated_at
before update on registrar_enrollment_email_settings
for each row execute function set_updated_at();

drop trigger if exists trg_registrar_enrollment_email_queue_updated_at on registrar_enrollment_email_queue;
create trigger trg_registrar_enrollment_email_queue_updated_at
before update on registrar_enrollment_email_queue
for each row execute function set_updated_at();

drop trigger if exists trg_learner_portal_help_tickets_updated_at on learner_portal_help_tickets;
create trigger trg_learner_portal_help_tickets_updated_at
before update on learner_portal_help_tickets
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
