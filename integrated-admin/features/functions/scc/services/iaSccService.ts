import { supabase } from '@deped-usis/shared-supabase';
import type {
  IaMailboxAvailabilityResult,
  IaSccAdviserCandidate,
  IaSccGoogleUser,
  IaSccLearnerCandidate,
  IaSccOfficer,
  IaSccOrganization,
  IaSccRequestReviewPayload,
  IaSccServiceRequest,
  SccNotificationResult,
  SccOfficerRecipient,
  SccSmtpStatus,
} from '../types';

const SCC_TABLES = {
  ORGANIZATIONS: 'scc_organizations',
  OFFICERS: 'scc_officers',
  SERVICE_REQUESTS: 'scc_service_requests',
} as const;

const STORAGE_KEYS = {
  ORGANIZATIONS: 'usis_scc_organizations_v4',
  REQUESTS: 'usis_scc_service_requests_v4',
} as const;

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

const FALLBACK_ORGANIZATIONS: IaSccOrganization[] = [
  {
    id: 'org-sslg-2026',
    schoolId: '302522',
    name: 'Supreme Secondary Learner Government',
    acronym: 'SSLG',
    category: 'Student Government',
    adviserName: 'Mr. Roderick S. Alcantara, LPT',
    adviserEmail: 'roderick.alcantara@leonnhs.edu.ph',
    adviserContact: '0917-123-4567',
    description:
      'The highest governing body of learners in Leon National High School dedicated to student welfare, leadership development, and school community representation.',
    officialEmail: 'sslg@leonnhs.edu.ph',
    status: 'active',
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
    description:
      'The recognized co-curricular environmental organization spearheading ecological stewardship, waste segregation, and tree nurturing projects in Leon NHS.',
    officialEmail: '',
    status: 'active',
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
    description:
      'Providing first aid education, youth health defense, leadership training, and voluntary humanitarian service to the school campus and barangay community.',
    officialEmail: 'srcy@leonnhs.edu.ph',
    status: 'active',
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
    description:
      'Empowering young investigators, robotics hobbyists, and STEM innovators through scientific inquiry and national science fair participation.',
    officialEmail: '',
    status: 'active',
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
    description:
      'Fostering mathematical problem solving, peer tutoring sessions, and representation in Metrobank-MTAP-DepEd Math Challenges.',
    officialEmail: '',
    status: 'active',
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
    description:
      'Instilling character building, outdoor wilderness skills, civic responsibility, and emergency disaster preparedness.',
    officialEmail: '',
    status: 'active',
  },
];

const FALLBACK_REQUESTS: IaSccServiceRequest[] = [
  {
    id: 'req-001',
    trackingNumber: 'SCC-2026-0001',
    organizationId: 'org-sslg-2026',
    organizationName: 'Supreme Secondary Learner Government',
    organizationAcronym: 'SSLG',
    requesterAccountId: 'acc-sslg-01',
    requesterName: 'Jacob O. Cajayon',
    requesterPosition: 'President',
    serviceKey: 'email_account',
    serviceTitle: 'Institutional Club Email Account',
    title: 'Request for Official SSLG Google Workspace Email Accounts (2026-2027)',
    justification:
      'To facilitate official correspondence with the Division Youth Formation Coordinator, centralize club communications, and ensure seamless transfer of leadership documents.',
    priority: 'high',
    status: 'provisioned',
    adviserEndorsement: true,
    createdAt: '2026-10-15T09:30:00Z',
    updatedAt: '2026-10-16T14:20:00Z',
    details: {
      requestedMailboxAlias: 'sslg',
      targetUsernames: [
        'sslg@leonnhs.edu.ph',
        'sslg.president@leonnhs.edu.ph',
        'sslg.secretary@leonnhs.edu.ph',
      ],
      customNotes: 'Executive board requires institutional 2-factor authentication enabled.',
    },
    provisionedData: {
      assignedEmail: 'sslg@leonnhs.edu.ph',
      tempPassword: 'LeonSSLG2026!#Pass',
      setupInstructions:
        'Login via mail.google.com using the assigned institutional credentials. Change the temporary password upon initial sign-in and set up Google Authenticator.',
      provisionedAt: '2026-10-16T14:20:00Z',
      provisionedBy: 'School ICT Coordinator',
    },
    reviewerRemarks: 'Approved and provisioned. Google Workspace Organizational Unit: Clubs/SSLG.',
    reviewedBy: 'School ICT Coordinator',
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
    justification:
      'For submitting monthly environmental reports to the Division Office and archiving Tree Planting project photos.',
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
    reviewerRemarks: 'Endorsement verified. Awaiting domain alias allocation.',
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
    requesterName: 'Jacob O. Cajayon',
    requesterPosition: 'President',
    serviceKey: 'broadcast_notice',
    serviceTitle: 'School Portal Bulletin Broadcast',
    title: 'Leadership Camp 2026 Announcement on Learner Portal & Mobile App',
    justification:
      'Dissemination of official dates, permission slips, and registration links to all Grade 7 to 12 classroom officers.',
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
];

export function sanitizeEmail(val?: string | null): string {
  if (!val) return '';
  return val
    .replace(/@deped\.gov\.ph/gi, '@leonnhs.edu.ph')
    .replace(/@leon-nhs\.edu\.ph/gi, '@leonnhs.edu.ph');
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
): { matched: boolean; position: string; matchedTag: string } {
  for (const tag of tags) {
    const rawTag = tag.trim();
    const sepIdx = rawTag.indexOf(' - ');
    if (sepIdx !== -1) {
      const orgPart = rawTag.slice(0, sepIdx).trim();
      const posPart = rawTag.slice(sepIdx + 3).trim();
      if (doesTagMatchOrg(rawTag, orgPart, targetAcronym, targetName)) {
        return { matched: true, position: posPart || 'Officer', matchedTag: rawTag };
      }
    } else if (doesTagMatchOrg(rawTag, rawTag, targetAcronym, targetName)) {
      return { matched: true, position: 'Member', matchedTag: rawTag };
    }
  }
  return { matched: false, position: '', matchedTag: '' };
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

function sanitizeRequest(req: IaSccServiceRequest): IaSccServiceRequest {
  const r = { ...req };
  if (r.requesterName && /fitz|calisnao/i.test(r.requesterName)) {
    r.requesterName = 'Jacob O. Cajayon';
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

function readLocalOrganizations(): IaSccOrganization[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORGANIZATIONS);
    if (raw) {
      const parsed: IaSccOrganization[] = JSON.parse(raw);
      return parsed.map((o) => ({
        ...o,
        adviserEmail: sanitizeEmail(o.adviserEmail),
        officialEmail: sanitizeEmail(o.officialEmail),
      }));
    }
  } catch (e) {
    console.warn('Failed reading local SCC organizations:', e);
  }
  return FALLBACK_ORGANIZATIONS;
}

function writeLocalOrganizations(orgs: IaSccOrganization[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ORGANIZATIONS, JSON.stringify(orgs));
  } catch (e) {
    console.warn('Failed saving local SCC organizations:', e);
  }
}

function readLocalRequests(): IaSccServiceRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    if (raw) {
      const parsed: IaSccServiceRequest[] = JSON.parse(raw);
      return parsed.map(sanitizeRequest);
    }
  } catch (e) {
    console.warn('Failed reading local SCC requests:', e);
  }
  return FALLBACK_REQUESTS.map(sanitizeRequest);
}

