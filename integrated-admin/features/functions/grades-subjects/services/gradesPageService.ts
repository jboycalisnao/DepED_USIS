import { supabase } from '../../../../../packages/shared-supabase/src';

export type TeacherSectionSubject = {
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  subjectCode: string;
  subjectTitle: string;
  teacherAccountId: string;
};

export type SectionLearner = {
  gender: string;
  id: string;
  name: string;
};

export type LearnerQuarterGrades = {
  quarter1: string;
  quarter2: string;
  quarter3: string;
  quarter4: string;
};

const toText = (value: unknown) => String(value || '').trim();

const toLearnerName = (row: Record<string, unknown>) => {
  const firstName = toText(row.first_name);
  const middleName = toText(row.middle_name);
  const lastName = toText(row.last_name);
  const fullName = [lastName, firstName, middleName].filter(Boolean).join(', ').replace(', ,', ',');
  return fullName || toText(row.full_name) || toText(row.name) || toText(row.learner_name) || toText(row.lrn) || 'Unknown Learner';
};

const toGender = (row: Record<string, unknown>) =>
  toText(row.sex || row.gender || row.sex_at_birth || row.profile_gender).toLowerCase();

const sortLearnersByLastName = (rows: SectionLearner[]) =>
  rows.slice().sort((a, b) => {
    const aName = toText(a.name);
    const bName = toText(b.name);
    const aLast = aName.split(',')[0]?.trim().toLowerCase() || aName.toLowerCase();
    const bLast = bName.split(',')[0]?.trim().toLowerCase() || bName.toLowerCase();
    const byLast = aLast.localeCompare(bLast);
    if (byLast !== 0) return byLast;
    return aName.localeCompare(bName);
  });

const loadLearnersForSection = async (sectionId: string, sectionName: string): Promise<SectionLearner[]> => {
  const table = 'registrar_learners';
  // Query once to avoid repeated 400 errors on environments with varying learner column names.
  const { data, error } = await supabase.from(table).select('*').limit(3000);
  if (error) {
    return [];
  }

  const normalizedSectionId = sectionId.toLowerCase();
  const normalizedSectionName = sectionName.toLowerCase();
  return sortLearnersByLastName((data || [])
    .filter((row: any) => {
      const rowSectionId = toText(row.current_section_id || row.section_id).toLowerCase();
      const rowSectionName = toText(row.section_name || row.section).toLowerCase();
      return rowSectionId === normalizedSectionId || rowSectionName === normalizedSectionName;
    })
    .map((row: any) => ({
      gender: toGender(row as Record<string, unknown>),
      id: toText(row.id) || `${toText(row.lrn)}-${toText(row.last_name)}`,
      name: toLearnerName(row as Record<string, unknown>),
    })));
};

export const loadTeacherSectionsAndSubjects = async (teacherAccountId: string): Promise<TeacherSectionSubject[]> => {
  const { data: subjectRows, error: subjectError } = await supabase
    .from('registrar_section_subjects')
    .select('section_id,subject_code,subject_title,teacher_account_id')
    .eq('teacher_account_id', teacherAccountId)
    .order('section_id', { ascending: true })
    .order('subject_code', { ascending: true });
  if (subjectError) throw new Error(subjectError.message || 'Unable to load assigned section subjects.');

  const sectionIds = Array.from(new Set((subjectRows || []).map((row: any) => toText(row.section_id)).filter(Boolean)));
  const sectionMap = new Map<string, { gradeLevel: string; sectionName: string }>();
  if (sectionIds.length > 0) {
    const { data: sectionRows } = await supabase
      .from('registrar_sections')
      .select('id,grade_level,name')
      .in('id', sectionIds);
    (sectionRows || []).forEach((row: any) => {
      sectionMap.set(toText(row.id), {
        gradeLevel: toText(row.grade_level),
        sectionName: toText(row.name),
      });
    });
  }

  return (subjectRows || []).map((row: any) => {
    const sectionId = toText(row.section_id);
    const sectionMeta = sectionMap.get(sectionId);
    return {
      gradeLevel: sectionMeta?.gradeLevel || 'Unassigned',
      sectionId,
      sectionName: sectionMeta?.sectionName || sectionId,
      subjectCode: toText(row.subject_code).toUpperCase(),
      subjectTitle: toText(row.subject_title),
      teacherAccountId: toText(row.teacher_account_id),
    };
  });
};

