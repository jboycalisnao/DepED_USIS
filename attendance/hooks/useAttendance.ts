
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
const MANILA_TIME_ZONE = 'Asia/Manila';
const MONTHLY_TAP_COLUMNS = Array.from({ length: 31 }, (_, index) => `day_${String(index + 1).padStart(2, '0')}` as const);

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

const formatTimeInManila = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getMonthlyDayColumn = (timestamp: string) => {
  const dateKey = formatDateInManila(timestamp);
  if (!dateKey) return null;
  const dayNumber = Number(dateKey.slice(8, 10));
  if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 31) return null;
  return `day_${String(dayNumber).padStart(2, '0')}` as const;
};

const getMonthlyAttendanceMonth = (timestamp: string) => {
  const dateKey = formatDateInManila(timestamp);
  if (!dateKey) return null;
  return `${dateKey.slice(0, 7)}-01`;
};

const createManualMonthlyTap = (type: AttendanceType, timestamp: string): ParsedMonthlyTap => ({
  type,
  loggedAt: timestamp,
  displayTime: formatTimeInManila(timestamp),
  source: 'manual',
  stationNo: '',
  scannedUid: '',
});

type MonthlyTapsRow = Record<string, unknown> & {
  learner_id?: unknown;
  attendance_month?: unknown;
};

type ParsedMonthlyTap = {
  type: AttendanceType;
  loggedAt: string;
  displayTime: string;
  source: string;
  stationNo: string;
  scannedUid: string;
};

const MONTHLY_TAP_TYPE_ORDER: AttendanceType[] = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT', 'UNSCHEDULED'];

const getMonthStart = (dateString: string) => `${dateString.slice(0, 7)}-01`;

const getMonthEnd = (dateString: string) => {
  const [year, month] = dateString.slice(0, 7).split('-').map((value) => Number(value));
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return `${dateString.slice(0, 7)}-31`;
  }
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

const normalizeMonthlyTapType = (value: unknown): AttendanceType => {
  const candidate = String(value || '').trim().toUpperCase();
  return MONTHLY_TAP_TYPE_ORDER.includes(candidate as AttendanceType)
    ? (candidate as AttendanceType)
    : 'UNSCHEDULED';
};

