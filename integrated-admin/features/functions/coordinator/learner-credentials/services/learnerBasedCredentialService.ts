import { supabase } from '../../../../../../packages/shared-supabase/src';

export type SectionDirectoryRecord = {
  gradeLevel: string;
  sectionId: string;
  sectionName: string;
  schoolYearId: string;
};

export type LearnerSearchRecord = {
  fullName: string;
  learnerId: string;
  lrn: string;
  sectionId: string;
};

export type GrantedLearnerAccessRecord = {
  credentialId: string;
  fullName: string;
  grantedBy: string;
  isActive: boolean;
  learnerId: string;
  learnerLrn: string;
  operationKey: string;
  positionTitle: string;
  sectionId: string;
};

const GRADE_SCOPE_PREFIX = 'grade_level::';
export const makeGradeScopeSectionId = (gradeLevel: string) => `${GRADE_SCOPE_PREFIX}${String(gradeLevel || '').trim()}`;
export const isGradeScopeSectionId = (sectionId: string) => String(sectionId || '').startsWith(GRADE_SCOPE_PREFIX);
export const getGradeLevelFromScopeSectionId = (sectionId: string) =>
  isGradeScopeSectionId(sectionId) ? String(sectionId).slice(GRADE_SCOPE_PREFIX.length).trim() : '';

export const loadActiveSectionsDirectory = async (): Promise<SectionDirectoryRecord[]> => {
  const activeSchoolYear = await supabase
    .from('registrar_school_years')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (activeSchoolYear.error || !activeSchoolYear.data?.id) {
    throw new Error('Active school year not found.');
  }

  const schoolYearId = String(activeSchoolYear.data.id || '').trim();
  const { data, error } = await supabase
    .from('registrar_sections')
    .select('id,name,grade_level,school_year_id')
    .eq('school_year_id', schoolYearId)
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw new Error('Unable to load active school year sections.');

  return (data || []).map((row: any) => ({
    gradeLevel: String(row.grade_level || 'Unassigned').trim() || 'Unassigned',
    schoolYearId: String(row.school_year_id || schoolYearId),
    sectionId: String(row.id || ''),
    sectionName: String(row.name || 'Unnamed Section').trim() || 'Unnamed Section',
  }));
};

