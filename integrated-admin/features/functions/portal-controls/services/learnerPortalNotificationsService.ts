import { supabase } from '../../../../../packages/shared-supabase/src';

const TABLE_NAME = 'ia_learner_portal_notifications';

const toText = (value: unknown) => String(value || '').trim();

export type LearnerPortalNotificationDraft = {
  notificationKey: string;
  title: string;
  message: string;
  isActive: boolean;
  isPinned: boolean;
  sortOrder: number;
};

export type LearnerPortalNotificationRecord = LearnerPortalNotificationDraft & {
  createdAt: string;
  id: string;
  updatedAt: string;
};

const mapRecord = (row: any): LearnerPortalNotificationRecord => ({
  id: toText(row?.id),
  notificationKey: toText(row?.notification_key),
  title: toText(row?.title),
  message: toText(row?.message),
  isActive: Boolean(row?.is_active),
  isPinned: Boolean(row?.is_pinned),
  sortOrder: Number(row?.sort_order || 0),
  createdAt: toText(row?.created_at),
  updatedAt: toText(row?.updated_at),
});

export const generateNotificationKey = (title: string) =>
  `learner-notification-${String(title || 'notice').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function loadLearnerPortalNotifications() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,notification_key,title,message,is_active,is_pinned,sort_order,created_at,updated_at')
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load learner portal notifications.');
  return (data || []).map(mapRecord);
}

export async function saveLearnerPortalNotification(id: string | null, draft: LearnerPortalNotificationDraft) {
  const payload = {
    notification_key: draft.notificationKey || generateNotificationKey(draft.title),
    title: toText(draft.title),
    message: toText(draft.message),
    is_active: draft.isActive,
    is_pinned: draft.isPinned,
    sort_order: Number(draft.sortOrder || 0),
  };

  const query = id
    ? supabase.from(TABLE_NAME).update(payload).eq('id', id)
    : supabase.from(TABLE_NAME).insert([payload]);

  const { error } = await query;
  if (error) throw new Error(error.message || 'Unable to save learner portal notification.');
}

export async function deleteLearnerPortalNotification(id: string) {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) throw new Error(error.message || 'Unable to delete learner portal notification.');
}
