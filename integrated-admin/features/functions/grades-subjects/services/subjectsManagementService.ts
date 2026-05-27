import { supabase } from '../../../../../packages/shared-supabase/src';
import { loadActiveSectionsDirectory } from '../../coordinator/learner-credentials/services/learnerBasedCredentialService';

export type SectionTrack = 'regular' | 'special_program_ste' | 'senior_high_school';

export type ManagedSection = {
  adviserName: string;
  gradeLevel: string;
  id: string;
  name: string;
  specialProgram: string;
  strand: string;
  subjectCount: number;
  subjects: SectionSubjectRecord[];
  track: SectionTrack;
};

export type SectionSubjectRecord = {
  departmentId: string;
  id: string;
  isCore: boolean;
  programScope: string;
  sectionId: string;
  subjectCode: string;
  subjectTitle: string;
  teacherAccountId: string;
  teacherName: string;
};

export type SubjectCatalogRecord = {
  departmentId: string;
  gradeLevel: string;
  id: string;
  isActive: boolean;
  programScope: SectionTrack;
  strand: string;
  subjectCode: string;
  subjectTitle: string;
  subjectType: 'core' | 'elective';
};

export type CoordinatorTeacherOption = {
  departmentId: string;
  departmentName: string;
  label: string;
  personnelType: string;
  value: string;
};

export type SectionSubjectScheduleRecord = {
  dayOfWeek: string;
  endTime: string;
  id: string;
  isActive: boolean;
  presetId: string;
  room: string;
  sectionId: string;
  sectionName: string;
  startTime: string;
  subjectCode: string;
  subjectTitle: string;
};

export type SubjectSchedulePresetRecord = {
  dayOfWeek: string;
  endTime: string;
  gradeLevel: string;
  id: string;
  isActive: boolean;
  label: string;
  programName: string;
  programScope: SectionTrack;
  room: string;
  startTime: string;
  strand: string;
};

const toText = (value: unknown) => String(value || '').trim();
let hasSectionSubjectsTableCache: boolean | null = null;
let hasSectionSubjectsTablePromise: Promise<boolean> | null = null;
let hasSectionSubjectSchedulesTableCache: boolean | null = null;
let hasSectionSubjectSchedulesTablePromise: Promise<boolean> | null = null;
let hasSubjectSchedulePresetsTableCache: boolean | null = null;
let hasSubjectSchedulePresetsTablePromise: Promise<boolean> | null = null;

const parseTrack = (gradeLevel: string, strand: string, specialProgram: string): SectionTrack => {
  const grade = gradeLevel.toLowerCase();
  const strandValue = strand.toLowerCase();
  const specialValue = specialProgram.toLowerCase();
  const isShs = grade.includes('11') || grade.includes('12') || grade.includes('senior high');
  if (isShs) return 'senior_high_school';
  if (specialValue || specialValue.includes('ste') || strandValue.includes('ste')) return 'special_program_ste';
  return 'regular';
};

const parseGradeNumber = (gradeLevel: string) => {
  const normalized = String(gradeLevel || '').toLowerCase();
  const match = normalized.match(/\b(7|8|9|10|11|12)\b/);
  return match ? Number(match[1]) : null;
};

const normalizeSubjectType = (value: string): 'core' | 'elective' => (value === 'elective' ? 'elective' : 'core');
const parseGradeNo = (value: string) => {
  const match = String(value || '').match(/\b(7|8|9|10|11|12)\b/);
  return match ? Number(match[1]) : null;
};

const hasSectionSubjectsTable = async () => {
  if (hasSectionSubjectsTableCache !== null) return hasSectionSubjectsTableCache;
  if (hasSectionSubjectsTablePromise) return hasSectionSubjectsTablePromise;
  hasSectionSubjectsTablePromise = (async () => {
  const { error } = await supabase.from('registrar_section_subjects').select('id').limit(1);
  if (error && (error.code === '42P01' || error.message?.toLowerCase().includes('schema cache'))) {
    hasSectionSubjectsTableCache = false;
    hasSectionSubjectsTablePromise = null;
    return false;
  }
  hasSectionSubjectsTableCache = !error;
  hasSectionSubjectsTablePromise = null;
  return hasSectionSubjectsTableCache;
  })();
  return hasSectionSubjectsTablePromise;
};

