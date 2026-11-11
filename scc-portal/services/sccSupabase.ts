import { supabase } from '@deped-usis/shared-supabase';
import type { SccOrganization, SccOfficer, SccServiceRequest, SccSession } from '../types';

export const SCC_TABLES = {
  ORGANIZATIONS: 'scc_organizations',
  OFFICERS: 'scc_officers',
  OFFICER_ACCOUNTS: 'scc_officer_accounts',
  SERVICE_REQUESTS: 'scc_service_requests',
  DIGITAL_SERVICES: 'scc_digital_services',
} as const;

// Seed data for offline / fallback
const SEED_ORGANIZATIONS: SccOrganization[] = [
  {
    id: 'org-sslg-2026',
    schoolId: '302522',
    name: 'Supreme Secondary Learner Government',
    acronym: 'SSLG',
    category: 'Student Government',
    adviserName: 'Mr. Roderick S. Alcantara, LPT',
    adviserEmail: 'roderick.alcantara@leonnhs.edu.ph',
    adviserContact: '0917-123-4567',
    description: 'The highest governing body of learners in Leon National High School dedicated to student welfare, leadership development, and school community representation.',
    officialEmail: 'sslg@leonnhs.edu.ph',
    status: 'active',
    officerCount: 8,
    activeRequestsCount: 2,
  },
  {
    id: 'org-yeso-2026',
    schoolId: '302522',
    name: 'Youth for Environment in Schools Organization',
    acronym: 'YES-O',
    category: 'Socio-Civic Organization',
    adviserName: 'Ms. Clarisse M. Bionat, LPT',
    adviserEmail: 'clarisse.bionat@leonnhs.edu.ph',
    adviserContact: '0918-987-6543',
    description: 'The recognized co-curricular environmental organization spearheading ecological stewardship, waste segregation, and tree nurturing projects in Leon NHS.',
    officialEmail: '',
    status: 'active',
    officerCount: 6,
    activeRequestsCount: 1,
  },
  {
    id: 'org-srcy-2026',
    schoolId: '302522',
    name: 'Senior Red Cross Youth Council',
    acronym: 'SRCY',
    category: 'Socio-Civic Organization',
    adviserName: 'Mrs. Leah G. Soriano, LPT',
    adviserEmail: 'leah.soriano@leonnhs.edu.ph',
    adviserContact: '0919-555-7890',
    description: 'Providing first aid education, youth health defense, leadership training, and voluntary humanitarian service to the school campus and barangay community.',
    officialEmail: 'srcy@leonnhs.edu.ph',
    status: 'active',
    officerCount: 7,
    activeRequestsCount: 1,
  },
  {
    id: 'org-sci-2026',
    schoolId: '302522',
    name: 'Leon NHS Science Explorers Club',
    acronym: 'SC-EXPLORERS',
    category: 'Academic Club',
    adviserName: 'Mr. Emmanuel P. Delgado, MST',
    adviserEmail: 'emmanuel.delgado@leonnhs.edu.ph',
    adviserContact: '0920-444-1122',
    description: 'Empowering young investigators, robotics hobbyists, and STEM innovators through scientific inquiry and national science fair participation.',
    officialEmail: '',
    status: 'active',
    officerCount: 5,
    activeRequestsCount: 0,
  },
  {
    id: 'org-math-2026',
    schoolId: '302522',
    name: 'Math Wizards Guild',
    acronym: 'MWG',
    category: 'Academic Club',
    adviserName: 'Mrs. Helen V. Castro, LPT',
    adviserEmail: 'helen.castro@leonnhs.edu.ph',
    adviserContact: '0921-333-8899',
    description: 'Fostering mathematical problem solving, peer tutoring sessions, and representation in Metrobank-MTAP-DepEd Math Challenges.',
    officialEmail: '',
    status: 'active',
    officerCount: 4,
    activeRequestsCount: 0,
  },
  {
    id: 'org-bsp-2026',
    schoolId: '302522',
    name: 'Boy Scouts of the Philippines - Leon Outfit',
    acronym: 'BSP',
    category: 'Socio-Civic Organization',
    adviserName: 'Mr. Joel A. Ramirez, ALT',
    adviserEmail: 'joel.ramirez@leonnhs.edu.ph',
    adviserContact: '0922-777-6655',
    description: 'Instilling character building, outdoor wilderness skills, civic responsibility, and emergency disaster preparedness.',
    officialEmail: '',
    status: 'active',
    officerCount: 6,
    activeRequestsCount: 0,
  },
];

const REUSABLE_TAG_POSITIONS_MARKER = 'USIS_OFFICER_POSITIONS:';

const DEFAULT_POSITION_HIERARCHY = [
  'President',
  'Youth Council President',
  'Outfit Leader',
  'Troop Leader',
  'Vice-President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Auditor',
  'Public Information Officer',
  'PIO',
  'Protocol Officer',
  'Business Manager',
  'Sergeant at Arms',
  'Peace Officer',
  'Grade 7 - Representative',
  'Grade 8 - Representative',
  'Grade 9 - Representative',
  'Grade 10 - Representative',
  'Grade 11 - Representative',
  'Grade 12 - Representative',
  'STE - Representative',
  'SPA - Representative',
  'Representative',
  'Committee Head',
  'Officer',
  'Member',
];

