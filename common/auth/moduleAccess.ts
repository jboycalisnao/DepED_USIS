import { supabase } from '../../packages/shared-supabase/src';

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
const MODULE_ACCESS_TABLE = 'coordinator_module_access';
const MODULE_KEYS: UsisModuleKey[] = ['coordinator', 'ia', 'registrar', 'attendance', 'election', 'sp_portal', 'spta', 'learner_portal', 'support'];

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

const sanitizeModules = (value: unknown): UsisModuleKey[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter((entry): entry is UsisModuleKey => MODULE_KEYS.includes(entry as UsisModuleKey)),
    ),
  );
};

export const loadCoordinatorModuleAccessMapFromSupabase = async (accountIds?: string[]) => {
  let query = supabase.from(MODULE_ACCESS_TABLE).select('account_id, modules');
  if (accountIds?.length) {
    query = query.in('account_id', accountIds);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Unable to load module access.');
  }
  const map: ModuleAccessMap = {};
  (data || []).forEach((row: any) => {
    const accountId = typeof row.account_id === 'string' ? row.account_id : '';
    if (!accountId) return;
    map[accountId] = sanitizeModules(row.modules);
  });
  setCoordinatorModuleAccessMap({
    ...getCoordinatorModuleAccessMap(),
    ...map,
  });
  return map;
};

export const saveCoordinatorAccountModuleAccessToSupabase = async (accountId: string, modules: UsisModuleKey[]) => {
  const sanitized = sanitizeModules(modules);
  const { error } = await supabase
    .from(MODULE_ACCESS_TABLE)
    .upsert(
      [{ account_id: accountId, modules: sanitized }],
      { onConflict: 'account_id' },
    );
  if (error) {
    throw new Error(error.message || 'Unable to save module access.');
  }
  setCoordinatorAccountModuleAccess(accountId, sanitized);
};

export const hasCoordinatorModuleAccessInSupabase = async (accountId: string | null | undefined, moduleKey: UsisModuleKey) => {
  if (!accountId) return false;
  const { data, error } = await supabase
    .from(MODULE_ACCESS_TABLE)
    .select('modules')
    .eq('account_id', accountId)
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    return hasCoordinatorModuleAccess(accountId, moduleKey);
  }
  const modules = sanitizeModules((data as any).modules);
  setCoordinatorAccountModuleAccess(accountId, modules);
  return modules.includes(moduleKey);
};

export const hasCoordinatorModuleAccess = (accountId: string | null | undefined, moduleKey: UsisModuleKey) => {
  if (!accountId) return false;
  const accessMap = getCoordinatorModuleAccessMap();
  const allowedModules = accessMap[accountId] || [];
  return allowedModules.includes(moduleKey);
};
