type TicketCacheEnvelope<T> = {
  cachedAt: number;
  payload: T;
};

const CACHE_PREFIX = 'usis:school-help-portal:';
const CACHE_TTL_MS = 10 * 60 * 1000;
const INDEXED_DB_NAME = 'usis-school-help-portal-cache';
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = 'entries';

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;
const hasIndexedDb = () => typeof window !== 'undefined' && !!window.indexedDB;

function buildKey(scope: string) {
  return `${CACHE_PREFIX}${scope}`;
}

function parseJSON<T>(raw: string | null): TicketCacheEnvelope<T> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TicketCacheEnvelope<T>;
  } catch {
    return null;
  }
}

let indexedDbPromise: Promise<IDBDatabase> | null = null;

function openIndexedDb() {
  if (!hasIndexedDb()) return Promise.reject(new Error('IndexedDB is not available.'));
  if (indexedDbPromise) return indexedDbPromise;

  indexedDbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Unable to open ticket cache.'));
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(INDEXED_DB_STORE)) {
        database.createObjectStore(INDEXED_DB_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

  return indexedDbPromise;
}

async function readIndexedCache<T>(key: string): Promise<TicketCacheEnvelope<T> | null> {
  if (!hasIndexedDb() || !key) return null;
  try {
    const db = await openIndexedDb();
    return await new Promise<TicketCacheEnvelope<T> | null>((resolve, reject) => {
      const transaction = db.transaction(INDEXED_DB_STORE, 'readonly');
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.get(key);
      request.onerror = () => reject(request.error || new Error('Unable to read ticket cache.'));
      request.onsuccess = () => {
        const result = request.result as TicketCacheEnvelope<T> | undefined;
        resolve(result || null);
      };
    });
  } catch {
    return null;
  }
}

async function writeIndexedCache<T>(key: string, payload: T) {
  if (!hasIndexedDb() || !key) return;
  try {
    const db = await openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(INDEXED_DB_STORE, 'readwrite');
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.put({
        key,
        cachedAt: Date.now(),
        payload,
      });
      request.onerror = () => reject(request.error || new Error('Unable to store ticket cache.'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to store ticket cache.'));
    });
  } catch {
    // Ignore IndexedDB failures and continue with localStorage fallback.
  }
}

export async function getPersistentTicketCache<T>(scope: string): Promise<T | null> {
  const key = buildKey(scope);
  const indexed = await readIndexedCache<T>(key);
  if (indexed && Date.now() - indexed.cachedAt <= CACHE_TTL_MS) {
    return indexed.payload ?? null;
  }
  if (!hasWindow()) return null;
  const fallback = parseJSON<T>(window.localStorage.getItem(key));
  if (!fallback || Date.now() - fallback.cachedAt > CACHE_TTL_MS) return null;
  return fallback.payload ?? null;
}

export async function setPersistentTicketCache<T>(scope: string, payload: T) {
  if (!hasWindow()) return;
  const key = buildKey(scope);
  const envelope: TicketCacheEnvelope<T> = {
    cachedAt: Date.now(),
    payload,
  };
  window.localStorage.setItem(key, JSON.stringify(envelope));
  await writeIndexedCache(key, payload);
}
