import { supabase } from '@deped-usis/shared-supabase';
import { fetchLearnerMerchOrders, type LearnerMerchOrderRecord } from './learnerMerchService';

const MERCH_CONTROL_OPERATION_KEY = 'class_section_merch_control';
const GRADE_SCOPE_PREFIX = 'grade_level::';

export type MerchControlSectionLearnerRecord = {
  learnerId: string;
  learnerLrn: string;
  learnerName: string;
  latestOrderAt: string | null;
  latestOrderStatus: string | null;
  sectionId: string;
  sectionName: string;
  totalOrders: number;
};

export type MerchControlSectionGroupRecord = {
  learners: MerchControlSectionLearnerRecord[];
  sectionId: string;
  sectionName: string;
};

export type MerchControlSectionSnapshot = {
  gradeLevel: string;
  hasAccess: boolean;
  isGradeRepresentative: boolean;
  sectionId: string;
  sectionGroups: MerchControlSectionGroupRecord[];
  sectionName: string;
  learners: MerchControlSectionLearnerRecord[];
};

type ActiveSchoolYearSectionRecord = {
  gradeLevel: string;
  sectionId: string;
  sectionName: string;
  schoolYearId: string;
};

const toText = (value: unknown) => String(value || '').trim();
const formatLearnerName = (row: any) => {
  const first = toText(row?.first_name);
  const middle = toText(row?.middle_name);
  const last = toText(row?.last_name);
  return [last, first, middle].filter(Boolean).join(', ').replace(', ,', ',') || 'Unnamed Learner';
};

const loadActiveSchoolYearId = async () => {
  const activeSchoolYearResult = await supabase
    .from('registrar_school_years')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (activeSchoolYearResult.error || !activeSchoolYearResult.data?.id) {
    throw new Error('Active school year not found.');
  }

  return toText(activeSchoolYearResult.data.id);
};

const loadActiveSchoolYearSections = async (schoolYearId: string, gradeLevel?: string) => {
  const normalizedSchoolYearId = toText(schoolYearId);
  if (!normalizedSchoolYearId) return [];

  let query = supabase
    .from('registrar_sections')
    .select('id,name,grade_level,school_year_id')
    .eq('school_year_id', normalizedSchoolYearId)
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true });

  if (gradeLevel) {
    query = query.eq('grade_level', gradeLevel);
  }

  const sectionsResult = await query;
  if (sectionsResult.error) {
    throw new Error(sectionsResult.error.message || 'Unable to load active school year sections.');
  }

  return (sectionsResult.data || []).map((row: any) => ({
    gradeLevel: toText(row.grade_level) || 'Unassigned',
    sectionId: toText(row.id),
    sectionName: toText(row.name) || 'Unnamed Section',
    schoolYearId: toText(row.school_year_id) || normalizedSchoolYearId,
  })) as ActiveSchoolYearSectionRecord[];
};

const resolveCredentialSectionId = async (params: { learnerId: string; learnerLrn: string }) => {
  const learnerId = toText(params.learnerId);
  const learnerLrn = toText(params.learnerLrn);
  const filters: string[] = [];
  if (learnerId) filters.push(`learner_id.eq.${learnerId}`);
  if (learnerLrn) filters.push(`learner_lrn.eq.${learnerLrn}`);
  if (filters.length === 0) return '';

  const { data, error } = await supabase
    .from('coordinator_learner_operation_credentials')
    .select('section_id')
    .eq('is_active', true)
    .eq('operation_key', MERCH_CONTROL_OPERATION_KEY)
    .or(filters.join(','))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Unable to validate merch control credentials.');
  return toText(data?.section_id);
};

export const hasMerchControlCredential = async (params: { learnerId: string; learnerLrn: string }) => {
  const sectionId = await resolveCredentialSectionId(params);
  return Boolean(sectionId);
};

