import { supabase } from '@deped-usis/shared-supabase';
import { getCachedLearnerData, resolveLearnerCacheKey, setCachedLearnerData } from './learnerPortalCache';

export type EnrollmentHistoryItem = {
  schoolYear: string;
  gradeLevel: string;
  section: string;
  status: string;
  enrollmentDate: string;
};

export type EnrollmentSnapshot = {
  history: EnrollmentHistoryItem[];
  currentStatus: string;
};

const toText = (value: unknown) => String(value || '').trim();

const readFirst = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = toText(row[key]);
    if (value) return value;
  }
  return '';
};

const toHistoryItem = (entry: unknown): EnrollmentHistoryItem | null => {
  if (!entry || typeof entry !== 'object') return null;
  const row = entry as Record<string, unknown>;
  return {
    schoolYear: readFirst(row, ['schoolYear', 'school_year', 'academicYear', 'academic_year']),
    gradeLevel: readFirst(row, ['gradeLevel', 'grade_level']),
    section: readFirst(row, ['section', 'section_name', 'sectionName']),
    status: readFirst(row, ['status', 'enrollmentStatus', 'enrollment_status']),
    enrollmentDate: readFirst(row, ['enrollmentDate', 'enrollment_date', 'date']),
  };
};

const resolveCurrentStatus = (history: EnrollmentHistoryItem[]) => {
  if (history.length === 0) return 'No Enrollment Record';
  const latest = history[0];
  return latest.status || 'Enrolled';
};

export async function fetchEnrollmentSnapshot(input: { learnerId?: string; lrn?: string }): Promise<EnrollmentSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });
  const cached = getCachedLearnerData<EnrollmentSnapshot>('enrollment-history', cacheKey);
  if (cached) return cached;

  let query = supabase.from('registrar_learners').select('enrollment_history').limit(1);

  if (learnerId) {
    query = query.eq('id', learnerId);
  } else if (lrn) {
    query = query.eq('lrn', lrn);
  } else {
    throw new Error('Learner enrollment lookup requires learner ID or LRN.');
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message || 'Unable to load enrollment history right now.');

  const historyRaw = Array.isArray((data as any)?.enrollment_history) ? (data as any).enrollment_history : [];
  const history = historyRaw
    .map(toHistoryItem)
    .filter((item): item is EnrollmentHistoryItem => Boolean(item))
    .sort((a, b) => b.enrollmentDate.localeCompare(a.enrollmentDate));

  const snapshot = { history, currentStatus: resolveCurrentStatus(history) };
  setCachedLearnerData('enrollment-history', cacheKey, snapshot);
  return snapshot;
}

export function formatEnrollmentDate(value: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}
