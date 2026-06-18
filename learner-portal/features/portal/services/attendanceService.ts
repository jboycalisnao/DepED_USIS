import { supabase } from '@deped-usis/shared-supabase';
import {
  getCachedLearnerData,
  getPersistentCachedLearnerData,
  resolveLearnerCacheKey,
  setCachedLearnerData,
  setPersistentCachedLearnerData,
} from './learnerPortalCache';

const ATTENDANCE_TAP_ORDER = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT', 'UNSCHEDULED'] as const;

export type LearnerAttendanceTapType = typeof ATTENDANCE_TAP_ORDER[number];

export type LearnerAttendanceTap = {
  type: LearnerAttendanceTapType;
  loggedAt: string;
  displayTime: string;
  isLate: boolean;
  source: string;
  stationNo: string;
  scannedUid: string;
};

export type LearnerAttendanceDayCell = {
  day: number;
  dateKey: string;
  taps: LearnerAttendanceTap[];
  unscheduledCount: number;
};

export type LearnerAttendanceMonthRow = {
  monthKey: string;
  monthLabel: string;
  days: LearnerAttendanceDayCell[];
};

export type LearnerAttendanceSnapshot = {
  months: LearnerAttendanceMonthRow[];
  totalMonths: number;
  totalDays: number;
  totalTaps: number;
};

type RawAttendanceRecordRow = {
  id: string;
  attendance_type: string;
  is_late?: boolean | null;
  logged_at: string;
  source: string | null;
  station_no: number | string | null;
  scanned_uid: string | null;
};

type AttendanceCachePayload = {
  rows: RawAttendanceRecordRow[];
  snapshot: LearnerAttendanceSnapshot;
  latestLoggedAt: string;
};

const CACHE_SCOPE = 'attendance-history-records-v1';
const MANILA_TIME_ZONE = 'Asia/Manila';

const toText = (value: unknown) => String(value || '').trim();

const formatTimeInManila = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return toText(value);
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatDateKeyInManila = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';
  return year && month && day ? `${year}-${month}-${day}` : '';
};

const formatMonthLabel = (monthKey: string) => {
  const candidate = new Date(`${monthKey}-01T00:00:00Z`);
  if (Number.isNaN(candidate.getTime())) return monthKey;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(candidate);
};

const normalizeAttendanceType = (value: string): LearnerAttendanceTapType => {
  const candidate = toText(value).toUpperCase();
  return ATTENDANCE_TAP_ORDER.includes(candidate as LearnerAttendanceTapType)
    ? (candidate as LearnerAttendanceTapType)
    : 'UNSCHEDULED';
};

const tapTypeLabelMap: Record<LearnerAttendanceTapType, string> = {
  AM_IN: 'AM In',
  AM_OUT: 'AM Out',
  PM_IN: 'PM In',
  PM_OUT: 'PM Out',
  UNSCHEDULED: 'Unscheduled',
};

const createTap = (
  type: LearnerAttendanceTapType,
  loggedAt: string,
  isLate = false,
  source = 'rfid',
  stationNo = '',
  scannedUid = '',
): LearnerAttendanceTap => ({
  type,
  loggedAt,
  displayTime: formatTimeInManila(loggedAt),
  isLate: Boolean(isLate),
  source: toText(source) || 'rfid',
  stationNo: toText(stationNo),
  scannedUid: toText(scannedUid),
});

const sortTaps = (taps: LearnerAttendanceTap[]) =>
  [...taps].sort((left, right) => {
    const leftOrder = ATTENDANCE_TAP_ORDER.indexOf(left.type);
    const rightOrder = ATTENDANCE_TAP_ORDER.indexOf(right.type);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return new Date(left.loggedAt).getTime() - new Date(right.loggedAt).getTime();
  });

const mergeRows = (existingRows: RawAttendanceRecordRow[], incomingRows: RawAttendanceRecordRow[]) => {
  const merged = new Map<string, RawAttendanceRecordRow>();
  for (const row of existingRows) merged.set(row.id, row);
  for (const row of incomingRows) merged.set(row.id, row);
  return Array.from(merged.values()).sort((left, right) => new Date(left.logged_at).getTime() - new Date(right.logged_at).getTime());
};