const hasSectionSubjectSchedulesTable = async () => {
  if (hasSectionSubjectSchedulesTableCache !== null) return hasSectionSubjectSchedulesTableCache;
  if (hasSectionSubjectSchedulesTablePromise) return hasSectionSubjectSchedulesTablePromise;
  hasSectionSubjectSchedulesTablePromise = (async () => {
    const { error } = await supabase.from('registrar_section_subject_schedules').select('id').limit(1);
    if (error && (error.code === '42P01' || error.message?.toLowerCase().includes('schema cache'))) {
      hasSectionSubjectSchedulesTableCache = false;
      hasSectionSubjectSchedulesTablePromise = null;
      return false;
    }
    hasSectionSubjectSchedulesTableCache = !error;
    hasSectionSubjectSchedulesTablePromise = null;
    return hasSectionSubjectSchedulesTableCache;
  })();
  return hasSectionSubjectSchedulesTablePromise;
};

const hasSubjectSchedulePresetsTable = async () => {
  if (hasSubjectSchedulePresetsTableCache !== null) return hasSubjectSchedulePresetsTableCache;
  if (hasSubjectSchedulePresetsTablePromise) return hasSubjectSchedulePresetsTablePromise;
  hasSubjectSchedulePresetsTablePromise = (async () => {
    const { error } = await supabase.from('registrar_subject_schedule_presets').select('id').limit(1);
    if (error && (error.code === '42P01' || error.message?.toLowerCase().includes('schema cache'))) {
      hasSubjectSchedulePresetsTableCache = false;
      hasSubjectSchedulePresetsTablePromise = null;
      return false;
    }
    hasSubjectSchedulePresetsTableCache = !error;
    hasSubjectSchedulePresetsTablePromise = null;
    return hasSubjectSchedulePresetsTableCache;
  })();
  return hasSubjectSchedulePresetsTablePromise;
};

const fetchSections = async () => {
  const sharedSections = await loadActiveSectionsDirectory();
  const gradeScopedSections = sharedSections.filter((row) => {
    const gradeNo = parseGradeNumber(row.gradeLevel);
    return gradeNo !== null && gradeNo >= 7 && gradeNo <= 12;
  });
  const sectionIds = gradeScopedSections.map((row) => toText(row.sectionId)).filter(Boolean);

  const detailsMap = new Map<string, { adviser_name: string; special_program: string; strand: string }>();
  if (sectionIds.length) {
    const fallback = await supabase
      .from('registrar_sections')
      .select('id,strand,adviser_name')
      .in('id', sectionIds);
    const detailsRows = (fallback.data || []) as any[];
    (detailsRows || []).forEach((row: any) => {
      const id = toText(row.id);
      if (!id) return;
      detailsMap.set(id, {
        adviser_name: toText(row.adviser_name),
        special_program: '',
        strand: toText(row.strand),
      });
    });
  }

  return gradeScopedSections.map((row) => {
    const id = toText(row.sectionId);
    const details = detailsMap.get(id);
    return {
      adviser_name: details?.adviser_name || '',
      grade_level: toText(row.gradeLevel),
      id,
      name: toText(row.sectionName),
      school_year_id: toText(row.schoolYearId),
      special_program: '',
      strand: details?.strand || '',
    };
  });
};

