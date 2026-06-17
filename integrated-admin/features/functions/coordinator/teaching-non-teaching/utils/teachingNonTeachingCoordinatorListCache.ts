import type { TeachingNonTeachingCredentialRecord } from '../services/teachingNonTeachingCredentialsService';

const DB_NAME = 'usis_ia_registry';
const DB_VERSION = 1;
const STORE_NAME = 'coordinator_list';
const CACHE_KEY = 'teaching_non_teaching';

type CachedCoordinatorList = {
  rows: TeachingNonTeachingCredentialRecord[];
  updatedAt: string;
};

const isIndexedDbAvailable = () =>
  typeof window !== 'undefined' &&
  typeof indexedDB !== 'undefined';

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open coordinator cache database.'));
  });

export const loadCachedCoordinatorList = async (): Promise<TeachingNonTeachingCredentialRecord[]> => {
  if (!isIndexedDbAvailable()) return [];
  try {
    const database = await openDatabase();
    return await new Promise<TeachingNonTeachingCredentialRecord[]>((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);
      request.onsuccess = () => {
        const result = request.result as CachedCoordinatorList | undefined;
        resolve(Array.isArray(result?.rows) ? result.rows : []);
      };
      request.onerror = () => resolve([]);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        resolve([]);
      };
    });
  } catch {
    return [];
  }
};

export const saveCachedCoordinatorList = async (rows: TeachingNonTeachingCredentialRecord[]) => {
  if (!isIndexedDbAvailable()) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({ rows, updatedAt: new Date().toISOString() } satisfies CachedCoordinatorList, CACHE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to save coordinator cache.'));
    });
    database.close();
  } catch {
    // Cache failures should not block the page.
  }
};
