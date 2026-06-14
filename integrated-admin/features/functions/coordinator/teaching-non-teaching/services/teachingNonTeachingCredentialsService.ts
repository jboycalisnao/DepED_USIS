import { supabase } from '../../../../../../packages/shared-supabase/src';
import type { UsisModuleKey } from '../../../../../../common/auth/moduleAccess';

export type PersonnelType = 'teaching' | 'non_teaching';

export type TeachingNonTeachingCredentialRecord = {
  departmentId: string;
  departmentName: string;
  email: string;
  employeeId: string;
  firstName: string;
  id: string;
  isActive: boolean;
  lastName: string;
  middleName: string;
  mobileNo: string;
  name: string;
  personnelType: PersonnelType;
  role: string;
  schoolCode: string;
  username: string;
};

export type SaveTeachingNonTeachingCredentialInput = {
  departmentId: string;
  email: string;
  employeeId: string;
  firstName: string;
  id?: string;
  isActive?: boolean;
  lastName: string;
  middleName: string;
  mobileNo: string;
  password?: string;
  personnelType: PersonnelType;
  schoolCode: string;
  username: string;
};

const toText = (value: unknown) => String(value || '').trim();
const normalizeIdentity = (value: string) => toText(value).toLowerCase();
const resolveRoleByPersonnelType = (_type: PersonnelType) => 'school_usis_coordinator';
const formatDbError = (error: { message?: string; details?: string; hint?: string } | null, fallback: string) =>
  [error?.message, error?.details, error?.hint].filter(Boolean).join(' | ') || fallback;
const buildCoordinatorPayload = (input: SaveTeachingNonTeachingCredentialInput) => ({
  school_id: null as string | null,
  employee_id: toText(input.employeeId) || null,
  username: normalizeIdentity(input.username),
  email: normalizeIdentity(input.email) || null,
  first_name: toText(input.firstName),
  middle_name: toText(input.middleName) || null,
  last_name: toText(input.lastName),
  mobile_no: toText(input.mobileNo) || null,
  role: resolveRoleByPersonnelType(input.personnelType),
  personnel_type: input.personnelType,
  access_level: 'school',
  is_super_admin: false,
  is_active: input.isActive ?? true,
  division_code: null,
  region_code: null,
});

export type CoordinatorDepartmentRecord = {
  id: string;
  isActive: boolean;
  name: string;
};

const hasMissingColumnError = (error: { message?: string } | null, column: string) =>
  String(error?.message || '').toLowerCase().includes(`column "${column}" does not exist`) ||
  String(error?.message || '').toLowerCase().includes(`column ${column} does not exist`);

const resolveSchoolUuid = async (schoolCode: string) => {
  const { data, error } = await supabase
    .from('usis_schools')
    .select('id')
    .eq('school_code', schoolCode)
    .limit(1)
    .maybeSingle();
  if (error || !data?.id) throw new Error('Unable to resolve school context for credential management.');
  return String(data.id);
};

