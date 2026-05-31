
import { useState, useEffect, useCallback } from 'react';
import {
  AttendanceDailySummaryRow,
  AttendanceMonthlySummaryRow,
  AttendanceRecord,
  AttendanceReportResult,
  AttendanceWeeklySummaryRow,
  AttendanceType,
} from '../types';
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
const REMOTE_FETCH_LIMIT = 5000;
const RAW_RETENTION_DAYS = 90;

const mapRemoteRowToAttendanceRecord = (row: any): AttendanceRecord | null => {
  const id = String(row?.id || '').trim();
  const learnerId = String(row?.learner_id || '').trim();
  const type = String(row?.attendance_type || '').trim() as AttendanceType;
  const timestamp = String(row?.logged_at || '').trim();
  if (!id || !learnerId || !type || !timestamp) return null;
  return {
    id,
    learnerId,
    type,
    timestamp,
    synced: true,
  };
};

const mergeAttendanceRecords = (localRecords: AttendanceRecord[], remoteRecords: AttendanceRecord[]) => {
  const merged = new Map<string, AttendanceRecord>();
  for (const record of remoteRecords) merged.set(record.id, record);
  for (const record of localRecords) {
    const existing = merged.get(record.id);
    if (!existing) {
      merged.set(record.id, record);
      continue;
    }
    merged.set(record.id, {
      ...existing,
      synced: existing.synced || record.synced,
    });
  }
  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

const toIsoDate = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = `${value.getMonth() + 1}`.padStart(2, '0');
  const dd = `${value.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const useAttendance = () => {
  const [uidMappings, setUidMappings] = useState<Record<string, string>>({});
  const [adminUids, setAdminUids] = useState<string[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const loadRemoteAttendanceRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id,learner_id,attendance_type,logged_at')
      .order('logged_at', { ascending: false })
      .limit(REMOTE_FETCH_LIMIT);
    if (error) throw error;
    return (data || [])
      .map(mapRemoteRowToAttendanceRecord)
      .filter(Boolean) as AttendanceRecord[];
  }, []);

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

        let mergedLogs = normalizedLogs;
        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            const remoteLogs = await loadRemoteAttendanceRecords();
            mergedLogs = mergeAttendanceRecords(normalizedLogs, remoteLogs);
          } catch (remoteError) {
            console.error('Failed to fetch remote attendance records:', remoteError);
          }
        }

        setUidMappings(normalizedMappings);
        setAdminUids(normalizedAdmins);
        setAttendanceLogs(mergedLogs);

        await Promise.all([
          saveUidMappings(normalizedMappings),
          saveAdminUids(normalizedAdmins),
          saveAttendanceLogs(mergedLogs),
        ]);
      } catch (error) {
        console.error('Failed to load attendance local state from IndexedDB:', error);
      } finally {
        setIsHydrated(true);
      }
    };

    void hydrate();
  }, [loadRemoteAttendanceRecords]);

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
    const loggedAt = new Date(record.timestamp);
    const startOfDay = new Date(loggedAt);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(loggedAt);
    endOfDay.setHours(23, 59, 59, 999);

    const existing = await supabase
      .from('attendance_records')
      .select('id')
      .eq('learner_id', record.learnerId)
      .eq('attendance_type', record.type)
      .gte('logged_at', startOfDay.toISOString())
      .lte('logged_at', endOfDay.toISOString())
      .limit(1)
      .maybeSingle();

    if (existing.error && existing.error.code !== 'PGRST116') {
      throw existing.error;
    }
    if (existing.data?.id) {
      return;
    }

    const payload: Record<string, string> = {
      learner_id: record.learnerId,
      attendance_type: record.type,
      logged_at: record.timestamp,
      source: 'rfid',
    };

    if (isUuid(record.id)) {
      payload.id = record.id;
    }

    const { error } = await supabase.from('attendance_records').insert(payload);
    if (error) throw error;
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

    try {
      const remoteLogs = await loadRemoteAttendanceRecords();
      setAttendanceLogs((prev) => mergeAttendanceRecords(prev, remoteLogs));
    } catch (error) {
      console.error('Failed to refresh attendance records from database:', error);
    }
  }, [attendanceLogs, trySyncRecord, isHydrated, loadRemoteAttendanceRecords]);

  const deleteRecord = (record: AttendanceRecord) => {
    setAttendanceLogs(prev => prev.filter(log => log.id !== record.id));

    if (!record.synced) return;

    if (isUuid(record.id)) {
      void supabase.from('attendance_records').delete().eq('id', record.id);
      return;
    }

    // Fallback delete path for rare synced rows without uuid IDs.
    void supabase
      .from('attendance_records')
      .delete()
      .eq('learner_id', record.learnerId)
      .eq('attendance_type', record.type)
      .eq('logged_at', record.timestamp);
  };

  const removeMapping = (learnerId: string) => {
    setUidMappings(prev => {
      const next = { ...prev };
      delete next[learnerId];
      return next;
    });
  };

  const queryRecordsByDateRange = useCallback(async (fromDate: string, toDate: string): Promise<AttendanceReportResult> => {
    const today = new Date();
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - RAW_RETENTION_DAYS);
    const cutoffDate = toIsoDate(cutoff);

    const normalizedFrom = fromDate || cutoffDate;
    const normalizedTo = toDate || toIsoDate(today);
    const shouldUseSummary = normalizedTo < cutoffDate;

    if (!shouldUseSummary) {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id,learner_id,attendance_type,logged_at')
        .gte('logged_at', `${normalizedFrom}T00:00:00.000Z`)
        .lte('logged_at', `${normalizedTo}T23:59:59.999Z`)
        .order('logged_at', { ascending: false })
        .limit(REMOTE_FETCH_LIMIT);
      if (error) throw error;
      const rawRecords = (data || [])
        .map(mapRemoteRowToAttendanceRecord)
        .filter(Boolean) as AttendanceRecord[];
      return { mode: 'raw', rawRecords, summaryRows: [] };
    }

    const { data, error } = await supabase
      .from('attendance_daily_summary')
      .select('learner_id,attendance_date,am_in,am_out,pm_in,pm_out,unscheduled_count,last_station_no')
      .gte('attendance_date', normalizedFrom)
      .lte('attendance_date', normalizedTo)
      .order('attendance_date', { ascending: false })
      .limit(REMOTE_FETCH_LIMIT);
    if (error) throw error;
    const summaryRows: AttendanceDailySummaryRow[] = (data || []).map((row: any) => ({
      learnerId: String(row.learner_id || '').trim(),
      attendanceDate: String(row.attendance_date || '').trim(),
      amIn: row.am_in ? String(row.am_in) : null,
      amOut: row.am_out ? String(row.am_out) : null,
      pmIn: row.pm_in ? String(row.pm_in) : null,
      pmOut: row.pm_out ? String(row.pm_out) : null,
      unscheduledCount: Number(row.unscheduled_count || 0),
      lastStationNo: row.last_station_no == null ? null : Number(row.last_station_no),
    }));
    return { mode: 'summary', rawRecords: [], summaryRows };
  }, []);

  const querySummaryByDateRange = useCallback(
    async (fromDate: string, toDate: string): Promise<{
      weekly: AttendanceWeeklySummaryRow[];
      monthly: AttendanceMonthlySummaryRow[];
    }> => {
      const { data: dailyRows, error: dailyError } = await supabase
        .from('attendance_daily_summary')
        .select('attendance_date,am_in,am_out,pm_in,pm_out,learner_id')
        .gte('attendance_date', fromDate)
        .lte('attendance_date', toDate)
        .limit(REMOTE_FETCH_LIMIT);
      if (dailyError) throw dailyError;

      const { data: learnerRows, error: learnerError } = await supabase
        .from('registrar_learners')
        .select('id,grade_level,section_id');
      if (learnerError) throw learnerError;

      const { data: sectionRows, error: sectionError } = await supabase
        .from('registrar_sections')
        .select('id,name,grade_level');
      if (sectionError) throw sectionError;

      const learnerMap = new Map<string, { gradeLevel: string; sectionId: string | null }>();
      (learnerRows || []).forEach((row: any) => {
        learnerMap.set(String(row.id), {
          gradeLevel: String(row.grade_level || 'Unknown'),
          sectionId: row.section_id ? String(row.section_id) : null,
        });
      });

      const sectionMap = new Map<string, { name: string; gradeLevel: string }>();
      (sectionRows || []).forEach((row: any) => {
        sectionMap.set(String(row.id), {
          name: String(row.name || 'No Section'),
          gradeLevel: String(row.grade_level || 'Unknown'),
        });
      });

      const weeklyMap = new Map<string, AttendanceWeeklySummaryRow>();
      (dailyRows || []).forEach((row: any) => {
        const date = new Date(`${row.attendance_date}T00:00:00`);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        date.setDate(date.getDate() + diff);
        const weekStart = toIsoDate(date);

        const learner = learnerMap.get(String(row.learner_id));
        const section = learner?.sectionId ? sectionMap.get(learner.sectionId) : undefined;
        const sectionName = section?.name || 'No Section';
        const gradeLevel = section?.gradeLevel || learner?.gradeLevel || 'Unknown';
        const key = `${weekStart}|${sectionName}|${gradeLevel}`;

        const presentSlots =
          (row.am_in ? 1 : 0) +
          (row.am_out ? 1 : 0) +
          (row.pm_in ? 1 : 0) +
          (row.pm_out ? 1 : 0);

        const existing = weeklyMap.get(key);
        if (!existing) {
          weeklyMap.set(key, {
            weekStart,
            sectionName,
            gradeLevel,
            learnerDays: 1,
            expectedSlots: 4,
            presentSlots,
            missingSlots: 4 - presentSlots,
          });
          return;
        }
        existing.learnerDays += 1;
        existing.expectedSlots += 4;
        existing.presentSlots += presentSlots;
        existing.missingSlots += 4 - presentSlots;
      });

      const weekly = Array.from(weeklyMap.values()).sort((a, b) =>
        a.weekStart < b.weekStart ? 1 : a.weekStart > b.weekStart ? -1 : a.sectionName.localeCompare(b.sectionName),
      );

      const monthStart = `${fromDate.slice(0, 7)}-01`;
      const monthEnd = `${toDate.slice(0, 7)}-31`;
      const { data: monthlyRows, error: monthlyError } = await supabase
        .from('attendance_monthly_summary')
        .select('summary_month,section_name,grade_level,learner_days,expected_slots,present_slots,missing_slots')
        .gte('summary_month', monthStart)
        .lte('summary_month', monthEnd)
        .order('summary_month', { ascending: false })
        .limit(REMOTE_FETCH_LIMIT);
      if (monthlyError) throw monthlyError;

      const monthly: AttendanceMonthlySummaryRow[] = (monthlyRows || []).map((row: any) => ({
        summaryMonth: String(row.summary_month || ''),
        sectionName: String(row.section_name || 'No Section'),
        gradeLevel: String(row.grade_level || 'Unknown'),
        learnerDays: Number(row.learner_days || 0),
        expectedSlots: Number(row.expected_slots || 0),
        presentSlots: Number(row.present_slots || 0),
        missingSlots: Number(row.missing_slots || 0),
      }));

      return { weekly, monthly };
    },
    [],
  );

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

  return {
    uidMappings,
    adminUids,
    attendanceLogs,
    addMapping,
    removeMapping,
    toggleAdmin,
    logAttendance,
    deleteRecord,
    queryRecordsByDateRange,
    querySummaryByDateRange,
  };
};
