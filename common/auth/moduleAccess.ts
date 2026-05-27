import { supabase } from '@deped-usis/shared-supabase';

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
const IA_PAGE_STORAGE_KEY = 'usis_coordinator_ia_page_access_map';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type ModuleAccessMap = Record<string, UsisModuleKey[]>;
type IaPageAccessMap = Record<string, string[]>;
const MODULE_ACCESS_TABLE = 'coordinator_module_access';
const IA_PAGE_ACCESS_TABLE = 'coordinator_account_ia_page_access';
const IA_PAGE_CATALOG_TABLE = 'coordinator_ia_pages';
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

const parseIaPageAccessMap = (raw: string | null): IaPageAccessMap => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as IaPageAccessMap;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
};

const sanitizePageKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean)));
};

export const getCoordinatorIaPageAccessMap = (): IaPageAccessMap => {
  if (typeof window === 'undefined') return parseIaPageAccessMap(readCookieValue(IA_PAGE_STORAGE_KEY));
  const localMap = parseIaPageAccessMap(window.localStorage.getItem(IA_PAGE_STORAGE_KEY));
  const cookieMap = parseIaPageAccessMap(readCookieValue(IA_PAGE_STORAGE_KEY));
  return { ...cookieMap, ...localMap };
};

export const setCoordinatorIaPageAccessMap = (value: IaPageAccessMap) => {
  const serialized = JSON.stringify(value);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(IA_PAGE_STORAGE_KEY, serialized);
  }
  writeCookieValue(IA_PAGE_STORAGE_KEY, serialized);
};

export const setCoordinatorAccountIaPageAccess = (accountId: string, pageKeys: string[]) => {
  const current = getCoordinatorIaPageAccessMap();
  current[accountId] = sanitizePageKeys(pageKeys);
  setCoordinatorIaPageAccessMap(current);
};

export const loadCoordinatorIaPageAccessMapFromSupabase = async (accountIds?: string[]) => {
  let query = supabase.from(IA_PAGE_ACCESS_TABLE).select('account_id,page_key');
  if (accountIds?.length) {
    query = query.in('account_id', accountIds);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || 'Unable to load IA page access.');
  }
  const map: IaPageAccessMap = {};
  (data || []).forEach((row: any) => {
    const accountId = typeof row.account_id === 'string' ? row.account_id : '';
    const pageKey = typeof row.page_key === 'string' ? row.page_key.trim() : '';
    if (!accountId || !pageKey) return;
    if (!map[accountId]) map[accountId] = [];
    map[accountId].push(pageKey);
  });
  Object.keys(map).forEach((accountId) => {
    map[accountId] = sanitizePageKeys(map[accountId]);
  });
  setCoordinatorIaPageAccessMap({
    ...getCoordinatorIaPageAccessMap(),
    ...map,
  });
  return map;
};

export const saveCoordinatorAccountIaPageAccessToSupabase = async (accountId: string, pageKeys: string[]) => {
  const sanitized = sanitizePageKeys(pageKeys);
  const { error: deleteError } = await supabase.from(IA_PAGE_ACCESS_TABLE).delete().eq('account_id', accountId);
  if (deleteError) {
    throw new Error(deleteError.message || 'Unable to clear IA page access.');
  }
  if (sanitized.length > 0) {
    const rows = sanitized.map((pageKey) => ({ account_id: accountId, page_key: pageKey }));
    const { error: insertError } = await supabase.from(IA_PAGE_ACCESS_TABLE).insert(rows);
    if (insertError) {
      throw new Error(insertError.message || 'Unable to save IA page access.');
    }
  }
  setCoordinatorAccountIaPageAccess(accountId, sanitized);
};

export const loadIaPageCatalogFromSupabase = async (): Promise<Array<{ group: string; key: string; label: string }>> => {
  const { data, error } = await supabase
    .from(IA_PAGE_CATALOG_TABLE)
    .select('page_key,page_label,page_group,is_active,sort_order')
    .eq('is_active', true)
    .order('page_group', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) {
    return [
      { group: 'Coordinator', key: 'ia.coordinator.departments', label: 'Departments' },
      { group: 'Coordinator', key: 'ia.coordinator.teaching_non_teaching', label: 'Teaching & Non-Teaching' },
      { group: 'Coordinator', key: 'ia.coordinator.learner_credentials', label: 'Learner-based Credentials' },
      { group: 'Grades & Subjects', key: 'ia.grades_subjects.subjects', label: 'Subjects' },
      { group: 'Grades & Subjects', key: 'ia.grades_subjects.grades', label: 'Grades' },
      { group: 'Grades & Subjects', key: 'ia.grades_subjects.subject_management', label: 'Subject Management' },
      { group: 'Grades & Subjects', key: 'ia.grades_subjects.time_slots', label: 'Time Slots' },
      { group: 'Merch', key: 'ia.merch.merchandise_control', label: 'Merchandise Control' },
      { group: 'Merch', key: 'ia.merch.orders', label: 'Orders' },
      { group: 'Merch', key: 'ia.merch.payment', label: 'Payment' },
      { group: 'Merch', key: 'ia.merch.order_counts', label: 'Order Counts' },
    ];
  }
  return (data || []).map((row: any) => ({
    group: String(row.page_group || '').trim(),
    key: String(row.page_key || '').trim(),
    label: String(row.page_label || '').trim(),
  })).filter((row) => row.key && row.label);
};

