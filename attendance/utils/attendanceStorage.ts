import { AttendanceRecord } from '../types';

const DB_NAME = 'usis_attendance_db';
// Keep this aligned with learnerRosterCache.ts so both caches share the same IndexedDB schema.
const DB_VERSION = 2;
const STORE_NAME = 'kv';

const UID_MAPPINGS_KEY = 'rfid_mappings';
const ADMIN_UIDS_KEY = 'admin_uids';
const ATTENDANCE_LOGS_KEY = 'attendance_logs';
const TEACHER_RANGE_CACHE_PREFIX = 'teacher_attendance_range_cache:';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getValue = async <T>(key: string): Promise<T | null> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
};

const setValue = async (key: string, value: unknown): Promise<void> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
};

export interface AttendanceLocalState {
  uidMappings: Record<string, string>;
  adminUids: string[];
  attendanceLogs: AttendanceRecord[];
}

export const loadAttendanceLocalState = async (): Promise<AttendanceLocalState> => {
  const [uidMappings, adminUids, attendanceLogs] = await Promise.all([
    getValue<Record<string, string>>(UID_MAPPINGS_KEY),
    getValue<string[]>(ADMIN_UIDS_KEY),
    getValue<AttendanceRecord[]>(ATTENDANCE_LOGS_KEY),
  ]);

  return {
    uidMappings: uidMappings || {},
    adminUids: adminUids || [],
    attendanceLogs: attendanceLogs || [],
  };
};

export const saveUidMappings = async (value: Record<string, string>): Promise<void> =>
  setValue(UID_MAPPINGS_KEY, value);

export const saveAdminUids = async (value: string[]): Promise<void> =>
  setValue(ADMIN_UIDS_KEY, value);

export const saveAttendanceLogs = async (value: AttendanceRecord[]): Promise<void> =>
  setValue(ATTENDANCE_LOGS_KEY, value);

export type TeacherAttendanceRangeCache = {
  rows: AttendanceRecord[];
  cachedAt: number;
  fromDate: string;
  toDate: string;
  learnerIds: string[];
};

export const buildTeacherAttendanceRangeCacheKey = (fromDate: string, toDate: string, learnerIds: string[]) => {
  const scope = Array.from(new Set(learnerIds.map((value) => String(value || '').trim()).filter(Boolean))).sort().join(',');
  return `${TEACHER_RANGE_CACHE_PREFIX}${String(fromDate || '').trim()}:${String(toDate || '').trim()}:${scope}`;
};

export const loadTeacherAttendanceRangeCache = async (cacheKey: string): Promise<TeacherAttendanceRangeCache | null> =>
  getValue<TeacherAttendanceRangeCache>(cacheKey);

export const saveTeacherAttendanceRangeCache = async (cacheKey: string, value: TeacherAttendanceRangeCache): Promise<void> =>
  setValue(cacheKey, value);
