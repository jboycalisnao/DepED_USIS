create table if not exists public.sp_portal_school_portals (
  id uuid primary key default gen_random_uuid(),
  school_id text not null,
  school_name text not null,
  region_name text not null,
  region_slug text not null,
  division_name text not null,
  division_slug text not null,
  status text not null default 'inactive' check (status in ('open', 'closed', 'inactive')),
  hero_copy text not null default 'Submit applications, view admission notices, and check school-specific requirements for special program offerings and grade-level admission.',
  timeline jsonb not null default '{"applicationPeriod":"For announcement","entranceExamination":"For announcement","resultsPosting":"For announcement"}'::jsonb,
  contact jsonb not null default '{"office":"Admissions Office","email":"For announcement","phone":"For announcement","officeHours":"For announcement","address":"For announcement"}'::jsonb,
  application_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (region_slug, division_slug, school_id)
);

create table if not exists public.sp_portal_coordinators (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.usis_schools(id) on delete cascade,
  employee_id text,
  username text not null,
  email text not null,
  password_hash text not null,
  password_plain text,
  first_name text not null,
  last_name text not null,
  middle_name text,
  mobile_no text,
  role text not null default 'sp_portal_coordinator',
  permissions jsonb not null default '{"permissions":["portal.manage","applications.review"]}'::jsonb,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, username),
  unique (school_id, email)
);

create table if not exists public.sp_portal_bulletins (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.sp_portal_school_portals(id) on delete cascade,
  date_posted date not null default current_date,
  title text not null,
  category text not null,
  announcement_text text not null,
  attachment_label text,
  attachment_url text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sp_portal_program_offerings (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.sp_portal_school_portals(id) on delete cascade,
  grade_level text not null,
  program_track text not null,
  slots integer not null default 0,
  status text not null default 'Open',
  display_order integer not null default 0
);

create table if not exists public.sp_portal_requirements (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.sp_portal_school_portals(id) on delete cascade,
  requirement_text text not null,
  is_program_specific boolean not null default false,
  display_order integer not null default 0
);

create table if not exists public.sp_portal_applications (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.sp_portal_school_portals(id) on delete restrict,
  application_number text not null unique,
  learner_last_name text not null,
  learner_first_name text not null,
  learner_middle_name text,
  incoming_grade_level text not null,
  selected_program_track text not null,
  guardian_name text,
  guardian_contact text,
  email text,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now()
);

create table if not exists public.sp_portal_exam_schedules (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references public.sp_portal_school_portals(id) on delete cascade,
  title text not null,
  exam_date date not null,
  venue text,
  instructions text,
  created_at timestamptz not null default now()
);

create table if not exists public.sp_portal_results (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.sp_portal_applications(id) on delete cascade,
  portal_id uuid not null references public.sp_portal_school_portals(id) on delete restrict,
  result_status text not null,
  remarks text,
  published_at timestamptz
);
