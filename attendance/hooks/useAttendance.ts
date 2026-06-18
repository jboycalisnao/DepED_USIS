
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
import { supabase } from '@deped-usis/shared-supabase';
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
const MANILA_TIME_ZONE = 'Asia/Manila';

const toIsoDate = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = `${value.getMonth() + 1}`.padStart(2, '0');
  const dd = `${value.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const formatDateInManila = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
};

const isWithinDateRange = (dateKey: string, fromDate: string, toDate: string) =>
  dateKey >= fromDate && dateKey <= toDate;

type LearnerSectionMeta = {
  sectionId: string | null;
};

type SectionMeta = {
  name: string;
  gradeLevel: string;
};

const buildDailySummariesFromRecords = (records: AttendanceRecord[]) => {
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const byDay = new Map<string, Map<string, AttendanceDailySummaryRow>>();

  sortedRecords.forEach((record) => {
    const attendanceDate = formatDateInManila(record.timestamp);
    if (!attendanceDate) return;

    const dayMap = byDay.get(attendanceDate) || new Map<string, AttendanceDailySummaryRow>();
    const existing =
      dayMap.get(record.learnerId) ||
      ({
        learnerId: record.learnerId,
        attendanceDate,
        amIn: null,
        amOut: null,
        pmIn: null,
        pmOut: null,
        unscheduledCount: 0,
        lastStationNo: null,
      } satisfies AttendanceDailySummaryRow);

    const timestamp = record.timestamp;
    switch (record.type) {
      case 'AM_IN':
        existing.amIn = existing.amIn || timestamp;
        break;
      case 'AM_OUT':
        existing.amOut = existing.amOut || timestamp;
        break;
      case 'PM_IN':
        existing.pmIn = existing.pmIn || timestamp;
        break;
      case 'PM_OUT':
        existing.pmOut = existing.pmOut || timestamp;
        break;
      case 'UNSCHEDULED':
        existing.unscheduledCount += 1;
        break;
    }

    dayMap.set(record.learnerId, existing);
    byDay.set(attendanceDate, dayMap);
  });

  return Array.from(byDay.entries())
    .flatMap(([, dayMap]) => Array.from(dayMap.values()))
    .sort((a, b) => {
      if (a.attendanceDate !== b.attendanceDate) {
        return b.attendanceDate.localeCompare(a.attendanceDate);
      }
      return a.learnerId.localeCompare(b.learnerId);
    });
};

const buildMonthlySummariesFromDailyRows = (
  dailyRows: any[],
  learnerMap: Map<string, LearnerSectionMeta>,
  sectionMap: Map<string, SectionMeta>,
) => {
  const monthlyMap = new Map<string, AttendanceMonthlySummaryRow>();

  dailyRows.forEach((row: any) => {
    const attendanceDate = String(row.attendanceDate || row.attendance_date || '').trim();
    const learnerId = String(row.learnerId || row.learner_id || '').trim();
    if (!attendanceDate || !learnerId) return;

    const monthKey = attendanceDate.slice(0, 7);
    const learner = learnerMap.get(learnerId);
    const section = learner?.sectionId ? sectionMap.get(learner.sectionId) : undefined;
    const sectionName = section?.name || 'No Section';
    const gradeLevel = section?.gradeLevel || 'Unknown';
    const key = `${monthKey}|${sectionName}|${gradeLevel}`;

    const presentSlots =
      (row.amIn ? 1 : 0) +
      (row.amOut ? 1 : 0) +
      (row.pmIn ? 1 : 0) +
      (row.pmOut ? 1 : 0);

    const existing = monthlyMap.get(key);
    if (!existing) {
      monthlyMap.set(key, {
        summaryMonth: monthKey,
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

  return Array.from(monthlyMap.values()).sort((a, b) =>
    a.summaryMonth < b.summaryMonth ? 1 : a.summaryMonth > b.summaryMonth ? -1 : a.sectionName.localeCompare(b.sectionName),
  );
};

const buildWeeklySummariesFromDailyRows = (
  dailyRows: AttendanceDailySummaryRow[],
  learnerMap: Map<string, LearnerSectionMeta>,
  sectionMap: Map<string, SectionMeta>,
) => {
  const weeklyMap = new Map<string, AttendanceWeeklySummaryRow>();

  dailyRows.forEach((row) => {
    if (!row.attendanceDate || !row.learnerId) return;

    const date = new Date(`${row.attendanceDate}T00:00:00`);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    const weekStart = toIsoDate(date);

    const learner = learnerMap.get(row.learnerId);
    const section = learner?.sectionId ? sectionMap.get(learner.sectionId) : undefined;
    const sectionName = section?.name || 'No Section';
    const gradeLevel = section?.gradeLevel || 'Unknown';
    const key = `${weekStart}|${sectionName}|${gradeLevel}`;

    const presentSlots =
      (row.amIn ? 1 : 0) +
      (row.amOut ? 1 : 0) +
      (row.pmIn ? 1 : 0) +
      (row.pmOut ? 1 : 0);

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

  return Array.from(weeklyMap.values()).sort((a, b) =>
    a.weekStart < b.weekStart ? 1 : a.weekStart > b.weekStart ? -1 : a.sectionName.localeCompare(b.sectionName),
  );
};

export const useAttendance = () => {
  const [uidMappings, setUidMappings] = useState<Record<string, string>>({});
  const [adminUids, setAdminUids] = useState<string[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const getLocalAttendanceRecordsInRange = useCallback((fromDate: string, toDate: string) => {
    const start = String(fromDate || '').trim();
    const end = String(toDate || '').trim();

    return attendanceLogs
      .filter((record) => {
        const dateKey = formatDateInManila(record.timestamp);
        return !!dateKey && isWithinDateRange(dateKey, start, end);
      })
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attendanceLogs]);

  const refreshAttendanceStatusByRange = useCallback(async (fromDate: string, toDate: string): Promise<Set<string>> => {
    if (!isHydrated) return new Set<string>();
    if (typeof navigator !== 'undefined' && !navigator.onLine) return new Set<string>();

    const start = String(fromDate || '').trim();
    const end = String(toDate || '').trim();
    const scopedRecords = attendanceLogs.filter((record) => {
      const dateKey = formatDateInManila(record.timestamp);
      return !!dateKey && isWithinDateRange(dateKey, start, end);
    });

    const scopedIds = scopedRecords
      .map((record) => record.id)
      .filter((id) => isUuid(String(id)));

    if (scopedIds.length === 0) return new Set<string>();

    const remoteIds = new Set<string>();
    const uniqueIds = Array.from(new Set(scopedIds.map((id) => String(id))));
    for (let index = 0; index < uniqueIds.length; index += SYNC_BATCH_SIZE) {
      const chunk = uniqueIds.slice(index, index + SYNC_BATCH_SIZE);
      // eslint-disable-next-line no-await-in-loop
      const { data, error } = await supabase
        .from('attendance_records')
        .select('id')
        .in('id', chunk);

      if (error) throw error;
      (data || []).forEach((row: any) => {
        if (row?.id) remoteIds.add(String(row.id));
      });
    }

    setAttendanceLogs((prev) =>
      prev.map((record) => {
        const dateKey = formatDateInManila(record.timestamp);
        if (!dateKey || !isWithinDateRange(dateKey, start, end)) return record;
        return { ...record, synced: remoteIds.has(record.id) };
      }),
    );
    return remoteIds;
  }, [attendanceLogs, isHydrated]);

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
      isLate: !!log.isLate || !!log.is_late,
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

  const hasAttendanceRecordForDay = useCallback(async (learnerId: string, type: AttendanceType, timestamp: string) => {
    const loggedAt = new Date(timestamp);
    const startOfDay = new Date(loggedAt);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(loggedAt);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('learner_id', learnerId)
      .eq('attendance_type', type)
      .gte('logged_at', startOfDay.toISOString())
      .lte('logged_at', endOfDay.toISOString())
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data?.id;
  }, []);

  const persistAttendanceRecord = useCallback(async (record: AttendanceRecord, source = 'rfid') => {
    const existing = await hasAttendanceRecordForDay(record.learnerId, record.type, record.timestamp);
    if (existing) {
      return;
    }

    const payload: Record<string, string | boolean> = {
      learner_id: record.learnerId,
      attendance_type: record.type,
      logged_at: record.timestamp,
      source,
      is_late: !!record.isLate,
    };

    if (isUuid(record.id)) {
      payload.id = record.id;
    }

    const { error } = await supabase.from('attendance_records').insert(payload);
    if (error) throw error;
  }, [hasAttendanceRecordForDay]);

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

  const logAttendance = (learnerId: string, type: AttendanceType, isLate = false) => {
    const record: AttendanceRecord = {
      id: generateRecordId(),
      learnerId,
      type,
      timestamp: new Date().toISOString(),
      isLate,
      synced: false
    };

    // Local-first write for offline safety.
    setAttendanceLogs(prev => [...prev, record]);

    // Cloud write is pooled and pushed on interval/reconnect/page-hide.
  };

  const addManualAttendanceRecord = useCallback(
    async (learnerId: string, type: AttendanceType, timestamp: string) => {
      const normalizedLearnerId = String(learnerId || '').trim();
      const normalizedTimestamp = String(timestamp || '').trim();
      if (!normalizedLearnerId || !normalizedTimestamp) {
        return { ok: false, error: 'Learner and timestamp are required.' };
      }

      try {
        const dailyExists = await hasAttendanceRecordForDay(normalizedLearnerId, type, normalizedTimestamp);
        if (dailyExists) {
          return { ok: false, error: 'An attendance record already exists for that learner and day.' };
        }

        const record: AttendanceRecord = {
          id: generateRecordId(),
          learnerId: normalizedLearnerId,
          type,
          timestamp: normalizedTimestamp,
          isLate: false,
          synced: false,
        };

        setAttendanceLogs((prev) => [record, ...prev]);
        await persistAttendanceRecord(record, 'manual');
        markAsSynced(record.id);

        return { ok: true, error: null };
      } catch (error: any) {
        return {
          ok: false,
          error: error?.message || 'Unable to create manual attendance record.',
        };
      }
    },
    [hasAttendanceRecordForDay, persistAttendanceRecord],
  );

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

  const deleteRecord = async (record: AttendanceRecord) => {
    if (record.synced) {
      if (isUuid(record.id)) {
        const { error } = await supabase.from('attendance_records').delete().eq('id', record.id);
        if (error) {
          console.error('Failed to delete attendance record:', error);
          return;
        }
      } else {
        const { error } = await supabase
          .from('attendance_records')
          .delete()
          .eq('learner_id', record.learnerId)
          .eq('attendance_type', record.type)
          .eq('logged_at', record.timestamp);
        if (error) {
          console.error('Failed to delete attendance record:', error);
          return;
        }
      }
    }

    setAttendanceLogs(prev => prev.filter(log => log.id !== record.id));
  };

  const removeMapping = (learnerId: string) => {
    setUidMappings(prev => {
      const next = { ...prev };
      delete next[learnerId];
      return next;
    });
  };

  const queryRecordsByDateRange = useCallback(async (fromDate: string, toDate: string): Promise<AttendanceReportResult> => {
    const rawRecords = getLocalAttendanceRecordsInRange(fromDate, toDate);

    return { mode: 'raw', rawRecords, summaryRows: [] };
  }, [getLocalAttendanceRecordsInRange]);

  const queryMonthlySummariesByRange = useCallback(async (fromDate: string, toDate: string): Promise<AttendanceMonthlySummaryRow[]> => {
    const dailyRows = buildDailySummariesFromRecords(getLocalAttendanceRecordsInRange(fromDate, toDate));

    const { data: learnerRows, error: learnerError } = await supabase
      .from('registrar_learners')
      .select('id,section_id');
    if (learnerError) throw learnerError;

    const { data: sectionRows, error: sectionError } = await supabase
      .from('registrar_sections')
      .select('id,name,grade_level');
    if (sectionError) throw sectionError;

    const learnerMap = new Map<string, LearnerSectionMeta>();
    (learnerRows || []).forEach((row: any) => {
      learnerMap.set(String(row.id), {
        sectionId: row.section_id ? String(row.section_id) : null,
      });
    });

    const sectionMap = new Map<string, SectionMeta>();
    (sectionRows || []).forEach((row: any) => {
      sectionMap.set(String(row.id), {
        name: String(row.name || 'No Section'),
        gradeLevel: String(row.grade_level || 'Unknown'),
      });
    });

    return buildMonthlySummariesFromDailyRows(dailyRows || [], learnerMap, sectionMap);
  }, [getLocalAttendanceRecordsInRange]);

  const queryDailySummariesByMonth = useCallback(async (summaryMonth: string): Promise<AttendanceDailySummaryRow[]> => {
    const monthStart = `${String(summaryMonth || '').slice(0, 7)}-01`;
    const monthEndDate = new Date(`${monthStart}T00:00:00`);
    monthEndDate.setMonth(monthEndDate.getMonth() + 1);
    monthEndDate.setDate(0);
    const monthEnd = toIsoDate(monthEndDate);

    try {
      const { data, error } = await supabase
        .from('attendance_daily_summary')
        .select('learner_id, attendance_date, am_in, am_out, pm_in, pm_out, unscheduled_count, last_station_no')
        .gte('attendance_date', monthStart)
        .lte('attendance_date', monthEnd)
        .order('attendance_date', { ascending: true });

      if (error) throw error;

      const rows = (data || []).map((row: any) => ({
        learnerId: String(row.learner_id || ''),
        attendanceDate: String(row.attendance_date || ''),
        amIn: row.am_in ? String(row.am_in) : null,
        amOut: row.am_out ? String(row.am_out) : null,
        pmIn: row.pm_in ? String(row.pm_in) : null,
        pmOut: row.pm_out ? String(row.pm_out) : null,
        unscheduledCount: Number(row.unscheduled_count || 0),
        lastStationNo: row.last_station_no == null ? null : Number(row.last_station_no),
      } satisfies AttendanceDailySummaryRow));

      if (rows.length > 0) return rows;
    } catch (error) {
      console.error('Failed to load attendance daily summaries from Supabase:', error);
    }

    return buildDailySummariesFromRecords(getLocalAttendanceRecordsInRange(monthStart, monthEnd));
  }, [getLocalAttendanceRecordsInRange]);

  const queryRawRecordsByDate = useCallback(async (attendanceDate: string): Promise<AttendanceRecord[]> => {
    const day = String(attendanceDate || '').trim();
    return getLocalAttendanceRecordsInRange(day, day);
  }, [getLocalAttendanceRecordsInRange]);

  const querySummaryByDateRange = useCallback(
    async (fromDate: string, toDate: string): Promise<{
      weekly: AttendanceWeeklySummaryRow[];
      monthly: AttendanceMonthlySummaryRow[];
    }> => {
      const dailyRows = buildDailySummariesFromRecords(getLocalAttendanceRecordsInRange(fromDate, toDate));

      const { data: learnerRows, error: learnerError } = await supabase
        .from('registrar_learners')
        .select('id,section_id');
      if (learnerError) throw learnerError;

      const { data: sectionRows, error: sectionError } = await supabase
        .from('registrar_sections')
        .select('id,name,grade_level');
      if (sectionError) throw sectionError;

      const learnerMap = new Map<string, LearnerSectionMeta>();
      (learnerRows || []).forEach((row: any) => {
        learnerMap.set(String(row.id), {
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

      const weekly = buildWeeklySummariesFromDailyRows(dailyRows, learnerMap, sectionMap);
      const monthly = buildMonthlySummariesFromDailyRows(dailyRows, learnerMap, sectionMap);

      return { weekly, monthly };
    },
    [getLocalAttendanceRecordsInRange],
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
    addManualAttendanceRecord,
    deleteRecord,
    queryRecordsByDateRange,
    queryMonthlySummariesByRange,
    queryDailySummariesByMonth,
    queryRawRecordsByDate,
    querySummaryByDateRange,
    refreshAttendanceStatusByRange,
  };
};