const SEED_REQUESTS: SccServiceRequest[] = [
  {
    id: 'req-001',
    trackingNumber: 'SCC-2026-0001',
    organizationId: 'org-sslg-2026',
    organizationName: 'Supreme Secondary Learner Government',
    organizationAcronym: 'SSLG',
    requesterAccountId: 'acc-sslg-01',
    requesterName: 'Jacob S. Cajayon',
    requesterPosition: 'President',
    serviceKey: 'email_account',
    serviceTitle: 'Institutional Club Email Account',
    title: 'Request for Official SSLG Google Workspace Email Accounts (2026-2027)',
    justification: 'To facilitate official correspondence with the Division Youth Formation Coordinator, centralize club communications, and ensure seamless transfer of leadership documents.',
    priority: 'high',
    status: 'provisioned',
    adviserEndorsement: true,
    createdAt: '2026-10-15T09:30:00Z',
    updatedAt: '2026-10-16T14:20:00Z',
    details: {
      requestedMailboxAlias: 'sslg',
      targetUsernames: ['sslg@leonnhs.edu.ph', 'sslg.president@leonnhs.edu.ph', 'sslg.secretary@leonnhs.edu.ph'],
      customNotes: 'Executive board requires institutional 2-factor authentication enabled.',
    },
    provisionedData: {
      assignedEmail: 'sslg@leonnhs.edu.ph',
      tempPassword: 'LeonSSLG2026!#Pass',
      setupInstructions: 'Login via mail.google.com using the assigned institutional credentials. Change the temporary password upon initial sign-in and set up Google Authenticator.',
      provisionedAt: '2026-10-16T14:20:00Z',
      provisionedBy: 'School ICT Coordinator',
    },
    reviewerRemarks: 'Approved and provisioned. Google Workspace Organizational Unit: Clubs/SSLG.',
    reviewedBy: 'Engr. D. Morales (School ICT Coordinator)',
    reviewedAt: '2026-10-16T14:20:00Z',
  },
  {
    id: 'req-002',
    trackingNumber: 'SCC-2026-0002',
    organizationId: 'org-yeso-2026',
    organizationName: 'Youth for Environment in Schools Organization',
    organizationAcronym: 'YES-O',
    requesterAccountId: 'acc-yeso-01',
    requesterName: 'Kian Gabriel M. Villanueva',
    requesterPosition: 'President',
    serviceKey: 'email_account',
    serviceTitle: 'Institutional Club Email Account',
    title: 'Request for Official YES-O Mailbox & Google Drive Space',
    justification: 'For submitting monthly environmental reports to the Division Office and archiving Tree Planting project photos.',
    priority: 'normal',
    status: 'under_review',
    adviserEndorsement: true,
    createdAt: '2026-11-04T10:15:00Z',
    updatedAt: '2026-11-05T08:00:00Z',
    details: {
      requestedMailboxAlias: 'yeso',
      targetUsernames: ['yeso@leonnhs.edu.ph'],
      storageCapacity: '50GB',
      customNotes: 'Endorsed by Adviser Clarisse Bionat during Club Induction meeting.',
    },
    reviewerRemarks: 'Endorsement verified. Awaiting domain alias allocation from Division IT.',
    reviewedBy: 'School ICT Coordinator',
    reviewedAt: '2026-11-05T08:00:00Z',
  },
  {
    id: 'req-003',
    trackingNumber: 'SCC-2026-0003',
    organizationId: 'org-sslg-2026',
    organizationName: 'Supreme Secondary Learner Government',
    organizationAcronym: 'SSLG',
    requesterAccountId: 'acc-sslg-01',
    requesterName: 'Jacob S. Cajayon',
    requesterPosition: 'President',
    serviceKey: 'broadcast_notice',
    serviceTitle: 'School Portal Bulletin Broadcast',
    title: 'Leadership Camp 2026 Announcement on Learner Portal & Mobile App',
    justification: 'Dissemination of official dates, permission slips, and registration links to all Grade 7 to 12 classroom officers.',
    priority: 'urgent',
    status: 'pending',
    adviserEndorsement: true,
    createdAt: '2026-11-08T11:45:00Z',
    updatedAt: '2026-11-08T11:45:00Z',
    details: {
      broadcastHeadline: 'Annual Youth Leadership Summit 2026 - Official Registration Open',
      broadcastChannels: ['Learner Portal Dashboard', 'USIS Mobile Feed', 'Campus Digital Bulletin'],
      customNotes: 'Scheduled event date is November 28-29, 2026.',
    },
  },
  {
    id: 'req-004',
    trackingNumber: 'SCC-2026-0004',
    organizationId: 'org-srcy-2026',
    organizationName: 'Senior Red Cross Youth Council',
    organizationAcronym: 'SRCY',
    requesterAccountId: 'acc-srcy-01',
    requesterName: 'Bea Nicole P. Hernandez',
    requesterPosition: 'Youth Council President',
    serviceKey: 'digital_id_pass',
    serviceTitle: 'Digital Event QR & Entry Passes',
    title: 'First Aid Training Camp - Gate Check-in QR Generation for 120 Trainees',
    justification: 'Automating participant gate verification and RFID tap logs for standard Red Cross certification tracking.',
    priority: 'normal',
    status: 'approved',
    adviserEndorsement: true,
    createdAt: '2026-11-02T13:20:00Z',
    updatedAt: '2026-11-03T16:10:00Z',
    details: {
      eventTitle: 'Basic First Aid & CPR Youth Certification',
      eventDate: '2026-11-20',
      estimatedAttendees: 120,
      customNotes: 'Integrated with Attendance module gate kiosk.',
    },
    reviewerRemarks: 'Approved. Event passes will be compiled into PDF and available 48 hours prior to event.',
    reviewedBy: 'School Coordinator',
    reviewedAt: '2026-11-03T16:10:00Z',
  },
];

