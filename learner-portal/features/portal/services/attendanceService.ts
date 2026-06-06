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

type RawAttendanceRow = {
  id: string;
  attendance_type: string;
  logged_at: string;
  source: string;
  station_no: string | number | null;
  scanned_uid: string | null;
};

type SummaryAttendanceRow = {
  attendance_date: string;
  am_in: string | null;
  am_out: string | null;
  pm_in: string | null;
  pm_out: string | null;
  unscheduled_count: number;
};

const CACHE_SCOPE = 'attendance-history-monthly';
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

const toManilaDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';
  return year && month && day ? `${year}-${month}-${day}` : value.slice(0, 10);
};

const getMonthKey = (dateKey: string) => dateKey.slice(0, 7);

const getDayNumber = (dateKey: string) => Number(dateKey.slice(8, 10));

const getDateKeyForMonthDay = (monthKey: string, day: number) => `${monthKey}-${String(day).padStart(2, '0')}`;

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

const addTapToDay = (
  dayMap: Map<string, { tapsByType: Partial<Record<LearnerAttendanceTapType, LearnerAttendanceTap>>; unscheduledCount: number }>,
  dateKey: string,
  tap: LearnerAttendanceTap,
) => {
  const current = dayMap.get(dateKey) || {
    tapsByType: {},
    unscheduledCount: 0,
  };

  if (tap.type === 'UNSCHEDULED') {
    current.unscheduledCount += 1;
  } else if (!current.tapsByType[tap.type] || new Date(tap.loggedAt).getTime() < new Date(current.tapsByType[tap.type]!.loggedAt).getTime()) {
    current.tapsByType[tap.type] = tap;
  }

  dayMap.set(dateKey, current);
};

const buildSnapshot = (rawRows: RawAttendanceRow[], summaryRows: SummaryAttendanceRow[]): LearnerAttendanceSnapshot => {
  const dayMap = new Map<string, { tapsByType: Partial<Record<LearnerAttendanceTapType, LearnerAttendanceTap>>; unscheduledCount: number }>();

  for (const row of rawRows) {
    const type = normalizeAttendanceType(row.attendance_type);
    if (!type) continue;
    const dateKey = toManilaDateKey(row.logged_at);
    addTapToDay(
      dayMap,
      dateKey,
      createTap(type, row.logged_at, row.source, row.station_no, row.scanned_uid || ''),
    );
  }

  for (const row of summaryRows) {
    const dateKey = toText(row.attendance_date).slice(0, 10);
    if (!dateKey) continue;

    if (row.am_in) addTapToDay(dayMap, dateKey, createTap('AM_IN', row.am_in));
    if (row.am_out) addTapToDay(dayMap, dateKey, createTap('AM_OUT', row.am_out));
    if (row.pm_in) addTapToDay(dayMap, dateKey, createTap('PM_IN', row.pm_in));
    if (row.pm_out) addTapToDay(dayMap, dateKey, createTap('PM_OUT', row.pm_out));

    const current = dayMap.get(dateKey) || {
      tapsByType: {},
      unscheduledCount: 0,
    };
    current.unscheduledCount = Math.max(current.unscheduledCount, Number(row.unscheduled_count || 0));
    dayMap.set(dateKey, current);
  }

  const monthMap = new Map<string, LearnerAttendanceMonthRow>();

  for (const [dateKey, dayState] of dayMap.entries()) {
    const monthKey = getMonthKey(dateKey);
    const monthRow = monthMap.get(monthKey) || {
      monthKey,
      monthLabel: formatMonthLabel(monthKey),
      days: Array.from({ length: 31 }, (_, index) => ({
        day: index + 1,
        dateKey: getDateKeyForMonthDay(monthKey, index + 1),
        taps: [],
        unscheduledCount: 0,
      })),
    };

    const dayNumber = getDayNumber(dateKey);
    if (dayNumber >= 1 && dayNumber <= 31) {
      const taps = sortTaps(
        ATTENDANCE_TAP_ORDER.flatMap((type) => {
          const tap = dayState.tapsByType[type];
          return tap ? [tap] : [];
        })
      );
      monthRow.days[dayNumber - 1] = {
        day: dayNumber,
        dateKey,
        taps,
        unscheduledCount: dayState.unscheduledCount,
      };
    }

    monthMap.set(monthKey, monthRow);
  }

  const months = Array.from(monthMap.values()).sort((left, right) => (left.monthKey < right.monthKey ? 1 : -1));
  const totalDays = months.reduce((sum, month) => sum + month.days.filter((day) => day.taps.length > 0 || day.unscheduledCount > 0).length, 0);
  const totalTaps = months.reduce(
    (sum, month) =>
      sum +
      month.days.reduce((daySum, day) => daySum + day.taps.length + day.unscheduledCount, 0),
    0,
  );

  return {
    months,
    totalMonths: months.length,
    totalDays,
    totalTaps,
  };
};

export async function fetchLearnerAttendanceSnapshot(input: { learnerId?: string; lrn?: string }): Promise<LearnerAttendanceSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });
  const cached = getCachedLearnerData<LearnerAttendanceSnapshot>(CACHE_SCOPE, cacheKey);
  if (cached) return cached;

  if (!learnerId) {
    throw new Error('Learner attendance lookup requires learner ID.');
  }

  const [rawResult, summaryResult] = await Promise.allSettled([
    supabase
      .from('attendance_records')
      .select('id,attendance_type,logged_at,source,station_no,scanned_uid')
      .eq('learner_id', learnerId)
      .order('logged_at', { ascending: true }),
    supabase
      .from('attendance_daily_summary')
      .select('attendance_date,am_in,am_out,pm_in,pm_out,unscheduled_count')
      .eq('learner_id', learnerId)
      .order('attendance_date', { ascending: true }),
  ]);

  const rawError = rawResult.status === 'rejected' ? rawResult.reason : rawResult.value.error;
  const summaryError = summaryResult.status === 'rejected' ? summaryResult.reason : summaryResult.value.error;
  const rawSucceeded = rawResult.status === 'fulfilled' && !rawResult.value.error;
  const summarySucceeded = summaryResult.status === 'fulfilled' && !summaryResult.value.error;

  const rawRows = rawSucceeded ? (rawResult.value.data || []).map((row: any) => ({
    id: toText(row.id),
    attendance_type: toText(row.attendance_type),
    logged_at: toText(row.logged_at),
    source: toText(row.source || 'rfid'),
    station_no: row.station_no,
    scanned_uid: row.scanned_uid == null ? null : toText(row.scanned_uid),
  })) as RawAttendanceRow[] : [];

  const summaryRows = summarySucceeded ? (summaryResult.value.data || []).map((row: any) => ({
    attendance_date: toText(row.attendance_date),
    am_in: row.am_in ? toText(row.am_in) : null,
    am_out: row.am_out ? toText(row.am_out) : null,
    pm_in: row.pm_in ? toText(row.pm_in) : null,
    pm_out: row.pm_out ? toText(row.pm_out) : null,
    unscheduled_count: Number(row.unscheduled_count || 0),
  })) as SummaryAttendanceRow[] : [];

  if (!rawSucceeded && !summarySucceeded) {
    const rawMessage = rawError instanceof Error ? rawError.message : 'Unable to load raw attendance data.';
    const summaryMessage = summaryError instanceof Error ? summaryError.message : 'Unable to load attendance summaries.';
    throw new Error(`${rawMessage} ${summaryMessage}`.trim());
  }

  const snapshot = buildSnapshot(rawRows, summaryRows);
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
