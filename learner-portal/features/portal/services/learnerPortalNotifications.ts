import { supabase } from '@deped-usis/shared-supabase';

const TABLE_NAME = 'ia_learner_portal_notifications';

const toText = (value: unknown) => String(value || '').trim();

export type LearnerPortalNotificationRecord = {
  id: string;
  notificationKey: string;
  title: string;
  message: string;
  isActive: boolean;
  isPinned: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

const mapRow = (row: any): LearnerPortalNotificationRecord => ({
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

export async function loadLearnerPortalNotifications() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,notification_key,title,message,is_active,is_pinned,sort_order,created_at,updated_at')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Unable to load learner portal notifications.');
  return (data || []).map(mapRow);
}
