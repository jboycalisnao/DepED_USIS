import type { PublicEnrollmentSubmission } from '../types';

type PublicEnrollmentSubmissionsCachePayload = {
  lastLoadedFromDbAt: string;
  updatedAt: string;
  rows: PublicEnrollmentSubmission[];
};

const CACHE_PREFIX = 'registrar_public_enrollment_submissions_cache_v4';
const LEGACY_LOCAL_STORAGE_PREFIX = 'registrar_public_enrollment_submissions_cache_v3';
const DB_NAME = 'registrar_public_enrollment_submissions_cache';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const memorySnapshots = new Map<string, PublicEnrollmentSubmissionsCachePayload>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

export const normalizePublicEnrollmentSubmissionsCacheScopeKey = (
  scopeKey: string,
  schoolYearLabel: string,
) => {
  const normalizedScopeKey = String(scopeKey || '').trim() || 'unscoped';
  const normalizedSchoolYear = String(schoolYearLabel || '').trim() || 'unscoped';
  return `${normalizedScopeKey}::${normalizedSchoolYear}`;
};

const getPublicEnrollmentSubmissionsCacheKeys = (scopeKey: string, schoolYearLabel = '') => {
  const normalizedScopeKey = String(scopeKey || '').trim() || 'unscoped';
  const normalizedSchoolYear = String(schoolYearLabel || '').trim() || 'unscoped';
  const primaryKey = `${CACHE_PREFIX}:${normalizedScopeKey}::${normalizedSchoolYear}`;
  const legacySchoolYearKey = `${CACHE_PREFIX}:${normalizedSchoolYear}`;
  const legacyScopeKey = `${CACHE_PREFIX}:${normalizedScopeKey}`;
  return Array.from(new Set([primaryKey, legacySchoolYearKey, legacyScopeKey]));
};

const getLegacyLocalStorageKeys = (scopeKey: string, schoolYearLabel = '') => {
  const normalizedScopeKey = String(scopeKey || '').trim() || 'unscoped';
  const normalizedSchoolYear = String(schoolYearLabel || '').trim() || 'unscoped';
  return Array.from(new Set([
    `${LEGACY_LOCAL_STORAGE_PREFIX}:${normalizedScopeKey}::${normalizedSchoolYear}`,
    `${LEGACY_LOCAL_STORAGE_PREFIX}:${normalizedSchoolYear}`,
    `${LEGACY_LOCAL_STORAGE_PREFIX}:${normalizedScopeKey}`,
  ]));
};

const readLegacyLocalSnapshot = (scopeKey: string, schoolYearLabel = ''): PublicEnrollmentSubmissionsCachePayload | null => {
  if (typeof window === 'undefined') return null;

  for (const key of getLegacyLocalStorageKeys(scopeKey, schoolYearLabel)) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as Partial<PublicEnrollmentSubmissionsCachePayload>;
      if (!Array.isArray(parsed.rows) || !parsed.updatedAt) continue;
      return {
        lastLoadedFromDbAt: String(parsed.lastLoadedFromDbAt || ''),
        updatedAt: String(parsed.updatedAt),
        rows: parsed.rows as PublicEnrollmentSubmission[],
      };
    } catch {
      // Ignore malformed legacy cache entries.
    }
  }

  return null;
};

const normalizeRows = (rows: PublicEnrollmentSubmission[]) =>
  [...rows].sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());

const getDb = async () => {
  if (typeof indexedDB === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Unable to open enrollment cache database.'));
    }).catch(() => null);
  }
  return dbPromise;
};

const readIndexedSnapshot = async (key: string): Promise<PublicEnrollmentSubmissionsCachePayload | null> => {
  const db = await getDb();
  if (!db) return null;

  return await new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      const parsed = request.result as Partial<PublicEnrollmentSubmissionsCachePayload> | undefined;
      if (!parsed || !Array.isArray(parsed.rows) || !parsed.updatedAt) {
        resolve(null);
        return;
      }
      resolve({
        lastLoadedFromDbAt: String(parsed.lastLoadedFromDbAt || ''),
        updatedAt: String(parsed.updatedAt),
        rows: parsed.rows as PublicEnrollmentSubmission[],
      });
    };

    request.onerror = () => resolve(null);
  });
};