export const searchLearnersBySection = async (params: {
  query: string;
  sectionId: string;
}): Promise<LearnerSearchRecord[]> => {
  const sectionId = String(params.sectionId || '').trim();
  const query = String(params.query || '').trim();
  if (!sectionId || query.length < 2) return [];

  const { data, error } = await supabase
    .from('registrar_learners')
    .select('id,lrn,first_name,middle_name,last_name,section_id')
    .eq('section_id', sectionId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(250);

  if (error) throw new Error(error.message || 'Unable to search learners in this section.');

  const normalizedQuery = query.toLowerCase();
  const filtered = (data || []).filter((row: any) => {
    const first = String(row.first_name || '').toLowerCase();
    const middle = String(row.middle_name || '').toLowerCase();
    const last = String(row.last_name || '').toLowerCase();
    const lrn = String(row.lrn || '').toLowerCase();
    return (
      first.includes(normalizedQuery) ||
      middle.includes(normalizedQuery) ||
      last.includes(normalizedQuery) ||
      lrn.includes(normalizedQuery)
    );
  });

  return filtered.slice(0, 20).map((row: any) => {
    const first = String(row.first_name || '').trim();
    const middle = String(row.middle_name || '').trim();
    const last = String(row.last_name || '').trim();
    const fullName = [last, first, middle].filter(Boolean).join(', ').replace(', ,', ',');
    return {
      fullName: fullName || 'Unnamed Learner',
      learnerId: String(row.id || ''),
      lrn: String(row.lrn || ''),
      sectionId: String(row.section_id || sectionId),
    };
  });
};

export const searchLearnersByGradeLevel = async (params: {
  gradeLevel: string;
  query: string;
}): Promise<LearnerSearchRecord[]> => {
  const gradeLevel = String(params.gradeLevel || '').trim();
  const query = String(params.query || '').trim();
  if (!gradeLevel || query.length < 2) return [];

  const sectionsResult = await supabase
    .from('registrar_sections')
    .select('id')
    .eq('grade_level', gradeLevel)
    .limit(500);
  if (sectionsResult.error) throw new Error(sectionsResult.error.message || 'Unable to load grade-level sections.');

  const sectionIds = (sectionsResult.data || []).map((row: any) => String(row.id || '').trim()).filter(Boolean);
  if (sectionIds.length === 0) return [];

  const learnersResult = await supabase
    .from('registrar_learners')
    .select('id,lrn,first_name,middle_name,last_name,section_id')
    .in('section_id', sectionIds)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
    .limit(500);
  if (learnersResult.error) throw new Error(learnersResult.error.message || 'Unable to search grade-level learners.');

  const normalizedQuery = query.toLowerCase();
  const filtered = (learnersResult.data || []).filter((row: any) => {
    const first = String(row.first_name || '').toLowerCase();
    const middle = String(row.middle_name || '').toLowerCase();
    const last = String(row.last_name || '').toLowerCase();
    const lrn = String(row.lrn || '').toLowerCase();
    return (
      first.includes(normalizedQuery) ||
      middle.includes(normalizedQuery) ||
      last.includes(normalizedQuery) ||
      lrn.includes(normalizedQuery)
    );
  });

  return filtered.slice(0, 20).map((row: any) => {
    const first = String(row.first_name || '').trim();
    const middle = String(row.middle_name || '').trim();
    const last = String(row.last_name || '').trim();
    const fullName = [last, first, middle].filter(Boolean).join(', ').replace(', ,', ',');
    return {
      fullName: fullName || 'Unnamed Learner',
      learnerId: String(row.id || ''),
      lrn: String(row.lrn || ''),
      sectionId: String(row.section_id || ''),
    };
  });
};

export const grantLearnerOperationAccess = async (payload: {
  learnerId: string;
  learnerLrn: string;
  operationKey: string;
  positionTitle: string;
  sectionId: string;
}) => {
  const actorName = (() => {
    if (typeof window === 'undefined') return 'Integrated Admin';
    try {
      const raw = window.sessionStorage.getItem('usis_integrated_admin_access');
      if (!raw) return 'Integrated Admin';
      const parsed = JSON.parse(raw) as { coordinatorName?: string };
      return String(parsed?.coordinatorName || '').trim() || 'Integrated Admin';
    } catch {
      return 'Integrated Admin';
    }
  })();

  const record = {
    granted_by: actorName,
    is_active: true,
    learner_id: String(payload.learnerId || '').trim() || null,
    learner_lrn: payload.learnerLrn,
    operation_key: payload.operationKey,
    position_title: payload.positionTitle,
    section_id: payload.sectionId,
  };

  const upsert = await supabase
    .from('coordinator_learner_operation_credentials')
    .upsert([record], { onConflict: 'learner_lrn,section_id,operation_key' });

  if (!upsert.error) return;

  const insertFallback = await supabase.from('coordinator_learner_operation_credentials').insert([record]);
  if (insertFallback.error) {
    throw new Error(upsert.error.message || insertFallback.error.message || 'Unable to grant learner-based credential access.');
  }
};

export const grantGradeLevelMerchControlAccess = async (payload: {
  gradeLevel: string;
  learnerId: string;
  learnerLrn: string;
  positionTitle: string;
}) => {
  return grantLearnerOperationAccess({
    learnerId: payload.learnerId,
    learnerLrn: payload.learnerLrn,
    operationKey: 'class_section_merch_control',
    positionTitle: payload.positionTitle,
    sectionId: makeGradeScopeSectionId(payload.gradeLevel),
  });
};

export const loadGradeLevelRepresentatives = async (): Promise<GrantedLearnerAccessRecord[]> => {
  const { data, error } = await supabase
    .from('coordinator_learner_operation_credentials')
    .select('id,learner_id,learner_lrn,section_id,operation_key,position_title,is_active,granted_by')
    .eq('is_active', true)
    .eq('operation_key', 'class_section_merch_control')
    .like('section_id', `${GRADE_SCOPE_PREFIX}%`)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message || 'Unable to load grade-level representatives.');

  const lrnSet = new Set<string>();
  const idSet = new Set<string>();
  (data || []).forEach((row: any) => {
    const learnerId = String(row.learner_id || '').trim();
    const learnerLrn = String(row.learner_lrn || '').trim();
    if (learnerId) idSet.add(learnerId);
    if (learnerLrn) lrnSet.add(learnerLrn);
  });

  let learnersData: any[] = [];
  if (idSet.size > 0 || lrnSet.size > 0) {
    const learnersResult = await supabase
      .from('registrar_learners')
      .select('id,lrn,first_name,middle_name,last_name')
      .or([
        idSet.size > 0 ? `id.in.(${Array.from(idSet).join(',')})` : '',
        lrnSet.size > 0 ? `lrn.in.(${Array.from(lrnSet).join(',')})` : '',
      ].filter(Boolean).join(','))
      .limit(2000);
    if (learnersResult.error) throw new Error(learnersResult.error.message || 'Unable to load representative names.');
    learnersData = learnersResult.data || [];
  }

  const byId = new Map<string, string>();
  const byLrn = new Map<string, string>();
  learnersData.forEach((row: any) => {
    const first = String(row.first_name || '').trim();
    const middle = String(row.middle_name || '').trim();
    const last = String(row.last_name || '').trim();
    const fullName = [last, first, middle].filter(Boolean).join(', ').replace(', ,', ',') || 'Unnamed Learner';
    const learnerId = String(row.id || '').trim();
    const learnerLrn = String(row.lrn || '').trim();
    if (learnerId) byId.set(learnerId, fullName);
    if (learnerLrn) byLrn.set(learnerLrn, fullName);
  });

  return (data || []).map((row: any) => {
    const learnerId = String(row.learner_id || '').trim();
    const learnerLrn = String(row.learner_lrn || '').trim();
    return {
      credentialId: String(row.id || '').trim(),
      fullName: byId.get(learnerId) || byLrn.get(learnerLrn) || 'Unknown Learner',
      grantedBy: String(row.granted_by || '').trim() || 'Integrated Admin',
      isActive: Boolean(row.is_active),
      learnerId,
      learnerLrn,
      operationKey: String(row.operation_key || '').trim(),
      positionTitle: String(row.position_title || '').trim(),
      sectionId: String(row.section_id || '').trim(),
    };
  });
};

