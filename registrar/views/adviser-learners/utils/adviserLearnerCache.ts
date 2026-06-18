import type { AdviserSectionGroup } from './adviserLearnerAccess';

type AdviserLearnerCachePayload = {
  updatedAt: string;
  schoolYearId: string;
  schoolYearLabel: string;
  coordinatorUsername: string;
  coordinatorName: string;
  groups: AdviserSectionGroup[];
};

const LOCAL_STORAGE_PREFIX = 'registrar_adviser_learner_cache_v1';
const IDB_NAME = 'usis-registrar-cache';
const IDB_STORE = 'adviser_learner_snapshots';

const getLocalKey = (schoolYearId: string, coordinatorUsername: string) =>
  `${LOCAL_STORAGE_PREFIX}:${String(schoolYearId || '').trim()}:${String(coordinatorUsername || '').trim().toLowerCase()}`;

const readJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const openIndexedDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
};

const idbGet = async (key: string) => {
  const db = await openIndexedDb();
  if (!db) return null;
  return new Promise<AdviserLearnerCachePayload | null>((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result?.value as AdviserLearnerCachePayload) || null);
    request.onerror = () => resolve(null);
  });
};

const idbSet = async (key: string, value: AdviserLearnerCachePayload) => {
  const db = await openIndexedDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
};

export const saveAdviserLearnerSnapshot = async (
  schoolYearId: string,
  schoolYearLabel: string,
  coordinatorUsername: string,
  coordinatorName: string,
  groups: AdviserSectionGroup[],
) => {
  const key = getLocalKey(schoolYearId, coordinatorUsername);
  const payload: AdviserLearnerCachePayload = {
    updatedAt: new Date().toISOString(),
    schoolYearId: String(schoolYearId || '').trim(),
    schoolYearLabel: String(schoolYearLabel || '').trim(),
    coordinatorUsername: String(coordinatorUsername || '').trim(),
    coordinatorName: String(coordinatorName || '').trim(),
    groups,
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // localStorage is a best-effort layer.
  }

  try {
    await idbSet(key, payload);
  } catch {
    // IndexedDB is also best-effort.
  }
};

export const loadAdviserLearnerSnapshot = async (
  schoolYearId: string,
  coordinatorUsername: string,
): Promise<AdviserLearnerCachePayload | null> => {
  const key = getLocalKey(schoolYearId, coordinatorUsername);
  if (typeof window !== 'undefined') {
    const localValue = readJson<AdviserLearnerCachePayload>(window.localStorage.getItem(key));
    if (localValue) return localValue;
  }

  try {
    return await idbGet(key);
  } catch {
    return null;
  }
};