function writeLocalRequests(requests: IaSccServiceRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));
  } catch (e) {
    console.warn('Failed saving local SCC requests:', e);
  }
}

export async function loadIaSccOrganizations(): Promise<IaSccOrganization[]> {
  let orgs: IaSccOrganization[] = [];
  try {
    const { data, error } = await supabase
      .from(SCC_TABLES.ORGANIZATIONS)
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      orgs = data.map((d: any) => ({
        id: String(d.id),
        schoolId: String(d.school_id || '302522'),
        name: String(d.name || ''),
        acronym: String(d.acronym || ''),
        category: String(d.category || 'Student Organization'),
        adviserName: String(d.adviser_name || ''),
        adviserEmail: String(d.adviser_email || '').trim().toLowerCase(),
        adviserContact: String(d.adviser_contact || ''),
        description: String(d.description || ''),
        officialEmail: sanitizeEmail(d.official_email),
        status: (d.status || 'active') as IaSccOrganization['status'],
      }));
      writeLocalOrganizations(orgs);
    } else {
      orgs = readLocalOrganizations();
    }
  } catch {
    orgs = readLocalOrganizations();
  }

  // Enrich organizations with live Registrar tagged + manual officer counts & active request counts
  const [taggedRows, requests, manualRes] = await Promise.all([
    fetchAllTaggedRegistrarLearners(),
    loadIaSccRequests(),
    supabase.from(SCC_TABLES.OFFICERS).select('organization_id, lrn, full_name'),
  ]);

  const manualOfficers = (!manualRes.error && Array.isArray(manualRes.data) ? manualRes.data : []) as any[];

  return orgs.map((org) => {
    const matchedTaggedRows = taggedRows.filter((row) => {
      const tags = normalizeTagList(row.tags);
      return matchLearnerTagToOrg(tags, org.acronym, org.name).matched;
    });
    const taggedLrns = new Set(matchedTaggedRows.map((r) => String(r.lrn || '')).filter(Boolean));
    const extraManualCount = manualOfficers.filter((m) => {
      if (String(m.organization_id) !== org.id) return false;
      if (/fitz|calisnao/i.test(String(m.full_name || '')) || m.lrn === '116503130041') return false;
      if (m.lrn && taggedLrns.has(String(m.lrn))) return false;
      return true;
    }).length;

    const activeReq = requests.filter(
      (r) =>
        r.organizationId === org.id &&
        (r.status === 'pending' || r.status === 'under_review' || r.status === 'approved'),
    ).length;

    return {
      ...org,
      officerCount: matchedTaggedRows.length + extraManualCount,
      activeRequestsCount: activeReq,
    };
  });
}

export async function deleteIaSccOrganization(organizationId: string): Promise<void> {
  const { error } = await supabase
    .from(SCC_TABLES.ORGANIZATIONS)
    .delete()
    .eq('id', organizationId);

  if (error) {
    throw new Error(error.message || 'Unable to delete organization.');
  }

  const all = readLocalOrganizations().filter((o) => o.id !== organizationId);
  writeLocalOrganizations(all);
}

export async function saveIaSccOrganization(
  payload: Omit<IaSccOrganization, 'officerCount' | 'activeRequestsCount'>,
  isNew: boolean,
): Promise<IaSccOrganization> {
  const cleanPayload: IaSccOrganization = {
    ...payload,
    id: isNew ? `org-${payload.acronym.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}` : payload.id,
    schoolId: payload.schoolId || '302522',
    adviserEmail: payload.adviserEmail.trim().toLowerCase(),
    officialEmail: sanitizeEmail(payload.officialEmail?.trim()),
  };

  try {
    const dbRow = {
      id: cleanPayload.id,
      school_id: cleanPayload.schoolId,
      name: cleanPayload.name.trim(),
      acronym: cleanPayload.acronym.trim().toUpperCase(),
      category: cleanPayload.category.trim(),
      adviser_name: cleanPayload.adviserName.trim(),
      adviser_email: cleanPayload.adviserEmail,
      adviser_contact: cleanPayload.adviserContact?.trim() || null,
      description: cleanPayload.description.trim(),
      official_email: cleanPayload.officialEmail || null,
      status: cleanPayload.status,
    };

    const { error } = await supabase
      .from(SCC_TABLES.ORGANIZATIONS)
      .upsert([dbRow], { onConflict: 'id' });

    if (error) {
      console.warn('Supabase scc_organizations upsert fallback to local:', error.message);
    }
  } catch (err) {
    console.warn('Supabase scc_organizations network fallback:', err);
  }

  const all = readLocalOrganizations();
  const idx = all.findIndex((o) => o.id === cleanPayload.id);
  if (idx >= 0) {
    all[idx] = cleanPayload;
  } else {
    all.push(cleanPayload);
  }
  writeLocalOrganizations(all);
  return cleanPayload;
}

