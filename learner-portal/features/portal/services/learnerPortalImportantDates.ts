import { supabase } from '@deped-usis/shared-supabase';

const TABLE_NAME = 'ia_learner_portal_important_dates';

const toText = (value: unknown) => String(value || '').trim();

export type LearnerPortalImportantDateRecord = {
  id: string;
  dateKey: string;
  title: string;
  details: string;
  dueDate: string;
  isActive: boolean;
  isPinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const mapRow = (row: any): LearnerPortalImportantDateRecord => ({
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

export async function loadLearnerPortalImportantDates() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,date_key,title,details,due_date,is_active,is_pinned,sort_order,created_at,updated_at')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message || 'Unable to load learner portal important dates.');
  return (data || []).map(mapRow);
}
