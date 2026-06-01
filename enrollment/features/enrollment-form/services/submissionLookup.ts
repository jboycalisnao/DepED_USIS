import { supabase } from '../../../lib/supabase';

const normalize = (value: unknown) => String(value ?? '').trim();

export type SubmissionLookupResult = {
  id: string;
  submissionReferenceId: string;
  lrn: string;
  fullName: string;
  submittedAt: string;
  schoolYear: string;
  gradeToEnroll: string;
  currentStatus: string;
  history: Array<{
    id: string;
    schoolYear: string;
    gradeLevel: string;
    section: string;
    status: string;
    enrollmentDate: string;
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

  let history: SubmissionLookupResult['history'] = [];
  if (lrn) {
    // Pull all submissions for this learner across all school years (no active-year filter).
    let allSubmissionRows: any[] = [];
    const { data: allRowsByLrn, error: allRowsByLrnError } = await supabase
      .from('registrar_public_enrollment_submissions')
      .select('id,created_at,school_year,grade_to_enroll,lrn,payload')
      .eq('lrn', lrn)
      .order('created_at', { ascending: false });
    if (allRowsByLrnError) throw allRowsByLrnError;
    allSubmissionRows = allRowsByLrn || [];

    // Fallback for older rows where lrn column is empty but payload.lrn exists.
    const { data: allRowsByPayloadLrn, error: allRowsByPayloadLrnError } = await supabase
      .from('registrar_public_enrollment_submissions')
      .select('id,created_at,school_year,grade_to_enroll,lrn,payload')
      .filter('payload->>lrn', 'eq', lrn)
      .order('created_at', { ascending: false });
    if (!allRowsByPayloadLrnError && allRowsByPayloadLrn?.length) {
      const seen = new Set(allSubmissionRows.map((row) => normalize(row.id)));
      for (const row of allRowsByPayloadLrn) {
        const id = normalize((row as any).id);
        if (!id || seen.has(id)) continue;
        allSubmissionRows.push(row);
        seen.add(id);
      }
    }

    const { data: learnerRow } = await supabase
      .from('registrar_learners')
      .select('id,school_id,section_id,enrollment_history')
      .eq('lrn', lrn)
      .maybeSingle();
    const learnerId = normalize((learnerRow as any)?.id);
    const legacyHistory = Array.isArray((learnerRow as any)?.enrollment_history)
      ? ((learnerRow as any).enrollment_history as Array<any>)
      : [];

    const legacyMapped: SubmissionLookupResult['history'] = legacyHistory
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry, index) => ({
        id: normalize(entry.id) || `legacy-${index}`,
        schoolYear: normalize(entry.schoolYear) || '--',
        gradeLevel: normalize(entry.gradeLevel) || '--',
        section: normalize(entry.section) || '--',
        status: normalize(entry.status) || 'Recorded',
        enrollmentDate: normalize(entry.enrollmentDate || entry.created_at),
      }));

    const submissionMapped: SubmissionLookupResult['history'] = (allSubmissionRows || []).map((row: any, index) => {
      const rowPayload = row?.payload && typeof row.payload === 'object' ? (row.payload as Record<string, any>) : {};
      return {
        id: normalize(row.id) || `submission-${index}`,
        schoolYear: normalize(row.school_year || rowPayload.schoolYear) || '--',
        gradeLevel: normalize(row.grade_to_enroll || rowPayload.gradeToEnroll) || '--',
        section: normalize(rowPayload.assignedSectionName) || '--',
        status: normalize(rowPayload.status) || 'Submission Received',
        enrollmentDate: normalize(row.created_at),
      };
    });

    if (learnerId) {
      const { data: historyRows, error: historyError } = await supabase
        .from('registrar_enrollment_history')
        .select('id,school_year,grade_level,section,status,enrollment_date,created_at')
        .eq('learner_id', learnerId)
        .order('enrollment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (historyError) throw historyError;
      const normalizedRows: SubmissionLookupResult['history'] = (historyRows || []).map((row: any) => ({
        id: normalize(row.id),
        schoolYear: normalize(row.school_year) || '--',
        gradeLevel: normalize(row.grade_level) || '--',
        section: normalize(row.section) || '--',
        status: normalize(row.status) || 'Recorded',
        enrollmentDate: normalize(row.enrollment_date || row.created_at),
      }));
      const dedupe = new Map<string, SubmissionLookupResult['history'][number]>();
      for (const row of [...normalizedRows, ...legacyMapped, ...submissionMapped]) {
        const key = `${row.schoolYear}|${row.gradeLevel}|${row.section}|${row.enrollmentDate}`;
        if (!dedupe.has(key)) dedupe.set(key, row);
      }

      const currentSectionId = normalize((learnerRow as any)?.section_id);
      if (currentSectionId) {
        const { data: sectionRow } = await supabase
          .from('registrar_sections')
          .select('name,grade_level')
          .eq('id', currentSectionId)
          .maybeSingle();
        const sectionName = normalize((sectionRow as any)?.name) || '--';
        const sectionGradeLevel = normalize((sectionRow as any)?.grade_level) || '--';
        const learnerSchoolId = normalize((learnerRow as any)?.school_id) || '--';
        const fallbackDate =
          normalize((submissionRow as any)?.created_at) ||
          normalize(submissionMapped[0]?.enrollmentDate) ||
          normalize(normalizedRows[0]?.enrollmentDate) ||
          normalize(legacyMapped[0]?.enrollmentDate) ||
          new Date().toISOString();
        const currentSchoolYear =
          normalize((submissionRow as any)?.school_year || payload.schoolYear) ||
          normalize(submissionMapped[0]?.schoolYear) ||
          normalize(normalizedRows[0]?.schoolYear) ||
          normalize(legacyMapped[0]?.schoolYear) ||
          '--';
        const currentRow = {
          id: `learner-current-${learnerId}`,
          schoolYear: currentSchoolYear,
          gradeLevel: sectionGradeLevel,
          section: sectionName,
          status: `Enrolled (Learner Record - School ${learnerSchoolId})`,
          enrollmentDate: fallbackDate,
        };
        const key = `${currentRow.schoolYear}|${currentRow.gradeLevel}|${currentRow.section}|${currentRow.enrollmentDate}`;
        if (!dedupe.has(key)) dedupe.set(key, currentRow);
      }

      history = Array.from(dedupe.values()).sort(
        (a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime(),
      );
    } else {
      history = [...legacyMapped, ...submissionMapped].sort(
        (a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime(),
      );
    }
  }

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
      currentStatus: history.length ? 'Previously Enrolled' : 'For review',
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
    currentStatus:
      normalize((submissionRow as any)?.status) ||
      normalize((submissionRow as any)?.application_status) ||
      normalize(payload.status) ||
      'For review',
    history,
  };
}
