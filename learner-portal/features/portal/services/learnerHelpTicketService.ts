import { supabase } from '@deped-usis/shared-supabase';

export type LearnerHelpTicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';

export type LearnerHelpTicketDraft = {
  category: string;
  contactNo: string;
  details: string;
  gradeLevel: string;
  learnerId: string;
  learnerLrn: string;
  learnerName: string;
  section: string;
  subject: string;
};

export type LearnerHelpTicketRecord = LearnerHelpTicketDraft & {
  createdAt: string;
  adminNotes: string;
  assignedCoordinatorId: string;
  resolvedAt: string;
  updatedAt: string;
  id: string;
  referenceNo: string;
  source: 'learner_portal' | 'integrated_admin';
  status: LearnerHelpTicketStatus;
};

const TABLE_NAME = 'learner_portal_help_tickets';

const toText = (value: unknown) => String(value || '').trim();

const mapTicket = (row: any): LearnerHelpTicketRecord => ({
  category: toText(row?.category),
  contactNo: toText(row?.contact_no),
  createdAt: toText(row?.created_at),
  adminNotes: toText(row?.admin_notes),
  assignedCoordinatorId: toText(row?.assigned_coordinator_id),
  details: toText(row?.details),
  gradeLevel: toText(row?.grade_level),
  id: toText(row?.id),
  learnerId: toText(row?.learner_id),
  learnerLrn: toText(row?.learner_lrn),
  learnerName: toText(row?.learner_name),
  referenceNo: toText(row?.reference_no),
  resolvedAt: toText(row?.resolved_at),
  section: toText(row?.section),
  source: row?.source === 'integrated_admin' ? 'integrated_admin' : 'learner_portal',
  status:
    row?.status === 'In Review' || row?.status === 'Resolved' || row?.status === 'Closed'
      ? row.status
      : 'Open',
  subject: toText(row?.subject),
  updatedAt: toText(row?.updated_at),
});

export const createLearnerHelpTicketReference = () => {
  const stamp = new Date();
  const datePart = stamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 9000 + 1000);
  return `LHT-${datePart}-${randomPart}`;
};

export const loadLearnerHelpTickets = async (input?: { learnerId?: string; learnerLrn?: string }) => {
  const learnerId = toText(input?.learnerId);
  const learnerLrn = toText(input?.learnerLrn);

  let query = supabase
    .from(TABLE_NAME)
    .select('id, reference_no, learner_id, learner_lrn, learner_name, grade_level, section, category, subject, details, contact_no, status, source, created_at, updated_at, resolved_at, admin_notes, assigned_coordinator_id')
    .order('created_at', { ascending: false });

  if (learnerId) {
    query = query.eq('learner_id', learnerId);
  } else if (learnerLrn) {
    query = query.eq('learner_lrn', learnerLrn);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Unable to load help tickets.');
  return (data || []).map(mapTicket);
};

export const addLearnerHelpTicket = async (draft: LearnerHelpTicketDraft) => {
  const payload = {
    category: draft.category.trim(),
    contact_no: draft.contactNo.trim(),
    details: draft.details.trim(),
    grade_level: draft.gradeLevel.trim(),
    learner_id: draft.learnerId.trim() || null,
    learner_lrn: draft.learnerLrn.trim(),
    learner_name: draft.learnerName.trim(),
    reference_no: createLearnerHelpTicketReference(),
    section: draft.section.trim(),
    source: 'learner_portal',
    status: 'Open',
    subject: draft.subject.trim(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([payload])
    .select('id, reference_no, learner_id, learner_lrn, learner_name, grade_level, section, category, subject, details, contact_no, status, source, created_at, updated_at, resolved_at, admin_notes, assigned_coordinator_id')
    .single();

  if (error) throw new Error(error.message || 'Unable to submit help ticket.');
  if (!data) throw new Error('Unable to submit help ticket.');
  return mapTicket(data);
};

export const getLearnerHelpTicketStatusTone = (status: LearnerHelpTicketStatus) => {
  if (status === 'Resolved') return 'Resolved';
  if (status === 'In Review') return 'In Review';
  if (status === 'Closed') return 'Closed';
  return 'Open';
};
