import { supabase } from '../../../lib/supabase';
import { fetchEnrollmentSchoolYear } from '../../../lib/enrollmentSchoolYear';

const normalize = (value: unknown) => String(value ?? '').trim();
const PLACEHOLDER = '--';

const loadSectionNameMap = async (sectionValues: string[]) => {
  const sectionIds = Array.from(
    new Set(sectionValues.map((value) => normalize(value)).filter((value) => value && value !== PLACEHOLDER)),
  );

  if (sectionIds.length === 0) return new Map<string, string>();

  const { data } = await supabase
    .from('registrar_sections')
    .select('id,name')
    .in('id', sectionIds);

  const sectionMap = new Map<string, string>();
  for (const row of data || []) {
    const id = normalize((row as any).id);
    const name = normalize((row as any).name);
    if (id && name) sectionMap.set(id, name);
  }
  return sectionMap;
};

const resolveSectionName = (sectionValue: unknown, sectionMap: Map<string, string>) => {
  const normalized = normalize(sectionValue);
  if (!normalized || normalized === PLACEHOLDER) return PLACEHOLDER;
  return sectionMap.get(normalized) || normalized;
};

const normalizeHistoryStatus = (value: string, isCurrentLearner: boolean) => {
  const normalized = normalize(value);
  if (isCurrentLearner && normalized.toLowerCase().includes('section assigned')) return 'Enrolled';
  if (isCurrentLearner && !normalized) return 'Enrolled';
  return normalized || 'Recorded';
};

export type SubmissionLookupResult = {
  id: string;
  submissionReferenceId: string;
  lrn: string;
  fullName: string;
  submittedAt: string;
  schoolYear: string;
  gradeToEnroll: string;
  currentStatus: string;
  hasCurrentSubmission: boolean;
  currentSubmissionStatus: string;
  history: Array<{
    id: string;
    schoolYear: string;
    gradeLevel: string;
    section: string;
    status: string;
    enrollmentDate: string;
    source?: 'submission' | 'learner-history';
  }>;
};

