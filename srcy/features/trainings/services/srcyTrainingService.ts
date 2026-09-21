import { supabase } from '@deped-usis/shared-supabase';
import type { MemberMisTrainingItem } from '../../members/mis/MemberMisDocument';

export type SrcyTrainingStatus = 'Completed' | 'Scheduled' | 'In Progress' | 'Archived';
export type SrcyParticipationStatus = 'Completed' | 'Attended' | 'Eligible' | 'Incomplete' | 'Excused';

export type SrcyTrainingRecord = {
  id: string;
  title: string;
  description: string;
  trainingDate: string;
  validityPeriod: string;
  status: SrcyTrainingStatus;
  venue: string;
  facilitator: string;
  schoolYear: string;
  schoolId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SrcyTrainingDraft = Omit<SrcyTrainingRecord, 'id' | 'createdAt' | 'updatedAt'>;

export type SrcyTrainingParticipantRecord = {
  id: string;
  trainingId: string;
  membershipId: string;
  participationStatus: SrcyParticipationStatus;
  remarks: string;
  createdAt: string;
};

const TRAININGS_TABLE = 'srcy_trainings';
const PARTICIPANTS_TABLE = 'srcy_training_participants';

const LOCAL_STORAGE_TRAININGS_KEY = 'srcy_training_records';
const LOCAL_STORAGE_PARTICIPANTS_KEY = 'srcy_training_participants_records';

const toText = (val: unknown) => String(val ?? '').trim();

const isMissingTableError = (error: any, table: string) =>
  error?.code === '42P01' || String(error?.message || '').toLowerCase().includes(table);

// Seed data for offline or initial fallback
const getInitialSeedTrainings = (): SrcyTrainingRecord[] => [
  {
    id: 'seed-training-1',
    title: 'SRCY Leadership Orientation & Youth Council Induction',
    description: 'Fundamental principles of the Red Cross Youth movement, leadership tenets, and official council oath-taking.',
    trainingDate: '2026-09-01',
    validityPeriod: '1 Year (Term Covered)',
    status: 'Completed',
    venue: 'Leon NHS Audio-Visual Room',
    facilitator: 'SRCY Council Adviser / Chapter Field Staff',
    schoolYear: '2026-2027',
    schoolId: '302488',
    createdBy: '',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'seed-training-2',
    title: 'Standard First Aid & Basic Life Support (CPR) Familiarization',
    description: 'Practical training on adult/infant CPR, foreign body airway obstruction relief, and emergency bandage techniques.',
    trainingDate: '2026-09-12',
    validityPeriod: '1 Year (Active Term)',
    status: 'Completed',
    venue: 'Leon NHS School Gymnasium',
    facilitator: 'Philippine Red Cross Safety Services Certified Instructor',
    schoolYear: '2026-2027',
    schoolId: '302488',
    createdBy: '',
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-09-12T08:00:00.000Z',
  },
  {
    id: 'seed-training-3',
    title: 'Disaster Risk Reduction & Youth Camp Assembly',
    description: 'Disaster preparedness simulation, hazard vulnerability mapping, and temporary evacuation center coordination.',
    trainingDate: '2026-10-15',
    validityPeriod: '1 Year (Active Term)',
    status: 'Scheduled',
    venue: 'School Grounds / Covered Court',
    facilitator: 'School DRRM Coordinator & Red Cross Youth Officers',
    schoolYear: '2026-2027',
    schoolId: '302488',
    createdBy: '',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  },
  {
    id: 'seed-training-4',
    title: 'Council Peer Education & Humanitarian Values Workshop',
    description: 'Interactive sessions promoting the 7 Fundamental Principles, empathy, peace, and anti-bullying advocacy.',
    trainingDate: '2026-11-20',
    validityPeriod: '1 Year (Active Term)',
    status: 'Scheduled',
    venue: 'SRCY Council Headquarters',
    facilitator: 'SRCY Youth Peer Educator',
    schoolYear: '2026-2027',
    schoolId: '302488',
    createdBy: '',
    createdAt: '2026-09-15T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  },
];

const readLocalTrainings = (): SrcyTrainingRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(LOCAL_STORAGE_TRAININGS_KEY);
    if (!data) {
      const seeds = getInitialSeedTrainings();
      window.localStorage.setItem(LOCAL_STORAGE_TRAININGS_KEY, JSON.stringify(seeds));
      return seeds;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalTrainings = (trainings: SrcyTrainingRecord[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_TRAININGS_KEY, JSON.stringify(trainings));
};

const readLocalParticipants = (): SrcyTrainingParticipantRecord[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = window.localStorage.getItem(LOCAL_STORAGE_PARTICIPANTS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalParticipants = (participants: SrcyTrainingParticipantRecord[]) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_STORAGE_PARTICIPANTS_KEY, JSON.stringify(participants));
};

const mapTrainingRow = (row: any): SrcyTrainingRecord => ({
  id: toText(row.id),
  title: toText(row.title),
  description: toText(row.description),
  trainingDate: toText(row.training_date),
  validityPeriod: toText(row.validity_period) || '1 Year (Active Term)',
  status: (toText(row.status) as SrcyTrainingStatus) || 'Completed',
  venue: toText(row.venue),
  facilitator: toText(row.facilitator),
  schoolYear: toText(row.school_year),
  schoolId: toText(row.school_id),
  createdBy: toText(row.created_by),
  createdAt: toText(row.created_at),
  updatedAt: toText(row.updated_at),
});

const mapParticipantRow = (row: any): SrcyTrainingParticipantRecord => ({
  id: toText(row.id),
  trainingId: toText(row.training_id),
  membershipId: toText(row.membership_id),
  participationStatus: (toText(row.participation_status) as SrcyParticipationStatus) || 'Completed',
  remarks: toText(row.remarks),
  createdAt: toText(row.created_at),
});

/**
 * Loads all council trainings from database or local fallback.
 */
export async function loadSrcyTrainings(): Promise<SrcyTrainingRecord[]> {
  const { data, error } = await supabase
    .from(TRAININGS_TABLE)
    .select('*')
    .order('training_date', { ascending: false });

  if (error) {
    if (isMissingTableError(error, TRAININGS_TABLE)) {
      return readLocalTrainings();
    }
    throw new Error(error.message || 'Unable to load trainings.');
  }

  return (data || []).map(mapTrainingRow);
}

/**
 * Creates a new council training.
 */
export async function createSrcyTraining(draft: SrcyTrainingDraft): Promise<SrcyTrainingRecord> {
  if (!draft.title.trim()) throw new Error('Training title is required.');
  if (!draft.trainingDate) throw new Error('Training date is required.');

  const row = {
    title: draft.title.trim(),
    description: draft.description.trim() || null,
    training_date: draft.trainingDate,
    validity_period: draft.validityPeriod.trim() || '1 Year (Active Term)',
    status: draft.status || 'Completed',
    venue: draft.venue.trim() || null,
    facilitator: draft.facilitator.trim() || null,
    school_year: draft.schoolYear.trim() || null,
    school_id: draft.schoolId.trim() || null,
    created_by: draft.createdBy.trim() || null,
  };

  const { data, error } = await supabase
    .from(TRAININGS_TABLE)
    .insert(row)
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error, TRAININGS_TABLE)) {
      const now = new Date().toISOString();
      const localRecord: SrcyTrainingRecord = {
        id: `local-training-${Date.now()}`,
        ...draft,
        createdAt: now,
        updatedAt: now,
      };
      const existing = readLocalTrainings();
      writeLocalTrainings([localRecord, ...existing]);
      return localRecord;
    }
    throw new Error(error.message || 'Unable to create training.');
  }

  return mapTrainingRow(data);
}