const LOCAL_STORAGE_KEYS = {
  ORGANIZATIONS: 'usis_scc_organizations_v4',
  OFFICERS: 'usis_scc_officers_v5',
  REQUESTS: 'usis_scc_service_requests_v4',
};

export function sanitizeEmail(val?: string | null): string {
  if (!val) return '';
  return val
    .replace(/@deped\.gov\.ph/gi, '@leonnhs.edu.ph')
    .replace(/@leon-nhs\.edu\.ph/gi, '@leonnhs.edu.ph');
}

export function sanitizeRequest(req: SccServiceRequest): SccServiceRequest {
  const r = { ...req };
  if (r.requesterName && /fitz|calisnao/i.test(r.requesterName)) {
    r.requesterName = 'Jacob S. Cajayon';
    r.requesterAccountId = 'acc-sslg-01';
  }
  if (r.details) {
    const details = { ...r.details };
    if (details.requestedMailboxAlias) {
      details.requestedMailboxAlias = details.requestedMailboxAlias.replace(/\.leon$/i, '');
    }
    if (Array.isArray(details.targetUsernames)) {
      details.targetUsernames = details.targetUsernames.map((u) => sanitizeEmail(u));
    }
    r.details = details;
  }
  if (r.provisionedData) {
    const prov = { ...r.provisionedData };
    if (prov.assignedEmail) {
      prov.assignedEmail = sanitizeEmail(prov.assignedEmail);
    }
    r.provisionedData = prov;
  }
  return r;
}

// Safe storage utilities
export function getStoredOrganizations(): SccOrganization[] {
  try {
    localStorage.removeItem('usis_scc_organizations_data');
    localStorage.removeItem('usis_scc_organizations_v1');
    localStorage.removeItem('usis_scc_organizations_v2');
    localStorage.removeItem('usis_scc_organizations_v3');
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.ORGANIZATIONS);
    if (raw) {
      const parsed: SccOrganization[] = JSON.parse(raw);
      return parsed.map((o) => ({
        ...o,
        adviserEmail: sanitizeEmail(o.adviserEmail),
        officialEmail: sanitizeEmail(o.officialEmail),
      }));
    }
  } catch (e) {
    console.warn('Failed to parse local organizations:', e);
  }
  return SEED_ORGANIZATIONS;
}

export function saveStoredOrganizations(orgs: SccOrganization[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(orgs));
  } catch (e) {
    console.warn('Failed to save local organizations:', e);
  }
}

export function getStoredOfficers(): SccOfficer[] {
  try {
    localStorage.removeItem('usis_scc_officers_data');
    localStorage.removeItem('usis_scc_officers_v1');
    localStorage.removeItem('usis_scc_officers_v2');
    localStorage.removeItem('usis_scc_officers_v3');
    localStorage.removeItem('usis_scc_officers_v4');
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.OFFICERS);
    if (raw) {
      const parsed: SccOfficer[] = JSON.parse(raw);
      return parsed
        .filter((off) => !/fitz|calisnao/i.test(off.fullName) && off.lrn !== '116503130041')
        .map((off) => ({
          ...off,
          email: sanitizeEmail(off.email),
        }));
    }
  } catch (e) {
    console.warn('Failed to parse local officers:', e);
  }
  return [];
}

export function saveStoredOfficers(officers: SccOfficer[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.OFFICERS, JSON.stringify(officers));
  } catch (e) {
    console.warn('Failed to save local officers:', e);
  }
}

export function getStoredRequests(): SccServiceRequest[] {
  try {
    localStorage.removeItem('usis_scc_service_requests_data');
    localStorage.removeItem('usis_scc_service_requests_v1');
    localStorage.removeItem('usis_scc_service_requests_v2');
    localStorage.removeItem('usis_scc_service_requests_v3');
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.REQUESTS);
    if (raw) {
      const parsed: SccServiceRequest[] = JSON.parse(raw);
      const sanitized = parsed.map(sanitizeRequest);
      saveStoredRequests(sanitized);
      return sanitized;
    }
  } catch (e) {
    console.warn('Failed to parse local requests:', e);
  }
  const seeded = SEED_REQUESTS.map(sanitizeRequest);
  saveStoredRequests(seeded);
  return seeded;
}

export function saveStoredRequests(reqs: SccServiceRequest[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.REQUESTS, JSON.stringify(reqs));
  } catch (e) {
    console.warn('Failed to save local requests:', e);
  }
}

// Supabase-first operations with storage fallback
export async function fetchSccOrganizations(): Promise<SccOrganization[]> {
  try {
    const { data, error } = await supabase
      .from(SCC_TABLES.ORGANIZATIONS)
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map((d: any) => ({
        id: d.id,
        schoolId: d.school_id || '302522',
        name: d.name,
        acronym: d.acronym,
        category: d.category || 'School Club',
        adviserName: d.adviser_name || '',
        adviserEmail: String(d.adviser_email || '').trim().toLowerCase(),
        adviserContact: d.adviser_contact || '',
        description: d.description || '',
        officialEmail: sanitizeEmail(d.official_email),
        status: d.status || 'active',
      }));
      saveStoredOrganizations(mapped);
      return mapped;
    }
  } catch (err) {
    console.info('Supabase scc_organizations not yet reachable, falling back to local dataset.', err);
  }
  return getStoredOrganizations();
}