export const loadManagedSections = async (): Promise<ManagedSection[]> => {
  const sections = await fetchSections();
  const sectionIds = sections.map((row: any) => toText(row.id)).filter(Boolean);
  const subjectCountMap = new Map<string, number>();
  const subjectRowsMap = new Map<string, SectionSubjectRecord[]>();

  if (sectionIds.length && (await hasSectionSubjectsTable())) {
    const { data: subjects } = await supabase
      .from('registrar_section_subjects')
      .select('id,section_id,subject_code,subject_title,is_core,program_scope,department_id,teacher_account_id,teacher_name')
      .in('section_id', sectionIds);
    (subjects || []).forEach((row: any) => {
      const key = toText(row.section_id);
      subjectCountMap.set(key, (subjectCountMap.get(key) || 0) + 1);
      const current = subjectRowsMap.get(key) || [];
      current.push({
        id: toText(row.id),
        departmentId: toText(row.department_id),
        isCore: Boolean(row.is_core),
        programScope: toText(row.program_scope),
        sectionId: key,
        subjectCode: toText(row.subject_code),
        subjectTitle: toText(row.subject_title),
        teacherAccountId: toText(row.teacher_account_id),
        teacherName: toText(row.teacher_name),
      });
      subjectRowsMap.set(key, current);
    });
  }

  return sections.map((row: any) => {
    const gradeLevel = toText(row.grade_level);
    const strand = toText(row.strand);
    const specialProgram = toText(row.special_program);
    const id = toText(row.id);
    return {
      adviserName: toText(row.adviser_name),
      gradeLevel,
      id,
      name: toText(row.name),
      specialProgram,
      strand,
      subjectCount: subjectCountMap.get(id) || 0,
      subjects: (subjectRowsMap.get(id) || []).sort((a, b) => a.subjectCode.localeCompare(b.subjectCode)),
      track: parseTrack(gradeLevel, strand, specialProgram),
    };
  });
};

export const loadSectionSubjects = async (sectionId: string): Promise<SectionSubjectRecord[]> => {
  if (!(await hasSectionSubjectsTable())) return [];
  const { data, error } = await supabase
    .from('registrar_section_subjects')
    .select('id,section_id,subject_code,subject_title,is_core,program_scope,department_id,teacher_account_id,teacher_name')
    .eq('section_id', sectionId)
    .order('subject_code');
  if (error) throw new Error(error.message || 'Unable to load section subjects.');
  return (data || []).map((row: any) => ({
    id: toText(row.id),
    departmentId: toText(row.department_id),
    isCore: Boolean(row.is_core),
    programScope: toText(row.program_scope),
    sectionId: toText(row.section_id),
    subjectCode: toText(row.subject_code),
    subjectTitle: toText(row.subject_title),
    teacherAccountId: toText(row.teacher_account_id),
    teacherName: toText(row.teacher_name),
  }));
};

export const saveSectionSubject = async (payload: {
  departmentId: string;
  id?: string;
  isCore: boolean;
  programScope: string;
  sectionId: string;
  subjectCode: string;
  subjectTitle: string;
  teacherAccountId: string;
  teacherName: string;
}) => {
  if (!(await hasSectionSubjectsTable())) {
    throw new Error("Section subjects table is not yet available. Run the latest IA schema SQL first.");
  }
  const record = {
    department_id: toText(payload.departmentId) || null,
    is_core: payload.isCore,
    program_scope: toText(payload.programScope) || 'regular',
    section_id: payload.sectionId,
    subject_code: toText(payload.subjectCode).toUpperCase(),
    subject_title: toText(payload.subjectTitle),
    teacher_account_id: toText(payload.teacherAccountId) || null,
    teacher_name: toText(payload.teacherName) || null,
  };
  if (payload.id) {
    const { error } = await supabase.from('registrar_section_subjects').update(record).eq('id', payload.id);
    if (error) throw new Error(error.message || 'Unable to update subject.');
    return payload.id;
  }
  const { data, error } = await supabase.from('registrar_section_subjects').insert([record]).select('id').single();
  if (error || !data?.id) throw new Error(error?.message || 'Unable to save subject.');
  return String(data.id);
};

