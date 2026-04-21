
-- OFFICIAL E-BOTO VOTING SYSTEM SCHEMA (REFINED)

-- 1. School Years Table (Core Reference)
CREATE TABLE IF NOT EXISTS public.school_years (
  id text not null,
  label text not null,
  is_active boolean null default false,
  is_locked boolean null default false,
  "isActive" boolean null default false,
  "isLocked" boolean null default false,
  constraint school_years_pkey primary key (id)
) TABLESPACE pg_default;

-- 2. Partylists Table
CREATE TABLE IF NOT EXISTS public.partylists (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slogan text,
  school_year_id text NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT partylists_name_sy_unique UNIQUE (name, school_year_id)
) TABLESPACE pg_default;

-- 3. Candidates Table
CREATE TABLE IF NOT EXISTS public.candidates (
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
  school_year_id text REFERENCES public.school_years(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 4. Election Configuration
CREATE TABLE IF NOT EXISTS public.election_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  status text NOT NULL DEFAULT 'OPEN',
  start_time timestamptz,
  end_time timestamptz,
  school_name text DEFAULT 'Leon National High School',
  school_year_id text REFERENCES public.school_years(id),
  public_results_enabled boolean DEFAULT false,
  public_turnout_enabled boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Seed initial config if not exists
INSERT INTO public.election_config (id, status, school_name) 
VALUES (1, 'OPEN', 'Leon National High School') 
ON CONFLICT (id) DO NOTHING;

-- 5. Voter Participation Registry
CREATE TABLE IF NOT EXISTS public.voter_participation (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lrn text NOT NULL,
  school_year_id text NOT NULL REFERENCES public.school_years(id) ON DELETE CASCADE,
  voted_at timestamptz DEFAULT now(),
  UNIQUE(lrn, school_year_id)
);

-- 6. Identified Ballots (Updated for Multi-seat Positions)
CREATE TABLE IF NOT EXISTS public.ballot_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  voter_lrn text NOT NULL,
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE CASCADE,
  position text NOT NULL,
  school_year_id text REFERENCES public.school_years(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  -- Prevent same voter from voting for the same candidate in the same position twice
  -- This allows voting for TWO different candidates in one position (Representatives)
  -- while blocking double-marks for a single person.
  CONSTRAINT unique_ballot_line UNIQUE (voter_lrn, candidate_id, position, school_year_id)
);