export async function lookupSubmissionStatus(queryValue: string): Promise<SubmissionLookupResult | null> {
  const query = normalize(queryValue);
  if (!query) return null;

  const byReference = query.toUpperCase().startsWith('USIS-ENR-');
  const lookupColumn = byReference ? 'submission_reference_id' : 'lrn';

  const { data: submissionRow, error: submissionError } = await supabase
    .from('registrar_public_enrollment_submissions')
    .select('*')
    .eq(lookupColumn, query)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (submissionError) throw submissionError;
  if (!submissionRow && byReference) return null;

  const payload = submissionRow && (submissionRow as any).payload && typeof (submissionRow as any).payload === 'object'
    ? ((submissionRow as any).payload as Record<string, any>)
    : {};
  const lrn = normalize((submissionRow as any)?.lrn || payload.lrn || (!byReference ? query : ''));
  let learnerRow: any = null;
  let activeSchoolYear = '';
  let hasCurrentSubmission = false;
  let currentSubmissionStatus = '';
  let currentSubmissionHistoryRow: SubmissionLookupResult['history'][number] | null = null;

  const activeSchoolYearResult = await fetchEnrollmentSchoolYear();
  activeSchoolYear = normalize(activeSchoolYearResult.label);
  const submissionSchoolYear = normalize((submissionRow as any)?.school_year || payload.schoolYear);

  if (submissionRow && activeSchoolYear && submissionSchoolYear === activeSchoolYear) {
    const currentAssignedSectionId = normalize(payload.assignedSectionId);
    const currentAssignedSectionName = normalize(payload.assignedSectionName);
    const currentAssignedSection = currentAssignedSectionName || currentAssignedSectionId;
    const currentGradeLevel = normalize((submissionRow as any)?.grade_to_enroll || payload.gradeToEnroll) || '--';
    const currentStatusLabel = currentAssignedSection ? 'Enrolled' : normalize(payload.status || (submissionRow as any)?.status || 'Submission Received') || 'Submission Received';
    currentSubmissionHistoryRow = {
      id: normalize((submissionRow as any)?.id) || `current-submission-${lrn}`,
      schoolYear: submissionSchoolYear || activeSchoolYear,
      gradeLevel: currentGradeLevel,
      section: currentAssignedSection || '--',
      status: currentStatusLabel,
      enrollmentDate: normalize((submissionRow as any)?.created_at) || new Date().toISOString(),
      source: 'submission',
    };
    hasCurrentSubmission = true;
    currentSubmissionStatus = currentStatusLabel;
  }

  let history: SubmissionLookupResult['history'] = [];
  if (lrn) {
    const { data: learnerRowData } = await supabase
      .from('registrar_learners')
      .select('id,school_id,enrollment_history')
      .eq('lrn', lrn)
      .maybeSingle();
    learnerRow = learnerRowData || null;
    const learnerId = normalize((learnerRow as any)?.id);

    if (learnerId) {
      const { data: historyRows, error: historyError } = await supabase
        .from('registrar_enrollment_history')
        .select('id,school_year,grade_level,section,status,enrollment_date,created_at')
        .eq('learner_id', learnerId)
        .order('enrollment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (historyError) throw historyError;
      const sectionNameMap = await loadSectionNameMap([
        currentSubmissionHistoryRow?.section || '',
        ...(historyRows || []).map((row: any) => row.section),
      ]);
      if (currentSubmissionHistoryRow) {
        currentSubmissionHistoryRow = {
          ...currentSubmissionHistoryRow,
          section: resolveSectionName(currentSubmissionHistoryRow.section, sectionNameMap),
        };
      }
      const canonicalHistory = (historyRows || []).map((row: any) => ({
        id: normalize(row.id),
        schoolYear: normalize(row.school_year) || '--',
        gradeLevel: normalize(row.grade_level) || '--',
        section: resolveSectionName(row.section, sectionNameMap),
        status:
          normalize(row.school_year) && activeSchoolYear && normalize(row.school_year) !== activeSchoolYear
            ? 'Previously Enrolled'
            : normalizeHistoryStatus(String(row.status || ''), true),
        enrollmentDate: normalize(row.enrollment_date || row.created_at),
        source: 'learner-history' as const,
      }));
      const filteredCanonicalHistory = currentSubmissionHistoryRow
        ? canonicalHistory.filter((row) => normalize(row.schoolYear) !== normalize(activeSchoolYear))
        : canonicalHistory;
      history = currentSubmissionHistoryRow
        ? [currentSubmissionHistoryRow, ...filteredCanonicalHistory]
        : filteredCanonicalHistory;
    } else {
      if (currentSubmissionHistoryRow) {
        const sectionNameMap = await loadSectionNameMap([currentSubmissionHistoryRow.section]);
        currentSubmissionHistoryRow = {
          ...currentSubmissionHistoryRow,
          section: resolveSectionName(currentSubmissionHistoryRow.section, sectionNameMap),
        };
      }
      history = currentSubmissionHistoryRow ? [currentSubmissionHistoryRow] : [];
    }
  }

  const hasPriorGrade12History = history.some((row) => /grade\s*12\b/i.test(String(row.gradeLevel || '').trim()));
  const currentSubmissionAssignedSection = normalize(payload.assignedSectionId || payload.assignedSectionName);
  const derivedCurrentStatus = currentSubmissionAssignedSection
    ? 'Enrolled'
    : hasCurrentSubmission
      ? 'Pending'
      : history.length > 0
        ? (hasPriorGrade12History ? 'Graduated' : 'Previous Learner')
        : 'Pending';

  // For LRN lookups, allow status page to show previous records
  // even if there is no public submission row yet.
  if (!submissionRow && !byReference) {
    const { data: learnerFallbackRow, error: learnerFallbackError } = await supabase
      .from('registrar_learners')
      .select('first_name,last_name,middle_name')
      .eq('lrn', lrn)
      .maybeSingle();
    if (learnerFallbackError) throw learnerFallbackError;
    if (!learnerFallbackRow && history.length === 0) return null;

    return {
      id: `learner-${lrn}`,
      submissionReferenceId: '--',
      lrn,
      fullName: learnerFallbackRow
        ? [normalize((learnerFallbackRow as any).last_name), normalize((learnerFallbackRow as any).first_name), normalize((learnerFallbackRow as any).middle_name)].filter(Boolean).join(', ') || '--'
        : '--',
      submittedAt: '',
      schoolYear: '--',
      gradeToEnroll: '--',
      currentStatus: derivedCurrentStatus,
      hasCurrentSubmission,
      currentSubmissionStatus,
      history,
    };
  }

  if (!submissionRow) return null;

  return {
    id: normalize((submissionRow as any)?.id),
    submissionReferenceId: normalize((submissionRow as any)?.submission_reference_id),
    lrn,
    fullName: [normalize((submissionRow as any)?.last_name), normalize((submissionRow as any)?.first_name), normalize((submissionRow as any)?.middle_name)].filter(Boolean).join(', ') || '--',
    submittedAt: normalize((submissionRow as any)?.created_at),
    schoolYear: normalize((submissionRow as any)?.school_year || payload.schoolYear) || '--',
    gradeToEnroll: normalize((submissionRow as any)?.grade_to_enroll || payload.gradeToEnroll) || '--',
    currentStatus: derivedCurrentStatus,
    hasCurrentSubmission,
    currentSubmissionStatus,
    history,
  };
}

export async function lookupSubmissionStatusByIdentity(firstName: string, lastName: string, birthDate: string): Promise<SubmissionLookupResult | null> {
  const normalizedFirstName = normalize(firstName);
  const normalizedLastName = normalize(lastName);
  const normalizedBirthDate = normalize(birthDate);

  if (!normalizedFirstName || !normalizedLastName || !normalizedBirthDate) return null;

  const { data, error } = await supabase
    .from('registrar_public_enrollment_submissions')
    .select('submission_reference_id,lrn,first_name,last_name,payload,created_at')
    .ilike('first_name', normalizedFirstName)
    .ilike('last_name', normalizedLastName)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  const matchedRow = (data || []).find((row: any) => {
    const rowBirthDate = normalize((row?.payload && typeof row.payload === 'object' ? row.payload.birthDate || row.payload.birth_date : '') || row.birth_date);
    return rowBirthDate === normalizedBirthDate;
  }) as any | undefined;

  if (!matchedRow) return null;

  const submissionReferenceId = normalize(matchedRow.submission_reference_id);
  if (submissionReferenceId) {
    return lookupSubmissionStatus(submissionReferenceId);
  }

  const lrn = normalize(matchedRow.lrn);
  if (lrn) {
    return lookupSubmissionStatus(lrn);
  }

  return null;
}
