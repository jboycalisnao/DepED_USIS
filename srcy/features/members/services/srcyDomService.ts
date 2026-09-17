import { supabase } from '@deped-usis/shared-supabase';
import type { SrcyMemberRecord, SrcyMembershipStatus } from './srcyMembershipService';

export type SrcyDomStatus = 'Active' | 'Pending' | 'Expired' | 'Archived';

export type SrcyDomRecord = {
  id: string;
  domNumber: string;
  title: string;
  schoolYear: string;
  validFrom: string;
  validUntil: string;
  status: SrcyDomStatus;
  description: string;
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SrcyDomDraft = Omit<SrcyDomRecord, 'id' | 'createdAt' | 'updatedAt'>;

const TABLE_NAME = 'srcy_dom_records';
const LOCAL_STORAGE_KEY = 'srcy_dom_records';

const toText = (value: unknown) => String(value ?? '').trim();

/**
 * Calculates exactly one year from a starting date (YYYY-MM-DD).
 * For example:
 * 2026-09-17 -> 2027-09-16 (1 year inclusive)
 */
export function computeOneYearValidity(startDate: string): string {
  if (!startDate) return '';
  const d = new Date(startDate);
  if (isNaN(d.getTime())) return '';
  
  const end = new Date(d);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return end.toISOString().slice(0, 10);
}

/**
 * Determines current validity state based on dates:
 * 'Active' (currently within validity window), 'Upcoming' (start date in future), 'Expired' (past end date)
 */
export function getDomValidityState(validFrom: string, validUntil: string): 'Active' | 'Upcoming' | 'Expired' {
  if (!validFrom || !validUntil) return 'Active';
  const today = new Date().toISOString().slice(0, 10);
  if (today < validFrom) return 'Upcoming';
  if (today > validUntil) return 'Expired';
  return 'Active';
}

/**
 * Determines whether a DOM batch is expired (by explicit status or past validity period).
 */
export function isDomExpired(dom?: SrcyDomRecord | null): boolean {
  if (!dom) return true;
  if (dom.status === 'Expired' || dom.status === 'Archived') return true;
  if (getDomValidityState(dom.validFrom, dom.validUntil) === 'Expired') return true;
  return false;
}

/**
 * Computes a member's membership status based strictly on the validity of their attached DOM batch.
 * - Active: DOM status is Active and current date is within the validFrom..validUntil window.
 * - Pending: DOM status is Pending or validFrom is in the future.
 * - Inactive: No DOM attached, DOM is Expired/Archived, or validity period has passed.
 */
export function computeMemberStatusFromDom(dom?: SrcyDomRecord | null): SrcyMembershipStatus {
  if (!dom) return 'Inactive';
  if (dom.status === 'Archived' || dom.status === 'Expired') return 'Inactive';
  if (dom.status === 'Pending') return 'Pending';

  const dateState = getDomValidityState(dom.validFrom, dom.validUntil);
  if (dateState === 'Expired') return 'Inactive';
  if (dateState === 'Upcoming') return 'Pending';
  return 'Active';
}

/**
 * Returns user-facing status label and explanation based on DOM batch validity.
 */
export function getMemberDomValiditySummary(dom?: SrcyDomRecord | null): {
  status: SrcyMembershipStatus;
  label: string;
  reason: string;
} {
  if (!dom) {
    return {
      status: 'Inactive',
      label: 'Inactive',
      reason: 'No DOM batch attached (Registration requires DOM)',
    };
  }

  if (dom.status === 'Archived') {
    return {
      status: 'Inactive',
      label: 'Inactive',
      reason: `Attached DOM (${dom.domNumber}) is archived`,
    };
  }

  if (dom.status === 'Expired') {
    return {
      status: 'Inactive',
      label: 'Inactive',
      reason: `Attached DOM (${dom.domNumber}) is marked expired`,
    };
  }

  const dateState = getDomValidityState(dom.validFrom, dom.validUntil);
  if (dateState === 'Expired') {
    return {
      status: 'Inactive',
      label: 'Inactive',
      reason: `1-Year validity expired on ${dom.validUntil} (${dom.domNumber})`,
    };
  }

  if (dateState === 'Upcoming' || dom.status === 'Pending') {
    return {
      status: 'Pending',
      label: 'Pending',
      reason: `Validity begins on ${dom.validFrom} (${dom.domNumber})`,
    };
  }

  return {
    status: 'Active',
    label: 'Active',
    reason: `Valid through ${dom.validUntil} (${dom.domNumber})`,
  };
}

/**
 * Returns DOM-specific status ('Active' | 'Pending' | 'Expired').
 * Status for a DOM is strictly 'Expired' when its validity date has passed or unattached, never 'Inactive'.
 */
export function getDomRecordStatusSummary(dom?: SrcyDomRecord | null): {
  status: 'Active' | 'Pending' | 'Expired';
  reason: string;
} {
  if (!dom) {
    return {
      status: 'Expired',
      reason: 'No DOM batch attached or batch has expired',
    };
  }

  if (dom.status === 'Archived' || dom.status === 'Expired') {
    return {
      status: 'Expired',
      reason: `DOM (${dom.domNumber}) is marked ${dom.status.toLowerCase()}`,
    };
  }

  const dateState = getDomValidityState(dom.validFrom, dom.validUntil);
  if (dateState === 'Expired') {
    return {
      status: 'Expired',
      reason: `1-Year validity expired on ${dom.validUntil} (${dom.domNumber})`,
    };
  }

  if (dateState === 'Upcoming' || dom.status === 'Pending') {
    return {
      status: 'Pending',
      reason: `Validity begins on ${dom.validFrom} (${dom.domNumber})`,
    };
  }

  return {
    status: 'Active',
    reason: `Valid through ${dom.validUntil} (${dom.domNumber})`,
  };
}

/**
 * Generates the next sequential DOM Number for a school year, starting at 1.
 * Format: DOM-{school year}-001, DOM-{school year}-002, etc.
 * Example: DOM-2026-2027-001 or DOM-2026-001
 */
export function generateNextDomNumber(schoolYear: string, existingDoms: SrcyDomRecord[] = []): string {
  const currentYear = new Date().getFullYear();
  const cleanSy = (schoolYear || '').trim() || `${currentYear}-${currentYear + 1}`;
  const prefix = `DOM-${cleanSy}-`;

  let maxSeq = 0;
  for (const record of existingDoms) {
    const domNum = (record.domNumber || '').trim();
    if (domNum.toUpperCase().startsWith(prefix.toUpperCase())) {
      const suffix = domNum.slice(prefix.length);
      const match = suffix.match(/^(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

/**
 * Loads the active school year label from registrar_school_years (e.g. '2026-2027').
 * Falls back to current academic school year if none is marked active.
 */
export async function loadActiveSchoolYearLabel(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('registrar_school_years')
      .select('id, label, is_active')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!error && data?.label) {
      return String(data.label).trim();
    }
  } catch {
    // fallback below
  }

  const now = new Date();
  const year = now.getFullYear();
  const isEarlyYear = now.getMonth() < 5;
  const startYear = isEarlyYear ? year - 1 : year;
  return `${startYear}-${startYear + 1}`;
}

const mapRow = (row: any): SrcyDomRecord => ({
  id: toText(row.id),
  domNumber: toText(row.dom_number),
  title: toText(row.title),
  schoolYear: toText(row.school_year),
  validFrom: toText(row.valid_from),
  validUntil: toText(row.valid_until),
  status: (toText(row.status) as SrcyDomStatus) || 'Active',
  description: toText(row.description),
  schoolId: toText(row.school_id),
  createdBy: toText(row.created_by),
  createdAt: toText(row.created_at),
  updatedAt: toText(row.updated_at),
});

const toRow = (draft: SrcyDomDraft) => ({
  dom_number: toText(draft.domNumber),
  title: toText(draft.title),
  school_year: toText(draft.schoolYear) || null,
  valid_from: toText(draft.validFrom),
  valid_until: toText(draft.validUntil) || computeOneYearValidity(draft.validFrom),
  status: toText(draft.status) || 'Active',
  description: toText(draft.description) || null,
  school_id: toText(draft.schoolId) || null,
  created_by: toText(draft.createdBy) || null,
});

const readLocalDoms = (): SrcyDomRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalDoms = (records: SrcyDomRecord[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
};

const isMissingTableError = (error: any) =>
  error?.code === '42P01' || String(error?.message || '').toLowerCase().includes(TABLE_NAME);

export async function loadSrcyDomRecords(): Promise<SrcyDomRecord[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('valid_from', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return readLocalDoms();
    throw new Error(error.message || 'Unable to load DOM records.');
  }

  return (data || []).map(mapRow);
}

export async function createSrcyDomRecord(draft: SrcyDomDraft): Promise<SrcyDomRecord> {
  if (!toText(draft.title)) throw new Error('DOM title is required.');
  if (!toText(draft.validFrom)) throw new Error('Starting date is required.');

  const localDoms = readLocalDoms();
  const domNumber = toText(draft.domNumber) || generateNextDomNumber(draft.schoolYear || '', localDoms);
  const validUntil = draft.validUntil || computeOneYearValidity(draft.validFrom);
  const nowIso = new Date().toISOString();

  const preparedDraft: SrcyDomDraft = {
    ...draft,
    domNumber,
  };

  const payload = {
    ...toRow(preparedDraft),
    valid_until: validUntil,
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([payload])
    .select('*')
    .single();

  if (error) {
    if (!isMissingTableError(error)) throw new Error(error.message || 'Unable to save DOM record.');
    const fallbackRecord: SrcyDomRecord = {
      ...preparedDraft,
      validUntil,
      id: `local-dom-${Date.now()}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    writeLocalDoms([fallbackRecord, ...localDoms]);
    return fallbackRecord;
  }

  return mapRow(data);
}

export async function updateSrcyDomRecord(id: string, updates: Partial<SrcyDomDraft>): Promise<SrcyDomRecord> {
  const nowIso = new Date().toISOString();

  if (id.startsWith('local-dom-')) {
    const existing = readLocalDoms();
    let updated: SrcyDomRecord | null = null;
    const nextList = existing.map((r) => {
      if (r.id !== id) return r;
      const validFrom = updates.validFrom ?? r.validFrom;
      const validUntil = updates.validUntil ?? (updates.validFrom ? computeOneYearValidity(updates.validFrom) : r.validUntil);
      updated = {
        ...r,
        ...updates,
        validFrom,
        validUntil,
        updatedAt: nowIso,
      };
      return updated;
    });
    writeLocalDoms(nextList);
    if (!updated) throw new Error('DOM record not found in local cache.');
    return updated;
  }

  const patch: any = { updated_at: nowIso };
  if (updates.domNumber !== undefined) patch.dom_number = toText(updates.domNumber);
  if (updates.title !== undefined) patch.title = toText(updates.title);
  if (updates.schoolYear !== undefined) patch.school_year = toText(updates.schoolYear) || null;
  if (updates.validFrom !== undefined) {
    patch.valid_from = toText(updates.validFrom);
    if (!updates.validUntil) {
      patch.valid_until = computeOneYearValidity(updates.validFrom);
    }
  }
  if (updates.validUntil !== undefined) patch.valid_until = toText(updates.validUntil);
  if (updates.status !== undefined) patch.status = toText(updates.status);
  if (updates.description !== undefined) patch.description = toText(updates.description) || null;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message || 'Unable to update DOM record.');
  return mapRow(data);
}

export async function deleteSrcyDomRecord(id: string): Promise<void> {
  if (id.startsWith('local-dom-')) {
    writeLocalDoms(readLocalDoms().filter((r) => r.id !== id));
    return;
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message || 'Unable to delete DOM record.');
}

/**
 * Attaches multiple members to a specific DOM record batch.
 */
export async function attachMembersToDom(domId: string, memberIds: string[]): Promise<void> {
  if (!memberIds.length) return;

  const { error } = await supabase
    .from('srcy_memberships')
    .update({ dom_id: domId, updated_at: new Date().toISOString() })
    .in('id', memberIds);

  if (error) {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('srcy_membership_records');
        if (raw) {
          const members: SrcyMemberRecord[] = JSON.parse(raw);
          const next = members.map((m) =>
            memberIds.includes(m.id) ? { ...m, domId, updatedAt: new Date().toISOString() } : m
          );
          window.localStorage.setItem('srcy_membership_records', JSON.stringify(next));
        }
      } catch {
        // ignore
      }
    }
  }
}

/**
 * Detaches a member from their current DOM record batch.
 */
export async function detachMemberFromDom(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('srcy_memberships')
    .update({ dom_id: null, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (error) {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('srcy_membership_records');
        if (raw) {
          const members: SrcyMemberRecord[] = JSON.parse(raw);
          const next = members.map((m) =>
            m.id === memberId ? { ...m, domId: '', updatedAt: new Date().toISOString() } : m
          );
          window.localStorage.setItem('srcy_membership_records', JSON.stringify(next));
        }
      } catch {
        // ignore
      }
    }
  }
}
