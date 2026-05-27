import { supabase } from '../../../../../../packages/shared-supabase/src';

export type SubjectType = 'core' | 'elective';
export type ProgramScope = 'regular' | 'special_program_ste' | 'senior_high_school';

export type SubjectManagementRecord = {
  departmentId: string;
  gradeLevel: string;
  id: string;
  isActive: boolean;
  programScope: ProgramScope;
  strand: string;
  subjectCode: string;
  subjectTitle: string;
  subjectType: SubjectType;
};

export type SaveSubjectManagementInput = {
  departmentId: string;
  gradeLevel: string;
  id?: string;
  isActive?: boolean;
  programScope: ProgramScope;
  strand?: string;
  subjectCode: string;
  subjectTitle: string;
  subjectType: SubjectType;
};

const toText = (value: unknown) => String(value || '').trim();
const toUpper = (value: unknown) => toText(value).toUpperCase();

const normalizeScope = (value: string): ProgramScope => {
  if (value === 'special_program_ste') return 'special_program_ste';
  if (value === 'senior_high_school') return 'senior_high_school';
  return 'regular';
};

const normalizeType = (value: string): SubjectType => (value === 'elective' ? 'elective' : 'core');

const hasRequiredShsStrand = (programScope: ProgramScope, strand: string) =>
  programScope !== 'senior_high_school' || Boolean(toText(strand));

export const loadSubjectManagementRecords = async (): Promise<SubjectManagementRecord[]> => {
  const { data, error } = await supabase
    .from('registrar_subject_management')
    .select('id,department_id,grade_level,program_scope,strand,subject_code,subject_title,subject_type,is_active')
    .order('grade_level', { ascending: true })
    .order('program_scope', { ascending: true })
    .order('strand', { ascending: true })
    .order('subject_code', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to load subject management records.');
  }

  return (data || []).map((row: any) => ({
    departmentId: toText(row.department_id),
    gradeLevel: toText(row.grade_level),
    id: toText(row.id),
    isActive: Boolean(row.is_active),
    programScope: normalizeScope(toText(row.program_scope)),
    strand: toText(row.strand),
    subjectCode: toUpper(row.subject_code),
    subjectTitle: toText(row.subject_title),
    subjectType: normalizeType(toText(row.subject_type)),
  }));
};

export const loadCoordinatorDepartmentOptions = async (): Promise<Array<{ label: string; value: string }>> => {
  const { data, error } = await supabase
    .from('coordinator_departments')
    .select('id,name,is_active')
    .eq('is_active', true)
    .order('name', { ascending: true });
  if (error) return [];
  return (data || [])
    .map((row: any) => ({
      label: toText(row.name),
      value: toText(row.id),
    }))
    .filter((row) => Boolean(row.value));
};

export const loadShsStrands = async (): Promise<Array<{ label: string; value: string }>> => {
  const { data, error } = await supabase
    .from('registrar_strands')
    .select('acronym,full_name')
    .order('acronym', { ascending: true });
  if (error) return [];
  return (data || [])
    .map((row: any) => {
      const acronym = toText(row.acronym);
      const fullName = toText(row.full_name);
      return {
        label: fullName ? `${acronym} - ${fullName}` : acronym,
        value: acronym,
      };
    })
    .filter((row) => Boolean(row.value));
};

export const saveSubjectManagementRecord = async (payload: SaveSubjectManagementInput) => {
  const programScope = normalizeScope(payload.programScope);
  const gradeLevel = toText(payload.gradeLevel);
  const departmentId = toText(payload.departmentId);
  const subjectCode = toUpper(payload.subjectCode);
  const subjectTitle = toText(payload.subjectTitle);
  const subjectType = normalizeType(payload.subjectType);
  const strand = programScope === 'senior_high_school' ? toText(payload.strand) : '';

  if (!gradeLevel) throw new Error('Grade level is required.');
  if (!departmentId) throw new Error('Department is required.');
  if (!subjectCode) throw new Error('Subject code is required.');
  if (!subjectTitle) throw new Error('Subject title is required.');
  if (!hasRequiredShsStrand(programScope, strand)) throw new Error('Strand is required for SHS subjects.');

  const record = {
    department_id: departmentId,
    grade_level: gradeLevel,
    is_active: payload.isActive ?? true,
    program_scope: programScope,
    strand: strand || null,
    subject_code: subjectCode,
    subject_title: subjectTitle,
    subject_type: subjectType,
  };

  if (payload.id) {
    const { error } = await supabase.from('registrar_subject_management').update(record).eq('id', payload.id);
    if (error) throw new Error(error.message || 'Unable to update subject.');
    return payload.id;
  }

  const { data, error } = await supabase.from('registrar_subject_management').insert([record]).select('id').single();
  if (error || !data?.id) throw new Error(error?.message || 'Unable to create subject.');
  return String(data.id);
};

export const deleteSubjectManagementRecord = async (id: string) => {
  const { error } = await supabase.from('registrar_subject_management').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Unable to delete subject.');
};
