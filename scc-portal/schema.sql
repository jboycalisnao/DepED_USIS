-- ==============================================================================
-- DepED USIS: School Coordinating Council (SCC) Portal Schema
-- Module Prefix: scc_
-- ==============================================================================

-- 1. Organizations Table (Clubs, Student Government, and Recognized Organizations)
CREATE TABLE IF NOT EXISTS public.scc_organizations (
  id TEXT PRIMARY KEY,
  school_id VARCHAR(50) NOT NULL DEFAULT '302522',
  name TEXT NOT NULL,
  acronym VARCHAR(50) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Student Organization',
  adviser_name TEXT NOT NULL,
  adviser_email TEXT NOT NULL,
  adviser_contact VARCHAR(50),
  description TEXT,
  official_email TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Certified Club Officers Table
CREATE TABLE IF NOT EXISTS public.scc_officers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES public.scc_organizations(id) ON DELETE CASCADE,
  lrn VARCHAR(12),
  full_name TEXT NOT NULL,
  position TEXT NOT NULL,
  grade_level VARCHAR(50) NOT NULL,
  section VARCHAR(100),
  email TEXT,
  contact_number VARCHAR(50),
  term_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
  is_authorized_signatory BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Digital Service Requests Table
CREATE TABLE IF NOT EXISTS public.scc_service_requests (
  id TEXT PRIMARY KEY,
  tracking_number VARCHAR(50) NOT NULL UNIQUE,
  organization_id TEXT NOT NULL REFERENCES public.scc_organizations(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_acronym VARCHAR(50) NOT NULL,
  requester_account_id TEXT NOT NULL,
  requester_name TEXT NOT NULL,
  requester_position TEXT NOT NULL,
  service_key VARCHAR(50) NOT NULL,
  service_title TEXT NOT NULL,
  title TEXT NOT NULL,
  justification TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  adviser_endorsement BOOLEAN NOT NULL DEFAULT true,
  details JSONB DEFAULT '{}'::jsonb,
  provisioned_data JSONB DEFAULT '{}'::jsonb,
  reviewer_remarks TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Digital Services Catalog
CREATE TABLE IF NOT EXISTS public.scc_digital_services (
  key VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] DEFAULT '{}',
  sla_turnaround VARCHAR(50) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sample_deliverable TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_scc_org_school ON public.scc_organizations(school_id);
CREATE INDEX IF NOT EXISTS idx_scc_officers_org ON public.scc_officers(organization_id);
CREATE INDEX IF NOT EXISTS idx_scc_req_org ON public.scc_service_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_scc_req_status ON public.scc_service_requests(status);
CREATE INDEX IF NOT EXISTS idx_scc_req_tracking ON public.scc_service_requests(tracking_number);

-- Seed Initial Recognized Organizations
INSERT INTO public.scc_organizations (id, school_id, name, acronym, category, adviser_name, adviser_email, adviser_contact, description, official_email)
VALUES
  ('org-sslg-2026', '302522', 'Supreme Secondary Learner Government', 'SSLG', 'Student Government', 'Mr. Roderick S. Alcantara, LPT', 'roderick.alcantara@leonnhs.edu.ph', '0917-123-4567', 'The highest governing body of learners in Leon National High School dedicated to student welfare, leadership development, and school community representation.', 'sslg@leonnhs.edu.ph'),
  ('org-yeso-2026', '302522', 'Youth for Environment in Schools Organization', 'YES-O', 'Socio-Civic Organization', 'Ms. Clarisse M. Bionat, LPT', 'clarisse.bionat@leonnhs.edu.ph', '0918-987-6543', 'The recognized co-curricular environmental organization spearheading ecological stewardship, waste segregation, and tree nurturing projects in Leon NHS.', NULL),
  ('org-srcy-2026', '302522', 'Senior Red Cross Youth Council', 'SRCY', 'Socio-Civic Organization', 'Mrs. Leah G. Soriano, LPT', 'leah.soriano@leonnhs.edu.ph', '0919-555-7890', 'Providing first aid education, youth health defense, leadership training, and voluntary humanitarian service to the school campus and barangay community.', 'srcy@leonnhs.edu.ph'),
  ('org-sci-2026', '302522', 'Leon NHS Science Explorers Club', 'SC-EXPLORERS', 'Academic Club', 'Mr. Emmanuel P. Delgado, MST', 'emmanuel.delgado@leonnhs.edu.ph', '0920-444-1122', 'Empowering young investigators, robotics hobbyists, and STEM innovators through scientific inquiry and national science fair participation.', NULL)
ON CONFLICT (id) DO NOTHING;
