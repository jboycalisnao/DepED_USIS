import { supabase } from '@deped-usis/shared-supabase';

export type HelpDeskTicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';
export type HelpDeskTicketSource = 'learner_portal' | 'integrated_admin';

export type HelpDeskTicketRecord = {
  adminNotes: string;
  assignedCoordinatorId: string;
  category: string;
  contactNo: string;
  createdAt: string;
  details: string;
  gradeLevel: string;
  id: string;
  learnerId: string;
  learnerLrn: string;
  learnerName: string;
  referenceNo: string;
  resolvedAt: string;
  section: string;
  source: HelpDeskTicketSource;
  status: HelpDeskTicketStatus;
  subject: string;
  updatedAt: string;
};

const TABLE_NAME = 'learner_portal_help_tickets';

const toText = (value: unknown) => String(value || '').trim();

const mapRow = (row: any): HelpDeskTicketRecord => ({
  adminNotes: toText(row?.admin_notes),
  assignedCoordinatorId: toText(row?.assigned_coordinator_id),
  category: toText(row?.category),
  contactNo: toText(row?.contact_no),
  createdAt: toText(row?.created_at),
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

export const loadHelpDeskTickets = async (): Promise<HelpDeskTicketRecord[]> => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(
      'id, reference_no, learner_id, learner_lrn, learner_name, grade_level, section, category, subject, details, contact_no, status, source, assigned_coordinator_id, admin_notes, resolved_at, created_at, updated_at',
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load help desk tickets.');
  }

  return (data || []).map(mapRow);
};
