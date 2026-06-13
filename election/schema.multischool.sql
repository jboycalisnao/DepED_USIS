-- DEPED USIS
-- Multi-school election schema proposal
-- Date: 2026-04-22
--
-- Design goals:
-- 1. Support multiple schools in one shared USIS database.
-- 2. Scope election data by both school_id and election_code.
-- 3. Keep election data isolated per election event, not only per school year.
-- 4. Add credential records for core USIS coordinators and election coordinators.
-- 5. Avoid plaintext passwords. Store password_hash only.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- CORE SHARED TABLES
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
    CHECK (role IN ('school_usis_coordinator', 'registrar_coordinator', 'division_usis_coordinator', 'regional_usis_coordinator', 'system_admin'))
);

CREATE INDEX IF NOT EXISTS usis_core_coordinators_school_idx
  ON public.usis_core_coordinators (school_id);

CREATE INDEX IF NOT EXISTS usis_core_coordinators_active_idx
  ON public.usis_core_coordinators (is_active);

CREATE INDEX IF NOT EXISTS usis_core_coordinators_region_code_idx
  ON public.usis_core_coordinators (region_code);

CREATE INDEX IF NOT EXISTS usis_core_coordinators_division_code_idx
  ON public.usis_core_coordinators (division_code);

-- =========================================================
-- ELECTION DOMAIN TABLES
-- =========================================================

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
  allowed_grade_level text,
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

CREATE TABLE IF NOT EXISTS public.election_partylists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  election_code text NOT NULL,
  school_year_id text NOT NULL REFERENCES public.registrar_school_years(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slogan text,
  description text,
  created_by uuid REFERENCES public.election_coordinators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT election_partylists_unique UNIQUE (school_id, election_code, school_year_id, name)
);

CREATE INDEX IF NOT EXISTS election_partylists_school_idx
  ON public.election_partylists (school_id);

CREATE INDEX IF NOT EXISTS election_partylists_election_idx
  ON public.election_partylists (election_id);

CREATE TABLE IF NOT EXISTS public.election_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  election_code text NOT NULL,
  school_year_id text NOT NULL REFERENCES public.registrar_school_years(id) ON DELETE RESTRICT,
  partylist_id uuid REFERENCES public.election_partylists(id) ON DELETE SET NULL,
  lrn text,
  name text NOT NULL,
  first_name text,
  last_name text,
  middle_name text,
  extension_name text,
  position text NOT NULL,
  grade_level text,
  party text DEFAULT 'Independent',
  image_url text,
  vision text,
  remarks text,
  gender text,
  age int,
  birth_date date,
  email text,
  mobile_no text,
  landline text,
  home_address text,
  father_name text,
  mother_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.election_coordinators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS election_candidates_school_idx
  ON public.election_candidates (school_id);

CREATE INDEX IF NOT EXISTS election_candidates_election_idx
  ON public.election_candidates (election_id);

CREATE INDEX IF NOT EXISTS election_candidates_position_idx
  ON public.election_candidates (school_id, election_code, position);

CREATE TABLE IF NOT EXISTS public.election_voter_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  election_code text NOT NULL,
  school_year_id text NOT NULL REFERENCES public.registrar_school_years(id) ON DELETE RESTRICT,
  lrn text NOT NULL,
  voted_at timestamptz NOT NULL DEFAULT now(),
  access_code_id uuid REFERENCES public.election_access_codes(id) ON DELETE SET NULL,
  ip_address inet,
  device_label text,
  CONSTRAINT election_voter_participation_unique UNIQUE (school_id, election_code, school_year_id, lrn)
);

CREATE INDEX IF NOT EXISTS election_voter_participation_school_idx
  ON public.election_voter_participation (school_id);

CREATE INDEX IF NOT EXISTS election_voter_participation_election_idx
  ON public.election_voter_participation (election_id);

CREATE INDEX IF NOT EXISTS election_voter_participation_lrn_idx
  ON public.election_voter_participation (school_id, election_code, lrn);

CREATE TABLE IF NOT EXISTS public.election_ballot_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.usis_schools(id) ON DELETE CASCADE,
  election_id uuid NOT NULL REFERENCES public.election_events(id) ON DELETE CASCADE,
  election_code text NOT NULL,
  school_year_id text NOT NULL REFERENCES public.registrar_school_years(id) ON DELETE RESTRICT,
  voter_lrn text NOT NULL,
  candidate_id uuid NOT NULL REFERENCES public.election_candidates(id) ON DELETE CASCADE,
  position text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT election_ballot_entries_unique_ballot_line
    UNIQUE (school_id, election_code, school_year_id, voter_lrn, candidate_id, position)
);

CREATE INDEX IF NOT EXISTS election_ballot_entries_school_idx
  ON public.election_ballot_entries (school_id);

CREATE INDEX IF NOT EXISTS election_ballot_entries_election_idx
  ON public.election_ballot_entries (election_id);

CREATE INDEX IF NOT EXISTS election_ballot_entries_position_idx
  ON public.election_ballot_entries (school_id, election_code, school_year_id, position);

CREATE INDEX IF NOT EXISTS election_ballot_entries_voter_idx
  ON public.election_ballot_entries (school_id, election_code, school_year_id, voter_lrn);

-- =========================================================
-- BALLOT LIMIT ENFORCEMENT
-- =========================================================

CREATE OR REPLACE FUNCTION public.enforce_ballot_position_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  allowed_marks integer;
  existing_marks integer;
BEGIN
  allowed_marks := CASE
    WHEN NEW.position IN (
      'Grade 7 Representative',
      'Grade 8 Representative',
      'Grade 9 Representative',
      'Grade 10 Representative',
      'Grade 11 Representative',
      'Grade 12 Representative'
    ) THEN 2
    ELSE 1
  END;

  SELECT COUNT(*)
  INTO existing_marks
  FROM public.election_ballot_entries
  WHERE school_id = NEW.school_id
    AND election_code = NEW.election_code
    AND school_year_id = NEW.school_year_id
    AND voter_lrn = NEW.voter_lrn
    AND position = NEW.position;

  IF existing_marks >= allowed_marks THEN
    RAISE EXCEPTION 'Ballot limit exceeded for position %', NEW.position;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS election_ballot_entries_position_limit_trigger
  ON public.election_ballot_entries;

CREATE TRIGGER election_ballot_entries_position_limit_trigger
BEFORE INSERT ON public.election_ballot_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ballot_position_limit();

-- =========================================================
-- OPTIONAL VIEW FOR CURRENT ELECTION SETTINGS
-- =========================================================

CREATE OR REPLACE VIEW public.election_config AS
SELECT
  e.id,
  e.school_id,
  e.election_code,
  e.school_year_id,
  e.status,
  e.start_time,
  e.end_time,
  COALESCE(e.school_display_name, s.school_name) AS school_name,
  e.public_results_enabled,
  e.public_turnout_enabled,
  e.allowed_grade_level,
  e.updated_at
FROM public.election_events e
JOIN public.usis_schools s
  ON s.id = e.school_id;
