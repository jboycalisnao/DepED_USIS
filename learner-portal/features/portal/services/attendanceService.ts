import { supabase } from '@deped-usis/shared-supabase';
import { getCachedLearnerData, resolveLearnerCacheKey, setCachedLearnerData } from './learnerPortalCache';

const ATTENDANCE_TAP_ORDER = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT', 'UNSCHEDULED'] as const;

export type LearnerAttendanceTapType = typeof ATTENDANCE_TAP_ORDER[number];

export type LearnerAttendanceTap = {
  type: LearnerAttendanceTapType;
  loggedAt: string;
  displayTime: string;
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

type MonthlyTapsRow = {
  attendance_month: string;
  day_01: unknown;
  day_02: unknown;
  day_03: unknown;
  day_04: unknown;
  day_05: unknown;
  day_06: unknown;
  day_07: unknown;
  day_08: unknown;
  day_09: unknown;
  day_10: unknown;
  day_11: unknown;
  day_12: unknown;
  day_13: unknown;
  day_14: unknown;
  day_15: unknown;
  day_16: unknown;
  day_17: unknown;
  day_18: unknown;
  day_19: unknown;
  day_20: unknown;
  day_21: unknown;
  day_22: unknown;
  day_23: unknown;
  day_24: unknown;
  day_25: unknown;
  day_26: unknown;
  day_27: unknown;
  day_28: unknown;
  day_29: unknown;
  day_30: unknown;
  day_31: unknown;
};

const CACHE_SCOPE = 'attendance-history-monthly-v2';
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

const formatMonthLabel = (monthKey: string) => {
  const candidate = new Date(`${monthKey}-01T00:00:00Z`);
  if (Number.isNaN(candidate.getTime())) return monthKey;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(candidate);
};

const getMonthKey = (dateKey: string) => dateKey.slice(0, 7);

const getDateKeyForMonthDay = (monthKey: string, day: number) => `${monthKey}-${String(day).padStart(2, '0')}`;

const getDayColumnName = (day: number) => `day_${String(day).padStart(2, '0')}` as const;

const tapTypeLabelMap: Record<LearnerAttendanceTapType, string> = {
  AM_IN: 'AM In',
  AM_OUT: 'AM Out',
  PM_IN: 'PM In',
  PM_OUT: 'PM Out',
  UNSCHEDULED: 'Unscheduled',
};

const createTap = (type: LearnerAttendanceTapType, loggedAt: string, source = 'rfid', stationNo = '', scannedUid = ''): LearnerAttendanceTap => ({
  type,
  loggedAt,
  displayTime: formatTimeInManila(loggedAt),
  source: toText(source) || 'rfid',
  stationNo: toText(stationNo),
  scannedUid: toText(scannedUid),
});

const createTapFromRecord = (
  type: LearnerAttendanceTapType,
  loggedAt: string,
  source = 'rfid',
  stationNo = '',
  scannedUid = '',
  displayTime = '',
): LearnerAttendanceTap => ({
  type,
  loggedAt,
  displayTime: toText(displayTime) || formatTimeInManila(loggedAt),
  source: toText(source) || 'rfid',
  stationNo: toText(stationNo),
  scannedUid: toText(scannedUid),
});

const normalizeAttendanceType = (value: string): LearnerAttendanceTapType | null => {
  const candidate = toText(value).toUpperCase();
  return ATTENDANCE_TAP_ORDER.includes(candidate as LearnerAttendanceTapType)
    ? (candidate as LearnerAttendanceTapType)
    : null;
};

const sortTaps = (taps: LearnerAttendanceTap[]) =>
  [...taps].sort((left, right) => {
    const leftOrder = ATTENDANCE_TAP_ORDER.indexOf(left.type);
    const rightOrder = ATTENDANCE_TAP_ORDER.indexOf(right.type);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return new Date(left.loggedAt).getTime() - new Date(right.loggedAt).getTime();
  });

const isTapRecordLike = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const tryParseJsonString = (value: string): unknown => {
  const text = value.trim();
  if (!text) return null;
  if (!(text.startsWith('[') || text.startsWith('{'))) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const createTapFromValue = (entry: unknown): LearnerAttendanceTap[] => {
  if (!entry) return [];

  if (typeof entry === 'string') {
    const parsed = tryParseJsonString(entry);
    if (parsed !== null) return parseTapArray(parsed);
    const loggedAt = entry.trim();
    return loggedAt ? [createTap('UNSCHEDULED', loggedAt)] : [];
  }

  if (Array.isArray(entry)) {
    return entry.flatMap((item) => createTapFromValue(item));
  }

  if (!isTapRecordLike(entry)) return [];

  const record = entry as Record<string, unknown>;
  const nestedTapCollections = [record.taps, record.entries, record.records, record.items].filter(Boolean);
  if (nestedTapCollections.length > 0) {
    const nested = nestedTapCollections.flatMap((collection) => createTapFromValue(collection));
    if (nested.length > 0) return nested;
  }

  const loggedAt = toText(record.loggedAt || record.logged_at || record.time || record.timestamp || record.value);
  if (!loggedAt) return [];
  const type = normalizeAttendanceType(toText(record.type || record.attendanceType || record.attendance_type)) || 'UNSCHEDULED';

  return [createTapFromRecord(
    type,
    loggedAt,
    toText(record.source || 'rfid'),
    toText(record.stationNo || record.station_no),
    toText(record.scannedUid || record.scanned_uid),
    toText(record.displayTime || record.display_time),
  )];
};

const parseTapArray = (value: unknown): LearnerAttendanceTap[] => createTapFromValue(value);

const flattenDayColumn = (row: MonthlyTapsRow, day: number): LearnerAttendanceTap[] => {
  const column = row[getDayColumnName(day)];
  return sortTaps(parseTapArray(column));
};

const buildSnapshot = (rows: MonthlyTapsRow[]): LearnerAttendanceSnapshot => {
  const months = rows
    .map((row) => {
      const monthKey = toText(row.attendance_month).slice(0, 7);
      const days = Array.from({ length: 31 }, (_, index) => {
        const day = index + 1;
        const dateKey = getDateKeyForMonthDay(monthKey, day);
        const taps = flattenDayColumn(row, day);
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
    .filter((row) => row.monthKey)
    .sort((left, right) => (left.monthKey < right.monthKey ? 1 : -1));

  const totalDays = months.reduce((sum, month) => sum + month.days.filter((day) => day.taps.length > 0 || day.unscheduledCount > 0).length, 0);
  const totalTaps = months.reduce(
    (sum, month) =>
      sum +
      month.days.reduce((daySum, day) => daySum + day.taps.length, 0),
    0,
  );

  return {
    months,
    totalMonths: months.length,
    totalDays,
    totalTaps,
  };
};

export async function fetchLearnerAttendanceSnapshot(
  input: { learnerId?: string; lrn?: string },
  options: { forceRefresh?: boolean } = {},
): Promise<LearnerAttendanceSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });
  if (!options.forceRefresh) {
    const cached = getCachedLearnerData<LearnerAttendanceSnapshot>(CACHE_SCOPE, cacheKey);
    if (cached) return cached;
  }

  if (!learnerId) {
    throw new Error('Learner attendance lookup requires learner ID.');
  }

  const { data, error } = await supabase
    .from('attendance_monthly_taps')
    .select(
      [
        'attendance_month',
        'day_01',
        'day_02',
        'day_03',
        'day_04',
        'day_05',
        'day_06',
        'day_07',
        'day_08',
        'day_09',
        'day_10',
        'day_11',
        'day_12',
        'day_13',
        'day_14',
        'day_15',
        'day_16',
        'day_17',
        'day_18',
        'day_19',
        'day_20',
        'day_21',
        'day_22',
        'day_23',
        'day_24',
        'day_25',
        'day_26',
        'day_27',
        'day_28',
        'day_29',
        'day_30',
        'day_31',
      ].join(',')
    )
    .eq('learner_id', learnerId)
    .order('attendance_month', { ascending: true });

  if (error) {
    throw new Error(error.message || 'Unable to load monthly attendance data.');
  }

  const snapshot = buildSnapshot((data || []) as MonthlyTapsRow[]);
  setCachedLearnerData(CACHE_SCOPE, cacheKey, snapshot);
  return snapshot;
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
