import { supabase } from '@deped-usis/shared-supabase';
import { loadSrcyDomRecords } from './srcyDomService';

export type SrcyMembershipStatus = 'Active' | 'Pending' | 'Inactive';

export type SrcyMembershipTermInfo = {
  termId: string;
  domId: string;
  domNumber?: string;
  schoolYear?: string;
  validFrom?: string;
  validUntil?: string;
  status: 'Active' | 'Pending' | 'Expired';
  gradeLevel?: string;
  section?: string;
  councilRole?: string;
  maabId?: string;
  joinedAt?: string;
  notes?: string;
  updatedAt?: string;
};

export type SrcyMemberRecord = {
  id: string;
  learnerLrn: string;
  fullName: string;
  gradeLevel: string;
  section: string;
  councilRole: string;
  membershipStatus: SrcyMembershipStatus;
  domId?: string;
  maabId?: string;
  birthdate?: string;
  address?: string;
  contactNo: string;
  email: string;
  emergencyContact: string;
  joinedAt: string;
  notes: string;
  membershipInfo: SrcyMembershipTermInfo[];
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SrcyMemberDraft = Omit<SrcyMemberRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  membershipInfo?: SrcyMembershipTermInfo[];
};

const TABLE_NAME = 'srcy_memberships';
const LOCAL_STORAGE_KEY = 'srcy_membership_records';

const toText = (value: unknown) => String(value ?? '').trim();

