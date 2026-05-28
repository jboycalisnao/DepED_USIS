
import { useState, useEffect, useCallback } from 'react';
import { AttendanceRecord, AttendanceType } from '../types';
import { normalizeRfidValue } from '../utils/rfid';
import { supabase } from '../lib/supabase';
import {
  loadAttendanceLocalState,
  saveAdminUids,
  saveAttendanceLogs,
  saveUidMappings,
} from '../utils/attendanceStorage';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => UUID_REGEX.test(value);

const generateRecordId = () =>
  crypto.randomUUID?.() || `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const SYNC_INTERVAL_MS = 60 * 1000;
const SYNC_BATCH_SIZE = 50;

export const useAttendance = () => {
  const [uidMappings, setUidMappings] = useState<Record<string, string>>({});
  const [adminUids, setAdminUids] = useState<string[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const localState = await loadAttendanceLocalState();

        let nextUidMappings = localState.uidMappings;
        let nextAdminUids = localState.adminUids;
        let nextAttendanceLogs = localState.attendanceLogs;

        // One-time migration from old localStorage data if IndexedDB is empty.
        if (Object.keys(nextUidMappings).length === 0) {
          const legacy = localStorage.getItem('rfid_mappings');
          if (legacy) nextUidMappings = JSON.parse(legacy) as Record<string, string>;
        }
        if (nextAdminUids.length === 0) {
          const legacy = localStorage.getItem('admin_uids');
          if (legacy) nextAdminUids = JSON.parse(legacy) as string[];
        }
        if (nextAttendanceLogs.length === 0) {
          const legacy = localStorage.getItem('attendance_logs');
          if (legacy) nextAttendanceLogs = JSON.parse(legacy) as AttendanceRecord[];
        }

        const normalizedMappings = Object.fromEntries(
          Object.entries(nextUidMappings).map(([learnerId, uid]) => [learnerId, normalizeRfidValue(uid)])
        );
        const normalizedAdmins = nextAdminUids.map(uid => normalizeRfidValue(uid));
        const normalizedLogs = nextAttendanceLogs.map((log: any) => ({
          ...log,
          id: log.id || generateRecordId(),
          synced: !!log.synced
        }));

        setUidMappings(normalizedMappings);
        setAdminUids(normalizedAdmins);
        setAttendanceLogs(normalizedLogs);

        await Promise.all([
          saveUidMappings(normalizedMappings),
          saveAdminUids(normalizedAdmins),
          saveAttendanceLogs(normalizedLogs),
        ]);
      } catch (error) {
        console.error('Failed to load attendance local state from IndexedDB:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    void hydrate();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    void saveUidMappings(uidMappings);
  }, [uidMappings, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveAdminUids(adminUids);
  }, [adminUids, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    void saveAttendanceLogs(attendanceLogs);
  }, [attendanceLogs, isHydrated]);

  const addMapping = (learnerId: string, uid: string) => {
    setUidMappings(prev => ({ ...prev, [learnerId]: normalizeRfidValue(uid) }));
  };

  const toggleAdmin = (uid: string) => {
    const normalizedUid = normalizeRfidValue(uid);
    setAdminUids(prev => 
      prev.includes(normalizedUid) ? prev.filter(u => u !== normalizedUid) : [...prev, normalizedUid]
    );
  };

  const persistAttendanceRecord = useCallback(async (record: AttendanceRecord) => {
    const payload: Record<string, string> = {
      learner_id: record.learnerId,
      attendance_type: record.type,
      logged_at: record.timestamp,
      source: 'rfid',
    };

    if (isUuid(record.id)) {
      payload.id = record.id;
    }

    const { error } = await supabase
      .from('attendance_records')
      .insert(payload);

    // 23505 = unique violation (already saved by previous sync attempt)
    if (error && error.code !== '23505') {
      throw error;
    }
  }, []);

  const markAsSynced = (recordId: string) => {
    setAttendanceLogs(prev =>
      prev.map(log => (log.id === recordId ? { ...log, synced: true } : log))
    );
  };

  const trySyncRecord = useCallback(async (record: AttendanceRecord) => {
    try {
      await persistAttendanceRecord(record);
      markAsSynced(record.id);
    } catch (error: any) {
      console.error('Attendance sync failed:', {
        recordId: record.id,
        learnerId: record.learnerId,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      // Keep unsynced for local fallback and future retry.
    }
  }, [persistAttendanceRecord]);

  const logAttendance = (learnerId: string, type: AttendanceType) => {
    const record: AttendanceRecord = {
      id: generateRecordId(),
      learnerId,
      type,
      timestamp: new Date().toISOString(),
      synced: false
    };

    // Local-first write for offline safety.
    setAttendanceLogs(prev => [...prev, record]);

    // Cloud write is pooled and pushed on interval/reconnect/page-hide.
  };

  const syncPendingLogs = useCallback(async () => {
    if (!isHydrated) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const pending = attendanceLogs.filter(log => !log.synced).slice(0, SYNC_BATCH_SIZE);
    if (pending.length === 0) return;

    for (const record of pending) {
      // Keep controlled throughput per batch cycle to avoid spike errors.
      // eslint-disable-next-line no-await-in-loop
      await trySyncRecord(record);
    }
  }, [attendanceLogs, trySyncRecord, isHydrated]);

  const deleteRecord = (id: string) => {
    setAttendanceLogs(prev => prev.filter(log => log.id !== id));
    if (!isUuid(id)) return;
    void supabase.from('attendance_records').delete().eq('id', id);
  };

  const removeMapping = (learnerId: string) => {
    setUidMappings(prev => {
      const next = { ...prev };
      delete next[learnerId];
      return next;
    });
  };

  useEffect(() => {
    if (!isHydrated) return;
    const timer = window.setInterval(() => {
      void syncPendingLogs();
    }, SYNC_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [syncPendingLogs, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    // Trigger one immediate sync pass right after hydration.
    void syncPendingLogs();
  }, [syncPendingLogs]);

  useEffect(() => {
    const handleOnline = () => {
      void syncPendingLogs();
    };
    const handlePageHide = () => {
      void syncPendingLogs();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [syncPendingLogs]);

  return { uidMappings, adminUids, attendanceLogs, addMapping, removeMapping, toggleAdmin, logAttendance, deleteRecord };
};
