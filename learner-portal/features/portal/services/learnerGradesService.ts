import { supabase } from '@deped-usis/shared-supabase';
import { getCachedLearnerData, resolveLearnerCacheKey, setCachedLearnerData } from './learnerPortalCache';

type QuarterGrades = {
  firstQuarter: string;
  fourthQuarter: string;
  secondQuarter: string;
  thirdQuarter: string;
};

export type LearnerGradeRow = {
  firstQuarter: string;
  fourthQuarter: string;
  secondQuarter: string;
  subjectCode: string;
  subjectTitle: string;
  subjectType: string;
  thirdQuarter: string;
};

export type LearnerGradesSnapshot = {
  gradeLevel: string;
  rows: LearnerGradeRow[];
  sectionName: string;
};

const toText = (value: unknown) => String(value || '').trim();

const readFirst = (row: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = toText(row[key]);
    if (value) return value;
  }
  return '';
};

const emptyQuarterGrades: QuarterGrades = {
  firstQuarter: '--',
  fourthQuarter: '--',
  secondQuarter: '--',
  thirdQuarter: '--',
};

const parseQuarterGrades = (row: Record<string, unknown>): QuarterGrades => ({
  firstQuarter: readFirst(row, ['first_quarter', 'firstQuarter', 'q1', 'quarter_1']) || '--',
  fourthQuarter: readFirst(row, ['fourth_quarter', 'fourthQuarter', 'q4', 'quarter_4']) || '--',
  secondQuarter: readFirst(row, ['second_quarter', 'secondQuarter', 'q2', 'quarter_2']) || '--',
  thirdQuarter: readFirst(row, ['third_quarter', 'thirdQuarter', 'q3', 'quarter_3']) || '--',
});

const resolveCurrentEnrollmentContext = (learner: Record<string, unknown>) => {
  const directSectionId = readFirst(learner, ['current_section_id', 'currentSectionId', 'section_id', 'sectionId']);
  const directGradeLevel = readFirst(learner, ['current_grade_level', 'currentGradeLevel', 'grade_level', 'gradeLevel']);
  const directSectionName = readFirst(learner, ['current_section_name', 'currentSectionName', 'section_name', 'sectionName', 'section']);
  if (directSectionId || directSectionName) {
    return { gradeLevel: directGradeLevel, sectionId: directSectionId, sectionName: directSectionName };
  }

  const historyRaw = Array.isArray(learner.enrollment_history) ? learner.enrollment_history : [];
  const latest = historyRaw
    .filter((item) => item && typeof item === 'object')
    .map((item) => item as Record<string, unknown>)
    .sort((a, b) => {
      const leftDate = readFirst(a, ['enrollmentDate', 'enrollment_date', 'date']);
      const rightDate = readFirst(b, ['enrollmentDate', 'enrollment_date', 'date']);
      return rightDate.localeCompare(leftDate);
    })[0];

  return {
    gradeLevel: latest ? readFirst(latest, ['gradeLevel', 'grade_level']) : '',
    sectionId: '',
    sectionName: latest ? readFirst(latest, ['section', 'section_name', 'sectionName']) : '',
  };
};

const resolveSectionId = async (input: { gradeLevel: string; sectionId: string; sectionName: string }) => {
  if (input.sectionId) return input.sectionId;
  if (!input.sectionName) return '';

  let query = supabase
    .from('registrar_sections')
    .select('id,name,grade_level')
    .eq('name', input.sectionName)
    .limit(1);
  if (input.gradeLevel) query = query.eq('grade_level', input.gradeLevel);

  const { data } = await query.maybeSingle();
  return toText((data as any)?.id);
};

const loadPublishedQuarterGradeMap = async (learnerId: string, lrn: string) => {
  const tableCandidates = [
    'registrar_learner_subject_grades',
    'registrar_subject_grades',
    'registrar_grades',
  ];
  const map = new Map<string, QuarterGrades>();

  for (const table of tableCandidates) {
    let query = supabase.from(table).select('*').limit(500);
    if (learnerId) query = query.eq('learner_id', learnerId);
    if (!learnerId && lrn) query = query.eq('learner_lrn', lrn);

    const { data, error } = await query;
    if (error) {
      const msg = toText(error.message).toLowerCase();
      if (error.code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) continue;
      continue;
    }

    (data || []).forEach((entry: any) => {
      const row = entry as Record<string, unknown>;
      const subjectCode = readFirst(row, ['subject_code', 'subjectCode']).toUpperCase();
      if (!subjectCode) return;
      map.set(subjectCode, parseQuarterGrades(row));
    });
    break;
  }

  return map;
};

