import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SmsQueueItem, SmsQueueLogEntry, SmsQueueLogLevel, SmsQueueStatus } from '../../../types';
import { sendSkySmsNotification } from '../services/skySmsNotification';
import {
  clearSmsQueueStorage,
  loadSmsQueueStorage,
  saveSmsQueueStorage,
  type SmsQueueStorageSnapshot,
} from '../utils/smsQueueStorage';

export interface SmsQueueRequest {
  learnerId: string;
  learnerName: string;
  phoneNumber: string;
  message: string;
  apiKey: string;
}

export interface SmsQueueStats {
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  total: number;
}

interface QueueSnapshot {
  queueItems: SmsQueueItem[];
  logEntries: SmsQueueLogEntry[];
}

const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const randomDelayMs = () => 1000 + Math.floor(Math.random() * 1001);

const normalizeStatus = (value: unknown): SmsQueueStatus => {
  const status = String(value || '').trim();
  if (status === 'sending' || status === 'sent' || status === 'failed') return status;
  return 'queued';
};

const normalizeLogLevel = (value: unknown): SmsQueueLogLevel => {
  const level = String(value || '').trim();
  if (level === 'success' || level === 'error') return level;
  return 'info';
};

const normalizeQueueItem = (item: Partial<SmsQueueItem>): SmsQueueItem => {
  const queuedAt = String(item.queuedAt || item.updatedAt || new Date().toISOString());
  const updatedAt = String(item.updatedAt || queuedAt);

  return {
    id: String(item.id || createId()),
    learnerId: String(item.learnerId || ''),
    learnerName: String(item.learnerName || 'Unnamed learner'),
    phoneNumber: String(item.phoneNumber || ''),
    message: String(item.message || ''),
    apiKey: String(item.apiKey || ''),
    status: normalizeStatus(item.status),
    attempts: Number.isFinite(Number(item.attempts)) ? Number(item.attempts) : 0,
    queuedAt,
    updatedAt,
    startedAt: item.startedAt ?? null,
    completedAt: item.completedAt ?? null,
    responseMessage: item.responseMessage ?? null,
    errorMessage: item.errorMessage ?? null,
  };
};

const normalizeLogEntry = (entry: Partial<SmsQueueLogEntry>): SmsQueueLogEntry => ({
  id: String(entry.id || createId()),
  queueItemId: String(entry.queueItemId || ''),
  timestamp: String(entry.timestamp || new Date().toISOString()),
  level: normalizeLogLevel(entry.level),
  title: String(entry.title || 'SMS log'),
  detail: entry.detail ?? null,
});

const normalizeSnapshot = (snapshot: SmsQueueStorageSnapshot | null): QueueSnapshot => ({
  queueItems: Array.isArray(snapshot?.queueItems) ? snapshot!.queueItems.map((item) => normalizeQueueItem(item)) : [],
  logEntries: Array.isArray(snapshot?.logEntries) ? snapshot!.logEntries.map((entry) => normalizeLogEntry(entry)) : [],
});

const createLogEntry = (queueItemId: string, level: SmsQueueLogLevel, title: string, detail?: string | null): SmsQueueLogEntry => ({
  id: createId(),
  queueItemId,
  timestamp: new Date().toISOString(),
  level,
  title,
  detail: detail ?? null,
});

