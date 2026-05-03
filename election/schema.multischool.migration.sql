-- DEPED USIS
-- Safe multi-school election migration for an existing legacy election schema
-- Run this against the current shared database instead of rerunning schema.multischool.sql directly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- NEW SHARED TABLES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.usis_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_code text NOT NULL UNIQUE,
  school_name text NOT NULL,
  campus_name text,
  division_code text NOT NULL DEFAULT 'SDI',
  division text NOT NULL DEFAULT 'Schools Division of Iloilo',
  region_code text NOT NULL DEFAULT 'R6',
  region text NOT NULL DEFAULT 'Region VI - Western Visayas',
  school_type text,
  address_line text,
  barangay text,
  municipality_city text,
  province text,
  postal_code text,
  contact_email text,
  contact_mobile text,
  contact_landline text,
  principal_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usis_schools_active_idx
  ON public.usis_schools (is_active);

ALTER TABLE public.usis_schools
  ADD COLUMN IF NOT EXISTS division_code text,
  ADD COLUMN IF NOT EXISTS division text,
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS region text;

ALTER TABLE public.usis_schools
  ALTER COLUMN division_code SET DEFAULT 'SDI',
  ALTER COLUMN division SET DEFAULT 'Schools Division of Iloilo',
  ALTER COLUMN region_code SET DEFAULT 'R6',
  ALTER COLUMN region SET DEFAULT 'Region VI - Western Visayas';

UPDATE public.usis_schools
SET
  division_code = COALESCE(NULLIF(trim(division_code), ''), 'SDI'),
  division = COALESCE(NULLIF(trim(division), ''), 'Schools Division of Iloilo'),
  region_code = COALESCE(NULLIF(trim(region_code), ''), 'R6'),
  region = COALESCE(NULLIF(trim(region), ''), 'Region VI - Western Visayas')
WHERE division_code IS NULL
   OR trim(division_code) = ''
   OR division IS NULL
   OR trim(division) = ''
   OR region_code IS NULL
   OR trim(region_code) = ''
   OR region IS NULL
   OR trim(region) = '';

ALTER TABLE public.usis_schools
  ALTER COLUMN division_code SET NOT NULL,
  ALTER COLUMN division SET NOT NULL,
  ALTER COLUMN region_code SET NOT NULL,
  ALTER COLUMN region SET NOT NULL;

CREATE INDEX IF NOT EXISTS usis_schools_region_code_idx
  ON public.usis_schools (region_code);

CREATE INDEX IF NOT EXISTS usis_schools_division_code_idx
  ON public.usis_schools (division_code);

CREATE TABLE IF NOT EXISTS public.usis_core_coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  employee_id text,
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  mobile_no text,
  region_code text,
  division_code text,
  role text NOT NULL DEFAULT 'school_usis_coordinator',
  access_level text NOT NULL DEFAULT 'school',
  is_super_admin boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usis_core_coordinators_role_check
    CHECK (role IN ('school_usis_coordinator', 'division_usis_coordinator', 'regional_usis_coordinator', 'system_admin'))
);

CREATE INDEX IF NOT EXISTS usis_core_coordinators_school_idx
  ON public.usis_core_coordinators (school_id);

CREATE INDEX IF NOT EXISTS usis_core_coordinators_active_idx
  ON public.usis_core_coordinators (is_active);

ALTER TABLE public.usis_core_coordinators
  ADD COLUMN IF NOT EXISTS region_code text,
  ADD COLUMN IF NOT EXISTS division_code text;

UPDATE public.usis_core_coordinators c
SET
  region_code = COALESCE(NULLIF(trim(c.region_code), ''), s.region_code, 'R6'),
  division_code = COALESCE(NULLIF(trim(c.division_code), ''), s.division_code, 'SDI')
FROM public.usis_schools s
WHERE s.id = c.school_id
  AND (
    c.region_code IS NULL
    OR trim(c.region_code) = ''
    OR c.division_code IS NULL
    OR trim(c.division_code) = ''
  );

CREATE INDEX IF NOT EXISTS usis_core_coordinators_region_code_idx
  ON public.usis_core_coordinators (region_code);

CREATE INDEX IF NOT EXISTS usis_core_coordinators_division_code_idx
  ON public.usis_core_coordinators (division_code);

