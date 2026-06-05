import { supabase } from '../../../../lib/supabase';
import type { EnrollmentAnnouncement } from '../../../../../common/types/enrollmentAnnouncements';

const ANNOUNCEMENT_TABLE = 'registrar_enrollment_announcements';

type EnrollmentAnnouncementDraft = {
  announcementKey?: string;
  title: string;
  message: string;
  isActive: boolean;
  isPinned: boolean;
  isHighlighted: boolean;
  sortOrder: number;
};

const generateAnnouncementKey = (title: string) =>
  `announcement-${String(title || 'enrollment').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function fetchEnrollmentAnnouncements(): Promise<EnrollmentAnnouncement[]> {
  const { data, error } = await supabase
    .from(ANNOUNCEMENT_TABLE)
    .select('id,announcement_key,title,message,audience,is_active,is_pinned,is_highlighted,sort_order,created_at,updated_at')
    .eq('audience', 'enrollment')
    .order('is_pinned', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return ((data || []) as Array<any>).map((row) => ({
    id: String(row.id),
    announcementKey: String(row.announcement_key || ''),
    title: String(row.title || ''),
    message: String(row.message || ''),
    audience: 'enrollment',
    isActive: Boolean(row.is_active),
    isPinned: Boolean(row.is_pinned),
    isHighlighted: Boolean(row.is_highlighted),
    sortOrder: Number(row.sort_order || 0),
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  }));
}

export async function saveEnrollmentAnnouncement(
  id: string | null,
  draft: EnrollmentAnnouncementDraft,
): Promise<void> {
  const payload = {
    announcement_key: draft.announcementKey || generateAnnouncementKey(draft.title),
    title: draft.title.trim(),
    message: draft.message.trim(),
    audience: 'enrollment',
    is_active: draft.isActive,
    is_pinned: draft.isPinned,
    is_highlighted: draft.isHighlighted,
    sort_order: Number.isFinite(draft.sortOrder) ? draft.sortOrder : 0,
  };

  const query = id
    ? supabase.from(ANNOUNCEMENT_TABLE).update(payload).eq('id', id)
    : supabase.from(ANNOUNCEMENT_TABLE).insert(payload);

  const { error } = await query;
  if (error) throw error;
}

export async function deleteEnrollmentAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from(ANNOUNCEMENT_TABLE).delete().eq('id', id);
  if (error) throw error;
}