export const useSmsNotificationQueue = () => {
  const [queueItems, setQueueItems] = useState<SmsQueueItem[]>([]);
  const [logEntries, setLogEntries] = useState<SmsQueueLogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasHydratedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const queueItemsRef = useRef<SmsQueueItem[]>([]);
  const logEntriesRef = useRef<SmsQueueLogEntry[]>([]);

  const persist = useCallback((nextQueueItems: SmsQueueItem[], nextLogEntries: SmsQueueLogEntry[]) => {
    saveSmsQueueStorage({
      queueItems: nextQueueItems,
      logEntries: nextLogEntries,
    });
  }, []);

  const setQueueItemsAndPersist = useCallback(
    (nextQueueItems: SmsQueueItem[]) => {
      queueItemsRef.current = nextQueueItems;
      setQueueItems(nextQueueItems);
      if (hasHydratedRef.current) {
        persist(nextQueueItems, logEntriesRef.current);
      }
    },
    [persist],
  );

  const setLogEntriesAndPersist = useCallback(
    (nextLogEntries: SmsQueueLogEntry[]) => {
      logEntriesRef.current = nextLogEntries;
      setLogEntries(nextLogEntries);
      if (hasHydratedRef.current) {
        persist(queueItemsRef.current, nextLogEntries);
      }
    },
    [persist],
  );

  const appendLog = useCallback(
    (entry: SmsQueueLogEntry) => {
      setLogEntriesAndPersist([...logEntriesRef.current, entry]);
    },
    [setLogEntriesAndPersist],
  );

  useEffect(() => {
    const snapshot = normalizeSnapshot(loadSmsQueueStorage());
    const recoveredCount = snapshot.queueItems.filter((item) => item.status === 'sending').length;
    const recoveredQueueItems = snapshot.queueItems.map((item) =>
      item.status === 'sending'
        ? {
            ...item,
            status: 'queued',
            startedAt: null,
            updatedAt: new Date().toISOString(),
            responseMessage: null,
            errorMessage: null,
          }
        : item,
    );
    const recoveredLogs = recoveredCount
      ? [
          ...snapshot.logEntries,
          createLogEntry('system', 'info', 'Recovered SMS queue after reload', `${recoveredCount} request${recoveredCount === 1 ? '' : 's'} returned to the queue.`),
        ]
      : snapshot.logEntries;

    queueItemsRef.current = recoveredQueueItems;
    logEntriesRef.current = recoveredLogs;
    setQueueItems(recoveredQueueItems);
    setLogEntries(recoveredLogs);
    hasHydratedRef.current = true;
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      while (true) {
        const nextItem = queueItemsRef.current.find((item) => item.status === 'queued');
        if (!nextItem) break;

        const startedAt = new Date().toISOString();
        const sendingItems = queueItemsRef.current.map((item) =>
          item.id === nextItem.id
            ? {
                ...item,
                status: 'sending',
                attempts: item.attempts + 1,
                startedAt,
                updatedAt: startedAt,
                responseMessage: null,
                errorMessage: null,
              }
            : item,
        );
        setQueueItemsAndPersist(sendingItems);
        appendLog(createLogEntry(nextItem.id, 'info', 'SMS request queued for delivery', `${nextItem.learnerName} - ${nextItem.phoneNumber}`));

        try {
          const response = await sendSkySmsNotification({
            apiKey: nextItem.apiKey,
            phoneNumber: nextItem.phoneNumber,
            message: nextItem.message,
          });

          const completedAt = new Date().toISOString();
          const responseMessage = response.message || 'SkySMS accepted the request.';
          const sentItems = queueItemsRef.current.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: 'sent',
                  completedAt,
                  updatedAt: completedAt,
                  responseMessage,
                  errorMessage: null,
                }
              : item,
          );
          setQueueItemsAndPersist(sentItems);
          appendLog(createLogEntry(nextItem.id, 'success', 'SMS request delivered', responseMessage));
        } catch (error: any) {
          const completedAt = new Date().toISOString();
          const errorMessage = error?.message || 'Unable to send SMS through SkySMS.';
          const failedItems = queueItemsRef.current.map((item) =>
            item.id === nextItem.id
              ? {
                  ...item,
                  status: 'failed',
                  completedAt,
                  updatedAt: completedAt,
                  responseMessage: null,
                  errorMessage,
                }
              : item,
          );
          setQueueItemsAndPersist(failedItems);
          appendLog(createLogEntry(nextItem.id, 'error', 'SMS request failed', errorMessage));
        }

        const hasMoreQueued = queueItemsRef.current.some((item) => item.status === 'queued');
        if (hasMoreQueued) {
          await delay(randomDelayMs());
        }
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [appendLog, setQueueItemsAndPersist]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (queueItemsRef.current.some((item) => item.status === 'queued')) {
      void processQueue();
    }
  }, [processQueue, queueItems]);

  const enqueueRequests = useCallback(
    (requests: SmsQueueRequest[]) => {
      if (requests.length === 0) return 0;

      const now = new Date().toISOString();
      const queueBatch = requests.map<SmsQueueItem>((request) => ({
        id: createId(),
        learnerId: request.learnerId,
        learnerName: request.learnerName,
        phoneNumber: request.phoneNumber,
        message: request.message,
        apiKey: request.apiKey,
        status: 'queued',
        attempts: 0,
        queuedAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null,
        responseMessage: null,
        errorMessage: null,
      }));
      const batchLogs = queueBatch.map((item) =>
        createLogEntry(item.id, 'info', 'SMS request queued', `${item.learnerName} - ${item.phoneNumber}`),
      );

      const nextQueueItems = [...queueItemsRef.current, ...queueBatch];
      const nextLogEntries = [...logEntriesRef.current, ...batchLogs];
      setQueueItemsAndPersist(nextQueueItems);
      setLogEntriesAndPersist(nextLogEntries);

      void processQueue();
      return queueBatch.length;
    },
    [processQueue, setLogEntriesAndPersist, setQueueItemsAndPersist],
  );

  const clearHistory = useCallback(() => {
    queueItemsRef.current = [];
    logEntriesRef.current = [];
    setQueueItems([]);
    setLogEntries([]);
    clearSmsQueueStorage();
  }, []);

  const stats = useMemo<SmsQueueStats>(() => {
    const queued = queueItems.filter((item) => item.status === 'queued').length;
    const sending = queueItems.filter((item) => item.status === 'sending').length;
    const sent = queueItems.filter((item) => item.status === 'sent').length;
    const failed = queueItems.filter((item) => item.status === 'failed').length;

    return {
      queued,
      sending,
      sent,
      failed,
      total: queueItems.length,
    };
  }, [queueItems]);

  return {
    queueItems,
    logEntries,
    enqueueRequests,
    clearHistory,
    isProcessing,
    stats,
  };
};