export async function fetchLearnerGradesSnapshot(input: { learnerId?: string; lrn?: string }): Promise<LearnerGradesSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });
  const cached = getCachedLearnerData<LearnerGradesSnapshot>('learner-grades', cacheKey);
  if (cached && cached.gradeLevel && cached.sectionName) return cached;

  let learnerQuery = supabase
    .from('registrar_learners')
    .select('*')
    .limit(1);
  if (learnerId) learnerQuery = learnerQuery.eq('id', learnerId);
  else if (lrn) learnerQuery = learnerQuery.eq('lrn', lrn);
  else throw new Error('Learner grades lookup requires learner ID or LRN.');

  const { data: learnerData, error: learnerError } = await learnerQuery.maybeSingle();
  if (learnerError) throw new Error(learnerError.message || 'Unable to load learner record.');
  if (!learnerData) return { gradeLevel: '', rows: [], sectionName: '' };

  const context = resolveCurrentEnrollmentContext(learnerData as Record<string, unknown>);
  const sectionId = await resolveSectionId(context);
  if (!sectionId) return { gradeLevel: context.gradeLevel, rows: [], sectionName: context.sectionName };

  const { data: sectionMeta } = await supabase
    .from('registrar_sections')
    .select('*')
    .eq('id', sectionId)
    .limit(1)
    .maybeSingle();
  let resolvedSectionName = context.sectionName || readFirst((sectionMeta as any) || {}, ['name', 'section_name', 'sectionName']);
  let resolvedGradeLevel = context.gradeLevel || readFirst((sectionMeta as any) || {}, ['grade_level', 'gradeLevel']);

  const [subjectsResult, gradeMap] = await Promise.all([
    supabase
      .from('registrar_section_subjects')
      .select('subject_code,subject_title,is_core')
      .eq('section_id', sectionId)
      .order('subject_code', { ascending: true }),
    loadPublishedQuarterGradeMap(toText((learnerData as any).id), toText((learnerData as any).lrn)),
  ]);

  if (subjectsResult.error) throw new Error(subjectsResult.error.message || 'Unable to load section subjects.');

  if (!resolvedSectionName || !resolvedGradeLevel) {
    const { data: scheduleMeta } = await supabase
      .from('registrar_section_subject_schedules')
      .select('section_name')
      .eq('section_id', sectionId)
      .limit(1)
      .maybeSingle();
    if (!resolvedSectionName) {
      resolvedSectionName = readFirst((scheduleMeta as any) || {}, ['section_name', 'sectionName']);
    }
  }

  if (!resolvedGradeLevel && resolvedSectionName) {
    const { data: sectionByName } = await supabase
      .from('registrar_sections')
      .select('*')
      .eq('name', resolvedSectionName)
      .limit(1)
      .maybeSingle();
    resolvedGradeLevel = readFirst((sectionByName as any) || {}, ['grade_level', 'gradeLevel']);
  }

  const rows: LearnerGradeRow[] = (subjectsResult.data || []).map((row: any) => {
    const subjectCode = toText(row.subject_code).toUpperCase();
    const quarter = gradeMap.get(subjectCode) || emptyQuarterGrades;
    return {
      firstQuarter: quarter.firstQuarter,
      fourthQuarter: quarter.fourthQuarter,
      secondQuarter: quarter.secondQuarter,
      subjectCode,
      subjectTitle: toText(row.subject_title),
      subjectType: row.is_core ? 'Core' : 'Elective',
      thirdQuarter: quarter.thirdQuarter,
    };
  });

  const snapshot: LearnerGradesSnapshot = {
    gradeLevel: resolvedGradeLevel,
    rows,
    sectionName: resolvedSectionName,
  };
  setCachedLearnerData('learner-grades', cacheKey, snapshot);
  return snapshot;
}
