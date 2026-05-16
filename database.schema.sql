-- WARNING: This schema is for context only and is not meant to be run as-is.
-- Table order, constraint order, triggers, policies, and dependent objects may need adjustment before execution.
-- DepED USIS naming convention: all tables are prefixed by the owning module using underscores.

CREATE TABLE public.usis_schools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_code text NOT NULL UNIQUE,
  school_name text NOT NULL,
  campus_name text,
  division_code text NOT NULL DEFAULT 'SDI'::text,
  division text NOT NULL DEFAULT 'Schools Division of Iloilo'::text,
  region_code text NOT NULL DEFAULT 'R6'::text,
  region text NOT NULL DEFAULT 'Region VI - Western Visayas'::text,
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usis_schools_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sslg_activities (
  id text NOT NULL,
  code text,
  title text,
  description text,
  objectives text,
  category text,
  venue text,
  budget numeric,
  startDate text,
  endDate text,
  status text,
  leadCommittee text,
  CONSTRAINT sslg_activities_pkey PRIMARY KEY (id)
);

CREATE TABLE public.core_app_settings (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  appName text DEFAULT 'Laboratory Inventory System'::text,
  logoUrl text,
  customFooterText text,
  adminUsername text DEFAULT 'admin'::text,
  adminPassword text DEFAULT 'admin123'::text,
  recoveryEmail text,
  emailJsServiceId text,
  emailJsTemplateId text,
  emailJsPublicKey text,
  CONSTRAINT core_app_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.core_app_users (
  id text NOT NULL,
  username text UNIQUE,
  password text,
  fullName text,
  role text,
  status text DEFAULT 'Active'::text,
  CONSTRAINT core_app_users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.core_audit_logs (
  id text NOT NULL,
  userId text,
  userName text,
  userRole text,
  action text,
  module text,
  details text,
  timestamp text,
  CONSTRAINT core_audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.election_ballot_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  candidate_id uuid,
  position text NOT NULL,
  school_year_id text,
  created_at timestamp with time zone DEFAULT now(),
  voter_lrn text NOT NULL,
  CONSTRAINT election_ballot_entries_pkey PRIMARY KEY (id),
  CONSTRAINT election_ballot_entries_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.election_candidates(id),
  CONSTRAINT election_ballot_entries_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.registrar_school_years(id)
);

CREATE TABLE public.inventory_borrow_records (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  itemId uuid,
  itemName text,
  itemCategory text,
  borrowerName text NOT NULL,
  borrowerId text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  borrowDate date DEFAULT CURRENT_DATE,
  dueDate date NOT NULL,
  returnDate date,
  status text CHECK (status = ANY (ARRAY['Borrowed'::text, 'Returned'::text, 'Overdue'::text])),
  specificId text,
  CONSTRAINT inventory_borrow_records_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_borrow_records_itemId_fkey FOREIGN KEY (itemId) REFERENCES public.inventory_items(id)
);

CREATE TABLE public.inventory_borrow_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  referenceCode text NOT NULL UNIQUE,
  borrowerName text NOT NULL,
  borrowerId text NOT NULL,
  requestDate timestamp with time zone DEFAULT now(),
  returnDate date NOT NULL,
  status text NOT NULL DEFAULT 'Pending'::text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  adminNotes text,
  CONSTRAINT inventory_borrow_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE public.election_candidates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position text NOT NULL,
  party text DEFAULT 'Independent'::text,
  image_url text,
  school_year_id text,
  created_at timestamp with time zone DEFAULT now(),
  first_name text,
  last_name text,
  middle_name text,
  extension_name text,
  grade_level text,
  gender text,
  age integer,
  birth_date date,
  email text,
  mobile_no text,
  landline text,
  home_address text,
  father_name text,
  mother_name text,
  remarks text,
  vision text,
  CONSTRAINT election_candidates_pkey PRIMARY KEY (id),
  CONSTRAINT election_candidates_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.registrar_school_years(id)
);

CREATE TABLE public.inventory_categories (
  id text NOT NULL,
  name text NOT NULL,
  isDefault boolean DEFAULT false,
  CONSTRAINT inventory_categories_pkey PRIMARY KEY (id)
);

CREATE TABLE public.guidance_complaint_tickets (
  id text NOT NULL,
  ticketNumber text,
  category text,
  adminNotes text,
  status text,
  createdAt text,
  complainantName text,
  complainantDetails text,
  dateResolved text,
  CONSTRAINT guidance_complaint_tickets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.drrm_disaster_logs (
  id text NOT NULL,
  name text,
  type text,
  dateStarted text,
  dateEnded text,
  status text,
  affectedCount integer,
  notes text,
  CONSTRAINT drrm_disaster_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_document_requests (
  id text NOT NULL,
  learnerId text,
  requestorName text,
  type text,
  purpose text,
  dateIssued text,
  status text,
  controlNumber text,
  CONSTRAINT registrar_document_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE public.election_config (
  id integer NOT NULL DEFAULT 1 CHECK (id = 1),
  status text NOT NULL DEFAULT 'OPEN'::text,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  school_year_id text,
  updated_at timestamp with time zone DEFAULT now(),
  school_name text DEFAULT 'Leon National High School'::text,
  public_results_enabled boolean DEFAULT false,
  public_turnout_enabled boolean DEFAULT false,
  CONSTRAINT election_config_pkey PRIMARY KEY (id),
  CONSTRAINT election_config_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.registrar_school_years(id)
);

CREATE TABLE public.drrm_evacuation_centers (
  id text NOT NULL,
  name text,
  location text,
  capacity integer,
  currentOccupancy integer,
  status text,
  managerName text,
  CONSTRAINT drrm_evacuation_centers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.finance_financial_transactions (
  id text NOT NULL,
  fiscalYear integer,
  date text,
  type text,
  category text,
  toCategory text,
  particulars text,
  amount numeric,
  status text,
  source text,
  referenceNo text,
  disbursementCode text,
  payee text,
  quarter text,
  liquidationStatus text,
  auditStatus text,
  auditRemarks text,
  auditDate text,
  notes text,
  storageLocation text,
  trackingId text,
  isDeficit boolean DEFAULT false,
  sourceItemId text,
  CONSTRAINT finance_financial_transactions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_grade_levels (
  id text NOT NULL,
  is_active boolean DEFAULT true,
  CONSTRAINT registrar_grade_levels_pkey PRIMARY KEY (id)
);

CREATE TABLE public.guidance_referrals (
  id text NOT NULL,
  caseId text,
  date text,
  gradeLevel text,
  section text,
  concernType text,
  urgency text,
  status text,
  description text,
  actionTaken text,
  CONSTRAINT guidance_referrals_pkey PRIMARY KEY (id)
);

CREATE TABLE public.drrm_hazards (
  id text NOT NULL,
  location text,
  type text,
  description text,
  riskLevel text,
  status text,
  dateIdentified text,
  CONSTRAINT drrm_hazards_pkey PRIMARY KEY (id)
);

CREATE TABLE public.guidance_incidents (
  id text NOT NULL,
  title text,
  date text,
  time text,
  location text,
  involvedLearners text,
  description text,
  actionTaken text,
  status text,
  category text,
  CONSTRAINT guidance_incidents_pkey PRIMARY KEY (id)
);

CREATE TABLE public.inventory_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  category text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  borrowedQuantity integer NOT NULL DEFAULT 0,
  unit text,
  location text,
  condition text CHECK (condition = ANY (ARRAY['Good'::text, 'Fair'::text, 'Repairable'::text, 'Defective'::text, 'Condemned'::text])),
  description text,
  safetyNotes text,
  lastUpdated timestamp with time zone DEFAULT now(),
  shortId text,
  isConsumable boolean DEFAULT false,
  maxBorrowable integer,
  CONSTRAINT inventory_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_learners (
  id text NOT NULL,
  lrn text UNIQUE,
  first_name text,
  last_name text,
  middle_name text,
  birth_date date,
  gender text,
  address text,
  contact_number text,
  guardian_name text,
  father_name text,
  mother_name text,
  status text,
  section_id text,
  is_sslg boolean DEFAULT false,
  is_club_officer boolean DEFAULT false,
  is_athlete boolean DEFAULT false,
  is_artist boolean DEFAULT false,
  is_4ps boolean DEFAULT false,
  is_indigent boolean DEFAULT false,
  org_affiliations jsonb DEFAULT '[]'::jsonb,
  enrollment_history jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registrar_learners_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_public_enrollment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  school_id text,
  school_year text,
  lrn text,
  last_name text,
  first_name text,
  middle_name text,
  grade_to_enroll text,
  guardian_contact text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT registrar_public_enrollment_submissions_pkey PRIMARY KEY (id)
);

ALTER TABLE public.registrar_public_enrollment_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registrar_public_enrollment_submissions'
      AND policyname = 'Registrar public enrollment insert policy'
  ) THEN
    CREATE POLICY "Registrar public enrollment insert policy"
      ON public.registrar_public_enrollment_submissions
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'registrar_public_enrollment_submissions'
      AND policyname = 'Registrar public enrollment select policy'
  ) THEN
    CREATE POLICY "Registrar public enrollment select policy"
      ON public.registrar_public_enrollment_submissions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

CREATE TABLE public.sslg_merch_orders (
  id text NOT NULL,
  customerName text,
  date text,
  items jsonb,
  total numeric,
  status text,
  paymentMethod text,
  CONSTRAINT sslg_merch_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sslg_merch_products (
  id text NOT NULL,
  name text,
  category text,
  price numeric,
  stock integer,
  description text,
  imageUrl text,
  CONSTRAINT sslg_merch_products_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sslg_officers (
  id text NOT NULL,
  name text,
  position text,
  gradeLevelRep text,
  committee text,
  termStart text,
  termEnd text,
  contactNumber text,
  status text,
  CONSTRAINT sslg_officers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sslg_organizations (
  id text NOT NULL,
  name text,
  type text,
  adviserName text,
  presidentName text,
  memberCount integer,
  status text,
  foundedYear text,
  CONSTRAINT sslg_organizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.election_partylists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slogan text,
  school_year_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT election_partylists_pkey PRIMARY KEY (id),
  CONSTRAINT election_partylists_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.registrar_school_years(id)
);

CREATE TABLE public.core_profiles (
  id uuid NOT NULL,
  username text UNIQUE,
  full_name text,
  role text,
  status text DEFAULT 'Active'::text,
  CONSTRAINT core_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT core_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.sslg_resolutions (
  id text NOT NULL,
  seriesYear integer,
  number integer,
  title text,
  status text,
  dateApproved text,
  sponsors ARRAY,
  presidingOfficer text,
  content jsonb,
  CONSTRAINT sslg_resolutions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_school_years (
  id text NOT NULL,
  label text NOT NULL,
  is_active boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  isActive boolean DEFAULT false,
  isLocked boolean DEFAULT false,
  CONSTRAINT registrar_school_years_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_sections (
  id text NOT NULL,
  name text,
  gradeLevel text,
  adviserName text,
  strand text,
  school_year_id text,
  grade_level text,
  adviser_name text,
  schoolYearId text,
  CONSTRAINT registrar_sections_pkey PRIMARY KEY (id)
);

CREATE TABLE public.sslg_sessions (
  id text NOT NULL,
  type text,
  date text,
  time text,
  venue text,
  status text,
  agenda ARRAY,
  attendees ARRAY,
  minutes text,
  CONSTRAINT sslg_sessions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_special_programs (
  id text NOT NULL,
  acronym text NOT NULL,
  full_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registrar_special_programs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.registrar_strands (
  id text NOT NULL,
  acronym text NOT NULL,
  full_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT registrar_strands_pkey PRIMARY KEY (id)
);

CREATE TABLE public.core_system_config (
  id integer NOT NULL DEFAULT 1,
  config jsonb,
  CONSTRAINT core_system_config_pkey PRIMARY KEY (id)
);

CREATE TABLE public.core_users (
  id text NOT NULL,
  username text NOT NULL UNIQUE,
  password text NOT NULL,
  display_name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT core_users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.election_voter_participation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  lrn text NOT NULL,
  school_year_id text NOT NULL,
  voted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT election_voter_participation_pkey PRIMARY KEY (id),
  CONSTRAINT election_voter_participation_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.registrar_school_years(id)
);

CREATE TABLE public.sslg_welfare_programs (
  id text NOT NULL,
  title text,
  date text,
  beneficiariesReached integer,
  type text,
  status text,
  description text,
  CONSTRAINT sslg_welfare_programs_pkey PRIMARY KEY (id)
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

-- Proposed election registration add-on for the next migration pass.
-- This is documented here for planning and code alignment. It is not assumed
-- to be live in the current database unless migrated separately.

CREATE TABLE public.election_registration_records (
  id text NOT NULL,
  school_year_id text,
  school_id text NOT NULL,
  school_name text NOT NULL,
  school_address text,
  school_division text NOT NULL DEFAULT 'Schools Division of Iloilo'::text,
  school_region text NOT NULL DEFAULT 'Region VI - Western Visayas'::text,
  coordinator_name text NOT NULL,
  coordinator_role text NOT NULL,
  coordinator_school_affiliation text NOT NULL,
  election_name text NOT NULL,
  election_type text NOT NULL,
  election_scope text NOT NULL,
  election_code text NOT NULL,
  filing_start_date date,
  filing_end_date date,
  voting_date date,
  notes text,
  generated_at timestamp with time zone DEFAULT now(),
  created_by_core_user_id text,
  CONSTRAINT election_registration_records_pkey PRIMARY KEY (id),
  CONSTRAINT election_registration_records_school_year_id_fkey FOREIGN KEY (school_year_id) REFERENCES public.registrar_school_years(id)
);

ALTER TABLE public.election_events
  ADD COLUMN IF NOT EXISTS registration_code text;
