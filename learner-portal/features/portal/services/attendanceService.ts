import { supabase } from '@deped-usis/shared-supabase';
import { getCachedLearnerData, resolveLearnerCacheKey, setCachedLearnerData } from './learnerPortalCache';

export type LearnerAttendanceRecord = {
  id: string;
  attendanceType: string;
  loggedAt: string;
  source: string;
  stationNo: string;
  scannedUid: string;
};

export type LearnerAttendanceSnapshot = {
  records: LearnerAttendanceRecord[];
  total: number;
};

const toText = (value: unknown) => String(value || '').trim();

export async function fetchLearnerAttendanceSnapshot(input: { learnerId?: string; lrn?: string }): Promise<LearnerAttendanceSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });
  const cached = getCachedLearnerData<LearnerAttendanceSnapshot>('attendance-history', cacheKey);
  if (cached) return cached;

  if (!learnerId) {
    throw new Error('Learner attendance lookup requires learner ID.');
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('id,attendance_type,logged_at,source,station_no,scanned_uid')
    .eq('learner_id', learnerId)
    .order('logged_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load attendance records right now.');
  }

  const records = (data || []).map((row: any) => ({
    id: toText(row.id),
    attendanceType: toText(row.attendance_type),
    loggedAt: toText(row.logged_at),
    source: toText(row.source || 'rfid'),
    stationNo: toText(row.station_no),
    scannedUid: toText(row.scanned_uid),
  }));

  const snapshot = { records, total: records.length };
  setCachedLearnerData('attendance-history', cacheKey, snapshot);
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

