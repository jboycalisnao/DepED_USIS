import type { MerchActiveLearnerOption, MerchOrderControlRecord, MerchProductOption } from '../services/merchOrderControlService';

const DB_NAME = 'usis_ia_registry';
const DB_VERSION = 1;
const STORE_NAME = 'merch_orders_page_cache';
const CACHE_KEY = 'merch_orders_page';

type MerchOrdersPageSnapshot = {
  learners: MerchActiveLearnerOption[];
  products: MerchProductOption[];
  records: MerchOrderControlRecord[];
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
    request.onerror = () => reject(request.error || new Error('Unable to open merch orders cache database.'));
  });

export const loadCachedMerchOrdersPageSnapshot = async (): Promise<MerchOrdersPageSnapshot | null> => {
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
) => {
  if (!isIndexedDbAvailable()) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put({
        learners,
        products,
        records,
        updatedAt: new Date().toISOString(),
      } satisfies MerchOrdersPageSnapshot, CACHE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to save merch orders cache.'));
    });
    database.close();
  } catch {
    // Cache failures should not block the page.
  }
};
