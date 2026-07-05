import { Learner, Section } from '../types';

const DB_NAME = 'usis_attendance_db';
const DB_VERSION = 2;
const STORE_NAME = 'kv';

const LEARNERS_KEY = 'attendance_learner_roster';
const SECTIONS_KEY = 'attendance_section_catalog';
const UPDATED_AT_KEY = 'attendance_learner_roster_updated_at';
const SYNC_META_KEY = 'attendance_learner_roster_sync_meta';

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

export interface LearnerRosterCache {
  learners: Learner[];
  sections: Section[];
  updatedAt: string;
}

export interface LearnerRosterSyncMeta {
  learnersUpdatedAt: string;
  sectionsUpdatedAt: string;
  schoolYearId: string;
  syncedAt: string;
}

export const loadLearnerRosterCache = async (): Promise<LearnerRosterCache | null> => {
  const [learners, sections, updatedAt] = await Promise.all([
    getValue<Learner[]>(LEARNERS_KEY),
    getValue<Section[]>(SECTIONS_KEY),
    getValue<string>(UPDATED_AT_KEY),
  ]);

  if (!learners && !sections) return null;

  return {
    learners: learners || [],
    sections: sections || [],
    updatedAt: updatedAt || '',
  };
};

export const saveLearnerRosterCache = async (value: { learners: Learner[]; sections: Section[] }): Promise<void> => {
  const updatedAt = new Date().toISOString();
  await Promise.all([
    setValue(LEARNERS_KEY, value.learners),
    setValue(SECTIONS_KEY, value.sections),
    setValue(UPDATED_AT_KEY, updatedAt),
  ]);
};

export const loadLearnerRosterSyncMeta = async (): Promise<LearnerRosterSyncMeta | null> => {
  return getValue<LearnerRosterSyncMeta>(SYNC_META_KEY);
};

export const saveLearnerRosterSyncMeta = async (value: LearnerRosterSyncMeta): Promise<void> => {
  await setValue(SYNC_META_KEY, value);
};
