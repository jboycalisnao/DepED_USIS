import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';

export const coreRoleOptions = [
  { label: 'System Admin', value: 'system_admin' },
  { label: 'School USIS Coordinator', value: 'school_usis_coordinator' },
  { label: 'Attendance Coordinator', value: 'attendance_coordinator' },
] as const;

export const coreAccessLevelOptions = [
  { label: 'School', value: 'school' },
] as const;

export const coreRoleByAccessLevel: Record<string, string> = {
  school: 'school_usis_coordinator',
};

export const coreAccessLevelByRole: Record<string, string> = {
  attendance_coordinator: 'school',
  registrar_coordinator: 'school',
  school_usis_coordinator: 'school',
  system_admin: 'school',
};

const uniq = <T,>(values: T[]) => Array.from(new Set(values));
const SCHOOL_ONLY_ROLES = ['school_usis_coordinator', 'registrar_coordinator', 'attendance_coordinator', 'system_admin'];

export const getAssignableCoreAccessLevels = (
  access: CoordinatorAccessRecord | null,
  includeCurrent?: string,
) => {
  const values = (() => {
    if (!access) return [];
    if (access.isSuperAdmin || access.coordinatorRole === 'system_admin') return ['school'];
    if (access.accountSource !== 'usis_core_coordinators') return [];
    return ['school'];
  })();

  return uniq(includeCurrent ? [...values, includeCurrent] : values);
};

export const getAssignableCoreRoles = (
  access: CoordinatorAccessRecord | null,
  includeCurrent?: string,
) => {
  const values = getAssignableCoreAccessLevels(access)
    .flatMap((value) =>
      value === 'school'
        ? ['school_usis_coordinator', 'registrar_coordinator', 'attendance_coordinator']
        : [coreRoleByAccessLevel[value]],
    )
    .filter(Boolean);
  if (access && (access.isSuperAdmin || access.coordinatorRole === 'system_admin')) {
    values.push('system_admin');
  }
  const nextValues = includeCurrent && SCHOOL_ONLY_ROLES.includes(includeCurrent)
    ? [...values, includeCurrent]
    : values;
  return uniq(nextValues);
};

export const getAssignableCoreAccessLevelOptions = (
  access: CoordinatorAccessRecord | null,
  includeCurrent?: string,
) => {
  const allowed = getAssignableCoreAccessLevels(access, includeCurrent);
  return coreAccessLevelOptions.filter((option) => allowed.includes(option.value));
};

export const getAssignableCoreRoleOptions = (
  access: CoordinatorAccessRecord | null,
  includeCurrent?: string,
) => {
  const allowed = getAssignableCoreRoles(access, includeCurrent);
  return coreRoleOptions.filter((option) => allowed.includes(option.value));
};

export const canAssignCoreAccessLevel = (
  actor: CoordinatorAccessRecord,
  nextAccessLevel: string,
) => getAssignableCoreAccessLevels(actor).includes(nextAccessLevel);

export const getDefaultCoreRoleForAccessLevel = (
  accessLevel: string,
  fallbackRole?: string,
) => {
  if (fallbackRole === 'system_admin') {
    return 'system_admin';
  }
  if (accessLevel === 'school' && fallbackRole === 'registrar_coordinator') {
    return 'registrar_coordinator';
  }
  return coreRoleByAccessLevel[accessLevel] || fallbackRole || 'school_usis_coordinator';
};

export const getDefaultCoreAccessLevelForRole = (
  role: string,
  fallbackAccessLevel?: string,
) => coreAccessLevelByRole[role] || fallbackAccessLevel || 'school';
