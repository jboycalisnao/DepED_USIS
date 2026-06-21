import { supabase } from '../../../../lib/supabase';
import { Student } from '../../../../types';

export type EnrollmentHistoryItem = {
  id: string;
  isCurrent: boolean;
  source: 'current' | 'registrar_history' | 'embedded_history';
  schoolYear: string;
  gradeLevel: string;
  section: string;
  status: string;
  enrollmentDate: string;
};

export type EnrollmentHistorySnapshot = {
  history: EnrollmentHistoryItem[];
  currentEnrollment: EnrollmentHistoryItem | null;
  currentStatus: string;
};

const toText = (value: unknown) => String(value || '').trim();

const normalizeSchoolYear = (value: string) => {
  const raw = toText(value);
  if (!raw) return '';
  const normalized = raw.replace(/^sy\s*/i, '').replace(/\s+/g, ' ');
  const match = normalized.match(/(20\d{2})\s*-\s*(20\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return normalized.toLowerCase();
};

const parseDate = (value: unknown) => {
  const text = toText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;
  const fallback = new Date(`${text}T00:00:00`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

const formatDateIso = (value: unknown) => {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : toText(value);
};

const readFirst = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = toText(row[key]);
    if (value) return value;
  }
  return '';
};

const makeHistoryId = (entry: Partial<EnrollmentHistoryItem> & { source?: string }) =>
  [
    entry.source || 'history',
    entry.schoolYear || '',
    entry.gradeLevel || '',
    entry.section || '',
    entry.enrollmentDate || '',
    entry.status || '',
  ].join('|');

const toHistoryItem = (entry: unknown, source: EnrollmentHistoryItem['source']): EnrollmentHistoryItem | null => {
  if (!entry || typeof entry !== 'object') return null;
  const row = entry as Record<string, unknown>;
  const schoolYear = readFirst(row, ['schoolYear', 'school_year', 'academicYear', 'academic_year']);
  const gradeLevel = readFirst(row, ['gradeLevel', 'grade_level']);
  const section = readFirst(row, ['section', 'section_name', 'sectionName']);
  const status = readFirst(row, ['status', 'enrollmentStatus', 'enrollment_status']);
  const enrollmentDate = formatDateIso(readFirst(row, ['enrollmentDate', 'enrollment_date', 'date', 'created_at']));
  return {
    id: toText(row.id) || makeHistoryId({ source, schoolYear, gradeLevel, section, enrollmentDate, status }),
    isCurrent: source === 'current',
    source,
    schoolYear: readFirst(row, ['schoolYear', 'school_year', 'academicYear', 'academic_year']),
    gradeLevel,
    section,
    status,
    enrollmentDate,
  };
};

const resolveCurrentStatus = (currentEnrollment: EnrollmentHistoryItem | null, history: EnrollmentHistoryItem[]) => {
  if (currentEnrollment?.status) return currentEnrollment.status;
  if (history.length === 0) return 'No Enrollment Record';
  const latest = history[0];
  return latest.status || 'Enrolled';
};

export async function fetchLearnerEnrollmentSnapshot(
  learner: Student,
  fallbackSchoolYearLabel = '',
): Promise<EnrollmentHistorySnapshot> {
  const learnerId = toText(learner.id);
  const lrn = toText(learner.lrn);
  if (!learnerId && !lrn) {
    return { history: [], currentEnrollment: null, currentStatus: 'No Enrollment Record' };
  }

  let query = supabase
    .from('registrar_learners')
    .select('id,lrn,status,section_id,school_year,enrollment_history')
    .limit(1);

  if (learnerId) {
    query = query.eq('id', learnerId);
  } else if (lrn) {
    query = query.eq('lrn', lrn);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw new Error(error.message || 'Unable to load enrollment history right now.');

  const learnerRow = (data as any) || {};
  const learnerSectionId = toText(learnerRow.section_id);
  const learnerSchoolYear = toText(learnerRow.school_year) || toText(fallbackSchoolYearLabel);

  const sectionResult = learnerSectionId
    ? await supabase
        .from('registrar_sections')
        .select('id,name,grade_level,school_year_id')
        .eq('id', learnerSectionId)
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  const historyTableResult = learnerRow.id
    ? await supabase
        .from('registrar_enrollment_history')
        .select('id,school_year,grade_level,section,status,enrollment_date,created_at')
        .eq('learner_id', String(learnerRow.id))
        .order('enrollment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
    : { data: [], error: null };

  if (historyTableResult.error) {
    throw new Error((historyTableResult.error as any)?.message || 'Unable to load enrollment history right now.');
  }

  const embeddedHistory = Array.isArray(learnerRow.enrollment_history) ? learnerRow.enrollment_history : [];
  const historyFromTable = (historyTableResult.data || [])
    .map((entry: any) => toHistoryItem(entry, 'registrar_history'))
    .filter((item): item is EnrollmentHistoryItem => Boolean(item));
  const historyFromEmbedded = embeddedHistory
    .map((entry: any) => toHistoryItem(entry, 'embedded_history'))
    .filter((item): item is EnrollmentHistoryItem => Boolean(item));

  const currentHistoryKey = normalizeSchoolYear(learnerSchoolYear);
  const matchingCurrentHistory = currentHistoryKey
    ? [...historyFromTable, ...historyFromEmbedded].find((item) => normalizeSchoolYear(item.schoolYear) === currentHistoryKey) || null
    : null;

  const sectionRow = (sectionResult as any).data || null;
  const currentEnrollment: EnrollmentHistoryItem | null = matchingCurrentHistory
    ? {
        ...matchingCurrentHistory,
        isCurrent: true,
        source: 'current',
      }
    : learnerRow.id
      ? {
          id: `current:${String(learnerRow.id)}`,
          isCurrent: true,
          source: 'current',
          schoolYear: learnerSchoolYear || fallbackSchoolYearLabel,
          gradeLevel: toText(sectionRow?.grade_level),
          section: toText(sectionRow?.name),
          status: toText(learnerRow.status) || 'Enrolled',
          enrollmentDate: formatDateIso(new Date().toISOString()),
        }
      : null;

  const historyCandidates = [...historyFromTable, ...historyFromEmbedded].filter((item) => {
    if (!currentEnrollment) return true;
    const sameId = item.id && item.id === currentEnrollment.id;
    const sameKey =
      normalizeSchoolYear(item.schoolYear) === normalizeSchoolYear(currentEnrollment.schoolYear) &&
      toText(item.gradeLevel) === toText(currentEnrollment.gradeLevel) &&
      toText(item.section) === toText(currentEnrollment.section) &&
      toText(item.status) === toText(currentEnrollment.status) &&
      toText(item.enrollmentDate) === toText(currentEnrollment.enrollmentDate);
    return !sameId && !sameKey;
  });

  const dedupedHistory = new Map<string, EnrollmentHistoryItem>();
  for (const item of historyCandidates) {
    const key = [
      normalizeSchoolYear(item.schoolYear),
      toText(item.gradeLevel),
      toText(item.section),
      toText(item.status),
      toText(item.enrollmentDate),
    ].join('|');
    if (!dedupedHistory.has(key)) {
      dedupedHistory.set(key, item);
    }
  }

  const history = [...dedupedHistory.values()].sort((a, b) => {
    const dateA = parseDate(a.enrollmentDate)?.getTime() || 0;
    const dateB = parseDate(b.enrollmentDate)?.getTime() || 0;
    return dateB - dateA;
  });

  return {
    history,
    currentEnrollment,
    currentStatus: resolveCurrentStatus(currentEnrollment, history),
  };
}