export async function loadIaSccRequests(): Promise<IaSccServiceRequest[]> {
  try {
    const { data, error } = await supabase
      .from(SCC_TABLES.SERVICE_REQUESTS)
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      const mapped = data.map((d: any) =>
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
      writeLocalRequests(mapped);
      return mapped;
    }
  } catch {
    // fallback below
  }
  return readLocalRequests();
}

export async function reviewIaSccRequest(
  requestId: string,
  payload: IaSccRequestReviewPayload,
): Promise<IaSccServiceRequest> {
  const now = new Date().toISOString();

  try {
    const { error } = await supabase
      .from(SCC_TABLES.SERVICE_REQUESTS)
      .update({
        status: payload.status,
        reviewer_remarks: payload.reviewerRemarks,
        reviewed_by: payload.reviewedBy,
        reviewed_at: now,
        provisioned_data: payload.provisionedData || null,
        updated_at: now,
      })
      .eq('id', requestId);

    if (error) {
      console.warn('Supabase scc_service_requests update fallback to local:', error.message);
    }
  } catch (err) {
    console.warn('Supabase scc_service_requests update network fallback:', err);
  }

  const all = readLocalRequests();
  const idx = all.findIndex((r) => r.id === requestId);
  if (idx === -1) throw new Error('Service request not found.');

  const updated: IaSccServiceRequest = sanitizeRequest({
    ...all[idx],
    status: payload.status,
    reviewerRemarks: payload.reviewerRemarks,
    reviewedBy: payload.reviewedBy,
    reviewedAt: now,
    provisionedData: payload.provisionedData ?? all[idx].provisionedData,
    updatedAt: now,
  });

  all[idx] = updated;
  writeLocalRequests(all);

  // Sync official mailbox to scc_organizations when email_account is provisioned
  if (payload.status === 'provisioned' && updated.serviceKey === 'email_account' && payload.provisionedData?.assignedEmail) {
    const cleanAssigned = sanitizeEmail(payload.provisionedData.assignedEmail);
    try {
      await supabase
        .from(SCC_TABLES.ORGANIZATIONS)
        .update({ official_email: cleanAssigned, updated_at: now })
        .eq('id', updated.organizationId);
    } catch {
      // handled in local fallback below
    }
    const orgs = readLocalOrganizations();
    const orgIdx = orgs.findIndex((o) => o.id === updated.organizationId);
    if (orgIdx !== -1) {
      orgs[orgIdx] = { ...orgs[orgIdx], officialEmail: cleanAssigned };
      writeLocalOrganizations(orgs);
    }
  }

  return updated;
}

async function fetchAllTaggedRegistrarLearners(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('registrar_learners')
      .select(
        'id, lrn, first_name, middle_name, last_name, extension_name, contact_number, email, microsoft_upn, section_id, enrollment_history, grade_to_enroll, tags, status',
      )
      .neq('tags', '[]');

    if (!error && Array.isArray(data)) {
      return data.filter(
        (row) =>
          !/fitz|calisnao/i.test(`${row.first_name || ''} ${row.last_name || ''}`) &&
          row.lrn !== '116503130041',
      );
    }
  } catch {
    // ignore
  }
  return [];
}

export async function loadIaSccOrganizationHierarchy(
  acronym?: string,
  name?: string,
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('registrar_tags')
      .select('label, description');

    if (!error && Array.isArray(data)) {
      const matched = data.find((t: any) =>
        doesTagMatchOrg(String(t.label || ''), String(t.label || ''), acronym, name),
      );
      if (matched) {
        return parseReusableTagPositions(matched.description);
      }
    }
  } catch {
    // ignore
  }
  return [];
}