const writeIndexedSnapshot = async (key: string, payload: PublicEnrollmentSubmissionsCachePayload) => {
  const db = await getDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(payload, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
};

export const peekPublicEnrollmentSubmissionsSnapshot = (
  scopeKey: string,
  schoolYearLabel = ''
): PublicEnrollmentSubmissionsCachePayload | null => {
  const keys = getPublicEnrollmentSubmissionsCacheKeys(scopeKey, schoolYearLabel);
  for (const key of keys) {
    const snapshot = memorySnapshots.get(key);
    if (snapshot) return snapshot;
  }
  return null;
};

export const readPublicEnrollmentSubmissionsSnapshot = async (
  scopeKey: string,
  schoolYearLabel = ''
): Promise<PublicEnrollmentSubmissionsCachePayload | null> => {
  const keys = getPublicEnrollmentSubmissionsCacheKeys(scopeKey, schoolYearLabel);
  for (const key of keys) {
    const snapshot = memorySnapshots.get(key) || (await readIndexedSnapshot(key));
    if (snapshot) return snapshot;
  }

  const legacySnapshot = readLegacyLocalSnapshot(scopeKey, schoolYearLabel);
  if (legacySnapshot) {
    await writePublicEnrollmentSubmissionsSnapshot(
      scopeKey,
      legacySnapshot.rows,
      schoolYearLabel,
      legacySnapshot.lastLoadedFromDbAt
    );
    return legacySnapshot;
  }

  return null;
};

export const writePublicEnrollmentSubmissionsSnapshot = async (
  scopeKey: string,
  rows: PublicEnrollmentSubmission[],
  schoolYearLabel = '',
  lastLoadedFromDbAt = '',
) => {
  const keys = getPublicEnrollmentSubmissionsCacheKeys(scopeKey, schoolYearLabel);
  const primaryKey = keys[0];
  const existingSnapshot = memorySnapshots.get(primaryKey) || await readIndexedSnapshot(primaryKey);
  const payload: PublicEnrollmentSubmissionsCachePayload = {
    lastLoadedFromDbAt: String(lastLoadedFromDbAt || existingSnapshot?.lastLoadedFromDbAt || ''),
    updatedAt: new Date().toISOString(),
    rows: normalizeRows(rows),
  };

  for (const key of keys) {
    memorySnapshots.set(key, payload);
    await writeIndexedSnapshot(key, payload);
  }
  return payload;
};

export const upsertPublicEnrollmentSubmissionsSnapshotRow = async (
  scopeKey: string,
  row: PublicEnrollmentSubmission,
  schoolYearLabel = '',
) => {
  const trimmedId = String(row.id || '').trim();
  if (!trimmedId) return;

  const existing = await readPublicEnrollmentSubmissionsSnapshot(scopeKey, schoolYearLabel);
  const rows = normalizeRows([
    ...((existing?.rows || []).filter((entry) => String(entry.id || '').trim() !== trimmedId)),
    row,
  ]);

  await writePublicEnrollmentSubmissionsSnapshot(scopeKey, rows, schoolYearLabel);
};

export const removePublicEnrollmentSubmissionsSnapshotRow = async (
  scopeKey: string,
  submissionId: string,
  schoolYearLabel = '',
) => {
  const trimmedId = String(submissionId || '').trim();
  if (!trimmedId) return;

  const existing = await readPublicEnrollmentSubmissionsSnapshot(scopeKey, schoolYearLabel);
  const rows = (existing?.rows || []).filter((row) => String(row.id || '').trim() !== trimmedId);
  await writePublicEnrollmentSubmissionsSnapshot(scopeKey, rows, schoolYearLabel);
};