export const loadTeachingNonTeachingCredentials = async (schoolCode: string): Promise<TeachingNonTeachingCredentialRecord[]> => {
  const schoolId = await resolveSchoolUuid(schoolCode);
  const primary = await supabase
    .from('usis_core_coordinators')
    .select('id,username,email,first_name,middle_name,last_name,employee_id,mobile_no,role,is_active,personnel_type')
    .eq('school_id', schoolId)
    .eq('role', 'school_usis_coordinator')
    .order('created_at', { ascending: false });

  let data: any[] = [];
  if (!primary.error) {
    data = (primary.data || []) as any[];
  } else if (hasMissingColumnError(primary.error, 'personnel_type') || hasMissingColumnError(primary.error, 'middle_name')) {
    const fallback = await supabase
      .from('usis_core_coordinators')
      .select('id,username,email,first_name,last_name,employee_id,mobile_no,role,is_active')
      .eq('school_id', schoolId)
      .eq('role', 'school_usis_coordinator')
      .order('created_at', { ascending: false });
    if (fallback.error) throw new Error(fallback.error.message || 'Unable to load teaching and non-teaching credentials.');
    data = (fallback.data || []) as any[];
  } else {
    throw new Error(primary.error.message || 'Unable to load teaching and non-teaching credentials.');
  }

  const accountIds = (data || []).map((row: any) => toText(row.id)).filter(Boolean);
  const { data: assignments } = accountIds.length
    ? await supabase
        .from('coordinator_account_departments')
        .select('account_id,department_id,coordinator_departments(id,name)')
        .in('account_id', accountIds)
    : { data: [] as any[] };
  const assignmentMap = new Map<string, { departmentId: string; departmentName: string }>();
  (assignments || []).forEach((row: any) => {
    const accountId = toText(row.account_id);
    if (!accountId) return;
    const department = Array.isArray(row.coordinator_departments) ? row.coordinator_departments[0] : row.coordinator_departments;
    assignmentMap.set(accountId, {
      departmentId: toText(row.department_id),
      departmentName: toText(department?.name),
    });
  });

  return (data || []).map((row: any) => {
    const first = toText(row.first_name);
    const middle = toText(row.middle_name);
    const last = toText(row.last_name);
    const personnelType = toText(row.personnel_type).toLowerCase() === 'non_teaching' ? 'non_teaching' : 'teaching';
    return {
      departmentId: assignmentMap.get(toText(row.id))?.departmentId || '',
      departmentName: assignmentMap.get(toText(row.id))?.departmentName || 'Not Set',
      email: toText(row.email),
      employeeId: toText(row.employee_id),
      firstName: first,
      id: toText(row.id),
      isActive: Boolean(row.is_active),
      lastName: last,
      middleName: middle,
      mobileNo: toText(row.mobile_no),
      name: [last, first, middle].filter(Boolean).join(', ').replace(', ,', ',') || toText(row.username),
      personnelType,
      role: toText(row.role),
      schoolCode,
      username: toText(row.username),
    };
  });
};