export function calculateAge(birthdateStr: string | null | undefined): number | null {
  if (!birthdateStr) return null;
  const birth = new Date(birthdateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

const normalizeStatus = (value: unknown): SrcyMembershipStatus => {
  const normalized = toText(value).toLowerCase();
  if (normalized === 'inactive') return 'Inactive';
  if (normalized === 'pending') return 'Pending';
  return 'Active';
};

const parseMembershipInfo = (value: unknown): SrcyMembershipTermInfo[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

const mapRow = (row: any): SrcyMemberRecord => ({
  id: toText(row.id),
  learnerLrn: toText(row.learner_lrn),
  fullName: toText(row.full_name),
  gradeLevel: toText(row.grade_level),
  section: toText(row.section),
  councilRole: toText(row.council_role),
  membershipStatus: normalizeStatus(row.membership_status),
  domId: toText(row.dom_id || row.domId),
  maabId: toText(row.maab_id || row.maabId),
  birthdate: toText(row.birthdate || row.birth_date),
  address: toText(row.address),
  contactNo: toText(row.contact_no),
  email: toText(row.email),
  emergencyContact: toText(row.emergency_contact),
  joinedAt: toText(row.joined_at),
  notes: toText(row.notes),
  membershipInfo: parseMembershipInfo(row.membership_info || row.membershipInfo),
  schoolId: toText(row.school_id),
  createdBy: toText(row.created_by),
  createdAt: toText(row.created_at),
  updatedAt: toText(row.updated_at),
});

const toRow = (draft: SrcyMemberDraft) => ({
  learner_lrn: toText(draft.learnerLrn),
  full_name: toText(draft.fullName),
  grade_level: toText(draft.gradeLevel),
  section: toText(draft.section),
  council_role: toText(draft.councilRole) || 'Member',
  membership_status: normalizeStatus(draft.membershipStatus),
  dom_id: toText(draft.domId) || null,
  maab_id: toText(draft.maabId)?.replace(/\D/g, '').slice(0, 7) || null,
  birthdate: toText(draft.birthdate) || null,
  address: toText(draft.address) || null,
  contact_no: toText(draft.contactNo) || null,
  email: toText(draft.email) || null,
  emergency_contact: toText(draft.emergencyContact) || null,
  joined_at: toText(draft.joinedAt) || new Date().toISOString().slice(0, 10),
  notes: toText(draft.notes) || null,
  membership_info: Array.isArray(draft.membershipInfo) ? draft.membershipInfo : [],
  school_id: toText(draft.schoolId) || null,
  created_by: toText(draft.createdBy) || null,
});

const readLocalMembers = (): SrcyMemberRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map((row) => ({
          ...row,
          membershipStatus: normalizeStatus(row.membershipStatus),
          membershipInfo: parseMembershipInfo(row.membershipInfo),
        }))
      : [];
  } catch {
    return [];
  }
};

const writeLocalMembers = (records: SrcyMemberRecord[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
};

const isMissingTableError = (error: any) =>
  error?.code === '42P01' || String(error?.message || '').toLowerCase().includes(TABLE_NAME);

export async function loadSrcyMembers(): Promise<SrcyMemberRecord[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('full_name', { ascending: true });

  if (error) {
    if (isMissingTableError(error)) return readLocalMembers();
    throw new Error(error.message || 'Unable to load SRCY memberships.');
  }

  return (data || []).map(mapRow);
}

/**
 * Creates or updates a member so that each student has STRICTLY ONE record in srcy_memberships.
 * The active and historical terms are stored inside the `membership_info` JSON column.
 */
export async function createSrcyMember(draft: SrcyMemberDraft): Promise<SrcyMemberRecord> {
  if (!toText(draft.fullName)) throw new Error('Member name is required.');
  if (!toText(draft.learnerLrn)) throw new Error('Learner LRN is required.');

  const lrn = toText(draft.learnerLrn);
  const nowIso = new Date().toISOString();

  // Try to lookup DOM record details if domId is provided
  let domDetails: {
    domNumber?: string;
    schoolYear?: string;
    validFrom?: string;
    validUntil?: string;
    status?: 'Active' | 'Pending' | 'Expired';
  } = {};

  if (draft.domId) {
    try {
      const doms = await loadSrcyDomRecords();
      const matched = doms.find((d) => d.id === draft.domId);
      if (matched) {
        domDetails = {
          domNumber: matched.domNumber,
          schoolYear: matched.schoolYear,
          validFrom: matched.validFrom,
          validUntil: matched.validUntil,
          status: matched.status === 'Pending' ? 'Pending' : (matched.status === 'Active' ? 'Active' : 'Expired'),
        };
      }
    } catch {
      // ignore
    }
  }

  const initialTerm: SrcyMembershipTermInfo = {
    termId: `term-${Date.now()}`,
    domId: draft.domId || '',
    domNumber: domDetails.domNumber || '',
    schoolYear: domDetails.schoolYear || '',
    validFrom: domDetails.validFrom || '',
    validUntil: domDetails.validUntil || '',
    status: domDetails.status || 'Active',
    gradeLevel: draft.gradeLevel || '',
    section: draft.section || '',
    councilRole: draft.councilRole || 'Member',
    maabId: draft.maabId || '',
    joinedAt: draft.joinedAt || nowIso.slice(0, 10),
    notes: draft.notes || '',
    updatedAt: nowIso,
  };

  // Check if member already exists (ensure one record only per member)
  let existingMember: SrcyMemberRecord | null = null;
  try {
    const { data: existingData, error: findError } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('learner_lrn', lrn)
      .maybeSingle();

    if (!findError && existingData) {
      existingMember = mapRow(existingData);
    }
  } catch {
    const local = readLocalMembers();
    existingMember = local.find((m) => m.learnerLrn === lrn) || null;
  }

  if (existingMember) {
    // Member already exists! Update their single record and append/update the term in JSON membership_info
    const existingTerms = existingMember.membershipInfo || [];
    const mergedTerms = [
      initialTerm,
      ...existingTerms.filter((t) => t.domId !== draft.domId),
    ];

    return updateSrcyMember(existingMember.id, {
      ...draft,
      membershipInfo: mergedTerms,
    });
  }

  // Brand-new member: insert single record with membership_info JSON
  const membershipInfo = [initialTerm];
  const rowToInsert = {
    ...toRow({ ...draft, membershipInfo }),
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([rowToInsert])
    .select('*')
    .single();

  if (error) {
    if (!isMissingTableError(error)) throw new Error(error.message || 'Unable to save SRCY membership.');
    const fallbackRecord: SrcyMemberRecord = {
      ...draft,
      councilRole: draft.councilRole || 'Member',
      membershipStatus: normalizeStatus(draft.membershipStatus),
      id: `local-${Date.now()}`,
      joinedAt: draft.joinedAt || nowIso.slice(0, 10),
      membershipInfo,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    writeLocalMembers([...readLocalMembers().filter((m) => m.learnerLrn !== lrn), fallbackRecord]);
    return fallbackRecord;
  }

  return mapRow(data);
}

export async function updateSrcyMemberStatus(id: string, membershipStatus: SrcyMembershipStatus): Promise<void> {
  const normalizedStatus = normalizeStatus(membershipStatus);
  if (id.startsWith('local-')) {
    writeLocalMembers(
      readLocalMembers().map((record) =>
        record.id === id ? { ...record, membershipStatus: normalizedStatus, updatedAt: new Date().toISOString() } : record,
      ),
    );
    return;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ membership_status: normalizedStatus, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message || 'Unable to update SRCY membership status.');
}

export async function updateSrcyMember(id: string, updates: Partial<SrcyMemberDraft>): Promise<SrcyMemberRecord> {
  const nowIso = new Date().toISOString();
  if (id.startsWith('local-')) {
    const existing = readLocalMembers();
    let updatedRecord: SrcyMemberRecord | null = null;
    const nextList = existing.map((r) => {
      if (r.id !== id) return r;
      updatedRecord = {
        ...r,
        ...updates,
        membershipStatus: updates.membershipStatus ? normalizeStatus(updates.membershipStatus) : r.membershipStatus,
        membershipInfo: updates.membershipInfo !== undefined ? updates.membershipInfo : r.membershipInfo,
        updatedAt: nowIso,
      };
      return updatedRecord;
    });
    writeLocalMembers(nextList);
    if (!updatedRecord) throw new Error('SRCY member not found in local records.');
    return updatedRecord;
  }

  const patch: any = { updated_at: nowIso };
  if (updates.fullName !== undefined) patch.full_name = toText(updates.fullName);
  if (updates.learnerLrn !== undefined) patch.learner_lrn = toText(updates.learnerLrn);
  if (updates.gradeLevel !== undefined) patch.grade_level = toText(updates.gradeLevel);
  if (updates.section !== undefined) patch.section = toText(updates.section);
  if (updates.councilRole !== undefined) patch.council_role = toText(updates.councilRole);
  if (updates.membershipStatus !== undefined) patch.membership_status = normalizeStatus(updates.membershipStatus);
  if (updates.domId !== undefined) patch.dom_id = toText(updates.domId) || null;
  if (updates.maabId !== undefined) patch.maab_id = toText(updates.maabId)?.replace(/\D/g, '').slice(0, 7) || null;
  if (updates.birthdate !== undefined) patch.birthdate = toText(updates.birthdate) || null;
  if (updates.address !== undefined) patch.address = toText(updates.address) || null;
  if (updates.contactNo !== undefined) patch.contact_no = toText(updates.contactNo) || null;
  if (updates.email !== undefined) patch.email = toText(updates.email) || null;
  if (updates.emergencyContact !== undefined) patch.emergency_contact = toText(updates.emergencyContact) || null;
  if (updates.joinedAt !== undefined) patch.joined_at = toText(updates.joinedAt) || null;
  if (updates.notes !== undefined) patch.notes = toText(updates.notes) || null;
  if (updates.membershipInfo !== undefined) {
    patch.membership_info = Array.isArray(updates.membershipInfo) ? updates.membershipInfo : [];
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Unable to update SRCY member.');
  return mapRow(data);
}

export async function deleteSrcyMember(id: string): Promise<void> {
  if (id.startsWith('local-')) {
    writeLocalMembers(readLocalMembers().filter((r) => r.id !== id));
    return;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete SRCY member.');
}

/**
 * Loads a member's historical term records directly from their stored JSON membership_info.
 * Falls back to legacy sibling records if membership_info has not yet been populated.
 */
export async function loadMemberHistory(member: SrcyMemberRecord): Promise<SrcyMemberRecord[]> {
  if (!member) return [];

  // 1. Primary Source: If membershipInfo JSON has entries, synthesize term records directly from JSON
  if (Array.isArray(member.membershipInfo) && member.membershipInfo.length > 0) {
    return member.membershipInfo.map((term, idx) => ({
      ...member,
      id: term.termId || `${member.id}-term-${idx}`,
      domId: term.domId,
      gradeLevel: term.gradeLevel || member.gradeLevel,
      section: term.section || member.section,
      councilRole: term.councilRole || member.councilRole,
      maabId: term.maabId || member.maabId,
      membershipStatus: (term.status as SrcyMembershipStatus) || 'Active',
      joinedAt: term.joinedAt || member.joinedAt,
      notes: term.notes || member.notes,
    }));
  }

  // 2. Legacy Fallback: Query matching rows by LRN or name
  const lrn = toText(member.learnerLrn);
  const name = toText(member.fullName).toLowerCase();

  let records: SrcyMemberRecord[] = [];

  try {
    let query = supabase.from(TABLE_NAME).select('*');
    if (lrn) {
      query = query.eq('learner_lrn', lrn);
    } else if (name) {
      query = query.ilike('full_name', member.fullName);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      records = data.map(mapRow);
    } else {
      records = readLocalMembers().filter((m) =>
        lrn ? m.learnerLrn === lrn : m.fullName.toLowerCase() === name
      );
    }
  } catch {
    records = readLocalMembers().filter((m) =>
      lrn ? m.learnerLrn === lrn : m.fullName.toLowerCase() === name
    );
  }

  // Ensure current member record is present
  if (!records.some((r) => r.id === member.id)) {
    records.push(member);
  }

  return records.sort((a, b) => {
    const timeA = new Date(a.joinedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.joinedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Renews an existing inactive member by updating their single member record in place
 * and recording the new term inside their `membership_info` JSON array.
 * This guarantees STRICTLY ONE record per member while preserving historical DOM batches.
 */
export async function renewSrcyMember(
  previousMember: SrcyMemberRecord,
  renewal: {
    domId: string;
    gradeLevel?: string;
    section?: string;
    councilRole?: string;
    maabId?: string;
    joinedAt?: string;
    notes?: string;
  }
): Promise<SrcyMemberRecord> {
  const nowIso = new Date().toISOString();

  // Load DOM details for the new renewal batch
  let domDetails: {
    domNumber?: string;
    schoolYear?: string;
    validFrom?: string;
    validUntil?: string;
    status?: 'Active' | 'Pending' | 'Expired';
  } = {};

  try {
    const doms = await loadSrcyDomRecords();
    const matched = doms.find((d) => d.id === renewal.domId);
    if (matched) {
      domDetails = {
        domNumber: matched.domNumber,
        schoolYear: matched.schoolYear,
        validFrom: matched.validFrom,
        validUntil: matched.validUntil,
        status: matched.status === 'Pending' ? 'Pending' : (matched.status === 'Active' ? 'Active' : 'Expired'),
      };
    }
  } catch {
    // ignore
  }

  const renewalTerm: SrcyMembershipTermInfo = {
    termId: `term-${Date.now()}`,
    domId: renewal.domId,
    domNumber: domDetails.domNumber || '',
    schoolYear: domDetails.schoolYear || '',
    validFrom: domDetails.validFrom || '',
    validUntil: domDetails.validUntil || '',
    status: domDetails.status || 'Active',
    gradeLevel: renewal.gradeLevel ?? previousMember.gradeLevel,
    section: renewal.section ?? previousMember.section,
    councilRole: renewal.councilRole ?? previousMember.councilRole ?? 'Member',
    maabId: renewal.maabId ?? previousMember.maabId,
    joinedAt: renewal.joinedAt || nowIso.slice(0, 10),
    notes: renewal.notes ?? previousMember.notes,
    updatedAt: nowIso,
  };

  const existingTerms = previousMember.membershipInfo || [];
  const updatedTerms = [
    renewalTerm,
    ...existingTerms.filter((t) => t.domId !== renewal.domId),
  ];

  // Update existing member record in place!
  return updateSrcyMember(previousMember.id, {
    gradeLevel: renewal.gradeLevel ?? previousMember.gradeLevel,
    section: renewal.section ?? previousMember.section,
    councilRole: renewal.councilRole ?? previousMember.councilRole ?? 'Member',
    membershipStatus: 'Active',
    domId: renewal.domId,
    maabId: renewal.maabId ?? previousMember.maabId,
    joinedAt: renewal.joinedAt || previousMember.joinedAt,
    notes: renewal.notes ?? previousMember.notes,
    membershipInfo: updatedTerms,
  });
}