/**
 * Updates an existing training.
 */
export async function updateSrcyTraining(
  id: string,
  updates: Partial<SrcyTrainingDraft>
): Promise<SrcyTrainingRecord> {
  const patch: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) patch.title = updates.title.trim();
  if (updates.description !== undefined) patch.description = updates.description.trim() || null;
  if (updates.trainingDate !== undefined) patch.training_date = updates.trainingDate;
  if (updates.validityPeriod !== undefined) patch.validity_period = updates.validityPeriod.trim() || '1 Year (Active Term)';
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.venue !== undefined) patch.venue = updates.venue.trim() || null;
  if (updates.facilitator !== undefined) patch.facilitator = updates.facilitator.trim() || null;
  if (updates.schoolYear !== undefined) patch.school_year = updates.schoolYear.trim() || null;

  if (id.startsWith('local-') || id.startsWith('seed-')) {
    const existing = readLocalTrainings();
    let updated: SrcyTrainingRecord | null = null;
    const nextList = existing.map((t) => {
      if (t.id !== id) return t;
      updated = { ...t, ...updates, updatedAt: patch.updated_at };
      return updated;
    });
    writeLocalTrainings(nextList);
    if (!updated) throw new Error('Training record not found.');
    return updated;
  }

  const { data, error } = await supabase
    .from(TRAININGS_TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error, TRAININGS_TABLE)) {
      const existing = readLocalTrainings();
      let updated: SrcyTrainingRecord | null = null;
      const nextList = existing.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, ...updates, updatedAt: patch.updated_at };
        return updated;
      });
      writeLocalTrainings(nextList);
      if (!updated) throw new Error('Training record not found.');
      return updated;
    }
    throw new Error(error.message || 'Unable to update training.');
  }

  return mapTrainingRow(data);
}

