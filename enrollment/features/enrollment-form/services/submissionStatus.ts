import { supabase } from '../../../lib/supabase';
import type { SubmissionStatusAccessRecord } from './submissionStatusAuth';

export type SubmissionStatusRow = {
  id: string;
  createdAt: string;
  schoolYear: string;
  gradeToEnroll: string;
  status: string;
};

const normalize = (value: unknown) => String(value ?? '').trim();

export async function fetchSubmissionStatuses(access: SubmissionStatusAccessRecord): Promise<SubmissionStatusRow[]> {
  const { data, error } = await supabase
    .from('registrar_public_enrollment_submissions')
    .select('*')
    .eq('lrn', access.lrn)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: normalize(row.id),
    createdAt: normalize(row.created_at),
    schoolYear: normalize(row.school_year) || normalize(row.payload?.schoolYear) || 'Not set',
    gradeToEnroll: normalize(row.grade_to_enroll) || normalize(row.payload?.gradeToEnroll) || 'Not set',
    status:
      normalize(row.status) ||
      normalize(row.application_status) ||
      normalize(row.payload?.status) ||
      'For review',
  }));
}
