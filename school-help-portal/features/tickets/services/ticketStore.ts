import { supabase } from '@deped-usis/shared-supabase';
import { getPersistentTicketCache, setPersistentTicketCache } from './ticketCache';

export type HelpTicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';

export type HelpTicketDraft = {
  category: string;
  contactNo: string;
  details: string;
  gradeLevel: string;
  learnerId?: string;
  learnerLrn: string;
  learnerName: string;
  section: string;
  subject: string;
};

export type HelpTicketRecord = HelpTicketDraft & {
  createdAt: string;
  adminNotes: string;
  assignedCoordinatorId: string;
  id: string;
  referenceNo: string;
  source: 'learner_portal' | 'integrated_admin';
  status: HelpTicketStatus;
};

const TABLE_NAME = 'learner_portal_help_tickets';
const CACHE_SCOPE = 'help-tickets';

const toText = (value: unknown) => String(value || '').trim();

const mapTicket = (row: any): HelpTicketRecord => ({
  category: toText(row?.category),
  contactNo: toText(row?.contact_no),
  createdAt: toText(row?.created_at),
  adminNotes: toText(row?.admin_notes),
  details: toText(row?.details),
  assignedCoordinatorId: toText(row?.assigned_coordinator_id),
  gradeLevel: toText(row?.grade_level),
  id: toText(row?.id),
  learnerId: toText(row?.learner_id),
  learnerLrn: toText(row?.learner_lrn),
  learnerName: toText(row?.learner_name),
  referenceNo: toText(row?.reference_no),
  section: toText(row?.section),
  source: row?.source === 'integrated_admin' ? 'integrated_admin' : 'learner_portal',
  status:
    row?.status === 'In Review' || row?.status === 'Resolved' || row?.status === 'Closed'
      ? row.status
      : 'Open',
  subject: toText(row?.subject),
});

export const createHelpTicketReference = () => {
  const stamp = new Date();
  const datePart = stamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.floor(Math.random() * 9000 + 1000);
  return `LHT-${datePart}-${randomPart}`;
};

export const loadHelpTickets = async (input?: { forceRefresh?: boolean; learnerId?: string; learnerLrn?: string }) => {
  const forceRefresh = Boolean(input?.forceRefresh);
  const learnerId = toText(input?.learnerId);
  const learnerLrn = toText(input?.learnerLrn);
  const cacheKey = learnerId || learnerLrn ? `${CACHE_SCOPE}:${learnerId || learnerLrn}` : CACHE_SCOPE;

  if (!forceRefresh) {
    const cachedTickets = await getPersistentTicketCache<HelpTicketRecord[]>(cacheKey);
    if (cachedTickets) {
      return learnerId || learnerLrn
        ? cachedTickets.filter((ticket) => (learnerId ? ticket.learnerId === learnerId : ticket.learnerLrn === learnerLrn))
        : cachedTickets;
    }

    if (!learnerId && !learnerLrn) {
      const fallbackTickets = await getPersistentTicketCache<HelpTicketRecord[]>(CACHE_SCOPE);
      if (fallbackTickets) {
        return fallbackTickets;
      }
    }
  }

  let query = supabase
    .from(TABLE_NAME)
    .select(
      'id, reference_no, learner_id, learner_lrn, learner_name, grade_level, section, category, subject, details, contact_no, status, source, created_at, admin_notes, assigned_coordinator_id',
    )
    .order('created_at', { ascending: false });

  if (learnerId) {
    query = query.eq('learner_id', learnerId);
  } else if (learnerLrn) {
    query = query.eq('learner_lrn', learnerLrn);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Unable to load help tickets.');
  const tickets = (data || []).map(mapTicket);
  void setPersistentTicketCache(cacheKey, tickets);
  return tickets;
};

export const updateHelpTicket = async (
  ticketId: string,
  input: { adminNotes?: string; assignedCoordinatorId?: string; status: HelpTicketStatus },
) => {
  const payload: Record<string, unknown> = {
    admin_notes: toText(input.adminNotes),
    assigned_coordinator_id: toText(input.assignedCoordinatorId) || null,
    status: input.status,
    resolved_at: input.status === 'Resolved' ? new Date().toISOString() : null,
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(payload)
    .eq('id', ticketId)
    .select(
      'id, reference_no, learner_id, learner_lrn, learner_name, grade_level, section, category, subject, details, contact_no, status, source, created_at, admin_notes, assigned_coordinator_id',
    )
    .single();

  if (error) throw new Error(error.message || 'Unable to update help ticket.');
  if (!data) throw new Error('Unable to update help ticket.');

  const nextTicket = mapTicket(data);
  void getPersistentTicketCache<HelpTicketRecord[]>(CACHE_SCOPE).then((cachedTickets) => {
    const nextTickets = [nextTicket, ...((cachedTickets || []).filter((ticket) => ticket.id !== nextTicket.id))];
    void setPersistentTicketCache(CACHE_SCOPE, nextTickets);
  });
  return nextTicket;
};

const clearTicketFromCache = async (scope: string, ticketId: string) => {
  const cachedTickets = await getPersistentTicketCache<HelpTicketRecord[]>(scope);
  if (!cachedTickets) return;
  const nextTickets = cachedTickets.filter((ticket) => ticket.id !== ticketId);
  await setPersistentTicketCache(scope, nextTickets);
};

export const deleteHelpTicket = async (ticket: HelpTicketRecord) => {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', ticket.id);
  if (error) throw new Error(error.message || 'Unable to delete help ticket.');

  await clearTicketFromCache(CACHE_SCOPE, ticket.id);
  if (ticket.learnerId) {
    await clearTicketFromCache(`${CACHE_SCOPE}:${ticket.learnerId}`, ticket.id);
  }
  if (ticket.learnerLrn) {
    await clearTicketFromCache(`${CACHE_SCOPE}:${ticket.learnerLrn}`, ticket.id);
  }
};

export const addHelpTicket = async (draft: HelpTicketDraft) => {
  const payload = {
    category: draft.category.trim(),
    contact_no: draft.contactNo.trim(),
    details: draft.details.trim(),
    grade_level: draft.gradeLevel.trim(),
    learner_id: draft.learnerId?.trim() || null,
    learner_lrn: draft.learnerLrn.trim(),
    learner_name: draft.learnerName.trim(),
    reference_no: createHelpTicketReference(),
    section: draft.section.trim(),
    source: 'learner_portal',
    status: 'Open',
    subject: draft.subject.trim(),
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([payload])
    .select(
      'id, reference_no, learner_id, learner_lrn, learner_name, grade_level, section, category, subject, details, contact_no, status, source, created_at, admin_notes, assigned_coordinator_id',
    )
    .single();

  if (error) throw new Error(error.message || 'Unable to submit help ticket.');
  if (!data) throw new Error('Unable to submit help ticket.');
  const nextTicket = mapTicket(data);
  void getPersistentTicketCache<HelpTicketRecord[]>(CACHE_SCOPE).then((cachedTickets) => {
    const nextTickets = [nextTicket, ...(cachedTickets || [])];
    void setPersistentTicketCache(CACHE_SCOPE, nextTickets);
  });
  return nextTicket;
};

export const getTicketStatusTone = (status: HelpTicketStatus) => {
  if (status === 'Resolved') return 'Resolved';
  if (status === 'In Review') return 'In Review';
  if (status === 'Closed') return 'Closed';
  return 'Open';
};