export const updateGradeLevelRepresentativeAccess = async (payload: {
  credentialId: string;
  learnerId: string;
  learnerLrn: string;
  positionTitle: string;
}) => {
  const credentialId = String(payload.credentialId || '').trim();
  if (!credentialId) throw new Error('Missing representative credential id.');

  const { error } = await supabase
    .from('coordinator_learner_operation_credentials')
    .update({
      learner_id: String(payload.learnerId || '').trim() || null,
      learner_lrn: String(payload.learnerLrn || '').trim(),
      position_title: String(payload.positionTitle || '').trim(),
    })
    .eq('id', credentialId);

  if (error) throw new Error(error.message || 'Unable to update grade-level representative access.');
};

export const deleteGradeLevelRepresentativeAccess = async (payload: { credentialId: string }) => {
  const credentialId = String(payload.credentialId || '').trim();
  if (!credentialId) throw new Error('Missing representative credential id.');

  const { error } = await supabase
    .from('coordinator_learner_operation_credentials')
    .update({ is_active: false })
    .eq('id', credentialId);

  if (error) throw new Error(error.message || 'Unable to delete grade-level representative.');
};

export const loadGrantedLearnerAccessBySections = async (sectionIds: string[]): Promise<GrantedLearnerAccessRecord[]> => {
  const cleanSectionIds = Array.from(new Set(sectionIds.map((row) => String(row || '').trim()).filter(Boolean)));
  if (cleanSectionIds.length === 0) return [];

  const credentialsResult = await supabase
    .from('coordinator_learner_operation_credentials')
    .select('id,learner_id,learner_lrn,section_id,operation_key,position_title,is_active,granted_by')
    .eq('is_active', true)
    .in('section_id', cleanSectionIds)
    .order('created_at', { ascending: false });
  if (credentialsResult.error) {
    throw new Error(credentialsResult.error.message || 'Unable to load granted learner credentials.');
  }

  const learnersResult = await supabase
    .from('registrar_learners')
    .select('id,lrn,first_name,middle_name,last_name,section_id')
    .in('section_id', cleanSectionIds)
    .limit(5000);
  if (learnersResult.error) {
    throw new Error(learnersResult.error.message || 'Unable to load learner directory for granted credentials.');
  }

  const byId = new Map<string, string>();
  const byLrn = new Map<string, string>();
  (learnersResult.data || []).forEach((row: any) => {
    const first = String(row.first_name || '').trim();
    const middle = String(row.middle_name || '').trim();
    const last = String(row.last_name || '').trim();
    const fullName = [last, first, middle].filter(Boolean).join(', ').replace(', ,', ',') || 'Unnamed Learner';
    const learnerId = String(row.id || '').trim();
    const learnerLrn = String(row.lrn || '').trim();
    if (learnerId) byId.set(learnerId, fullName);
    if (learnerLrn) byLrn.set(learnerLrn, fullName);
  });

  return (credentialsResult.data || []).map((row: any) => {
    const learnerId = String(row.learner_id || '').trim();
    const learnerLrn = String(row.learner_lrn || '').trim();
    return {
      credentialId: String(row.id || '').trim(),
      fullName: byId.get(learnerId) || byLrn.get(learnerLrn) || 'Unknown Learner',
      grantedBy: String(row.granted_by || '').trim() || 'Integrated Admin',
      isActive: Boolean(row.is_active),
      learnerId,
      learnerLrn,
      operationKey: String(row.operation_key || '').trim(),
      positionTitle: String(row.position_title || '').trim(),
      sectionId: String(row.section_id || '').trim(),
    };
  });
};

export const updateLearnerOperationAccess = async (payload: {
  credentialId: string;
  operationKey: string;
  positionTitle: string;
}) => {
  const credentialId = String(payload.credentialId || '').trim();
  if (!credentialId) throw new Error('Missing credential record id.');

  const { error } = await supabase
    .from('coordinator_learner_operation_credentials')
    .update({
      operation_key: String(payload.operationKey || '').trim(),
      position_title: String(payload.positionTitle || '').trim(),
    })
    .eq('id', credentialId);

  if (error) throw new Error(error.message || 'Unable to update learner-based credential access.');
};