const tryParseMonthlyTapJson = (value: string) => {
  const trimmed = value.trim();
  if (!(trimmed.startsWith('[') || trimmed.startsWith('{'))) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

const parseMonthlyTapEntries = (entry: unknown): ParsedMonthlyTap[] => {
  if (!entry) return [];

  if (typeof entry === 'string') {
    const parsed = tryParseMonthlyTapJson(entry);
    if (parsed !== null) return parseMonthlyTapEntries(parsed);
    return [];
  }

  if (Array.isArray(entry)) {
    return entry.flatMap((value) => parseMonthlyTapEntries(value));
  }

  if (typeof entry !== 'object') {
    return [];
  }

  const record = entry as Record<string, unknown>;
  const nestedCollections = [record.taps, record.entries, record.records, record.items].filter(Boolean);
  if (nestedCollections.length > 0) {
    const nested = nestedCollections.flatMap((value) => parseMonthlyTapEntries(value));
    if (nested.length > 0) return nested;
  }

  const loggedAt = String(record.loggedAt || record.logged_at || record.time || record.timestamp || record.value || '').trim();
  if (!loggedAt) return [];

  return [{
    type: normalizeMonthlyTapType(record.type || record.attendanceType || record.attendance_type),
    loggedAt,
    displayTime: String(record.displayTime || record.display_time || ''),
    source: String(record.source || 'rfid'),
    stationNo: String(record.stationNo || record.station_no || ''),
    scannedUid: String(record.scannedUid || record.scanned_uid || ''),
  }];
};

const isWithinDateRange = (dateKey: string, fromDate: string, toDate: string) =>
  dateKey >= fromDate && dateKey <= toDate;

const buildMonthlyTapRecordId = (
  learnerId: string,
  attendanceMonth: string,
  dayNumber: number,
  tap: ParsedMonthlyTap,
  tapIndex: number,
) =>
  [
    'monthly',
    learnerId,
    attendanceMonth,
    `day${String(dayNumber).padStart(2, '0')}`,
    tap.type,
    tapIndex,
    tap.loggedAt.replace(/[^0-9a-z]/gi, ''),
  ].join('|');

const parseMonthlyTapRecordId = (recordId: string) => {
  const parts = String(recordId || '').split('|');
  if (parts.length < 7 || parts[0] !== 'monthly') {
    return null;
  }

  const [, learnerId, attendanceMonth, dayToken, typeToken, tapIndexToken] = parts;
  const dayNumber = Number(dayToken.replace(/^day/, ''));
  const tapIndex = Number(tapIndexToken);
  const type = String(typeToken || '').trim().toUpperCase() as AttendanceType;

  if (
    !learnerId ||
    !attendanceMonth ||
    !Number.isFinite(dayNumber) ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    !Number.isFinite(tapIndex)
  ) {
    return null;
  }

  return {
    learnerId,
    attendanceMonth,
    dayNumber,
    type: (MONTHLY_TAP_TYPE_ORDER.includes(type) ? type : 'UNSCHEDULED') as AttendanceType,
    tapIndex,
  };
};

const flattenMonthlyTapRows = (
  rows: MonthlyTapsRow[],
  fromDate: string,
  toDate: string,
): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];

  rows.forEach((row) => {
    const learnerId = String(row.learner_id || '').trim();
    const attendanceMonth = String(row.attendance_month || '').trim().slice(0, 7);
    if (!learnerId || !attendanceMonth) return;

    for (let day = 1; day <= 31; day += 1) {
      const dayKey = `${attendanceMonth}-${String(day).padStart(2, '0')}`;
      if (!isWithinDateRange(dayKey, fromDate, toDate)) continue;

      const taps = parseMonthlyTapEntries(row[`day_${String(day).padStart(2, '0')}`]);
      taps.forEach((tap, tapIndex) => {
        records.push({
          id: buildMonthlyTapRecordId(learnerId, attendanceMonth, day, tap, tapIndex),
          learnerId,
          type: tap.type,
          timestamp: tap.loggedAt,
          synced: true,
        });
      });
    }
  });

  return records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

  const hasMonthlyTapForDay = useCallback(async (learnerId: string, type: AttendanceType, timestamp: string) => {
    const attendanceMonth = getMonthlyAttendanceMonth(timestamp);
    const dayColumn = getMonthlyDayColumn(timestamp);
    if (!attendanceMonth || !dayColumn) return false;

    const { data, error } = await supabase
      .from('attendance_monthly_taps')
      .select(
        [
          'attendance_month',
          dayColumn,
        ].join(','),
      )
      .eq('learner_id', learnerId)
      .eq('attendance_month', attendanceMonth)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const existingDay = Array.isArray((data as any)?.[dayColumn]) ? (data as any)[dayColumn] : [];
    return existingDay.some((entry: any) => {
      const existingType = String(entry?.type || entry?.attendance_type || '').trim();
      return existingType === type;
    });
  }, []);

  const persistMonthlyTapRecord = useCallback(async (learnerId: string, type: AttendanceType, timestamp: string) => {
    const attendanceMonth = getMonthlyAttendanceMonth(timestamp);
    const dayColumn = getMonthlyDayColumn(timestamp);
    if (!attendanceMonth || !dayColumn) {
      throw new Error('Unable to resolve attendance month for manual record.');
    }

    const { data, error } = await supabase
      .from('attendance_monthly_taps')
      .select(
        [
          'attendance_month',
          ...MONTHLY_TAP_COLUMNS,
        ].join(','),
      )
      .eq('learner_id', learnerId)
      .eq('attendance_month', attendanceMonth)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    const currentTap = createManualMonthlyTap(type, timestamp);
    const existingDayValue = (data as any)?.[dayColumn];
    const existingDayTaps = Array.isArray(existingDayValue)
      ? existingDayValue
      : existingDayValue
        ? [existingDayValue]
        : [];

    const nextDayTaps = [...existingDayTaps, currentTap];
    const payload: Record<string, unknown> = {
      learner_id: learnerId,
      attendance_month: attendanceMonth,
      [dayColumn]: nextDayTaps,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from('attendance_monthly_taps')
      .upsert(payload, { onConflict: 'learner_id,attendance_month' });

    if (upsertError) throw upsertError;
  }, []);

  const persistAttendanceRecord = useCallback(async (record: AttendanceRecord) => {
    const existing = await hasAttendanceRecordForDay(record.learnerId, record.type, record.timestamp);
    if (existing) {
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

    // Write the monthly tap immediately so the records page can reflect the scan
    // without waiting for the raw-record sync cycle.
    void persistMonthlyTapRecord(record.learnerId, record.type, record.timestamp).catch((error) => {
      console.error('Monthly tap persistence failed:', error);
    });

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
        const monthlyExists = await hasMonthlyTapForDay(normalizedLearnerId, type, normalizedTimestamp);
        if (monthlyExists) {
          return { ok: false, error: 'A monthly attendance record already exists for that learner and day.' };
        }

        const record: AttendanceRecord = {
          id: generateRecordId(),
          learnerId: normalizedLearnerId,
          type,
          timestamp: normalizedTimestamp,
          synced: true,
        };

        await persistMonthlyTapRecord(normalizedLearnerId, type, normalizedTimestamp);
        setAttendanceLogs((prev) => [...prev, record]);

        return { ok: true, error: null };
      } catch (error: any) {
        return {
          ok: false,
          error: error?.message || 'Unable to create manual attendance record.',
        };
      }
    },
    [hasAttendanceRecordForDay, hasMonthlyTapForDay, persistMonthlyTapRecord],
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

  const deleteMonthlyTapRecord = useCallback(async (recordId: string) => {
    const parsed = parseMonthlyTapRecordId(recordId);
    if (!parsed) {
      return { ok: false, error: 'Invalid monthly tap record.' };
    }

    try {
      const { data, error } = await supabase
        .from('attendance_monthly_taps')
        .select(
          [
            'learner_id',
            'attendance_month',
            ...MONTHLY_TAP_COLUMNS,
          ].join(','),
        )
        .eq('learner_id', parsed.learnerId)
        .eq('attendance_month', `${parsed.attendanceMonth}-01`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) {
        return { ok: false, error: 'Monthly tap record not found.' };
      }

      const dayColumn = `day_${String(parsed.dayNumber).padStart(2, '0')}`;
      const dayValue = (data as any)?.[dayColumn];
      const dayTaps = Array.isArray(dayValue)
        ? dayValue
        : dayValue
          ? [dayValue]
          : [];

      const nextDayTaps = dayTaps
        .flatMap((entry: unknown) => parseMonthlyTapEntries(entry))
        .filter((tap, tapIndex) =>
          buildMonthlyTapRecordId(parsed.learnerId, parsed.attendanceMonth, parsed.dayNumber, tap, tapIndex) !== recordId
        );

      const payload: Record<string, unknown> = {
        learner_id: parsed.learnerId,
        attendance_month: `${parsed.attendanceMonth}-01`,
        [dayColumn]: nextDayTaps,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('attendance_monthly_taps')
        .upsert(payload, { onConflict: 'learner_id,attendance_month' });

      if (updateError) {
        throw updateError;
      }

      setAttendanceLogs((prev) => prev.filter((log) => log.id !== recordId));
      return { ok: true, error: null };
    } catch (error: any) {
      return {
        ok: false,
        error: error?.message || 'Unable to delete monthly tap record.',
      };
    }
  }, []);

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
      const monthStart = getMonthStart(normalizedFrom);
      const monthEnd = getMonthEnd(normalizedTo);
      const { data, error } = await supabase
        .from('attendance_monthly_taps')
        .select(
          [
            'learner_id',
            'attendance_month',
            ...MONTHLY_TAP_COLUMNS,
          ].join(','),
        )
        .gte('attendance_month', monthStart)
        .lte('attendance_month', monthEnd)
        .order('attendance_month', { ascending: false })
        .limit(REMOTE_FETCH_LIMIT);
      if (error) throw error;
      const rawRecords = flattenMonthlyTapRows((data || []) as MonthlyTapsRow[], normalizedFrom, normalizedTo);
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
    addManualAttendanceRecord,
    deleteRecord,
    deleteMonthlyTapRecord,
    queryRecordsByDateRange,
    querySummaryByDateRange,
  };
};
