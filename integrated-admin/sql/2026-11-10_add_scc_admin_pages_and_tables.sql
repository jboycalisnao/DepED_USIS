-- =========================================================
-- SCC Admin Integration for Integrated Admin (IA)
-- =========================================================

-- 1. Register SCC IA pages in coordinator_ia_pages
insert into public.coordinator_ia_pages (page_key, page_label, page_group, is_active, sort_order)
values
  ('ia.scc.dashboard', 'Dashboard', 'SCC', true, 10),
  ('ia.scc.service_requests', 'Service Requests', 'SCC', true, 20),
  ('ia.scc.organizations', 'Organizations & Rosters', 'SCC', true, 30),
  ('ia.scc.google_accounts', 'Google Accounts', 'SCC', true, 40)
on conflict (page_key) do update
set
  page_label = excluded.page_label,
  page_group = excluded.page_group,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- 2. Register SCC Portal in ia_portal_controls
insert into public.ia_portal_controls (
  module_key, module_label, is_enabled, mode, preset_key, title_text, body_text, icon_name
)
values (
  'scc_portal',
  'SCC Portal',
  false,
  'maintenance',
  'maintenance',
  'SCC Portal Under Maintenance',
  'The School Coordinating Council Portal is temporarily unavailable. Please check back shortly.',
  'diversity_3'
)
on conflict (module_key) do nothing;

-- 3. Create SCC Tables (if not yet provisioned)
create table if not exists public.scc_organizations (
  id text primary key,
  school_id text not null default '302522',
  name text not null,
  acronym text not null,
  category text not null default 'Student Organization',
  adviser_name text not null default '',
  adviser_email text not null default '',
  adviser_contact text,
  description text,
  official_email text,
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scc_officers (
  id text primary key,
  organization_id text not null references public.scc_organizations(id) on delete cascade,
  lrn text,
  full_name text not null,
  position text not null,
  grade_level text not null,
  section text,
  email text,
  contact_number text,
  term_year text not null default '2026-2027',
  is_authorized_signatory boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scc_service_requests (
  id text primary key,
  tracking_number text not null unique,
  organization_id text not null references public.scc_organizations(id) on delete cascade,
  organization_name text not null,
  organization_acronym text not null,
  requester_account_id text not null,
  requester_name text not null,
  requester_position text not null,
  service_key text not null,
  service_title text not null,
  title text not null,
  justification text not null,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'approved', 'provisioned', 'rejected')),
  adviser_endorsement boolean not null default true,
  details jsonb not null default '{}'::jsonb,
  provisioned_data jsonb,
  reviewer_remarks text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scc_digital_services (
  key text primary key,
  title text not null,
  subtitle text not null,
  category text not null,
  description text not null,
  requirements text[] not null default '{}',
  sla_turnaround text not null,
  icon text not null,
  is_active boolean not null default true,
  sample_deliverable text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_scc_org_school on public.scc_organizations(school_id);
create index if not exists idx_scc_officers_org on public.scc_officers(organization_id);
create index if not exists idx_scc_req_org on public.scc_service_requests(organization_id);
create index if not exists idx_scc_req_status on public.scc_service_requests(status);
create index if not exists idx_scc_req_tracking on public.scc_service_requests(tracking_number);

-- Seed initial organizations
insert into public.scc_organizations (
  id, school_id, name, acronym, category, adviser_name, adviser_email, adviser_contact, description, official_email
)
values
  ('org-sslg-2026', '302522', 'Supreme Secondary Learner Government', 'SSLG', 'Student Government', 'Mr. Roderick S. Alcantara, LPT', 'roderick.alcantara@leonnhs.edu.ph', '0917-123-4567', 'The highest governing body of learners in Leon National High School dedicated to student welfare, leadership development, and school community representation.', 'sslg@leonnhs.edu.ph'),
  ('org-yeso-2026', '302522', 'Youth for Environment in Schools Organization', 'YES-O', 'Socio-Civic Organization', 'Ms. Clarisse M. Bionat, LPT', 'clarisse.bionat@leonnhs.edu.ph', '0918-987-6543', 'The recognized co-curricular environmental organization spearheading ecological stewardship, waste segregation, and tree nurturing projects in Leon NHS.', null),
  ('org-srcy-2026', '302522', 'Senior Red Cross Youth Council', 'SRCY', 'Socio-Civic Organization', 'Mrs. Leah G. Soriano, LPT', 'leah.soriano@leonnhs.edu.ph', '0919-555-7890', 'Providing first aid education, youth health defense, leadership training, and voluntary humanitarian service to the school campus and barangay community.', 'srcy@leonnhs.edu.ph'),
  ('org-sci-2026', '302522', 'Leon NHS Science Explorers Club', 'SC-EXPLORERS', 'Academic Club', 'Mr. Emmanuel P. Delgado, MST', 'emmanuel.delgado@leonnhs.edu.ph', '0920-444-1122', 'Empowering young investigators, robotics hobbyists, and STEM innovators through scientific inquiry and national science fair participation.', null)
on conflict (id) do nothing;