export const deleteSectionSubject = async (id: string) => {
  if (!(await hasSectionSubjectsTable())) {
    throw new Error("Section subjects table is not yet available. Run the latest IA schema SQL first.");
  }
  const { error } = await supabase.from('registrar_section_subjects').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Unable to delete subject.');
};

export const loadAssignableSubjectsForSection = async (section: ManagedSection): Promise<SubjectCatalogRecord[]> => {
  const gradeLevel = toText(section.gradeLevel);
  const scope = section.track;
  const strand = toText(section.strand);
  if (!gradeLevel || !scope) return [];

  let query = supabase
    .from('registrar_subject_management')
    .select('id,department_id,grade_level,program_scope,strand,subject_code,subject_title,subject_type,is_active')
    .eq('grade_level', gradeLevel)
    .eq('program_scope', scope)
    .eq('is_active', true)
    .order('subject_code', { ascending: true });

  if (scope === 'senior_high_school') {
    query = query.eq('strand', strand);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Unable to load assignable subjects.');

  return (data || []).map((row: any) => ({
    gradeLevel: toText(row.grade_level),
    departmentId: toText(row.department_id),
    id: toText(row.id),
    isActive: Boolean(row.is_active),
    programScope: toText(row.program_scope) as SectionTrack,
    strand: toText(row.strand),
    subjectCode: toText(row.subject_code).toUpperCase(),
    subjectTitle: toText(row.subject_title),
    subjectType: normalizeSubjectType(toText(row.subject_type)),
  }));
};

export const assignCatalogSubjectToSection = async (payload: {
  preset?: SubjectSchedulePresetRecord | null;
  section: ManagedSection;
  subject: SubjectCatalogRecord;
  teacherAccountId: string;
  teacherName: string;
}) => {
  const savedId = await saveSectionSubject({
    departmentId: payload.subject.departmentId,
    isCore: payload.subject.subjectType === 'core',
    programScope: payload.section.track,
    sectionId: payload.section.id,
    subjectCode: payload.subject.subjectCode,
    subjectTitle: payload.subject.subjectTitle,
    teacherAccountId: payload.teacherAccountId,
    teacherName: payload.teacherName,
  });
  if (payload.preset) {
    const allPresets = await loadSubjectSchedulePresets();
    const selected = payload.preset;
    const selectedProgramName = toText(selected.programName).toLowerCase();
    const selectedStrand = toText(selected.strand).toLowerCase();
    const scheduleBundle = allPresets
      .filter((row) => row.isActive)
      .filter((row) => toText(row.gradeLevel) === toText(selected.gradeLevel))
      .filter((row) => row.programScope === selected.programScope)
      .filter((row) => toText(row.label).toLowerCase() === toText(selected.label).toLowerCase())
      .filter((row) => {
        if (selected.programScope === 'senior_high_school') {
          return toText(row.strand).toLowerCase() === selectedStrand;
        }
        if (selected.programScope === 'special_program_ste') {
          return toText(row.programName).toLowerCase() === selectedProgramName;
        }
        return true;
      })
      .sort((a, b) => a.dayOfWeek.localeCompare(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));

    const rowsToApply = scheduleBundle.length > 0 ? scheduleBundle : [selected];

    for (const row of rowsToApply) {
      await saveSectionSubjectSchedule({
        dayOfWeek: row.dayOfWeek,
        endTime: row.endTime,
        presetId: row.id || selected.id,
        room: row.room,
        sectionId: payload.section.id,
        sectionName: payload.section.name,
        startTime: row.startTime,
        subjectCode: payload.subject.subjectCode,
        subjectTitle: payload.subject.subjectTitle,
      });
    }
  }
  return savedId;
};

export const loadCoordinatorTeacherAccountOptions = async (): Promise<CoordinatorTeacherOption[]> => {
  const primary = await supabase
    .from('usis_core_coordinators')
    .select('id,username,first_name,middle_name,last_name,is_active,role,personnel_type')
    .eq('is_active', true)
    .order('last_name', { ascending: true });
  let accounts: any[] = [];
  if (!primary.error) {
    accounts = (primary.data || []) as any[];
  } else if (String(primary.error.message || '').toLowerCase().includes('personnel_type')) {
    const fallback = await supabase
      .from('usis_core_coordinators')
      .select('id,username,first_name,middle_name,last_name,is_active,role')
      .eq('is_active', true)
      .order('last_name', { ascending: true });
    if (fallback.error) throw new Error(fallback.error.message || 'Unable to load teacher accounts.');
    accounts = (fallback.data || []) as any[];
  } else {
    throw new Error(primary.error.message || 'Unable to load teacher accounts.');
  }

  const accountIds = (accounts || []).map((row: any) => toText(row.id)).filter(Boolean);
  const { data: assignments, error: assignmentError } = accountIds.length
    ? await supabase
        .from('coordinator_account_departments')
        .select('account_id,department_id,coordinator_departments(name)')
        .in('account_id', accountIds)
    : { data: [] as any[], error: null };
  if (assignmentError) throw new Error(assignmentError.message || 'Unable to load teacher department assignments.');

  const assignmentMap = new Map<string, { departmentId: string; departmentName: string }>();
  (assignments || []).forEach((row: any) => {
    const accountId = toText(row.account_id);
    if (!accountId) return;
    const department = Array.isArray(row.coordinator_departments) ? row.coordinator_departments[0] : row.coordinator_departments;
    assignmentMap.set(accountId, {
      departmentId: toText(row.department_id),
      departmentName: toText(department?.name) || 'No Department',
    });
  });

  const normalized = (accounts || []).map((row: any) => {
    const id = toText(row.id);
    const first = toText(row.first_name);
    const middle = toText(row.middle_name);
    const last = toText(row.last_name);
    const displayName = [last, first, middle].filter(Boolean).join(', ') || toText(row.username);
    const assignment = assignmentMap.get(id);
    const departmentName = assignment?.departmentName || 'No Department';
    return {
      departmentId: assignment?.departmentId || '',
      departmentName,
      label: `${displayName} (${departmentName})`,
      personnelType: toText(row.personnel_type).toLowerCase(),
      value: id,
    };
  });

  const withTeachingFlag = normalized.filter((row) => !row.personnelType || row.personnelType === 'teaching');
  return withTeachingFlag;
};

export const loadSectionSubjectSchedules = async (sectionIds?: string[]): Promise<SectionSubjectScheduleRecord[]> => {
  if (!(await hasSectionSubjectSchedulesTable())) return [];
  let query = supabase
    .from('registrar_section_subject_schedules')
    .select('id,section_id,preset_id,section_name,subject_code,subject_title,day_of_week,start_time,end_time,room,is_active')
    .order('section_name', { ascending: true })
    .order('subject_code', { ascending: true })
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  if (sectionIds?.length) {
    query = query.in('section_id', sectionIds);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Unable to load subject schedules.');
  return (data || []).map((row: any) => ({
    dayOfWeek: toText(row.day_of_week),
    endTime: toText(row.end_time),
    id: toText(row.id),
    isActive: Boolean(row.is_active),
    presetId: toText(row.preset_id),
    room: toText(row.room),
    sectionId: toText(row.section_id),
    sectionName: toText(row.section_name),
    startTime: toText(row.start_time),
    subjectCode: toText(row.subject_code),
    subjectTitle: toText(row.subject_title),
  }));
};

export const saveSectionSubjectSchedule = async (payload: {
  dayOfWeek: string;
  endTime: string;
  id?: string;
  isActive?: boolean;
  presetId?: string | null;
  room?: string;
  sectionId: string;
  sectionName: string;
  startTime: string;
  subjectCode: string;
  subjectTitle: string;
}) => {
  if (!(await hasSectionSubjectSchedulesTable())) {
    throw new Error('Section subject schedules table is not yet available. Run the latest IA schema SQL first.');
  }
  const record = {
    day_of_week: toText(payload.dayOfWeek),
    end_time: toText(payload.endTime),
    is_active: payload.isActive ?? true,
    preset_id: payload.presetId ? toText(payload.presetId) : null,
    room: toText(payload.room) || null,
    section_id: toText(payload.sectionId),
    section_name: toText(payload.sectionName),
    start_time: toText(payload.startTime),
    subject_code: toText(payload.subjectCode).toUpperCase(),
    subject_title: toText(payload.subjectTitle),
  };
  if (payload.id) {
    const { error } = await supabase.from('registrar_section_subject_schedules').update(record).eq('id', payload.id);
    if (error) throw new Error(error.message || 'Unable to update subject schedule.');
    return payload.id;
  }
  const { data, error } = await supabase.from('registrar_section_subject_schedules').insert([record]).select('id').single();
  if (error || !data?.id) throw new Error(error?.message || 'Unable to create subject schedule.');
  return String(data.id);
};

export const deleteSectionSubjectSchedule = async (id: string) => {
  if (!(await hasSectionSubjectSchedulesTable())) {
    throw new Error('Section subject schedules table is not yet available. Run the latest IA schema SQL first.');
  }
  const { error } = await supabase.from('registrar_section_subject_schedules').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Unable to delete subject schedule.');
};

export const isSectionSubjectsTableAvailable = async () => hasSectionSubjectsTable();
export const isSectionSubjectSchedulesTableAvailable = async () => hasSectionSubjectSchedulesTable();
export const isSubjectSchedulePresetsTableAvailable = async () => hasSubjectSchedulePresetsTable();

export const loadSubjectSchedulePresets = async (): Promise<SubjectSchedulePresetRecord[]> => {
  if (!(await hasSubjectSchedulePresetsTable())) return [];
  const primary = await supabase
    .from('registrar_subject_schedule_presets')
    .select('id,grade_level,program_scope,program_name,strand,slot_label,day_of_week,start_time,end_time,room,is_active')
    .order('grade_level', { ascending: true })
    .order('program_scope', { ascending: true })
    .order('strand', { ascending: true })
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  let rows: any[] = [];
  if (!primary.error) {
    rows = (primary.data || []) as any[];
  } else if (String(primary.error.message || '').toLowerCase().includes('program_name')) {
    // Backward compatibility for environments that have not yet applied the program_name column.
    const fallback = await supabase
      .from('registrar_subject_schedule_presets')
      .select('id,grade_level,program_scope,strand,slot_label,day_of_week,start_time,end_time,room,is_active')
      .order('grade_level', { ascending: true })
      .order('program_scope', { ascending: true })
      .order('strand', { ascending: true })
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    if (fallback.error) throw new Error(fallback.error.message || 'Unable to load schedule presets.');
    rows = (fallback.data || []) as any[];
  } else {
    throw new Error(primary.error.message || 'Unable to load schedule presets.');
  }
  return rows.map((row: any) => ({
    dayOfWeek: toText(row.day_of_week),
    endTime: toText(row.end_time),
    gradeLevel: toText(row.grade_level),
    id: toText(row.id),
    isActive: Boolean(row.is_active),
    label: toText(row.slot_label),
    programName: toText(row.program_name),
    programScope: toText(row.program_scope) as SectionTrack,
    room: toText(row.room),
    startTime: toText(row.start_time),
    strand: toText(row.strand),
  }));
};

export const saveSubjectSchedulePreset = async (payload: {
  dayOfWeek: string;
  endTime: string;
  gradeLevel: string;
  id?: string;
  isActive?: boolean;
  label: string;
  programName?: string;
  programScope: SectionTrack;
  room?: string;
  startTime: string;
  strand?: string;
}) => {
  if (!(await hasSubjectSchedulePresetsTable())) {
    throw new Error('Subject schedule presets table is not yet available. Run the latest IA schema SQL first.');
  }
  const gradeNo = parseGradeNo(payload.gradeLevel);
  const isShsGrade = gradeNo === 11 || gradeNo === 12;
  const nextScope: SectionTrack = isShsGrade ? 'senior_high_school' : (payload.programScope === 'special_program_ste' ? 'special_program_ste' : 'regular');
  if (isShsGrade && !toText(payload.strand)) {
    throw new Error('Strand is required for Grade 11 and Grade 12 presets.');
  }
  const record = {
    day_of_week: toText(payload.dayOfWeek),
    end_time: toText(payload.endTime),
    grade_level: toText(payload.gradeLevel),
    is_active: payload.isActive ?? true,
    program_name: nextScope === 'special_program_ste' ? toText(payload.programName) || null : null,
    program_scope: nextScope,
    room: toText(payload.room) || null,
    slot_label: toText(payload.label),
    start_time: toText(payload.startTime),
    strand: isShsGrade ? toText(payload.strand) || null : null,
  };
  if (payload.id) {
    let { error } = await supabase.from('registrar_subject_schedule_presets').update(record).eq('id', payload.id);
    if (error && String(error.message || '').toLowerCase().includes('program_name')) {
      const { program_name: _omitProgramName, ...fallbackRecord } = record as any;
      const retry = await supabase.from('registrar_subject_schedule_presets').update(fallbackRecord).eq('id', payload.id);
      error = retry.error || null;
    }
    if (error) throw new Error(error.message || 'Unable to update schedule preset.');
    return payload.id;
  }
  let create = await supabase.from('registrar_subject_schedule_presets').insert([record]).select('id').single();
  if (create.error && String(create.error.message || '').toLowerCase().includes('program_name')) {
    const { program_name: _omitProgramName, ...fallbackRecord } = record as any;
    create = await supabase.from('registrar_subject_schedule_presets').insert([fallbackRecord]).select('id').single();
  }
  if (create.error || !create.data?.id) throw new Error(create.error?.message || 'Unable to create schedule preset.');
  return String(create.data.id);
};

export const deleteSubjectSchedulePreset = async (id: string) => {
  if (!(await hasSubjectSchedulePresetsTable())) {
    throw new Error('Subject schedule presets table is not yet available. Run the latest IA schema SQL first.');
  }
  const { error } = await supabase.from('registrar_subject_schedule_presets').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Unable to delete schedule preset.');
};

export const loadApplicableSchedulePresetsForSection = async (section: ManagedSection): Promise<SubjectSchedulePresetRecord[]> => {
  const all = await loadSubjectSchedulePresets();
  return all.filter((row) => {
    if (!row.isActive) return false;
    if (toText(row.gradeLevel) !== toText(section.gradeLevel)) return false;
    if (row.programScope !== section.track) return false;
    if (row.programScope === 'special_program_ste' && toText(row.programName) && toText(row.programName) !== toText(section.specialProgram)) return false;
    if (row.programScope === 'senior_high_school') return toText(row.strand) === toText(section.strand);
    return true;
  });
};

export const loadJhsSpecialPrograms = async (): Promise<Array<{ label: string; value: string }>> => {
  const normalizeRows = (rows: any[]) =>
    (rows || [])
      .map((row: any) => {
        const acronym = toText(row.acronym);
        const fullName = toText(row.full_name);
        const value = acronym || fullName;
        return {
          label: fullName && acronym ? `${acronym} - ${fullName}` : value,
          value,
        };
      })
      .filter((row) => Boolean(row.value));

  const primary = await supabase
    .from('registrar_special_programs')
    .select('id,acronym,full_name')
    .order('acronym', { ascending: true });
  if (!primary.error && (primary.data || []).length > 0) {
    return normalizeRows(primary.data as any[]);
  }

  // Legacy shared table fallback for environments that haven't migrated.
  const legacy = await supabase
    .from('special_programs')
    .select('acronym,full_name')
    .order('acronym', { ascending: true });
  if (!legacy.error && (legacy.data || []).length > 0) {
    return normalizeRows(legacy.data as any[]);
  }

  return [];
};
