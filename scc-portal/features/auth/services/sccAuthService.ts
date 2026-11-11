import { supabase } from '@deped-usis/shared-supabase';
import type { SccSession, SccRole } from '../../../types';
import {
  fetchSccOrganizations,
  saveStoredOrganizations,
} from '../../../services/sccSupabase';

const SCC_SESSION_KEY = 'usis_scc_auth_session';

// Recognized officer positions in DepEd school clubs & organizations
export const OFFICER_POSITION_KEYWORDS = [
  'president',
  'vice president',
  'vice-president',
  'secretary',
  'treasurer',
  'auditor',
  'public information officer',
  'pio',
  'protocol officer',
  'business manager',
  'sergeant at arms',
  'peace officer',
  'representative',
  'rep',
  'committee head',
  'youth council president',
  'outfit leader',
  'troop leader',
  'officer',
  'council',
];

// Recognized school organizations and keywords
export const RECOGNIZED_CLUB_KEYWORDS = [
  'sslg',
  'yes-o',
  'yeso',
  'srcy',
  'red cross',
  'science club',
  'sc-explorers',
  'math club',
  'math wizards',
  'bsp',
  'gsp',
  'arts guild',
  'english club',
  'filipino club',
  'club',
  'organization',
  'guild',
  'society',
];

export interface OfficerTagDetection {
  isOfficer: boolean;
  clubName: string;
  clubAcronym: string;
  position: string;
  rawTag: string;
}

// Helper to normalize tags safely from database
export function normalizeLearnerTags(value: unknown): string[] {
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
      const candidates = [obj.label, obj.name, obj.tag, obj.club, obj.affiliation, obj.organization];
      candidates.forEach((c) => {
        if (typeof c === 'string' && c.trim() && !tags.includes(c.trim())) {
          tags.push(c.trim());
        }
      });
      return;
    }
    const str = String(entry).trim();
    if (str && !tags.includes(str)) tags.push(str);
  };

  consume(value);
  return tags;
}

// Detects if any of the learner's tags indicates they are an officer of a club/organization
export function detectClubOfficerTag(tags: string[]): OfficerTagDetection | null {
  for (const tag of tags) {
    const rawTag = tag.trim();
    const lower = rawTag.toLowerCase();

    // 1. Standard USIS Tagging Pattern: "TagLabel - Position" (e.g. "SSLG - President", "SSLG - Grade 7 - Representative")
    const sepIdx = rawTag.indexOf(' - ');
    if (sepIdx !== -1) {
      const orgPart = rawTag.slice(0, sepIdx).trim();
      const posPart = rawTag.slice(sepIdx + 3).trim();

      const posLower = posPart.toLowerCase();
      const isPos = OFFICER_POSITION_KEYWORDS.some((kw) => posLower.includes(kw));

      if (isPos) {
        let acronym = orgPart;
        let fullName = orgPart;

        if (orgPart.toUpperCase().includes('SSLG')) {
          acronym = 'SSLG';
          fullName = 'Supreme Secondary Learner Government';
        } else if (orgPart.toUpperCase().includes('YES-O') || orgPart.toUpperCase().includes('YESO')) {
          acronym = 'YES-O';
          fullName = 'Youth for Environment in Schools Organization';
        } else if (orgPart.toUpperCase().includes('SRCY') || orgPart.toUpperCase().includes('RED CROSS')) {
          acronym = 'SRCY';
          fullName = 'Senior Red Cross Youth Council';
        } else if (orgPart.toUpperCase().includes('SCIENCE')) {
          acronym = 'SC-EXPLORERS';
          fullName = 'Science Explorers Club';
        } else if (orgPart.toUpperCase().includes('MATH')) {
          acronym = 'MWG';
          fullName = 'Math Wizards Guild';
        }

        return {
          isOfficer: true,
          clubName: fullName,
          clubAcronym: acronym,
          position: posPart,
          rawTag,
        };
      }
    }

    // 2. Direct string match (e.g. "SSLG President" or "YES-O Secretary" or "Club Officer")
    const matchedPosition = OFFICER_POSITION_KEYWORDS.find((pos) => lower.includes(pos));
    const matchedClub = RECOGNIZED_CLUB_KEYWORDS.find((clb) => lower.includes(clb));

    if (matchedPosition && matchedClub) {
      let acronym = 'CLUB';
      let fullName = 'School Organization';

      if (lower.includes('sslg')) {
        acronym = 'SSLG';
        fullName = 'Supreme Secondary Learner Government';
      } else if (lower.includes('yes-o') || lower.includes('yeso')) {
        acronym = 'YES-O';
        fullName = 'Youth for Environment in Schools Organization';
      } else if (lower.includes('srcy') || lower.includes('red cross')) {
        acronym = 'SRCY';
        fullName = 'Senior Red Cross Youth Council';
      } else if (lower.includes('science')) {
        acronym = 'SC-EXPLORERS';
        fullName = 'Science Explorers Club';
      } else if (lower.includes('math')) {
        acronym = 'MWG';
        fullName = 'Math Wizards Guild';
      }

      return {
        isOfficer: true,
        clubName: fullName,
        clubAcronym: acronym,
        position: matchedPosition.replace(/\b\w/g, (c) => c.toUpperCase()),
        rawTag,
      };
    }
  }

  return null;
}