export const loadLearnersBySectionIds = async (sections: Array<{ sectionId: string; sectionName: string }>) => {
  const uniqueSections = Array.from(new Map(sections.map((row) => [row.sectionId, row])).values());
  const learnersBySection = new Map<string, SectionLearner[]>();
  await Promise.all(uniqueSections.map(async (section) => {
    const learners = await loadLearnersForSection(section.sectionId, section.sectionName);
    learnersBySection.set(section.sectionId, learners);
  }));
  return learnersBySection;
};

export const loadQuarterGradesMap = async (
  sectionIds: string[],
): Promise<Map<string, LearnerQuarterGrades>> => {
  if (!sectionIds.length) return new Map();
  const { data, error } = await supabase
    .from('registrar_section_subject_grades')
    .select('section_id,learner_id,subject_code,quarter_1,quarter_2,quarter_3,quarter_4')
    .in('section_id', sectionIds);

  if (error) {
    return new Map();
  }

  const map = new Map<string, LearnerQuarterGrades>();
  (data || []).forEach((row: any) => {
    const sectionId = toText(row.section_id);
    const learnerId = toText(row.learner_id);
    const subjectCode = toText(row.subject_code).toUpperCase();
    if (!sectionId || !learnerId || !subjectCode) return;
    const key = `${sectionId}::${subjectCode}::${learnerId}`;
    map.set(key, {
      quarter1: toText(row.quarter_1),
      quarter2: toText(row.quarter_2),
      quarter3: toText(row.quarter_3),
      quarter4: toText(row.quarter_4),
    });
  });
  return map;
};

export const saveQuarterGradesForSubject = async (payload: {
  sectionId: string;
  subjectCode: string;
  subjectTitle: string;
  teacherAccountId: string;
  rows: Array<{
    learnerId: string;
    quarter1: string;
    quarter2: string;
    quarter3: string;
    quarter4: string;
  }>;
}) => {
  const toNumeric = (value: string) => {
    const next = String(value || '').trim();
    if (!next) return null;
    const parsed = Number(next);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const records = payload.rows
    .map((row) => ({
      learner_id: toText(row.learnerId),
      quarter_1: toNumeric(row.quarter1),
      quarter_2: toNumeric(row.quarter2),
      quarter_3: toNumeric(row.quarter3),
      quarter_4: toNumeric(row.quarter4),
      section_id: toText(payload.sectionId),
      subject_code: toText(payload.subjectCode).toUpperCase(),
      subject_title: toText(payload.subjectTitle),
      teacher_account_id: toText(payload.teacherAccountId) || null,
    }))
    .filter((row) => Boolean(row.learner_id));

  if (!records.length) return;

  const table = 'registrar_section_subject_grades';
  const tableCheck = await supabase.from(table).select('id').limit(1);
  if (tableCheck.error && (tableCheck.error.code === '42P01' || String(tableCheck.error.message || '').toLowerCase().includes('does not exist'))) {
    throw new Error('Grades table is not deployed yet. Apply the latest IA schema for registrar_section_subject_grades.');
  }

  const fullUpsert = await supabase
    .from(table)
    .upsert(records, { onConflict: 'section_id,learner_id,subject_code' });
  if (!fullUpsert.error) return;

  // Backward-compatible fallback for schema variants that do not yet have all columns (e.g. subject_title / teacher_account_id).
  const minimalRecords = records.map((row) => ({
    learner_id: row.learner_id,
    quarter_1: row.quarter_1,
    quarter_2: row.quarter_2,
    quarter_3: row.quarter_3,
    quarter_4: row.quarter_4,
    section_id: row.section_id,
    subject_code: row.subject_code,
  }));
  const minimalUpsert = await supabase
    .from(table)
    .upsert(minimalRecords, { onConflict: 'section_id,learner_id,subject_code' });

  if (minimalUpsert.error) {
    throw new Error(minimalUpsert.error.message || fullUpsert.error.message || 'Unable to save quarter grades.');
  }
};
