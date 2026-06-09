import type { PersonnelType, TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';

export type TeachingNonTeachingCredentialDepartmentGroup = {
  departmentId: string;
  departmentName: string;
  rows: TeachingNonTeachingCredentialRecord[];
};

export type TeachingNonTeachingCredentialPersonnelGroup = {
  count: number;
  departments: TeachingNonTeachingCredentialDepartmentGroup[];
  personnelType: PersonnelType;
  personnelTypeLabel: string;
};

const personnelTypeOrder: PersonnelType[] = ['teaching', 'non_teaching'];

const normalizeDepartmentKey = (record: TeachingNonTeachingCredentialRecord) => {
  const departmentId = String(record.departmentId || '').trim();
  const departmentName = String(record.departmentName || '').trim() || 'Not Set';
  return {
    departmentId: departmentId || departmentName.toLowerCase(),
    departmentName,
  };
};

const compareLabel = (left: string, right: string) => left.localeCompare(right, undefined, { sensitivity: 'base' });

export const getPersonnelTypeLabel = (personnelType: PersonnelType) =>
  personnelType === 'non_teaching' ? 'Non-Teaching' : 'Teaching';

export const groupTeachingNonTeachingCredentials = (
  rows: TeachingNonTeachingCredentialRecord[],
): TeachingNonTeachingCredentialPersonnelGroup[] => {
  const byPersonnelType = new Map<PersonnelType, TeachingNonTeachingCredentialRecord[]>();

  personnelTypeOrder.forEach((personnelType) => {
    byPersonnelType.set(personnelType, []);
  });

  rows.forEach((row) => {
    const personnelType = row.personnelType === 'non_teaching' ? 'non_teaching' : 'teaching';
    byPersonnelType.get(personnelType)?.push(row);
  });

  return personnelTypeOrder
    .map((personnelType) => {
      const personnelRows = (byPersonnelType.get(personnelType) || []).slice();
      if (personnelRows.length === 0) return null;

      const departmentMap = new Map<string, TeachingNonTeachingCredentialDepartmentGroup>();
      personnelRows.forEach((row) => {
        const department = normalizeDepartmentKey(row);
        const existing = departmentMap.get(department.departmentId);
        if (existing) {
          existing.rows.push(row);
          return;
        }
        departmentMap.set(department.departmentId, {
          departmentId: department.departmentId,
          departmentName: department.departmentName,
          rows: [row],
        });
      });

      const departments = Array.from(departmentMap.values())
        .map((department) => ({
          ...department,
          rows: department.rows.slice().sort((left, right) => compareLabel(left.name, right.name)),
        }))
        .sort((left, right) => {
          if (left.departmentName === 'Not Set' && right.departmentName !== 'Not Set') return -1;
          if (right.departmentName === 'Not Set' && left.departmentName !== 'Not Set') return 1;
          return compareLabel(left.departmentName, right.departmentName);
        });

      return {
        count: personnelRows.length,
        departments,
        personnelType,
        personnelTypeLabel: getPersonnelTypeLabel(personnelType),
      };
    })
    .filter((group): group is TeachingNonTeachingCredentialPersonnelGroup => Boolean(group));
};