export async function loadIaSccOrgRoster(
  organizationId: string,
  organizationAcronym: string,
  organizationName: string,
): Promise<{ officers: IaSccOfficer[]; hierarchy: string[] }> {
  const [hierarchy, taggedLearners] = await Promise.all([
    loadIaSccOrganizationHierarchy(organizationAcronym, organizationName),
    fetchAllTaggedRegistrarLearners(),
  ]);

  const matchedLearners: Array<{ row: any; position: string; matchedTag: string }> = [];
  const sectionIds = new Set<string>();

  for (const row of taggedLearners) {
    const tags = normalizeTagList(row.tags);
    const match = matchLearnerTagToOrg(tags, organizationAcronym, organizationName);
    if (match.matched) {
      matchedLearners.push({ row, position: match.position, matchedTag: match.matchedTag });
      if (row.section_id) sectionIds.add(String(row.section_id));
    }
  }

  const sectionMap = new Map<string, { name: string; gradeLevel: string; schoolYearId: string }>();
  if (sectionIds.size > 0) {
    try {
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
    } catch {
      // fallback to enrollment_history
    }
  }

  const officers: IaSccOfficer[] = matchedLearners.map(({ row, position, matchedTag }) => {
    const secInfo = row.section_id ? sectionMap.get(String(row.section_id)) : undefined;
    const latestEnrollment =
      Array.isArray(row.enrollment_history) && row.enrollment_history.length > 0
        ? row.enrollment_history[0]
        : null;

    const gradeLevel =
      secInfo?.gradeLevel || latestEnrollment?.gradeLevel || row.grade_to_enroll || 'Enrolled';
    const sectionName =
      secInfo?.name || (latestEnrollment?.section ? toTitleCase(latestEnrollment.section) : '') || '—';
    const termYear = latestEnrollment?.schoolYear || '2026-2027';
    const rank = getOfficerHierarchyRank(position, hierarchy);

    const personalEmail = sanitizeEmail(row.email || '');
    const m365Email = sanitizeEmail(row.microsoft_upn || '');
    const primaryEmail = m365Email || personalEmail;
    const secondaryEmail =
      personalEmail && personalEmail !== primaryEmail ? personalEmail : undefined;

    return {
      id: String(row.id),
      organizationId,
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
      email: primaryEmail,
      secondaryEmail,
      contactNumber: String(row.contact_number || ''),
      termYear,
      isAuthorizedSignatory: isSignatoryPosition(position, rank),
      source: 'registrar',
      matchedTag,
    };
  });

  // Merge any supplemental scc_officers rows
  try {
    const existingLrns = new Set(officers.map((o) => o.lrn).filter(Boolean));
    const { data: extraRows, error: extraErr } = await supabase
      .from(SCC_TABLES.OFFICERS)
      .select('*')
      .eq('organization_id', organizationId);

    if (!extraErr && Array.isArray(extraRows)) {
      for (const d of extraRows) {
        if (/fitz|calisnao/i.test(d.full_name) || d.lrn === '116503130041') continue;
        if (d.lrn && existingLrns.has(String(d.lrn))) continue;
        officers.push({
          id: String(d.id),
          organizationId: String(d.organization_id),
          lrn: String(d.lrn || ''),
          fullName: String(d.full_name || ''),
          position: String(d.position || ''),
          gradeLevel: String(d.grade_level || ''),
          section: String(d.section || ''),
          email: sanitizeEmail(d.email),
          contactNumber: String(d.contact_number || ''),
          termYear: String(d.term_year || '2026-2027'),
          isAuthorizedSignatory: Boolean(d.is_authorized_signatory),
          source: 'manual',
        });
      }
    }
  } catch {
    // ignore
  }

  officers.sort((a, b) => {
    const rankDiff =
      getOfficerHierarchyRank(a.position, hierarchy) -
      getOfficerHierarchyRank(b.position, hierarchy);
    if (rankDiff !== 0) return rankDiff;
    return a.fullName.localeCompare(b.fullName);
  });

  return { officers, hierarchy };
}

export async function loadTotalRegistrarTaggedCount(): Promise<number> {
  const rows = await fetchAllTaggedRegistrarLearners();
  return rows.length;
}

function stripOrgTags(tags: string[], organizationAcronym: string, organizationName: string): string[] {
  return tags.filter((tag) => {
    const raw = tag.trim();
    const sepIdx = raw.indexOf(' - ');
    const orgPart = sepIdx !== -1 ? raw.slice(0, sepIdx).trim() : raw;
    return !doesTagMatchOrg(raw, orgPart, organizationAcronym, organizationName);
  });
}

export async function searchIaSccLearners(query: string): Promise<IaSccLearnerCandidate[]> {
  const clean = query.trim().replace(/[(),%]/g, '');
  if (clean.length < 2) return [];

  const { data: rows, error } = await supabase
    .from('registrar_learners')
    .select(
      'id, lrn, first_name, middle_name, last_name, extension_name, contact_number, email, microsoft_upn, section_id, enrollment_history, grade_to_enroll, tags',
    )
    .or(`lrn.ilike.%${clean}%,first_name.ilike.%${clean}%,last_name.ilike.%${clean}%`)
    .limit(15);

  if (error || !Array.isArray(rows)) {
    throw new Error(error?.message || 'Unable to search learners.');
  }

  const validRows = rows.filter(
    (r) =>
      !/fitz|calisnao/i.test(`${r.first_name || ''} ${r.last_name || ''}`) &&
      r.lrn !== '116503130041',
  );

  const sectionIds = Array.from(
    new Set(validRows.map((r) => r.section_id).filter(Boolean).map(String)),
  );
  const sectionMap = new Map<string, { name: string; gradeLevel: string }>();

  if (sectionIds.length > 0) {
    const { data: secRows } = await supabase
      .from('registrar_sections')
      .select('id, name, grade_level, gradeLevel')
      .in('id', sectionIds);
    if (Array.isArray(secRows)) {
      secRows.forEach((sec: any) => {
        sectionMap.set(String(sec.id), {
          name: toTitleCase(sec.name || ''),
          gradeLevel: sec.grade_level || sec.gradeLevel || '',
        });
      });
    }
  }

  return validRows.map((row) => {
    const secInfo = row.section_id ? sectionMap.get(String(row.section_id)) : undefined;
    const latestEnrollment =
      Array.isArray(row.enrollment_history) && row.enrollment_history.length > 0
        ? row.enrollment_history[0]
        : null;

    return {
      id: String(row.id),
      lrn: String(row.lrn || ''),
      fullName: formatLearnerDisplayName(
        row.first_name,
        row.middle_name,
        row.last_name,
        row.extension_name,
      ),
      gradeLevel:
        secInfo?.gradeLevel || latestEnrollment?.gradeLevel || row.grade_to_enroll || 'Enrolled',
      section:
        secInfo?.name || (latestEnrollment?.section ? toTitleCase(latestEnrollment.section) : '') || '—',
      email: sanitizeEmail(row.microsoft_upn || row.email || ''),
      contactNumber: String(row.contact_number || ''),
      tags: normalizeTagList(row.tags),
    };
  });
}