CREATE TABLE IF NOT EXISTS public.election_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  election_code text NOT NULL,
  registration_code text,
  election_name text NOT NULL,
  election_type text NOT NULL DEFAULT 'sslg_general',
  school_year_id text NOT NULL REFERENCES public.registrar_school_years(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT',
  start_time timestamptz,
  end_time timestamptz,
  public_results_enabled boolean NOT NULL DEFAULT false,
  public_turnout_enabled boolean NOT NULL DEFAULT false,
  allow_schedule_enforcement boolean NOT NULL DEFAULT false,
  school_display_name text,
  instructions text,
  created_by uuid REFERENCES public.usis_core_coordinators(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.usis_core_coordinators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT election_events_status_check
    CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED', 'ARCHIVED')),
  CONSTRAINT election_events_code_unique UNIQUE (school_id, election_code),
  CONSTRAINT election_events_school_year_unique UNIQUE (school_id, school_year_id, election_code)
);

CREATE INDEX IF NOT EXISTS election_events_school_idx
  ON public.election_events (school_id);

CREATE INDEX IF NOT EXISTS election_events_year_idx
  ON public.election_events (school_year_id);

CREATE INDEX IF NOT EXISTS election_events_status_idx
  ON public.election_events (status);

ALTER TABLE public.election_events
  ADD COLUMN IF NOT EXISTS registration_code text;

CREATE INDEX IF NOT EXISTS election_events_registration_code_idx
  ON public.election_events (registration_code);

CREATE TABLE IF NOT EXISTS public.election_coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  election_code text NOT NULL,
  employee_id text,
  username text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  password_plain text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  middle_name text,
  mobile_no text,
  role text NOT NULL DEFAULT 'election_coordinator',
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT election_coordinators_role_check
    CHECK (role IN ('election_coordinator', 'election_encoder', 'election_viewer', 'election_admin')),
  CONSTRAINT election_coordinators_unique_username UNIQUE (school_id, election_code, username),
  CONSTRAINT election_coordinators_unique_email UNIQUE (school_id, election_code, email)
);

CREATE INDEX IF NOT EXISTS election_coordinators_school_idx
  ON public.election_coordinators (school_id);

CREATE INDEX IF NOT EXISTS election_coordinators_election_idx
  ON public.election_coordinators (election_id);

CREATE TABLE IF NOT EXISTS public.election_access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  election_code text NOT NULL,
  access_code text NOT NULL,
  code_type text NOT NULL DEFAULT 'voter',
  assigned_grade_level text,
  assigned_section_id text REFERENCES public.registrar_sections(id) ON DELETE SET NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by uuid REFERENCES public.election_coordinators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT election_access_codes_type_check
    CHECK (code_type IN ('voter', 'admin', 'coordinator', 'public_results')),
  CONSTRAINT election_access_codes_unique UNIQUE (school_id, election_code, access_code)
);

CREATE INDEX IF NOT EXISTS election_access_codes_election_idx
  ON public.election_access_codes (election_id);

-- =========================================================
-- EXTEND EXISTING LEGACY ELECTION TABLES
-- =========================================================

ALTER TABLE public.election_partylists
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_id uuid REFERENCES public.election_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_code text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.election_coordinators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.election_candidates
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_id uuid REFERENCES public.election_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_code text,
  ADD COLUMN IF NOT EXISTS partylist_id uuid REFERENCES public.election_partylists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lrn text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.election_coordinators(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.election_voter_participation
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_id uuid REFERENCES public.election_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_code text,
  ADD COLUMN IF NOT EXISTS access_code_id uuid REFERENCES public.election_access_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS device_label text;

ALTER TABLE public.election_ballot_entries
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_id uuid REFERENCES public.election_events(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS election_code text;

-- =========================================================
-- INDEXES FOR EXTENDED TABLES
-- =========================================================

CREATE INDEX IF NOT EXISTS election_partylists_school_idx
  ON public.election_partylists (school_id);

CREATE INDEX IF NOT EXISTS election_partylists_election_idx
  ON public.election_partylists (election_id);

CREATE INDEX IF NOT EXISTS election_candidates_school_idx
  ON public.election_candidates (school_id);

CREATE INDEX IF NOT EXISTS election_candidates_election_idx
  ON public.election_candidates (election_id);

CREATE INDEX IF NOT EXISTS election_candidates_position_idx
  ON public.election_candidates (school_id, election_code, position);

CREATE INDEX IF NOT EXISTS election_voter_participation_school_idx
  ON public.election_voter_participation (school_id);

CREATE INDEX IF NOT EXISTS election_voter_participation_election_idx
  ON public.election_voter_participation (election_id);

CREATE INDEX IF NOT EXISTS election_voter_participation_lrn_idx
  ON public.election_voter_participation (school_id, election_code, lrn);

CREATE INDEX IF NOT EXISTS election_ballot_entries_school_idx
  ON public.election_ballot_entries (school_id);

CREATE INDEX IF NOT EXISTS election_ballot_entries_election_idx
  ON public.election_ballot_entries (election_id);

CREATE INDEX IF NOT EXISTS election_ballot_entries_position_idx
  ON public.election_ballot_entries (school_id, election_code, school_year_id, position);

CREATE INDEX IF NOT EXISTS election_ballot_entries_voter_idx
  ON public.election_ballot_entries (school_id, election_code, school_year_id, voter_lrn);
