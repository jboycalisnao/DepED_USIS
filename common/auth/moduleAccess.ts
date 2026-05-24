export type UsisModuleKey =
  | 'coordinator'
  | 'ia'
  | 'registrar'
  | 'attendance'
  | 'election'
  | 'sp_portal'
  | 'spta'
  | 'learner_portal'
  | 'support';

const STORAGE_KEY = 'usis_coordinator_module_access_map';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type ModuleAccessMap = Record<string, UsisModuleKey[]>;

const parseModuleAccessMap = (raw: string | null): ModuleAccessMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as ModuleAccessMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const readCookieValue = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
};

const writeCookieValue = (name: string, value: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
};

export const getCoordinatorModuleAccessMap = (): ModuleAccessMap => {
  if (typeof window === 'undefined') return parseModuleAccessMap(readCookieValue(STORAGE_KEY));
  const localMap = parseModuleAccessMap(window.localStorage.getItem(STORAGE_KEY));
  const cookieMap = parseModuleAccessMap(readCookieValue(STORAGE_KEY));
  return { ...cookieMap, ...localMap };
};

export const setCoordinatorModuleAccessMap = (value: ModuleAccessMap) => {
  const serialized = JSON.stringify(value);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  }
  writeCookieValue(STORAGE_KEY, serialized);
};

export const setCoordinatorAccountModuleAccess = (accountId: string, modules: UsisModuleKey[]) => {
  const current = getCoordinatorModuleAccessMap();
  current[accountId] = Array.from(new Set(modules));
  setCoordinatorModuleAccessMap(current);
};

export const hasCoordinatorModuleAccess = (accountId: string | null | undefined, moduleKey: UsisModuleKey) => {
  if (!accountId) return false;
  const accessMap = getCoordinatorModuleAccessMap();
  const allowedModules = accessMap[accountId] || [];
  return allowedModules.includes(moduleKey);
};
