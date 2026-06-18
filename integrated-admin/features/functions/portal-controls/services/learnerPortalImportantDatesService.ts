import { supabase } from '../../../../../packages/shared-supabase/src';

const TABLE_NAME = 'ia_learner_portal_important_dates';

const toText = (value: unknown) => String(value || '').trim();

export type LearnerPortalImportantDateDraft = {
  dateKey: string;
  title: string;
  details: string;
  dueDate: string;
  isActive: boolean;
  isPinned: boolean;
  sortOrder: number;
};

export type LearnerPortalImportantDateRecord = LearnerPortalImportantDateDraft & {
  createdAt: string;
  id: string;
  updatedAt: string;
};

const mapRecord = (row: any): LearnerPortalImportantDateRecord => ({
  id: toText(row?.id),
  dateKey: toText(row?.date_key),
  title: toText(row?.title),
  details: toText(row?.details),
  dueDate: toText(row?.due_date),
  isActive: Boolean(row?.is_active),
  isPinned: Boolean(row?.is_pinned),
  sortOrder: Number(row?.sort_order || 0),
  createdAt: toText(row?.created_at),
  updatedAt: toText(row?.updated_at),
});

export const generateImportantDateKey = (title: string) =>
  `learner-date-${String(title || 'reminder').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function loadLearnerPortalImportantDates() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,date_key,title,details,due_date,is_active,is_pinned,sort_order,created_at,updated_at')
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('due_date', { ascending: true });

  if (error) throw new Error(error.message || 'Unable to load learner portal important dates.');
  return (data || []).map(mapRecord);
}

export async function saveLearnerPortalImportantDate(id: string | null, draft: LearnerPortalImportantDateDraft) {
  const payload = {
    date_key: draft.dateKey || generateImportantDateKey(draft.title),
    title: toText(draft.title),
    details: toText(draft.details),
    due_date: toText(draft.dueDate) || null,
    is_active: draft.isActive,
    is_pinned: draft.isPinned,
    sort_order: Number(draft.sortOrder || 0),
  };

  const query = id
    ? supabase.from(TABLE_NAME).update(payload).eq('id', id)
    : supabase.from(TABLE_NAME).insert([payload]);

  const { error } = await query;
  if (error) throw new Error(error.message || 'Unable to save learner portal important date.');
}

export async function deleteLearnerPortalImportantDate(id: string) {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) throw new Error(error.message || 'Unable to delete learner portal important date.');
}
