
-- OFFICIAL E-BOTO VOTING SYSTEM SCHEMA (REFINED)

-- 1. School Years Table (Core Reference)
CREATE TABLE IF NOT EXISTS public.registrar_school_years (
  id text not null,
  label text not null,
  is_active boolean null default false,
  is_locked boolean null default false,
  "isActive" boolean null default false,
  "isLocked" boolean null default false,
  constraint registrar_school_years_pkey primary key (id)
) TABLESPACE pg_default;

-- 2. Partylists Table
CREATE TABLE IF NOT EXISTS public.election_partylists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slogan text,
  school_year_id text NOT NULL REFERENCES public.registrar_school_years(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT election_partylists_name_sy_unique UNIQUE (name, school_year_id)
) TABLESPACE pg_default;

-- 3. Candidates Table
CREATE TABLE IF NOT EXISTS public.election_candidates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
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
  school_year_id text REFERENCES public.registrar_school_years(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 4. Election Configuration
CREATE TABLE IF NOT EXISTS public.election_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status text NOT NULL DEFAULT 'OPEN',
  start_time timestamptz,
  end_time timestamptz,
  school_name text DEFAULT 'Leon National High School',
  election_name text DEFAULT 'Learner Government Election',
  school_year_id text REFERENCES public.registrar_school_years(id),
  public_results_enabled boolean DEFAULT false,
  public_turnout_enabled boolean DEFAULT false,
  allowed_grade_level text,
  updated_at timestamptz DEFAULT now()
);

-- Seed initial config if not exists
INSERT INTO public.election_config (id, status, school_name, election_name) 
VALUES (1, 'OPEN', 'Leon National High School', 'Learner Government Election') 
ON CONFLICT (id) DO NOTHING;

-- 5. Voter Participation Registry
CREATE TABLE IF NOT EXISTS public.election_voter_participation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lrn text NOT NULL,
  school_year_id text NOT NULL REFERENCES public.registrar_school_years(id) ON DELETE CASCADE,
  voted_at timestamptz DEFAULT now(),
  UNIQUE(lrn, school_year_id)
);

-- 6. Identified Ballots (Updated for Multi-seat Positions)
CREATE TABLE IF NOT EXISTS public.election_ballot_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_lrn text NOT NULL,
  candidate_id uuid REFERENCES public.election_candidates(id) ON DELETE CASCADE,
  position text NOT NULL,
  school_year_id text REFERENCES public.registrar_school_years(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  -- Prevent same voter from voting for the same candidate in the same position twice
  -- This allows voting for TWO different candidates in one position (Representatives)
  -- while blocking double-marks for a single person.
  CONSTRAINT election_ballot_entries_unique_ballot_line UNIQUE (voter_lrn, candidate_id, position, school_year_id)
);

CREATE INDEX IF NOT EXISTS election_ballot_entries_school_year_position_idx
  ON public.election_ballot_entries (school_year_id, position);

CREATE INDEX IF NOT EXISTS election_ballot_entries_school_year_voter_idx
  ON public.election_ballot_entries (school_year_id, voter_lrn);

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
  WHERE voter_lrn = NEW.voter_lrn
    AND position = NEW.position
    AND school_year_id = NEW.school_year_id;

  IF existing_marks >= allowed_marks THEN
    RAISE EXCEPTION 'Ballot limit exceeded for position %', NEW.position;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS election_ballot_entries_position_limit_trigger ON public.election_ballot_entries;

CREATE TRIGGER election_ballot_entries_position_limit_trigger
BEFORE INSERT ON public.election_ballot_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ballot_position_limit();