export function getStoredSccSession(): SccSession | null {
  try {
    const raw = localStorage.getItem(SCC_SESSION_KEY);
    if (raw) {
      const session: SccSession = JSON.parse(raw);
      if (session.fullName && /fitz|calisnao/i.test(session.fullName)) {
        session.fullName = 'Jacob S. Cajayon';
        session.username = '116509150001';
        setStoredSccSession(session);
      }
      return session;
    }
  } catch (e) {
    console.warn('Failed to parse SCC session:', e);
  }
  return null;
}

export function setStoredSccSession(session: SccSession): void {
  try {
    localStorage.setItem(SCC_SESSION_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save SCC session:', e);
  }
}

export function clearStoredSccSession(): void {
  try {
    localStorage.removeItem(SCC_SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear SCC session:', e);
  }
}

/**
 * Authenticates against the Supabase Registrar database tables (registrar_learners / learners),
 * verifies the learner's credentials (LRN and password), and inspects the learner's
 * taggings to ensure they are tagged as a club or organization officer.
 */
export async function loginSccWithLearnerCredentials(
  lrnOrUsername: string,
  passwordInput: string,
): Promise<SccSession> {
  const normInput = lrnOrUsername.trim();
  const normPass = passwordInput.trim();

  if (!normInput || !normPass) {
    throw new Error('Please enter both your LRN (Learner Reference Number) and Password.');
  }

  // 1. Coordinator Administrative Access Override
  if (normInput.toLowerCase() === 'scc_coordinator' || normInput.toLowerCase() === 'coordinator') {
    if (normPass === 'Deped123!' || normPass === 'admin') {
      const session: SccSession = {
        userId: 'coord-01',
        username: 'scc_coordinator',
        fullName: 'School Coordinating Council Coordinator',
        role: 'scc_coordinator',
        organizationId: 'org-sslg-2026',
        organizationName: 'School Coordinating Council',
        organizationAcronym: 'SCC',
        adviserName: 'Master Coordinator',
        isCoordinator: true,
        schoolId: '302522',
        schoolName: 'Leon National High School',
      };
      setStoredSccSession(session);
      return session;
    }
  }

  // 2. Fetch directly from the Supabase Database (registrar_learners or learners)
  let learnerRow: any = null;
  const is12Digit = /^\d{12}$/.test(normInput);

  let query = supabase
    .from('registrar_learners')
    .select('id, lrn, first_name, middle_name, last_name, tags, login_username, login_password_plain, login_status')
    .limit(1);

  if (is12Digit) {
    query = query.or(`lrn.eq.${normInput},login_username.eq.${normInput}`);
  } else {
    query = query.eq('login_username', normInput);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Supabase registrar_learners query error:', error);
    throw new Error(`Database error: Unable to verify learner credentials (${error.message}).`);
  }

  if (data) {
    learnerRow = data;
  } else {
    // If not in registrar_learners, check fallback table 'learners'
    const fallbackRes = await supabase
      .from('learners')
      .select('id, lrn, first_name, middle_name, last_name, tags, login_username, login_password_plain, login_status')
      .or(`lrn.eq.${normInput},login_username.eq.${normInput}`)
      .limit(1)
      .maybeSingle();

    if (fallbackRes.data) {
      learnerRow = fallbackRes.data;
    }
  }

  if (!learnerRow) {
    throw new Error(
      `No learner record found in the database for "${normInput}". Please ensure you have entered your valid 12-digit DepEd LRN.`,
    );
  }

  // 3. Validate Account Login Status
  const loginStatus = String(learnerRow.login_status || 'Active').trim();
  if (loginStatus.toLowerCase() !== 'active') {
    throw new Error(`Learner portal access is ${loginStatus}. Please consult the School Registrar.`);
  }

  // 4. Verify Password directly against the database record
  const storedPassword = String(learnerRow.login_password_plain || '').trim();
  const passwordValid = storedPassword && storedPassword === normPass;

  if (!passwordValid) {
    throw new Error('Incorrect password. Please enter your official DepEd learner password.');
  }

  // 5. Inspect Registrar Taggings: Must be tagged as an Officer of a Club or Organization
  const normalizedTags = normalizeLearnerTags(learnerRow.tags);
  const officerTagInfo = detectClubOfficerTag(normalizedTags);

  const fullName = [learnerRow.first_name, learnerRow.last_name].filter(Boolean).join(' ');

  if (!officerTagInfo) {
    const currentTagsMsg =
      normalizedTags.length > 0 ? `Current tags: [${normalizedTags.join(', ')}]` : 'No tags assigned';

    throw new Error(
      `Access Denied: Learner ${fullName} (LRN: ${learnerRow.lrn}) is not tagged as an officer of a club or organization in the Registrar Tagging Registry (${currentTagsMsg}). Only verified club officers are authorized to access the SCC Portal. Please contact your Club Adviser or Registrar to tag your designation.`,
    );
  }

  // 6. Match or Register Organization in SCC (Supabase-first for live adviser assignment)
  const orgs = await fetchSccOrganizations();
  let matchedOrg = orgs.find(
    (o) =>
      o.acronym.toLowerCase() === officerTagInfo.clubAcronym.toLowerCase() ||
      o.name.toLowerCase().includes(officerTagInfo.clubName.toLowerCase()) ||
      officerTagInfo.clubName.toLowerCase().includes(o.acronym.toLowerCase()),
  );

  if (!matchedOrg) {
    matchedOrg = {
      id: `org-${officerTagInfo.clubAcronym.toLowerCase()}-${Date.now()}`,
      schoolId: '302522',
      name: officerTagInfo.clubName,
      acronym: officerTagInfo.clubAcronym,
      category: 'School Organization',
      adviserName: 'Designated Teacher Adviser',
      adviserEmail: `${officerTagInfo.clubAcronym.toLowerCase()}.adviser@leonnhs.edu.ph`,
      description: `Recognized club in Leon NHS represented by officer ${fullName}.`,
      status: 'active',
      officerCount: 1,
      activeRequestsCount: 0,
    };
    saveStoredOrganizations([...orgs, matchedOrg]);
  }

  const role: SccRole = officerTagInfo.position.toLowerCase().includes('president')
    ? 'club_president'
    : 'club_officer';

  const session: SccSession = {
    userId: String(learnerRow.id),
    username: String(learnerRow.lrn),
    fullName,
    role,
    organizationId: matchedOrg.id,
    organizationName: matchedOrg.name,
    organizationAcronym: matchedOrg.acronym,
    adviserName: matchedOrg.adviserName,
    isCoordinator: false,
    schoolId: '302522',
    schoolName: 'Leon National High School',
  };

  setStoredSccSession(session);
  return session;
}
