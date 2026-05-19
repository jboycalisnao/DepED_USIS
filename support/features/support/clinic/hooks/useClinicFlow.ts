import { useMemo, useState } from 'react';
import type { ClinicQueueEntry, ClinicRegistryFilter, ClinicVisitInput, ClinicVisitRecord } from '../types';
import { buildVisitCode } from '../utils/buildVisitCode';
import { loadClinicStorage, saveClinicStorage } from '../utils/clinicStorage';

type ClinicStore = {
  queue: ClinicQueueEntry[];
  history: ClinicVisitRecord[];
};

const DEFAULT_STORE: ClinicStore = {
  queue: [],
  history: [],
};

export function useClinicFlow() {
  const [store, setStore] = useState<ClinicStore>(() => loadClinicStorage(DEFAULT_STORE));
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  const selectedQueueEntry = useMemo(
    () => store.queue.find((entry) => entry.id === selectedQueueId) ?? null,
    [store.queue, selectedQueueId],
  );

  const persistStore = (next: ClinicStore) => {
    setStore(next);
    saveClinicStorage(next);
  };

  const registerVisit = (payload: Omit<ClinicQueueEntry, 'id' | 'queuedAt'>) => {
    const nextEntry: ClinicQueueEntry = {
      id: `queue-${Date.now()}`,
      learnerLrn: payload.learnerLrn,
      learnerName: payload.learnerName,
      sex: payload.sex,
      age: payload.age,
      gradeSection: payload.gradeSection,
      concern: payload.concern,
      referredBy: payload.referredBy,
      queuedAt: new Date().toISOString(),
    };

    const nextStore: ClinicStore = {
      ...store,
      queue: [nextEntry, ...store.queue],
    };

    persistStore(nextStore);
    setSelectedQueueId(nextEntry.id);
  };

  const completeVisit = (payload: ClinicVisitInput) => {
    const queueEntry = store.queue.find((entry) => entry.id === payload.queueId);
    if (!queueEntry) {
      return;
    }

    const visitRecord: ClinicVisitRecord = {
      id: `visit-${Date.now()}`,
      visitCode: buildVisitCode(),
      learnerLrn: queueEntry.learnerLrn,
      learnerName: queueEntry.learnerName,
      sex: queueEntry.sex,
      age: queueEntry.age,
      gradeSection: queueEntry.gradeSection,
      concern: queueEntry.concern,
      referredBy: queueEntry.referredBy,
      bloodPressure: payload.bloodPressure,
      temperatureC: payload.temperatureC,
      pulseBpm: payload.pulseBpm,
      respiratoryRate: payload.respiratoryRate,
      oxygenSaturation: payload.oxygenSaturation,
      heightCm: payload.heightCm,
      weightKg: payload.weightKg,
      notes: payload.notes,
      actionTaken: payload.actionTaken,
      disposition: payload.disposition,
      followUpDate: payload.followUpDate,
      assessedAt: new Date().toISOString(),
    };

    const nextStore: ClinicStore = {
      queue: store.queue.filter((entry) => entry.id !== payload.queueId),
      history: [visitRecord, ...store.history],
    };

    persistStore(nextStore);
    setSelectedQueueId((current) => (current === payload.queueId ? null : current));
  };

  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const completedToday = store.history.filter((item) => new Date(item.assessedAt).toDateString() === today).length;
    const referredCount = store.history.filter((item) => item.disposition === 'Referred to Hospital').length;

    return {
      queued: store.queue.length,
      completedToday,
      totalRecords: store.history.length,
      referredCount,
    };
  }, [store.history, store.queue.length]);

  const getFilteredHistory = (filter: ClinicRegistryFilter) => {
    const normalizedQuery = filter.query.trim().toLowerCase();

    return store.history.filter((record) => {
      const matchesDisposition = filter.disposition === 'All' || record.disposition === filter.disposition;
      if (!matchesDisposition) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = `${record.visitCode} ${record.learnerLrn} ${record.learnerName} ${record.gradeSection} ${record.concern}`.toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  };

  return {
    queue: store.queue,
    history: store.history,
    metrics,
    selectedQueueEntry,
    selectedQueueId,
    setSelectedQueueId,
    registerVisit,
    completeVisit,
    getFilteredHistory,
  };
}