/**
 * Deletes a training record.
 */
export async function deleteSrcyTraining(id: string): Promise<void> {
  if (id.startsWith('local-') || id.startsWith('seed-')) {
    const existing = readLocalTrainings();
    writeLocalTrainings(existing.filter((t) => t.id !== id));
    // Also remove participants
    const existingParts = readLocalParticipants();
    writeLocalParticipants(existingParts.filter((p) => p.trainingId !== id));
    return;
  }

  const { error } = await supabase
    .from(TRAININGS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    if (isMissingTableError(error, TRAININGS_TABLE)) {
      const existing = readLocalTrainings();
      writeLocalTrainings(existing.filter((t) => t.id !== id));
      return;
    }
    throw new Error(error.message || 'Unable to delete training.');
  }
}

/**
 * Loads all participants for a specific training.
 */
export async function loadTrainingParticipants(trainingId: string): Promise<SrcyTrainingParticipantRecord[]> {
  const { data, error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .select('*')
    .eq('training_id', trainingId);

  if (error) {
    if (isMissingTableError(error, PARTICIPANTS_TABLE)) {
      return readLocalParticipants().filter((p) => p.trainingId === trainingId);
    }
    throw new Error(error.message || 'Unable to load training participants.');
  }

  return (data || []).map(mapParticipantRow);
}

/**
 * Loads all participant mappings across all trainings.
 */
export async function loadAllTrainingParticipants(): Promise<SrcyTrainingParticipantRecord[]> {
  const { data, error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .select('*');

  if (error) {
    if (isMissingTableError(error, PARTICIPANTS_TABLE)) {
      return readLocalParticipants();
    }
    return [];
  }

  return (data || []).map(mapParticipantRow);
}

/**
 * Attaches multiple members to a training in bulk.
 */
export async function attachParticipantsToTraining(
  trainingId: string,
  membershipIds: string[],
  participationStatus: SrcyParticipationStatus = 'Completed'
): Promise<void> {
  if (!trainingId || membershipIds.length === 0) return;

  const rows = membershipIds.map((mId) => ({
    training_id: trainingId,
    membership_id: mId,
    participation_status: participationStatus,
  }));

  const { error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .upsert(rows, { onConflict: 'training_id,membership_id' });

  if (error) {
    if (isMissingTableError(error, PARTICIPANTS_TABLE)) {
      const existing = readLocalParticipants();
      const existingMap = new Map(existing.map((p) => [`${p.trainingId}_${p.membershipId}`, p]));
      for (const mId of membershipIds) {
        const key = `${trainingId}_${mId}`;
        if (!existingMap.has(key)) {
          existing.push({
            id: `local-part-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            trainingId,
            membershipId: mId,
            participationStatus,
            remarks: '',
            createdAt: new Date().toISOString(),
          });
        }
      }
      writeLocalParticipants(existing);
      return;
    }
    throw new Error(error.message || 'Unable to add participants.');
  }
}

/**
 * Detaches a single participant from a training.
 */
export async function detachParticipantFromTraining(
  trainingId: string,
  membershipId: string
): Promise<void> {
  const { error } = await supabase
    .from(PARTICIPANTS_TABLE)
    .delete()
    .eq('training_id', trainingId)
    .eq('membership_id', membershipId);

  if (error) {
    if (isMissingTableError(error, PARTICIPANTS_TABLE)) {
      const existing = readLocalParticipants();
      writeLocalParticipants(
        existing.filter((p) => !(p.trainingId === trainingId && p.membershipId === membershipId))
      );
      return;
    }
    throw new Error(error.message || 'Unable to remove participant.');
  }
}

/**
 * Formats date for MIS sheet display (e.g. "Sep 12, 2026" or "09-12-2026").
 */
function formatTrainingDateForMis(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Fetches all trainings that a given member has participated in,
 * formatted specifically as MemberMisTrainingItem for dynamic injection into the MIS sheet.
 */
export async function loadMemberTrainings(
  memberId: string,
  learnerLrn?: string
): Promise<MemberMisTrainingItem[]> {
  if (!memberId && !learnerLrn) return [];

  try {
    // 1. Get all trainings
    const allTrainings = await loadSrcyTrainings();
    if (allTrainings.length === 0) return [];
    const trainingMap = new Map(allTrainings.map((t) => [t.id, t]));

    // 2. Query participant records for this membership ID or any sibling terms with same LRN
    const memberIdSet = new Set<string>();
    if (memberId) memberIdSet.add(memberId);

    if (learnerLrn?.trim()) {
      try {
        const { data: siblings } = await supabase
          .from('srcy_memberships')
          .select('id')
          .eq('learner_lrn', learnerLrn.trim());
        if (siblings && Array.isArray(siblings)) {
          siblings.forEach((s) => memberIdSet.add(s.id));
        }
      } catch {
        // use memberId
      }
    }

    const memberIdList = Array.from(memberIdSet);
    let participantRecords: SrcyTrainingParticipantRecord[] = [];

    const { data, error } = await supabase
      .from(PARTICIPANTS_TABLE)
      .select('*')
      .in('membership_id', memberIdList);

    if (!error && Array.isArray(data)) {
      participantRecords = data.map(mapParticipantRow);
    } else {
      // Check local storage fallback
      participantRecords = readLocalParticipants().filter((p) =>
        memberIdSet.has(p.membershipId)
      );
    }

    // 3. Map to MemberMisTrainingItem (deduplicating by trainingId)
    const items: MemberMisTrainingItem[] = [];
    const seenTrainings = new Set<string>();

    for (const part of participantRecords) {
      if (seenTrainings.has(part.trainingId)) continue;
      seenTrainings.add(part.trainingId);

      const training = trainingMap.get(part.trainingId);
      if (training) {
        items.push({
          date: formatTrainingDateForMis(training.trainingDate),
          description: training.title,
          validityPeriod: training.validityPeriod?.trim() || 'No Expiration',
          status: part.participationStatus || training.status,
        });
      }
    }

    // Sort chronologically by date
    return items.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return timeA - timeB;
    });
  } catch {
    return [];
  }
}