function toTitleCase(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (char) => char.toUpperCase());
}

function formatLearnerDisplayName(
  firstName?: string | null,
  middleName?: string | null,
  lastName?: string | null,
  extensionName?: string | null,
): string {
  const first = toTitleCase(firstName || '');
  const last = toTitleCase(lastName || '');
  const midRaw = String(middleName || '').trim();
  const midInitial = midRaw ? `${midRaw.charAt(0).toUpperCase()}.` : '';
  const ext = extensionName ? toTitleCase(extensionName) : '';
  return [first, midInitial, last, ext].filter(Boolean).join(' ');
}

function normalizeTagList(value: unknown): string[] {
  const tags: string[] = [];
  const consume = (entry: unknown) => {
    if (entry == null) return;
    if (Array.isArray(entry)) {
      entry.forEach(consume);
      return;
    }
    if (typeof entry === 'string') {
      entry
        .split(/[\n,;]/g)
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((part) => {
          if (!tags.includes(part)) tags.push(part);
        });
      return;
    }
    if (typeof entry === 'object') {
      const obj = entry as Record<string, unknown>;
      [obj.label, obj.name, obj.tag, obj.club, obj.affiliation, obj.organization].forEach((c) => {
        if (typeof c === 'string' && c.trim() && !tags.includes(c.trim())) {
          tags.push(c.trim());
        }
      });
    }
  };
  consume(value);
  return tags;
}