export async function addIaSccRosterOfficer(params: {
  organizationId: string;
  organizationAcronym: string;
  organizationName: string;
  position: string;
  learnerId?: string;
  lrn?: string;
  fullName?: string;
  gradeLevel?: string;
  section?: string;
  email?: string;
  contactNumber?: string;
  termYear?: string;
  isAuthorizedSignatory?: boolean;
}): Promise<void> {
  const cleanPos = params.position.trim();
  if (!cleanPos) throw new Error('Officer position is required.');

  if (params.learnerId) {
    const { data: learnerRow, error: fetchErr } = await supabase
      .from('registrar_learners')
      .select('id, tags')
      .eq('id', params.learnerId)
      .maybeSingle();

    if (fetchErr || !learnerRow) {
      throw new Error(fetchErr?.message || 'Selected learner record not found.');
    }

    const existingTags = normalizeTagList(learnerRow.tags);
    const cleanedTags = stripOrgTags(
      existingTags,
      params.organizationAcronym,
      params.organizationName,
    );
    const newTag = `${params.organizationAcronym.trim()} - ${cleanPos}`;
    const nextTags = [...cleanedTags, newTag];

    const { error: updateErr } = await supabase
      .from('registrar_learners')
      .update({ tags: nextTags })
      .eq('id', params.learnerId);

    if (updateErr) {
      throw new Error(updateErr.message || 'Unable to tag learner in Registrar Registry.');
    }
    return;
  }

  const newId = `off-${Date.now()}`;
  const { error } = await supabase.from(SCC_TABLES.OFFICERS).insert({
    id: newId,
    organization_id: params.organizationId,
    lrn: params.lrn?.trim() || null,
    full_name: params.fullName?.trim() || '',
    position: cleanPos,
    grade_level: params.gradeLevel?.trim() || 'Grade 11',
    section: params.section?.trim() || '—',
    email: sanitizeEmail(params.email?.trim()) || null,
    contact_number: params.contactNumber?.trim() || null,
    term_year: params.termYear?.trim() || '2026-2027',
    is_authorized_signatory: Boolean(params.isAuthorizedSignatory),
  });

  if (error) {
    throw new Error(error.message || 'Unable to add manual officer record.');
  }
}

export async function updateIaSccRosterOfficer(params: {
  officer: IaSccOfficer;
  organizationAcronym: string;
  organizationName: string;
  position: string;
  lrn?: string;
  fullName?: string;
  gradeLevel?: string;
  section?: string;
  email?: string;
  contactNumber?: string;
  termYear?: string;
  isAuthorizedSignatory?: boolean;
}): Promise<void> {
  const cleanPos = params.position.trim();
  if (!cleanPos) throw new Error('Officer position is required.');

  if (params.officer.source === 'registrar') {
    const { data: learnerRow, error: fetchErr } = await supabase
      .from('registrar_learners')
      .select('id, tags')
      .eq('id', params.officer.id)
      .maybeSingle();

    if (fetchErr || !learnerRow) {
      throw new Error(fetchErr?.message || 'Tagged learner record not found.');
    }

    const existingTags = normalizeTagList(learnerRow.tags);
    const cleanedTags = stripOrgTags(
      existingTags,
      params.organizationAcronym,
      params.organizationName,
    );
    const updatedTag = `${params.organizationAcronym.trim()} - ${cleanPos}`;
    const nextTags = [...cleanedTags, updatedTag];

    const updateFields: Record<string, unknown> = { tags: nextTags };
    if (params.contactNumber !== undefined) {
      updateFields.contact_number = params.contactNumber.trim() || null;
    }

    const { error: updateErr } = await supabase
      .from('registrar_learners')
      .update(updateFields)
      .eq('id', params.officer.id);

    if (updateErr) {
      throw new Error(updateErr.message || 'Unable to update tagged learner role.');
    }
    return;
  }

  const { error } = await supabase
    .from(SCC_TABLES.OFFICERS)
    .update({
      lrn: params.lrn?.trim() || null,
      full_name: params.fullName?.trim() || params.officer.fullName,
      position: cleanPos,
      grade_level: params.gradeLevel?.trim() || params.officer.gradeLevel,
      section: params.section?.trim() || params.officer.section,
      email: sanitizeEmail(params.email?.trim()) || null,
      contact_number: params.contactNumber?.trim() || null,
      term_year: params.termYear?.trim() || params.officer.termYear,
      is_authorized_signatory: Boolean(params.isAuthorizedSignatory),
    })
    .eq('id', params.officer.id);

  if (error) {
    throw new Error(error.message || 'Unable to update officer record.');
  }
}

export async function removeIaSccRosterOfficer(params: {
  officer: IaSccOfficer;
  organizationAcronym: string;
  organizationName: string;
}): Promise<void> {
  if (params.officer.source === 'registrar') {
    const { data: learnerRow, error: fetchErr } = await supabase
      .from('registrar_learners')
      .select('id, tags')
      .eq('id', params.officer.id)
      .maybeSingle();

    if (fetchErr || !learnerRow) {
      throw new Error(fetchErr?.message || 'Tagged learner record not found.');
    }

    const existingTags = normalizeTagList(learnerRow.tags);
    const nextTags = stripOrgTags(
      existingTags,
      params.organizationAcronym,
      params.organizationName,
    );

    const { error: updateErr } = await supabase
      .from('registrar_learners')
      .update({ tags: nextTags })
      .eq('id', params.officer.id);

    if (updateErr) {
      throw new Error(updateErr.message || 'Unable to untag learner from organization.');
    }
    return;
  }

  const { error } = await supabase
    .from(SCC_TABLES.OFFICERS)
    .delete()
    .eq('id', params.officer.id);

  if (error) {
    throw new Error(error.message || 'Unable to delete officer record.');
  }
}

