import { supabase } from '@deped-usis/shared-supabase';
import { getCachedLearnerData, resolveLearnerCacheKey, setCachedLearnerData } from './learnerPortalCache';

type AttendanceArchiveRow = {
  id: string;
  archive_month: string;
  from_logged_at: string;
  to_logged_at: string;
  row_count: number;
  am_in_count: number;
  am_out_count: number;
  pm_in_count: number;
  pm_out_count: number;
  unscheduled_count: number;
  archived_at: string;
  notes: string | null;
  learner_name: string | null;
  learner_lrn: string | null;
  first_logged_at: string;
  last_logged_at: string;
};

export type LearnerAttendanceArchiveRecord = {
  id: string;
  archiveMonth: string;
  archiveMonthLabel: string;
  fromLoggedAt: string;
  toLoggedAt: string;
  archiveRangeLabel: string;
  rowCount: number;
  amInCount: number;
  amOutCount: number;
  pmInCount: number;
  pmOutCount: number;
  unscheduledCount: number;
  archivedAt: string;
  archivedAtLabel: string;
  notes: string;
  learnerName: string;
  learnerLrn: string;
};

export type LearnerAttendanceArchiveSnapshot = {
  records: LearnerAttendanceArchiveRecord[];
  totalBatches: number;
  totalRows: number;
  totalTaps: number;
  totalUnscheduled: number;
  latestArchivedAt: string;
  latestArchivedRange: string;
};

const CACHE_SCOPE = 'attendance-archive-summaries';
const MANILA_TIME_ZONE = 'Asia/Manila';

const toText = (value: unknown) => String(value || '').trim();

const formatArchiveDate = (value: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

const formatArchiveDateTime = (value: string) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatMonthLabel = (value: string) => {
  if (!value) return 'N/A';
  const date = new Date(`${value}-01T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const buildArchiveRangeLabel = (fromLoggedAt: string, toLoggedAt: string) => {
  const from = formatArchiveDate(fromLoggedAt);
  const to = formatArchiveDate(toLoggedAt);
  if (from === to) return from;
  return `${from} to ${to}`;
};

const buildSnapshot = (rows: AttendanceArchiveRow[]): LearnerAttendanceArchiveSnapshot => {
  const records = rows.map((row) => ({
    id: String(row.id),
    archiveMonth: String(row.archive_month || '').slice(0, 7),
    archiveMonthLabel: formatMonthLabel(String(row.archive_month || '').slice(0, 7)),
    fromLoggedAt: String(row.from_logged_at || ''),
    toLoggedAt: String(row.to_logged_at || ''),
    archiveRangeLabel: buildArchiveRangeLabel(String(row.from_logged_at || ''), String(row.to_logged_at || '')),
    rowCount: Number(row.row_count || 0),
    amInCount: Number(row.am_in_count || 0),
    amOutCount: Number(row.am_out_count || 0),
    pmInCount: Number(row.pm_in_count || 0),
    pmOutCount: Number(row.pm_out_count || 0),
    unscheduledCount: Number(row.unscheduled_count || 0),
    archivedAt: String(row.archived_at || ''),
    archivedAtLabel: formatArchiveDateTime(String(row.archived_at || '')),
    notes: toText(row.notes),
    learnerName: toText(row.learner_name),
    learnerLrn: toText(row.learner_lrn),
  }));

  const totalRows = records.reduce((sum, record) => sum + record.rowCount, 0);
  const totalTaps = totalRows;
  const totalUnscheduled = records.reduce((sum, record) => sum + record.unscheduledCount, 0);
  const latestArchivedAt = records[0]?.archivedAt || '';
  const latestArchivedRange = records[0]?.archiveRangeLabel || '';

  return {
    records,
    totalBatches: records.length,
    totalRows,
    totalTaps,
    totalUnscheduled,
    latestArchivedAt,
    latestArchivedRange,
  };
};

export async function fetchLearnerAttendanceArchiveSnapshot(
  input: { learnerId?: string; lrn?: string },
  options: { forceRefresh?: boolean } = {},
): Promise<LearnerAttendanceArchiveSnapshot> {
  const learnerId = toText(input.learnerId);
  const lrn = toText(input.lrn);
  const cacheKey = resolveLearnerCacheKey({ learnerId, lrn });
  if (!options.forceRefresh) {
    const cached = getCachedLearnerData<LearnerAttendanceArchiveSnapshot>(CACHE_SCOPE, cacheKey);
    if (cached) return cached;
  }

  if (!learnerId) {
    throw new Error('Learner archive lookup requires learner ID.');
  }

  const { data, error } = await supabase
    .from('attendance_archive_learner_summaries')
    .select(
      [
        'id',
        'archive_month',
        'from_logged_at',
        'to_logged_at',
        'row_count',
        'am_in_count',
        'am_out_count',
        'pm_in_count',
        'pm_out_count',
        'unscheduled_count',
        'archived_at',
        'notes',
        'learner_name',
        'learner_lrn',
        'first_logged_at',
        'last_logged_at',
      ].join(','),
    )
    .eq('learner_id', learnerId)
    .order('archived_at', { ascending: false })
    .order('from_logged_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load archived attendance data.');
  }

  const snapshot = buildSnapshot((data || []) as AttendanceArchiveRow[]);
  setCachedLearnerData(CACHE_SCOPE, cacheKey, snapshot);
  return snapshot;
}
