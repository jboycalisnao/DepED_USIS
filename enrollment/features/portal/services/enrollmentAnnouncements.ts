import { supabase } from '../../../lib/supabase';
import type { EnrollmentAnnouncement } from '../../../../common/types/enrollmentAnnouncements';

const ANNOUNCEMENT_TABLE = 'registrar_enrollment_announcements';

export async function fetchEnrollmentAnnouncements(): Promise<EnrollmentAnnouncement[]> {
  const { data, error } = await supabase
    .from(ANNOUNCEMENT_TABLE)
    .select('id,announcement_key,title,message,audience,is_active,is_pinned,is_highlighted,sort_order,created_at,updated_at')
    .eq('audience', 'enrollment')
    .eq('is_active', true)
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

export async function fetchInformationVerificationAndUpdateEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from('registrar_enrollment_form_schedule')
    .select('information_verification_and_update_enabled')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  return Boolean((data as any)?.information_verification_and_update_enabled);
}