export const saveTeachingNonTeachingCredential = async (input: SaveTeachingNonTeachingCredentialInput) => {
  const schoolId = await resolveSchoolUuid(input.schoolCode);
  const payload: Record<string, unknown> = {
    ...buildCoordinatorPayload(input),
    school_id: schoolId,
  };
  const departmentId = toText(input.departmentId);
  if (!departmentId) throw new Error('Department is required.');

  const password = toText(input.password);
  if (!input.id && password.length < 6) {
    throw new Error('Password is required and must be at least 6 characters.');
  }
  if (input.id) {
    if (password && password.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }
    if (password) {
      payload.password_hash = password;
    }
  } else {
    payload.password_hash = password;
  }

  if (input.id) {
    const { error } = await supabase.from('usis_core_coordinators').update(payload).eq('id', input.id);
    if (error) {
      const message = `${error.message || ''} ${error.details || ''}`.toLowerCase();
      if (!message.includes('personnel_type')) {
        throw new Error(formatDbError(error, 'Unable to update credential.'));
      }
      const fallbackPayload = { ...payload };
      delete fallbackPayload.personnel_type;
      const retry = await supabase.from('usis_core_coordinators').update(fallbackPayload).eq('id', input.id);
      if (retry.error) throw new Error(formatDbError(retry.error, 'Unable to update credential.'));
    }
    const { error: assignmentError } = await supabase
      .from('coordinator_account_departments')
      .upsert([{ account_id: input.id, department_id: departmentId }], { onConflict: 'account_id' });
    if (assignmentError) throw new Error(formatDbError(assignmentError, 'Unable to update account department.'));
    return String(input.id);
  }

  const insertOnce = async (nextPayload: Record<string, unknown>) =>
    supabase.from('usis_core_coordinators').insert([nextPayload]).select('id').single();

  const { data, error } = await insertOnce(payload);
  if (error && hasMissingColumnError(error, 'personnel_type')) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.personnel_type;
    const retryWithoutPersonnelType = await insertOnce(fallbackPayload);
    if (!retryWithoutPersonnelType.error && retryWithoutPersonnelType.data?.id) {
      const createdId = String(retryWithoutPersonnelType.data.id);
      const { error: assignmentError } = await supabase
        .from('coordinator_account_departments')
        .upsert([{ account_id: createdId, department_id: departmentId }], { onConflict: 'account_id' });
      if (assignmentError) throw new Error(formatDbError(assignmentError, 'Unable to assign department to credential.'));
      return createdId;
    }
    throw new Error(formatDbError(retryWithoutPersonnelType.error || error, 'Unable to create credential.'));
  }
  if (!error && data?.id) {
    const createdId = String(data.id);
    const { error: assignmentError } = await supabase
      .from('coordinator_account_departments')
      .upsert([{ account_id: createdId, department_id: departmentId }], { onConflict: 'account_id' });
    if (assignmentError) throw new Error(formatDbError(assignmentError, 'Unable to assign department to credential.'));
    return createdId;
  }

  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  const roleCheckFailed = message.includes('role_check') || message.includes('violates check constraint');
  if (!roleCheckFailed) {
    throw new Error(formatDbError(error, 'Unable to create credential.'));
  }

  // Fallback for deployments where role check constraint allows a different role set.
  const { data: roleRows } = await supabase
    .from('usis_core_coordinators')
    .select('role')
    .not('role', 'is', null)
    .limit(50);

  const discoveredRoles = Array.from(
    new Set((roleRows || []).map((row: any) => toText(row.role)).filter(Boolean)),
  );
  const retryRole =
    discoveredRoles.find((role) => role === 'school_usis_coordinator') ||
    discoveredRoles.find((role) => role === 'registrar_coordinator') ||
    discoveredRoles.find((role) => role === 'attendance_coordinator') ||
    discoveredRoles.find((role) => role !== 'system_admin') ||
    null;

  if (!retryRole) {
    throw new Error(
      "Unable to create credential because your 'usis_core_coordinators' role constraint does not accept the submitted role. No fallback role could be resolved from existing records.",
    );
  }

  const retryPayload = {
    ...payload,
    role: retryRole,
  };
  const retry = await insertOnce(retryPayload);
  if (retry.error || !retry.data?.id) {
    throw new Error(formatDbError(retry.error, 'Unable to create credential.'));
  }
  const createdId = String(retry.data.id);
  const { error: assignmentError } = await supabase
    .from('coordinator_account_departments')
    .upsert([{ account_id: createdId, department_id: departmentId }], { onConflict: 'account_id' });
  if (assignmentError) throw new Error(formatDbError(assignmentError, 'Unable to assign department to credential.'));
  return createdId;
};

export const deactivateTeachingNonTeachingCredential = async (id: string) => {
  const { error } = await supabase.from('usis_core_coordinators').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message || 'Unable to deactivate credential.');
};

export const teachingNonTeachingModuleOptions: Array<{ key: UsisModuleKey; label: string }> = [
  { key: 'ia', label: 'Integrated Admin (IA)' },
  { key: 'coordinator', label: 'Coordinator Portal' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'registrar', label: 'Registrar' },
  { key: 'election', label: 'Election' },
  { key: 'sp_portal', label: 'SP Portal' },
  { key: 'spta', label: 'SPTA' },
  { key: 'learner_portal', label: 'Learner Portal' },
  { key: 'help_admin', label: 'Help Desk Admin' },
  { key: 'support', label: 'Support' },
];

export const loadCoordinatorDepartments = async (): Promise<CoordinatorDepartmentRecord[]> => {
  const { data, error } = await supabase
    .from('coordinator_departments')
    .select('id,name,is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw new Error(error.message || 'Unable to load departments.');
  return (data || []).map((row: any) => ({
    id: toText(row.id),
    isActive: Boolean(row.is_active),
    name: toText(row.name),
  }));
};