function parseReusableTagPositions(description?: string | null): string[] {
  const raw = String(description || '');
  const idx = raw.indexOf(REUSABLE_TAG_POSITIONS_MARKER);
  if (idx === -1) return [];
  const payload = raw.slice(idx + REUSABLE_TAG_POSITIONS_MARKER.length).trim();
  try {
    const parsed = JSON.parse(payload);
    return Array.isArray(parsed)
      ? parsed.map((entry) => String(entry || '').trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function normalizePosKey(pos: string): string {
  return pos.toLowerCase().replace(/[-\s]+/g, ' ').trim();
}

export function getOfficerHierarchyRank(position: string, customHierarchy: string[] = []): number {
  const norm = normalizePosKey(position);
  if (!norm) return 9999;

  for (let i = 0; i < customHierarchy.length; i++) {
    if (normalizePosKey(customHierarchy[i]) === norm) return i;
  }
  for (let i = 0; i < customHierarchy.length; i++) {
    const target = normalizePosKey(customHierarchy[i]);
    if (norm.includes(target) || target.includes(norm)) return i + 0.5;
  }

  for (let i = 0; i < DEFAULT_POSITION_HIERARCHY.length; i++) {
    if (normalizePosKey(DEFAULT_POSITION_HIERARCHY[i]) === norm) return 1000 + i;
  }
  for (let i = 0; i < DEFAULT_POSITION_HIERARCHY.length; i++) {
    const target = normalizePosKey(DEFAULT_POSITION_HIERARCHY[i]);
    if (norm.includes(target) || target.includes(norm)) return 2000 + i;
  }

  return 9999;
}

export function sortOfficersByHierarchy(
  officers: SccOfficer[],
  customHierarchy: string[] = [],
): SccOfficer[] {
  return [...officers].sort((a, b) => {
    const rankDiff =
      getOfficerHierarchyRank(a.position, customHierarchy) -
      getOfficerHierarchyRank(b.position, customHierarchy);
    if (rankDiff !== 0) return rankDiff;
    return a.fullName.localeCompare(b.fullName);
  });
}

function isSignatoryPosition(position: string, rank: number): boolean {
  const lower = position.toLowerCase();
  if (
    lower.includes('president') ||
    lower.includes('secretary') ||
    lower.includes('treasurer') ||
    lower.includes('auditor') ||
    lower.includes('leader')
  ) {
    return true;
  }
  return rank < 5;
}

function normalizeOrgToken(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function doesTagMatchOrg(rawTag: string, orgPart: string, targetAcronym?: string, targetName?: string): boolean {
  const normTag = normalizeOrgToken(rawTag);
  const normPart = normalizeOrgToken(orgPart);
  const normAcronym = targetAcronym ? normalizeOrgToken(targetAcronym) : '';
  const normName = targetName ? normalizeOrgToken(targetName) : '';

  if (!normAcronym && !normName) return true;
  if (normAcronym && (normPart === normAcronym || normTag.startsWith(normAcronym))) return true;
  if (normName && (normPart === normName || normName.includes(normPart))) return true;

  // Common recognized aliases
  if (normAcronym === 'srcy' && normPart.includes('redcross')) return true;
  if (normAcronym === 'scexplorers' && normPart.includes('science')) return true;
  if (normAcronym === 'mwg' && normPart.includes('math')) return true;
  if (normAcronym === 'yeso' && normPart.includes('yeso')) return true;

  return false;
}

function matchLearnerTagToOrg(
  tags: string[],
  targetAcronym?: string,
  targetName?: string,
): { matched: boolean; position: string } {
  for (const tag of tags) {
    const rawTag = tag.trim();
    const sepIdx = rawTag.indexOf(' - ');
    if (sepIdx !== -1) {
      const orgPart = rawTag.slice(0, sepIdx).trim();
      const posPart = rawTag.slice(sepIdx + 3).trim();
      if (doesTagMatchOrg(rawTag, orgPart, targetAcronym, targetName)) {
        return { matched: true, position: posPart || 'Officer' };
      }
    } else if (doesTagMatchOrg(rawTag, rawTag, targetAcronym, targetName)) {
      return { matched: true, position: 'Member' };
    }
  }
  return { matched: false, position: '' };
}

export async function fetchSccOrganizationHierarchy(
  organizationAcronym?: string,
  organizationName?: string,
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('registrar_tags')
      .select('label, category, description, is_active');

    if (!error && Array.isArray(data)) {
      const matchedTag = data.find((t: any) =>
        doesTagMatchOrg(String(t.label || ''), String(t.label || ''), organizationAcronym, organizationName),
      );
      if (matchedTag) {
        return parseReusableTagPositions(matchedTag.description);
      }
    }
  } catch (err) {
    console.info('Unable to load registrar_tags hierarchy, using default order:', err);
  }
  return [];
}

export async function fetchSccOfficers(
  organizationId?: string,
  organizationAcronym?: string,
  organizationName?: string,
): Promise<SccOfficer[]> {
  // Resolve target organization details if not explicitly passed
  let targetAcronym = organizationAcronym;
  let targetName = organizationName;
  if (organizationId && (!targetAcronym || !targetName)) {
    const orgMatch = getStoredOrganizations().find((o) => o.id === organizationId);
    if (orgMatch) {
      targetAcronym = targetAcronym || orgMatch.acronym;
      targetName = targetName || orgMatch.name;
    }
  }

  // When SCC Coordinator is viewing default without a specific club selected, default to SSLG or passed org
  if (targetAcronym?.toUpperCase() === 'SCC' && organizationId === 'org-sslg-2026') {
    targetAcronym = 'SSLG';
    targetName = 'Supreme Secondary Learner Government';
  }

  const customHierarchy = await fetchSccOrganizationHierarchy(targetAcronym, targetName);

  try {
    // Query tagged learners directly from Registrar database
    let { data: learnerRows, error: learnerError } = await supabase
      .from('registrar_learners')
      .select(
        'id, lrn, first_name, middle_name, last_name, extension_name, contact_number, email, microsoft_upn, section_id, enrollment_history, grade_to_enroll, tags, status',
      )
      .neq('tags', '[]');

    if (learnerError) {
      const fallback = await supabase
        .from('learners')
        .select(
          'id, lrn, first_name, middle_name, last_name, extension_name, contact_number, email, microsoft_upn, section_id, enrollment_history, grade_to_enroll, tags, status',
        )
        .neq('tags', '[]');
      learnerRows = fallback.data;
      learnerError = fallback.error;
    }

    if (!learnerError && Array.isArray(learnerRows)) {
      const matchedLearners: Array<{ row: any; position: string }> = [];
      const sectionIds = new Set<string>();

      for (const row of learnerRows) {
        if (/fitz|calisnao/i.test(`${row.first_name || ''} ${row.last_name || ''}`) || row.lrn === '116503130041') {
          continue;
        }
        const tags = normalizeTagList(row.tags);
        const tagMatch = matchLearnerTagToOrg(tags, targetAcronym, targetName);
        if (tagMatch.matched) {
          matchedLearners.push({ row, position: tagMatch.position });
          if (row.section_id) sectionIds.add(String(row.section_id));
        }
      }

      // Resolve grade level and section names from registrar_sections
      const sectionMap = new Map<string, { name: string; gradeLevel: string; schoolYearId: string }>();
      if (sectionIds.size > 0) {
        const { data: secRows } = await supabase
          .from('registrar_sections')
          .select('id, name, grade_level, gradeLevel, school_year_id')
          .in('id', Array.from(sectionIds));

        if (Array.isArray(secRows)) {
          secRows.forEach((sec: any) => {
            sectionMap.set(String(sec.id), {
              name: toTitleCase(sec.name || ''),
              gradeLevel: sec.grade_level || sec.gradeLevel || '',
              schoolYearId: sec.school_year_id || '',
            });
          });
        }
      }

      const registrarOfficers: SccOfficer[] = matchedLearners.map(({ row, position }) => {
        const secInfo = row.section_id ? sectionMap.get(String(row.section_id)) : undefined;
        const latestEnrollment =
          Array.isArray(row.enrollment_history) && row.enrollment_history.length > 0
            ? row.enrollment_history[0]
            : null;

        const gradeLevel =
          secInfo?.gradeLevel ||
          latestEnrollment?.gradeLevel ||
          row.grade_to_enroll ||
          'Enrolled';

        const sectionName =
          secInfo?.name ||
          (latestEnrollment?.section ? toTitleCase(latestEnrollment.section) : '') ||
          '—';

        const termYear =
          latestEnrollment?.schoolYear ||
          (secInfo?.schoolYearId === 'sy20262027' ? '2026-2027' : '2026-2027');

        const rank = getOfficerHierarchyRank(position, customHierarchy);

        return {
          id: String(row.id),
          organizationId: organizationId || `org-${(targetAcronym || 'club').toLowerCase()}`,
          lrn: String(row.lrn || ''),
          fullName: formatLearnerDisplayName(
            row.first_name,
            row.middle_name,
            row.last_name,
            row.extension_name,
          ),
          position,
          gradeLevel,
          section: sectionName,
          email: sanitizeEmail(row.microsoft_upn || row.email || ''),
          contactNumber: String(row.contact_number || ''),
          termYear,
          isAuthorizedSignatory: isSignatoryPosition(position, rank),
        };
      });

      // Merge any supplementary manual additions from scc_officers (avoiding duplicate LRNs)
      const existingLrns = new Set(registrarOfficers.map((o) => o.lrn).filter(Boolean));
      const { data: extraRows, error: extraErr } = organizationId
        ? await supabase.from(SCC_TABLES.OFFICERS).select('*').eq('organization_id', organizationId)
        : await supabase.from(SCC_TABLES.OFFICERS).select('*');

      if (!extraErr && Array.isArray(extraRows)) {
        for (const d of extraRows) {
          if (/fitz|calisnao/i.test(d.full_name) || d.lrn === '116503130041') continue;
          if (d.lrn && existingLrns.has(String(d.lrn))) continue;
          registrarOfficers.push({
            id: d.id,
            organizationId: d.organization_id,
            lrn: String(d.lrn || ''),
            fullName: d.full_name,
            position: d.position,
            gradeLevel: d.grade_level,
            section: d.section,
            email: sanitizeEmail(d.email),
            contactNumber: d.contact_number || '',
            termYear: d.term_year || '2026-2027',
            isAuthorizedSignatory: Boolean(d.is_authorized_signatory),
          });
        }
      }

      const sorted = sortOfficersByHierarchy(registrarOfficers, customHierarchy);
      saveStoredOfficers(sorted);
      return sorted;
    }
  } catch (err) {
    console.info('Supabase registrar tagged learners fallback:', err);
  }

  const stored = getStoredOfficers();
  const filtered = organizationId ? stored.filter((o) => o.organizationId === organizationId) : stored;
  return sortOfficersByHierarchy(filtered, customHierarchy);
}

export async function addSccOfficer(officer: Omit<SccOfficer, 'id'>): Promise<SccOfficer> {
  const newId = `off-${Date.now()}`;
  const newOfficer: SccOfficer = {
    ...officer,
    id: newId,
  };

  try {
    const { error } = await supabase.from(SCC_TABLES.OFFICERS).insert({
      id: newId,
      organization_id: newOfficer.organizationId,
      lrn: newOfficer.lrn,
      full_name: newOfficer.fullName,
      position: newOfficer.position,
      grade_level: newOfficer.gradeLevel,
      section: newOfficer.section,
      email: newOfficer.email,
      contact_number: newOfficer.contactNumber,
      term_year: newOfficer.termYear,
      is_authorized_signatory: newOfficer.isAuthorizedSignatory,
    });
    if (error) console.warn('Supabase insert officer error, saving locally:', error);
  } catch (e) {
    console.warn('Officer insert network error:', e);
  }

  const all = getStoredOfficers();
  all.push(newOfficer);
  saveStoredOfficers(all);
  return newOfficer;
}

export async function fetchSccRequests(organizationId?: string): Promise<SccServiceRequest[]> {
  try {
    let query = supabase
      .from(SCC_TABLES.SERVICE_REQUESTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped: SccServiceRequest[] = data.map((d: any) =>
        sanitizeRequest({
          id: d.id,
          trackingNumber: d.tracking_number,
          organizationId: d.organization_id,
          organizationName: d.organization_name,
          organizationAcronym: d.organization_acronym,
          requesterAccountId: d.requester_account_id,
          requesterName: d.requester_name,
          requesterPosition: d.requester_position,
          serviceKey: d.service_key,
          serviceTitle: d.service_title,
          title: d.title,
          justification: d.justification,
          priority: d.priority || 'normal',
          status: d.status || 'pending',
          adviserEndorsement: Boolean(d.adviser_endorsement),
          createdAt: d.created_at,
          updatedAt: d.updated_at,
          details: typeof d.details === 'object' ? d.details : JSON.parse(d.details || '{}'),
          provisionedData:
            typeof d.provisioned_data === 'object'
              ? d.provisioned_data
              : d.provisioned_data
                ? JSON.parse(d.provisioned_data)
                : undefined,
          reviewerRemarks: d.reviewer_remarks,
          reviewedBy: d.reviewed_by,
          reviewedAt: d.reviewed_at,
        }),
      );
      return mapped;
    }
  } catch (err) {
    console.info('Supabase scc_service_requests fallback.');
  }

  const stored = getStoredRequests();
  return organizationId ? stored.filter((r) => r.organizationId === organizationId) : stored;
}

export interface MailboxAvailabilityResult {
  email: string;
  alias: string;
  available: boolean;
  registeredTo?: string;
  existsInDatabase: boolean;
  databaseReason?: string;
  existsInGoogleAdmin: boolean;
  googleAdminReason?: string;
  directoryChecked: boolean;
}

export function formatEmailAlreadyRegisteredMessage(
  email: string,
  registeredTo?: string,
): string {
  const owner = String(registeredTo || '').trim() || 'an existing account';
  return `${email} is registered already to ${owner}. Please select other email address.`;
}

export function normalizeMailboxAlias(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/\.leon$/i, '')
    .replace(/[^a-z0-9._-]/g, '');
}

export async function checkSccMailboxAvailability(
  aliasOrEmail: string,
  options?: { excludeRequestId?: string },
): Promise<MailboxAvailabilityResult> {
  const alias = normalizeMailboxAlias(aliasOrEmail);
  const fullEmail = alias ? `${alias}@leonnhs.edu.ph` : '';

  if (!alias || !fullEmail) {
    return {
      email: '',
      alias: '',
      available: false,
      existsInDatabase: false,
      existsInGoogleAdmin: false,
      directoryChecked: false,
    };
  }

  let existsInDatabase = false;
  let databaseReason: string | undefined;
  let dbRegisteredTo: string | undefined;

  // 1a. Check local fallback / Supabase scc_organizations.official_email
  const localOrgs = getStoredOrganizations();
  const localOrgMatch = localOrgs.find(
    (o) => sanitizeEmail(o.officialEmail || '').toLowerCase() === fullEmail,
  );
  if (localOrgMatch) {
    existsInDatabase = true;
    dbRegisteredTo = localOrgMatch.name
      ? localOrgMatch.acronym
        ? `${localOrgMatch.name} (${localOrgMatch.acronym})`
        : localOrgMatch.name
      : localOrgMatch.acronym;
    databaseReason = `Already registered in database as official email of ${dbRegisteredTo}.`;
  }

  try {
    const [orgRes, reqRes, learnerRes, offRes] = await Promise.all([
      supabase
        .from(SCC_TABLES.ORGANIZATIONS)
        .select('id, acronym, name, official_email')
        .ilike('official_email', fullEmail),
      supabase
        .from(SCC_TABLES.SERVICE_REQUESTS)
        .select('id, tracking_number, organization_name, organization_acronym, requester_name, status, service_key, details, provisioned_data')
        .eq('service_key', 'email_account')
        .neq('status', 'rejected'),
      supabase
        .from('registrar_learners')
        .select('id, first_name, middle_name, last_name, extension_name')
        .or(`email.ilike.${fullEmail},microsoft_upn.ilike.${fullEmail}`)
        .limit(1),
      supabase
        .from(SCC_TABLES.OFFICERS)
        .select('id, full_name, position')
        .ilike('email', fullEmail)
        .limit(1),
    ]);

    if (!orgRes.error && Array.isArray(orgRes.data) && orgRes.data.length > 0) {
      const hit = orgRes.data[0] as any;
      existsInDatabase = true;
      dbRegisteredTo = hit.name
        ? hit.acronym
          ? `${hit.name} (${hit.acronym})`
          : hit.name
        : hit.acronym || 'an SCC organization';
      databaseReason = `Already assigned in database to ${dbRegisteredTo}.`;
    }

    if (!existsInDatabase && !reqRes.error && Array.isArray(reqRes.data)) {
      for (const row of reqRes.data as any[]) {
        if (options?.excludeRequestId && row.id === options.excludeRequestId) continue;
        const prov =
          typeof row.provisioned_data === 'object'
            ? row.provisioned_data
            : row.provisioned_data
              ? JSON.parse(row.provisioned_data)
              : null;
        const details =
          typeof row.details === 'object'
            ? row.details
            : row.details
              ? JSON.parse(row.details)
              : null;

        const assigned = sanitizeEmail(prov?.assignedEmail || '').toLowerCase();
        const reqAlias = normalizeMailboxAlias(details?.requestedMailboxAlias || '');
        const targets: string[] = Array.isArray(details?.targetUsernames)
          ? details.targetUsernames.map((t: unknown) => sanitizeEmail(String(t)).toLowerCase())
          : [];

        if (assigned === fullEmail || reqAlias === alias || targets.includes(fullEmail)) {
          existsInDatabase = true;
          dbRegisteredTo = row.organization_name
            ? row.organization_acronym
              ? `${row.organization_name} (${row.organization_acronym})`
              : row.organization_name
            : row.organization_acronym || row.requester_name || 'an SCC organization';
          databaseReason = `Already used in active/provisioned request ${row.tracking_number} (${row.organization_acronym}).`;
          break;
        }
      }
    }

    if (!existsInDatabase && !learnerRes.error && Array.isArray(learnerRes.data) && learnerRes.data.length > 0) {
      const lrnRow = learnerRes.data[0] as any;
      existsInDatabase = true;
      dbRegisteredTo =
        formatLearnerDisplayName(
          lrnRow.first_name,
          lrnRow.middle_name,
          lrnRow.last_name,
          lrnRow.extension_name,
        ) || 'a Registrar learner account';
      databaseReason = `Already assigned to ${dbRegisteredTo}.`;
    }

    if (!existsInDatabase && !offRes.error && Array.isArray(offRes.data) && offRes.data.length > 0) {
      const offRow = offRes.data[0] as any;
      existsInDatabase = true;
      dbRegisteredTo = offRow.full_name || 'an SCC officer record';
      databaseReason = `Already registered to ${dbRegisteredTo}.`;
    }
  } catch {
    // fallback also check local requests
    if (!existsInDatabase) {
      const localReq = getStoredRequests().find((r) => {
        if (options?.excludeRequestId && r.id === options.excludeRequestId) return false;
        if (r.status === 'rejected' || r.serviceKey !== 'email_account') return false;
        const assigned = sanitizeEmail(r.provisionedData?.assignedEmail || '').toLowerCase();
        const reqAlias = normalizeMailboxAlias(r.details?.requestedMailboxAlias || '');
        return assigned === fullEmail || reqAlias === alias;
      });
      if (localReq) {
        existsInDatabase = true;
        dbRegisteredTo = localReq.organizationName
          ? `${localReq.organizationName} (${localReq.organizationAcronym})`
          : localReq.organizationAcronym;
        databaseReason = `Already used in request ${localReq.trackingNumber} (${localReq.organizationAcronym}).`;
      }
    }
  }

  // 2. Check Google Admin Users Directory via /api/scc-check-email
  let existsInGoogleAdmin = false;
  let directoryChecked = false;
  let googleAdminReason: string | undefined;
  let googleRegisteredTo: string | undefined;

  try {
    const res = await fetch(`/api/scc-check-email?email=${encodeURIComponent(fullEmail)}`);
    if (res.ok) {
      const data = await res.json();
      directoryChecked = Boolean(data?.checked);
      existsInGoogleAdmin = Boolean(data?.existsInGoogleAdmin);
      if (existsInGoogleAdmin) {
        googleRegisteredTo = String(data?.registeredTo || '').trim() || undefined;
        googleAdminReason = 'Already exists in the Google Admin Users Directory.';
      }
    }
  } catch {
    // keep directoryChecked = false when offline
  }

  return {
    email: fullEmail,
    alias,
    available: !existsInDatabase && !existsInGoogleAdmin,
    registeredTo: googleRegisteredTo || dbRegisteredTo,
    existsInDatabase,
    databaseReason,
    existsInGoogleAdmin,
    googleAdminReason,
    directoryChecked,
  };
}

export async function createSccRequest(
  payload: Omit<SccServiceRequest, 'id' | 'trackingNumber' | 'createdAt' | 'updatedAt' | 'status'>,
): Promise<SccServiceRequest> {
  if (payload.serviceKey === 'email_account') {
    const check = await checkSccMailboxAvailability(payload.details?.requestedMailboxAlias || '');
    if (!check.alias) {
      throw new Error('Please provide a valid mailbox alias before submitting.');
    }
    if (!check.available) {
      throw new Error(formatEmailAlreadyRegisteredMessage(check.email, check.registeredTo));
    }
  }

  const currentRequests = getStoredRequests();
  const nextNum = String(currentRequests.length + 1).padStart(4, '0');
  const trackingNumber = `SCC-2026-${nextNum}`;
  const now = new Date().toISOString();
  const id = `req-${Date.now()}`;

  const newRequest: SccServiceRequest = {
    ...payload,
    id,
    trackingNumber,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { error } = await supabase.from(SCC_TABLES.SERVICE_REQUESTS).insert({
      id,
      tracking_number: trackingNumber,
      organization_id: newRequest.organizationId,
      organization_name: newRequest.organizationName,
      organization_acronym: newRequest.organizationAcronym,
      requester_account_id: newRequest.requesterAccountId,
      requester_name: newRequest.requesterName,
      requester_position: newRequest.requesterPosition,
      service_key: newRequest.serviceKey,
      service_title: newRequest.serviceTitle,
      title: newRequest.title,
      justification: newRequest.justification,
      priority: newRequest.priority,
      status: 'pending',
      adviser_endorsement: newRequest.adviserEndorsement,
      details: newRequest.details,
      created_at: now,
      updated_at: now,
    });
    if (error) console.warn('Supabase create request error, saving locally:', error);
  } catch (e) {
    console.warn('Network error creating request in Supabase:', e);
  }

  const all = [newRequest, ...currentRequests];
  saveStoredRequests(all);
  return newRequest;
}

export async function updateSccRequestStatus(
  requestId: string,
  updates: {
    status: SccServiceRequest['status'];
    reviewerRemarks?: string;
    reviewedBy?: string;
    provisionedData?: SccServiceRequest['provisionedData'];
  },
): Promise<SccServiceRequest> {
  const now = new Date().toISOString();
  const all = getStoredRequests();
  const targetIndex = all.findIndex((r) => r.id === requestId);
  if (targetIndex === -1) throw new Error('Request not found');

  const updated: SccServiceRequest = {
    ...all[targetIndex],
    status: updates.status,
    reviewerRemarks: updates.reviewerRemarks || all[targetIndex].reviewerRemarks,
    reviewedBy: updates.reviewedBy || all[targetIndex].reviewedBy,
    reviewedAt: now,
    updatedAt: now,
    provisionedData: updates.provisionedData || all[targetIndex].provisionedData,
  };

  // If provisioned with an email, also update the organization's official email
  if (updates.status === 'provisioned' && updates.provisionedData?.assignedEmail) {
    const orgs = getStoredOrganizations();
    const orgIndex = orgs.findIndex((o) => o.id === updated.organizationId);
    if (orgIndex !== -1) {
      orgs[orgIndex].officialEmail = updates.provisionedData.assignedEmail;
      saveStoredOrganizations(orgs);
    }
  }

  try {
    const { error } = await supabase
      .from(SCC_TABLES.SERVICE_REQUESTS)
      .update({
        status: updates.status,
        reviewer_remarks: updated.reviewerRemarks,
        reviewed_by: updated.reviewedBy,
        reviewed_at: now,
        updated_at: now,
        provisioned_data: updated.provisionedData,
      })
      .eq('id', requestId);
    if (error) console.warn('Supabase update status error:', error);
  } catch (e) {
    console.warn('Supabase update status network error:', e);
  }

  all[targetIndex] = updated;
  saveStoredRequests(all);
  return updated;
}