export async function provisionGoogleWorkspaceAccount(params: {
  primaryEmail: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationAcronym?: string;
  organizationName?: string;
  orgUnitPath?: string;
  changePasswordAtNextLogin?: boolean;
  updateIfExists?: boolean;
  linkToOrganizationId?: string;
  excludeRequestId?: string;
}): Promise<{
  ok: boolean;
  action: 'created' | 'updated';
  user: {
    id: string;
    primaryEmail: string;
    orgUnitPath: string;
    changePasswordAtNextLogin: boolean;
  };
}> {
  if (!params.updateIfExists) {
    const dup = await checkIaMailboxAvailability(params.primaryEmail, {
      excludeOrganizationId: params.linkToOrganizationId,
      excludeRequestId: params.excludeRequestId,
    });
    if (!dup.available) {
      throw new Error(formatIaDuplicateEmailMessage(dup.email, dup.registeredTo));
    }
  }

  const { linkToOrganizationId, excludeRequestId: _ignoredReqId, ...apiPayload } = params;
  const response = await fetch('/api/scc-provision-google-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(apiPayload),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error ||
        `Google Admin provisioning endpoint returned HTTP ${response.status}.`,
    );
  }

  if (linkToOrganizationId) {
    const cleanEmail = sanitizeEmail(data.user?.primaryEmail || params.primaryEmail);
    const now = new Date().toISOString();
    try {
      await supabase
        .from(SCC_TABLES.ORGANIZATIONS)
        .update({ official_email: cleanEmail, updated_at: now })
        .eq('id', linkToOrganizationId);
    } catch {
      // fallback below
    }
    const orgs = readLocalOrganizations();
    const orgIdx = orgs.findIndex((o) => o.id === linkToOrganizationId);
    if (orgIdx !== -1) {
      orgs[orgIdx] = { ...orgs[orgIdx], officialEmail: cleanEmail };
      writeLocalOrganizations(orgs);
    }
  }

  return data;
}

export async function fetchGoogleAdminOrgUnits(): Promise<{
  defaultOrgUnitPath: string;
  orgUnitPaths: string[];
}> {
  try {
    const res = await fetch('/api/scc-provision-google-user');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.orgUnitPaths) && data.orgUnitPaths.length > 0) {
        return {
          defaultOrgUnitPath: String(data.defaultOrgUnitPath || data.orgUnitPaths[0] || '/School Orgs and Clubs'),
          orgUnitPaths: data.orgUnitPaths.map(String),
        };
      }
    }
  } catch {
    // fallback below
  }
  return {
    defaultOrgUnitPath: '/School Orgs and Clubs',
    orgUnitPaths: ['/School Orgs and Clubs', '/'],
  };
}

export async function loadGoogleWorkspaceUsers(): Promise<{
  defaultOrgUnitPath: string;
  orgUnitPaths: string[];
  users: IaSccGoogleUser[];
}> {
  const response = await fetch('/api/scc-provision-google-user?includeUsers=1');
  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error || `Unable to load Google Workspace accounts (HTTP ${response.status}).`,
    );
  }

  return {
    defaultOrgUnitPath: String(data.defaultOrgUnitPath || '/School Orgs and Clubs'),
    orgUnitPaths: Array.isArray(data.orgUnitPaths) ? data.orgUnitPaths.map(String) : ['/School Orgs and Clubs', '/'],
    users: Array.isArray(data.users) ? data.users : [],
  };
}

export async function updateGoogleWorkspaceUser(params: {
  primaryEmail: string;
  newPrimaryEmail?: string;
  firstName?: string;
  lastName?: string;
  orgUnitPath?: string;
  suspended?: boolean;
}): Promise<IaSccGoogleUser> {
  if (
    params.newPrimaryEmail &&
    params.newPrimaryEmail.toLowerCase() !== params.primaryEmail.toLowerCase()
  ) {
    const dup = await checkIaMailboxAvailability(params.newPrimaryEmail);
    if (!dup.available) {
      throw new Error(formatIaDuplicateEmailMessage(dup.email, dup.registeredTo));
    }
  }

  const response = await fetch('/api/scc-provision-google-user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, mode: 'modify' }),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok || !data?.user) {
    throw new Error(
      data?.error || `Unable to update Google Workspace account (HTTP ${response.status}).`,
    );
  }

  // Sync renamed email to scc_organizations if an org was linked to the old address
  if (
    params.newPrimaryEmail &&
    params.newPrimaryEmail.toLowerCase() !== params.primaryEmail.toLowerCase()
  ) {
    const oldLower = params.primaryEmail.toLowerCase();
    const newClean = sanitizeEmail(data.user.primaryEmail);
    try {
      await supabase
        .from(SCC_TABLES.ORGANIZATIONS)
        .update({ official_email: newClean, updated_at: new Date().toISOString() })
        .eq('official_email', oldLower);
    } catch {
      // ignore
    }
    const orgs = readLocalOrganizations();
    let changed = false;
    const nextOrgs = orgs.map((o) => {
      if ((o.officialEmail || '').toLowerCase() === oldLower) {
        changed = true;
        return { ...o, officialEmail: newClean };
      }
      return o;
    });
    if (changed) writeLocalOrganizations(nextOrgs);
  }

  return data.user as IaSccGoogleUser;
}

export async function resetGoogleWorkspaceUserPassword(params: {
  primaryEmail: string;
  password: string;
  changePasswordAtNextLogin?: boolean;
}): Promise<IaSccGoogleUser> {
  const response = await fetch('/api/scc-provision-google-user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, mode: 'reset_password' }),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok || !data?.user) {
    throw new Error(
      data?.error || `Unable to reset Google Workspace password (HTTP ${response.status}).`,
    );
  }

  return data.user as IaSccGoogleUser;
}

export async function deleteGoogleWorkspaceUser(primaryEmail: string): Promise<void> {
  const response = await fetch('/api/scc-provision-google-user', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ primaryEmail }),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error || `Unable to delete Google Workspace account (HTTP ${response.status}).`,
    );
  }

  // Clear official_email from any linked SCC organization
  const cleanLower = primaryEmail.toLowerCase();
  try {
    await supabase
      .from(SCC_TABLES.ORGANIZATIONS)
      .update({ official_email: null, updated_at: new Date().toISOString() })
      .eq('official_email', cleanLower);
  } catch {
    // ignore
  }
  const orgs = readLocalOrganizations();
  let changed = false;
  const nextOrgs = orgs.map((o) => {
    if ((o.officialEmail || '').toLowerCase() === cleanLower) {
      changed = true;
      return { ...o, officialEmail: '' };
    }
    return o;
  });
  if (changed) writeLocalOrganizations(nextOrgs);
}

