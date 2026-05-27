import {
  getCoordinatorModuleAccessMap,
  loadCoordinatorModuleAccessMapFromSupabase,
  saveCoordinatorAccountModuleAccessToSupabase,
  setCoordinatorAccountModuleAccess,
} from '../../../../common/auth/moduleAccess';
import type { UsisModuleKey } from '../../../../common/auth/moduleAccess';

export type { UsisModuleKey };

export const moduleOptions: Array<{ key: UsisModuleKey; label: string }> = [
  { key: 'coordinator', label: 'Coordinator Portal' },
  { key: 'ia', label: 'Integrated Admin (IA)' },
  { key: 'registrar', label: 'Registrar' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'election', label: 'Election' },
  { key: 'sp_portal', label: 'SP Portal' },
  { key: 'spta', label: 'SPTA' },
  { key: 'learner_portal', label: 'Learner Portal' },
  { key: 'support', label: 'Support' },
];

type ModuleAccessMap = Record<string, UsisModuleKey[]>;

export const getModuleAccessMap = (): ModuleAccessMap => getCoordinatorModuleAccessMap();

export const setAccountModuleAccess = (accountId: string, modules: UsisModuleKey[]) => {
  setCoordinatorAccountModuleAccess(accountId, modules);
};

export const getAccountModuleAccess = (accountId: string) => getModuleAccessMap()[accountId] || [];
export { loadCoordinatorModuleAccessMapFromSupabase, saveCoordinatorAccountModuleAccessToSupabase };