export const fetchMerchControlSectionSnapshot = async (params: {
  learnerId: string;
  learnerLrn: string;
}): Promise<MerchControlSectionSnapshot> => {
  const sectionId = await resolveCredentialSectionId(params);
  if (!sectionId) {
    return {
      gradeLevel: '',
      hasAccess: false,
      isGradeRepresentative: false,
      learners: [],
      sectionId: '',
      sectionGroups: [],
      sectionName: '',
    };
  }

  const activeSchoolYearId = await loadActiveSchoolYearId();
  const isGradeScope = sectionId.startsWith(GRADE_SCOPE_PREFIX);
  const gradeLevelScope = isGradeScope ? sectionId.slice(GRADE_SCOPE_PREFIX.length).trim() : '';
  const sectionIds: string[] = [];
  let sectionName = '';
  let gradeLevel = '';

  const sectionNameById = new Map<string, string>();
  if (isGradeScope) {
    gradeLevel = gradeLevelScope;
    sectionName = `${gradeLevelScope} (All Sections)`;
    const sections = await loadActiveSchoolYearSections(activeSchoolYearId, gradeLevelScope);
    sections.forEach((row) => {
      if (!row.sectionId) return;
      sectionIds.push(row.sectionId);
      sectionNameById.set(row.sectionId, row.sectionName || 'Unnamed Section');
    });
  } else {
    const sectionResult = await supabase
      .from('registrar_sections')
      .select('id,name,grade_level,school_year_id')
      .eq('id', sectionId)
      .limit(1)
      .maybeSingle();
    if (sectionResult.error) throw new Error(sectionResult.error.message || 'Unable to load assigned class section.');
    const sectionSchoolYearId = toText(sectionResult.data?.school_year_id);
    if (sectionSchoolYearId !== activeSchoolYearId) {
      return {
        gradeLevel: toText(sectionResult.data?.grade_level),
        hasAccess: true,
        isGradeRepresentative: isGradeScope,
        learners: [],
        sectionId,
        sectionGroups: [],
        sectionName: toText(sectionResult.data?.name),
      };
    }
    sectionName = toText(sectionResult.data?.name);
    gradeLevel = toText(sectionResult.data?.grade_level);
    if (sectionId) {
      sectionIds.push(sectionId);
      sectionNameById.set(sectionId, sectionName || 'Unnamed Section');
    }
  }

  if (sectionIds.length === 0) {
    return {
      gradeLevel,
      hasAccess: true,
      isGradeRepresentative: isGradeScope,
      learners: [],
      sectionId,
      sectionGroups: [],
      sectionName,
    };
  }

  const learnersResult = await supabase
    .from('registrar_learners')
    .select('id,lrn,first_name,middle_name,last_name,section_id')
    .in('section_id', sectionIds)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true });
  if (learnersResult.error) throw new Error(learnersResult.error.message || 'Unable to load section learner list.');

  const learners = (learnersResult.data || []).map((row: any) => ({
    learnerId: toText(row.id),
    learnerLrn: toText(row.lrn),
    learnerName: formatLearnerName(row),
    sectionId: toText(row.section_id),
  }));

  const lrnList = learners.map((row) => row.learnerLrn).filter(Boolean);
  const ordersMap = new Map<string, { latestOrderAt: string | null; latestOrderStatus: string | null; totalOrders: number }>();
  if (lrnList.length > 0) {
    const ordersResult = await supabase
      .from('merch_orders')
      .select('learner_lrn,created_at,order_status')
      .in('learner_lrn', lrnList)
      .order('created_at', { ascending: false });
    if (ordersResult.error) throw new Error(ordersResult.error.message || 'Unable to load section merch orders.');

    (ordersResult.data || []).forEach((row: any) => {
      const lrn = toText(row.learner_lrn);
      if (!lrn) return;
      const current = ordersMap.get(lrn);
      if (!current) {
        ordersMap.set(lrn, {
          latestOrderAt: toText(row.created_at) || null,
          latestOrderStatus: toText(row.order_status) || null,
          totalOrders: 1,
        });
        return;
      }
      current.totalOrders += 1;
    });
  }

  const normalizedLearners: MerchControlSectionLearnerRecord[] = learners.map((row) => {
    const orderInfo = ordersMap.get(row.learnerLrn);
    return {
      learnerId: row.learnerId,
      learnerLrn: row.learnerLrn,
      learnerName: row.learnerName,
      latestOrderAt: orderInfo?.latestOrderAt || null,
      latestOrderStatus: orderInfo?.latestOrderStatus || null,
      sectionId: row.sectionId,
      sectionName: sectionNameById.get(row.sectionId) || 'Unassigned Section',
      totalOrders: orderInfo?.totalOrders || 0,
    };
  });

  const groupsMap = new Map<string, MerchControlSectionGroupRecord>();
  normalizedLearners.forEach((row) => {
    if (!groupsMap.has(row.sectionId)) {
      groupsMap.set(row.sectionId, {
        learners: [],
        sectionId: row.sectionId,
        sectionName: row.sectionName,
      });
    }
    groupsMap.get(row.sectionId)!.learners.push(row);
  });

  const sectionGroups = Array.from(groupsMap.values()).sort((a, b) => a.sectionName.localeCompare(b.sectionName));

  return {
    gradeLevel,
    hasAccess: true,
    isGradeRepresentative: isGradeScope,
    learners: normalizedLearners,
    sectionId,
    sectionGroups,
    sectionName,
  };
};

export const fetchMerchControlLearnerOrders = async (params: {
  learnerId: string;
  learnerLrn: string;
}): Promise<LearnerMerchOrderRecord[]> => {
  return fetchLearnerMerchOrders({ learnerId: params.learnerId, learnerLrn: params.learnerLrn });
};