const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPresidentPosition(position: string): boolean {
  const norm = position.toLowerCase();
  return norm.includes('president') && !norm.includes('vice');
}

export async function resolveOrganizationOfficerRecipients(params: {
  organizationId: string;
  organizationAcronym: string;
  organizationName: string;
}): Promise<{ recipients: SccOfficerRecipient[]; allOfficersCount: number }> {
  const { officers } = await loadIaSccOrgRoster(
    params.organizationId,
    params.organizationAcronym,
    params.organizationName,
  );

  const seenEmails = new Set<string>();
  const recipients: SccOfficerRecipient[] = [];

  for (const off of officers) {
    const candidateEmails = [off.secondaryEmail, off.email]
      .map((val) => sanitizeEmail(val || '').trim().toLowerCase())
      .filter((val) => VALID_EMAIL_RE.test(val));

    for (const email of candidateEmails) {
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);
      recipients.push({
        id: `${off.id}:${email}`,
        fullName: off.fullName,
        position: off.position,
        email,
        isPresident: isPresidentPosition(off.position),
        isAuthorizedSignatory: off.isAuthorizedSignatory,
      });
    }
  }

  return { recipients, allOfficersCount: officers.length };
}

export async function fetchSmtpNotificationStatus(): Promise<SccSmtpStatus> {
  try {
    const res = await fetch('/api/scc-send-notification');
    const data = await res.json().catch(() => null);
    if (res.ok && data) {
      return {
        ok: true,
        configured: Boolean(data.configured),
        host: String(data.host || 'smtp.gmail.com'),
        port: Number(data.port || 587),
        from: String(data.from || ''),
        fromName: String(data.fromName || 'DepED USIS Integrated Admin (SCC)'),
        missing: Array.isArray(data.missing) ? data.missing.map(String) : [],
      };
    }
  } catch {
    // fallback below
  }
  return {
    ok: false,
    configured: false,
    host: 'smtp.gmail.com',
    port: 587,
    from: '',
    fromName: 'DepED USIS Integrated Admin (SCC)',
    missing: ['Unable to reach /api/scc-send-notification'],
  };
}

export async function sendOfficerEmailNotification(params: {
  to: string[];
  cc?: string[];
  replyTo?: string;
  subject: string;
  text: string;
}): Promise<SccNotificationResult> {
  const cleanTo = Array.from(
    new Set(
      params.to
        .map((val) => sanitizeEmail(val).trim().toLowerCase())
        .filter((val) => VALID_EMAIL_RE.test(val)),
    ),
  );
  const cleanCc = Array.from(
    new Set(
      (params.cc || [])
        .map((val) => sanitizeEmail(val).trim().toLowerCase())
        .filter((val) => VALID_EMAIL_RE.test(val) && !cleanTo.includes(val)),
    ),
  );

  if (cleanTo.length === 0) {
    throw new Error('No valid registered officer email addresses selected.');
  }

  const response = await fetch('/api/scc-send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: cleanTo,
      cc: cleanCc,
      replyTo: params.replyTo,
      subject: params.subject,
      text: params.text,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.error ||
        `Google SMTP notification endpoint returned HTTP ${response.status}.`,
    );
  }

  return {
    ok: true,
    host: data.host,
    from: data.from,
    sentTo: Array.isArray(data.sentTo) ? data.sentTo : cleanTo,
    ccSent: Array.isArray(data.ccSent) ? data.ccSent : cleanCc,
  };
}

export function formatIaDuplicateEmailMessage(
  email: string,
  registeredTo?: string,
): string {
  const owner = String(registeredTo || '').trim() || 'an existing account';
  return `${email} is registered already to ${owner}. Please select other email address.`;
}

function normalizeIaMailboxAlias(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/\.leon$/i, '')
    .replace(/[^a-z0-9._-]/g, '');
}

