import type { SmsQueueItem, SmsQueueLogEntry } from '../../../types';

const STORAGE_KEY = 'attendance_sms_queue_state_v1';

export interface SmsQueueStorageSnapshot {
  queueItems: SmsQueueItem[];
  logEntries: SmsQueueLogEntry[];
}

const safeParse = (raw: string | null): SmsQueueStorageSnapshot | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SmsQueueStorageSnapshot>;
    return {
      queueItems: Array.isArray(parsed.queueItems) ? (parsed.queueItems as SmsQueueItem[]) : [],
      logEntries: Array.isArray(parsed.logEntries) ? (parsed.logEntries as SmsQueueLogEntry[]) : [],
    };
  } catch {
    return null;
  }
};

export const loadSmsQueueStorage = (): SmsQueueStorageSnapshot | null => {
  if (typeof window === 'undefined') return null;
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

export const saveSmsQueueStorage = (value: SmsQueueStorageSnapshot): void => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      queueItems: value.queueItems,
      logEntries: value.logEntries,
    }),
  );
};

export const clearSmsQueueStorage = (): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};
