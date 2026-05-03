import type { CoordinatorAccessRecord } from '@/features/auth/utils/coordinatorAccess';

export const coreRoleOptions = [
  { label: 'School USIS Coordinator', value: 'school_usis_coordinator' },
  { label: 'Division USIS Coordinator', value: 'division_usis_coordinator' },
  { label: 'Regional USIS Coordinator', value: 'regional_usis_coordinator' },
] as const;

export const coreAccessLevelOptions = [
  { label: 'School', value: 'school' },
  { label: 'Division', value: 'division' },
  { label: 'Region', value: 'region' },
] as const;

export const coreRoleByAccessLevel: Record<string, string> = {
  division: 'division_usis_coordinator',
  region: 'regional_usis_coordinator',
  school: 'school_usis_coordinator',
};

export const coreAccessLevelByRole: Record<string, string> = {
  division_usis_coordinator: 'division',
  regional_usis_coordinator: 'region',
  school_usis_coordinator: 'school',
};

const uniq = <T,>(values: T[]) => Array.from(new Set(values));

export const getAssignableCoreAccessLevels = (
  access: CoordinatorAccessRecord | null,
  includeCurrent?: string,
) => {
  const values = (() => {
    if (!access) return [];
    if (access.isSuperAdmin || access.coordinatorRole === 'system_admin') {
      return ['region', 'division', 'school'];
    }

    if (access.accountSource !== 'usis_core_coordinators') {
      return [];
    }

    if (access.accessLevel === 'region') {
      return ['division', 'school'];
    }

    if (access.accessLevel === 'division') {
      return ['school'];
    }

    return [];
  })();

  return uniq(includeCurrent ? [...values, includeCurrent] : values);
};

export const getAssignableCoreRoles = (
  access: CoordinatorAccessRecord | null,
  includeCurrent?: string,
) => {
  const values = getAssignableCoreAccessLevels(access).map((value) => coreRoleByAccessLevel[value]).filter(Boolean);
  return uniq(includeCurrent ? [...values, includeCurrent] : values);
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
) => coreRoleByAccessLevel[accessLevel] || fallbackRole || 'school_usis_coordinator';

export const getDefaultCoreAccessLevelForRole = (
  role: string,
  fallbackAccessLevel?: string,
) => coreAccessLevelByRole[role] || fallbackAccessLevel || 'school';
