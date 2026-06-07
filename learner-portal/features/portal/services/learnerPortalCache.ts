type CacheEnvelope<T> = {
  updatedAt: number;
  payload: T;
};

const CACHE_PREFIX = 'usis:learner-portal:';
const CACHE_TTL_MS = 10 * 60 * 1000;
const INDEXED_DB_NAME = 'usis-learner-portal-cache';
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = 'entries';

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;
const hasIndexedDb = () => typeof window !== 'undefined' && !!window.indexedDB;

function buildKey(scope: string, learnerKey: string) {
  return `${CACHE_PREFIX}${scope}:${learnerKey}`;
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function resolveLearnerCacheKey(input: { learnerId?: string; lrn?: string }) {
  const learnerId = String(input.learnerId || '').trim();
  const lrn = String(input.lrn || '').trim();
  if (learnerId) return `id:${learnerId}`;
  if (lrn) return `lrn:${lrn}`;
  return '';
}

export function getCachedLearnerData<T>(scope: string, learnerKey: string): T | null {
  if (!hasWindow() || !learnerKey) return null;
  const key = buildKey(scope, learnerKey);
  const envelope = parseJSON<CacheEnvelope<T>>(window.localStorage.getItem(key));
  if (!envelope || typeof envelope.updatedAt !== 'number') return null;
  if (Date.now() - envelope.updatedAt > CACHE_TTL_MS) return null;
  return envelope.payload ?? null;
}

export function setCachedLearnerData<T>(scope: string, learnerKey: string, payload: T) {
  if (!hasWindow() || !learnerKey) return;
  const key = buildKey(scope, learnerKey);
  const envelope: CacheEnvelope<T> = {
    updatedAt: Date.now(),
    payload,
  };
  window.localStorage.setItem(key, JSON.stringify(envelope));
}

type IndexedCacheRecord<T> = CacheEnvelope<T> & {
  key: string;
};

let indexedDbPromise: Promise<IDBDatabase> | null = null;

function openIndexedDb() {
  if (!hasIndexedDb()) return Promise.reject(new Error('IndexedDB is not available.'));
  if (indexedDbPromise) return indexedDbPromise;

  indexedDbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);
    request.onerror = () => reject(request.error || new Error('Unable to open learner portal cache.'));
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

async function readIndexedCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  if (!hasIndexedDb() || !key) return null;
  try {
    const db = await openIndexedDb();
    return await new Promise<CacheEnvelope<T> | null>((resolve, reject) => {
      const transaction = db.transaction(INDEXED_DB_STORE, 'readonly');
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.get(key);
      request.onerror = () => reject(request.error || new Error('Unable to read learner portal cache.'));
      request.onsuccess = () => {
        const result = request.result as IndexedCacheRecord<T> | undefined;
        resolve(result ? { updatedAt: result.updatedAt, payload: result.payload } : null);
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
        updatedAt: Date.now(),
        payload,
      } satisfies IndexedCacheRecord<T>);
      request.onerror = () => reject(request.error || new Error('Unable to store learner portal cache.'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to store learner portal cache.'));
    });
  } catch {
    // Fallback remains localStorage; ignore IndexedDB failures.
  }
}

async function clearIndexedCache() {
  if (!hasIndexedDb()) return;
  try {
    const db = await openIndexedDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(INDEXED_DB_STORE, 'readwrite');
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.clear();
      request.onerror = () => reject(request.error || new Error('Unable to clear learner portal cache.'));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('Unable to clear learner portal cache.'));
    });
  } catch {
    // Ignore cache clear failures.
  }
}

export async function getPersistentCachedLearnerData<T>(scope: string, learnerKey: string): Promise<T | null> {
  if (!learnerKey) return null;
  const key = buildKey(scope, learnerKey);
  const indexed = await readIndexedCache<T>(key);
  if (indexed) return indexed.payload ?? null;
  if (!hasWindow()) return null;
  const fallback = parseJSON<CacheEnvelope<T>>(window.localStorage.getItem(key));
  return fallback?.payload ?? null;
}

export async function setPersistentCachedLearnerData<T>(scope: string, learnerKey: string, payload: T) {
  if (!hasWindow() || !learnerKey) return;
  const key = buildKey(scope, learnerKey);
  const envelope: CacheEnvelope<T> = {
    updatedAt: Date.now(),
    payload,
  };
  window.localStorage.setItem(key, JSON.stringify(envelope));
  await writeIndexedCache(key, payload);
}

export function clearLearnerPortalCache() {
  if (!hasWindow()) return;
  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    if (key.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  void clearIndexedCache();
}
