import type { MerchActiveLearnerOption, MerchOrderControlRecord, MerchProductOption } from '../services/merchOrderControlService';

const DB_NAME = 'usis_ia_registry';
const DB_VERSION = 1;
const STORE_NAME = 'merch_orders_page_cache';
const CACHE_KEY = 'merch_orders_page';
const SESSION_STORAGE_KEY = 'usis_ia_merch_orders_page_cache';

type MerchOrdersPageSnapshot = {
  learners: MerchActiveLearnerOption[];
  lastLoadedFromDbAt: string;
  products: MerchProductOption[];
  records: MerchOrderControlRecord[];
  updatedAt: string;
};

const isIndexedDbAvailable = () =>
  typeof window !== 'undefined' &&
  typeof indexedDB !== 'undefined';

const isSessionStorageAvailable = () =>
  typeof window !== 'undefined' &&
  typeof window.sessionStorage !== 'undefined';

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
    request.onerror = () => reject(request.error || new Error('Unable to open merch orders cache database.'));
  });

const readSessionSnapshot = (): MerchOrdersPageSnapshot | null => {
  if (!isSessionStorageAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<MerchOrdersPageSnapshot>;
    return parsed && Array.isArray(parsed.records) ? (parsed as MerchOrdersPageSnapshot) : null;
  } catch {
    return null;
  }
};

const writeSessionSnapshot = (payload: MerchOrdersPageSnapshot) => {
  if (!isSessionStorageAvailable()) return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Session storage should never block the cache path.
  }
};

export const loadCachedMerchOrdersPageSnapshot = async (): Promise<MerchOrdersPageSnapshot | null> => {
  const sessionSnapshot = readSessionSnapshot();
  if (sessionSnapshot) return sessionSnapshot;
  if (!isIndexedDbAvailable()) return null;
  try {
    const database = await openDatabase();
    return await new Promise<MerchOrdersPageSnapshot | null>((resolve) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(CACHE_KEY);
      request.onsuccess = () => {
        const result = request.result as MerchOrdersPageSnapshot | undefined;
        resolve(result && Array.isArray(result.records) ? result : null);
      };
      request.onerror = () => resolve(null);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
};

export const saveCachedMerchOrdersPageSnapshot = async (
  records: MerchOrderControlRecord[],
  learners: MerchActiveLearnerOption[],
  products: MerchProductOption[],
  lastLoadedFromDbAt: string,
) => {
  if (!isIndexedDbAvailable()) return;
  try {
    const payload: MerchOrdersPageSnapshot = {
      learners,
      lastLoadedFromDbAt,
      products,
      records,
      updatedAt: new Date().toISOString(),
    };
    writeSessionSnapshot({
      learners,
      lastLoadedFromDbAt,
      products,
      records,
      updatedAt: payload.updatedAt,
    });
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(payload, CACHE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to save merch orders cache.'));
    });
    database.close();
  } catch {
    // Cache failures should not block the page.
  }
};