const buildSnapshot = (rows: RawAttendanceRecordRow[]): LearnerAttendanceSnapshot => {
  const monthMap = new Map<string, Map<number, LearnerAttendanceTap[]>>();

  rows.forEach((row) => {
    const dateKey = formatDateKeyInManila(row.logged_at);
    if (!dateKey) return;

    const monthKey = dateKey.slice(0, 7);
    const day = Number(dateKey.slice(8, 10));
    if (!monthKey || !Number.isFinite(day) || day < 1 || day > 31) return;

    const tapsByDay = monthMap.get(monthKey) || new Map<number, LearnerAttendanceTap[]>();
    const taps = tapsByDay.get(day) || [];
    taps.push(
      createTap(
        normalizeAttendanceType(row.attendance_type),
        row.logged_at,
        Boolean(row.is_late),
        row.source || 'rfid',
        row.station_no == null ? '' : String(row.station_no),
        row.scanned_uid || '',
      ),
    );
    tapsByDay.set(day, taps);
    monthMap.set(monthKey, tapsByDay);
  });

  const months = Array.from(monthMap.entries())
    .map(([monthKey, daysByNumber]) => {
      const days = Array.from({ length: 31 }, (_, index) => {
        const day = index + 1;
        const dateKey = `${monthKey}-${String(day).padStart(2, '0')}`;
        const taps = sortTaps(daysByNumber.get(day) || []);
        return {
          day,
          dateKey,
          taps,
          unscheduledCount: taps.filter((tap) => tap.type === 'UNSCHEDULED').length,
        };
      });

      return {
        monthKey,
        monthLabel: formatMonthLabel(monthKey),
        days,
      };
    })
    .sort((left, right) => (left.monthKey < right.monthKey ? 1 : -1));

  const totalDays = months.reduce(
    (sum, month) => sum + month.days.filter((day) => day.taps.length > 0 || day.unscheduledCount > 0).length,
    0,
  );
  const totalTaps = months.reduce(
    (sum, month) => sum + month.days.reduce((daySum, day) => daySum + day.taps.length, 0),
    0,
  );

  return {
    months,
    totalMonths: months.length,
    totalDays,
    totalTaps,
  };
};

const fetchAllAttendanceRows = async (learnerId: string) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id,attendance_type,logged_at,source,station_no,scanned_uid')
    .eq('learner_id', learnerId)
    .order('logged_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to load attendance records.');
  }

  return (data || []) as RawAttendanceRecordRow[];
};

const fetchAttendanceRowsSince = async (learnerId: string, sinceLoggedAt: string) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select('id,attendance_type,logged_at,source,station_no,scanned_uid')
    .eq('learner_id', learnerId)
    .gte('logged_at', sinceLoggedAt)
    .order('logged_at', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to refresh attendance records.');
  }

  return (data || []) as RawAttendanceRecordRow[];
};

const buildCachePayload = (rows: RawAttendanceRecordRow[]): AttendanceCachePayload => ({
  rows,
  snapshot: buildSnapshot(rows),
  latestLoggedAt: rows.length > 0 ? rows[rows.length - 1].logged_at : '',
});

export async function fetchLearnerAttendanceSnapshot(
  input: { learnerId?: string; lrn?: string },
  options: { forceRefresh?: boolean } = {},
): Promise<LearnerAttendanceSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });

  if (!learnerId) {
    throw new Error('Learner attendance lookup requires learner ID.');
  }

  if (!options.forceRefresh) {
    const persistentCached = await getPersistentCachedLearnerData<AttendanceCachePayload>(CACHE_SCOPE, cacheKey);
    if (persistentCached?.snapshot) return persistentCached.snapshot;

    const cached = getCachedLearnerData<AttendanceCachePayload>(CACHE_SCOPE, cacheKey);
    if (cached?.snapshot) {
      void setPersistentCachedLearnerData(CACHE_SCOPE, cacheKey, cached);
      return cached.snapshot;
    }
  }

  const persistentCached = await getPersistentCachedLearnerData<AttendanceCachePayload>(CACHE_SCOPE, cacheKey);
  if (persistentCached?.rows?.length && persistentCached.latestLoggedAt) {
    const newRows = await fetchAttendanceRowsSince(learnerId, persistentCached.latestLoggedAt);
    if (newRows.length === 0) {
      return persistentCached.snapshot;
    }

    const mergedRows = mergeRows(persistentCached.rows, newRows);
    const nextCache = buildCachePayload(mergedRows);
    await setPersistentCachedLearnerData(CACHE_SCOPE, cacheKey, nextCache);
    setCachedLearnerData(CACHE_SCOPE, cacheKey, nextCache);
    return nextCache.snapshot;
  }

  const rows = await fetchAllAttendanceRows(learnerId);
  const nextCache = buildCachePayload(rows);
  await setPersistentCachedLearnerData(CACHE_SCOPE, cacheKey, nextCache);
  setCachedLearnerData(CACHE_SCOPE, cacheKey, nextCache);
  return nextCache.snapshot;
}

export function formatAttendanceDateTime(value: string) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatAttendanceTapType(value: LearnerAttendanceTapType) {
  return tapTypeLabelMap[value] || value;
}