export async function checkIaMailboxAvailability(
  emailOrAlias: string,
  options?: { excludeOrganizationId?: string; excludeRequestId?: string },
): Promise<IaMailboxAvailabilityResult> {
  const cleanRaw = sanitizeEmail(String(emailOrAlias || '')).trim().toLowerCase();
  const alias = normalizeIaMailboxAlias(cleanRaw);
  const fullEmail = cleanRaw.includes('@') ? cleanRaw : alias ? `${alias}@leonnhs.edu.ph` : '';

  if (!fullEmail || !VALID_EMAIL_RE.test(fullEmail)) {
    return {
      email: fullEmail,
      available: false,
      existsInDatabase: false,
      existsInGoogleAdmin: false,
      directoryChecked: false,
    };
  }

  let existsInDatabase = false;
  let databaseConflictOrgId: string | undefined;
  let databaseReason: string | undefined;
  let dbRegisteredTo: string | undefined;

  const localOrgMatch = readLocalOrganizations().find(
    (o) =>
      o.id !== options?.excludeOrganizationId &&
      sanitizeEmail(o.officialEmail || '').toLowerCase() === fullEmail,
  );
  if (localOrgMatch) {
    existsInDatabase = true;
    databaseConflictOrgId = localOrgMatch.id;
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
        .select('id, tracking_number, organization_id, organization_name, organization_acronym, requester_name, status, service_key, details, provisioned_data')
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

    if (!orgRes.error && Array.isArray(orgRes.data)) {
      const hit = (orgRes.data as any[]).find((o) => o.id !== options?.excludeOrganizationId);
      if (hit) {
        existsInDatabase = true;
        databaseConflictOrgId = String(hit.id);
        dbRegisteredTo = hit.name
          ? hit.acronym
            ? `${hit.name} (${hit.acronym})`
            : hit.name
          : hit.acronym || 'an SCC organization';
        databaseReason = `Already assigned in database to ${dbRegisteredTo}.`;
      }
    }

    if (!existsInDatabase && !reqRes.error && Array.isArray(reqRes.data)) {
      for (const row of reqRes.data as any[]) {
        if (options?.excludeRequestId && row.id === options.excludeRequestId) continue;
        if (options?.excludeOrganizationId && row.organization_id === options.excludeOrganizationId && row.status !== 'provisioned') {
          continue;
        }
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
        const reqAlias = normalizeIaMailboxAlias(details?.requestedMailboxAlias || '');
        const targets: string[] = Array.isArray(details?.targetUsernames)
          ? details.targetUsernames.map((t: unknown) => sanitizeEmail(String(t)).toLowerCase())
          : [];

        if (assigned === fullEmail || (alias && reqAlias === alias) || targets.includes(fullEmail)) {
          existsInDatabase = true;
          databaseConflictOrgId = String(row.organization_id || '');
          dbRegisteredTo = row.organization_name
            ? row.organization_acronym
              ? `${row.organization_name} (${row.organization_acronym})`
              : row.organization_name
            : row.organization_acronym || row.requester_name || 'an SCC organization';
          databaseReason = `Already claimed in request ${row.tracking_number} (${row.organization_acronym}).`;
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
    // offline fallback already checked local orgs
  }

  let existsInGoogleAdmin = false;
  let directoryChecked = false;
  let googleAdminReason: string | undefined;
  let googleRegisteredTo: string | undefined;

  try {
    const res = await fetch(
      `/api/scc-provision-google-user?checkEmail=${encodeURIComponent(fullEmail)}`,
    );
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
    // ignore when endpoint offline
  }

  return {
    email: fullEmail,
    available: !existsInDatabase && !existsInGoogleAdmin,
    registeredTo: googleRegisteredTo || dbRegisteredTo,
    existsInDatabase,
    databaseConflictOrgId,
    databaseReason,
    existsInGoogleAdmin,
    googleAdminReason,
    directoryChecked,
  };
}

export async function loadIaCoordinatorAdviserCandidates(params?: {
  schoolUuid?: string;
  schoolCode?: string;
}): Promise<IaSccAdviserCandidate[]> {
  let targetSchoolUuid = String(params?.schoolUuid || '').trim();
  const targetSchoolCode = String(params?.schoolCode || '').trim();

  if (!targetSchoolUuid && targetSchoolCode) {
    try {
      const { data: schoolRow } = await supabase
        .from('usis_schools')
        .select('id')
        .eq('school_code', targetSchoolCode)
        .limit(1)
        .maybeSingle();
      if (schoolRow?.id) targetSchoolUuid = String(schoolRow.id);
    } catch {
      // ignore and load unscoped/all
    }
  }

  const primary = await supabase
    .from('usis_core_coordinators')
    .select('id,school_id,username,email,first_name,middle_name,last_name,mobile_no,role,is_active,personnel_type')
    .order('last_name', { ascending: true });

  let rows: any[] = [];
  if (!primary.error) {
    rows = (primary.data || []) as any[];
  } else {
    const fallback = await supabase
      .from('usis_core_coordinators')
      .select('id,school_id,username,email,first_name,last_name,mobile_no,role,is_active')
      .order('last_name', { ascending: true });
    if (fallback.error) {
      throw new Error(fallback.error.message || 'Unable to load Coordinator Accounts from IA.');
    }
    rows = (fallback.data || []) as any[];
  }

  const scopedRows = targetSchoolUuid
    ? rows.filter((r) => !r.school_id || String(r.school_id) === targetSchoolUuid)
    : rows;
  const effectiveRows = scopedRows.length > 0 ? scopedRows : rows;

  const accountIds = effectiveRows.map((r) => String(r.id || '')).filter(Boolean);
  const deptMap = new Map<string, string>();

  if (accountIds.length > 0) {
    try {
      const { data: assignments } = await supabase
        .from('coordinator_account_departments')
        .select('account_id,coordinator_departments(name)')
        .in('account_id', accountIds);

      (assignments || []).forEach((row: any) => {
        const accountId = String(row.account_id || '').trim();
        if (!accountId) return;
        const dept = Array.isArray(row.coordinator_departments)
          ? row.coordinator_departments[0]
          : row.coordinator_departments;
        const deptName = String(dept?.name || '').trim();
        if (deptName) deptMap.set(accountId, deptName);
      });
    } catch {
      // ignore missing assignment join
    }
  }

  return effectiveRows
    .map((row): IaSccAdviserCandidate => {
      const id = String(row.id || '');
      const first = String(row.first_name || '').trim();
      const middle = String(row.middle_name || '').trim();
      const last = String(row.last_name || '').trim();
      const midInitial = middle ? `${middle.charAt(0).toUpperCase()}.` : '';
      const fullName =
        [first, midInitial, last].filter(Boolean).join(' ').trim() ||
        String(row.username || '').trim();
      const rawType = String(row.personnel_type || '').trim().toLowerCase();
      const personnelType: IaSccAdviserCandidate['personnelType'] =
        rawType === 'non_teaching'
          ? 'non_teaching'
          : rawType === 'teaching'
            ? 'teaching'
            : 'coordinator';

      return {
        id,
        fullName,
        email: String(row.email || '').trim().toLowerCase(),
        mobileNo: String(row.mobile_no || '').trim(),
        role: String(row.role || 'school_usis_coordinator').trim(),
        personnelType,
        departmentName: deptMap.get(id) || '',
        isActive: row.is_active !== false,
        username: String(row.username || '').trim(),
      };
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: 'base' });
    });
}
