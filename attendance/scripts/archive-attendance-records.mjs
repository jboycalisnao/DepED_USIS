#!/usr/bin/env node
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const MANILA_TIME_ZONE = 'Asia/Manila';
const DEFAULT_RETENTION_MONTHS = Number(process.env.ATTENDANCE_ARCHIVE_MONTHS || 3);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const parseArgs = () => {
  const result = {};
  const argv = process.argv.slice(2);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const body = token.slice(2);
    const equalsIndex = body.indexOf('=');
    if (equalsIndex >= 0) {
      result[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      continue;
    }

    const nextToken = argv[index + 1];
    if (nextToken && !nextToken.startsWith('--')) {
      result[body] = nextToken;
      index += 1;
      continue;
    }

    result[body] = 'true';
  }
  return result;
};

const args = parseArgs();

const toText = (value) => String(value || '').trim();

const chunk = (items, size) => {
  const result = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
};

const formatManilaDateParts = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (!lookup.year || !lookup.month || !lookup.day) return null;
  return {
    year: lookup.year,
    month: lookup.month,
    day: lookup.day,
  };
};

const getManilaDateKey = (value) => {
  const parts = formatManilaDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getManilaMonthKey = (value) => {
  const parts = formatManilaDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}`;
};

const getManilaMonthLabel = (monthKey) => {
  const date = new Date(`${monthKey}-01T00:00:00+08:00`);
  if (Number.isNaN(date.getTime())) return monthKey;
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: MANILA_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatDateRangeLabel = (fromValue, toValue) => {
  const start = getManilaDateKey(fromValue);
  const end = getManilaDateKey(toValue);
  if (!start && !end) return 'N/A';
  if (start === end) return start;
  return `${start} to ${end}`;
};

const formatLearnerName = (row) => {
  const firstName = toText(row.first_name);
  const middleName = toText(row.middle_name);
  const lastName = toText(row.last_name);
  return [firstName, middleName, lastName].filter(Boolean).join(' ').trim();
};

const getEligibleBounds = async (windowStartIso, windowEndExclusiveIso) => {
  const query = supabase
    .from('attendance_records')
    .select('id, logged_at')
    .gte('logged_at', windowStartIso)
    .lt('logged_at', windowEndExclusiveIso)
    .order('logged_at', { ascending: true });

  const { data: firstRows, error: firstError } = await query.limit(1);
  if (firstError) throw firstError;
  if (!firstRows || firstRows.length === 0) return null;

  const { data: lastRows, error: lastError } = await supabase
    .from('attendance_records')
    .select('id, logged_at')
    .gte('logged_at', windowStartIso)
    .lt('logged_at', windowEndExclusiveIso)
    .order('logged_at', { ascending: false })
    .limit(1);
  if (lastError) throw lastError;
  if (!lastRows || lastRows.length === 0) return null;

  return {
    firstLoggedAt: String(firstRows[0].logged_at),
    lastLoggedAt: String(lastRows[0].logged_at),
  };
};

const fetchEligibleRecords = async (windowStartIso, windowEndExclusiveIso) => {
  const records = [];
  const learnerIds = new Set();
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, learner_id, attendance_type, station_no, scanned_uid, logged_at, source, created_at')
      .gte('logged_at', windowStartIso)
      .lt('logged_at', windowEndExclusiveIso)
      .order('logged_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    for (const row of data) {
      records.push(row);
      if (row.learner_id) learnerIds.add(String(row.learner_id));
    }

    offset += data.length;
    if (data.length < pageSize) break;
  }

  return { records, learnerIds: [...learnerIds] };
};

const fetchLearnerDirectory = async (learnerIds) => {
  const directory = new Map();
  for (const ids of chunk(learnerIds, 200)) {
    const { data, error } = await supabase
      .from('registrar_learners')
      .select('id, lrn, first_name, middle_name, last_name')
      .in('id', ids);
    if (error) throw error;
    for (const row of data || []) {
      directory.set(String(row.id), {
        id: String(row.id),
        lrn: toText(row.lrn),
        name: formatLearnerName(row),
      });
    }
  }
  return directory;
};

const groupRecordsByMonth = (records, learnerDirectory) => {
  const groups = new Map();

  for (const record of records) {
    const monthKey = getManilaMonthKey(record.logged_at);
    if (!monthKey) continue;

    if (!groups.has(monthKey)) {
      groups.set(monthKey, {
        monthKey,
        records: [],
        learnerSummaries: new Map(),
      });
    }

    const group = groups.get(monthKey);
    group.records.push(record);

    const learnerId = String(record.learner_id || '');
    if (!learnerId) continue;

    if (!group.learnerSummaries.has(learnerId)) {
      const learner = learnerDirectory.get(learnerId) || { id: learnerId, lrn: '', name: '' };
      group.learnerSummaries.set(learnerId, {
        archive_batch_id: '',
        learner_id: learnerId,
        learner_name: learner.name || '',
        learner_lrn: learner.lrn || '',
        archive_month: `${monthKey}-01`,
        from_logged_at: String(record.logged_at),
        to_logged_at: String(record.logged_at),
        row_count: 0,
        am_in_count: 0,
        am_out_count: 0,
        pm_in_count: 0,
        pm_out_count: 0,
        unscheduled_count: 0,
        first_logged_at: String(record.logged_at),
        last_logged_at: String(record.logged_at),
        notes: '',
      });
    }

    const summary = group.learnerSummaries.get(learnerId);
    summary.row_count += 1;
    summary.first_logged_at = summary.row_count === 1 || String(record.logged_at) < summary.first_logged_at ? String(record.logged_at) : summary.first_logged_at;
    summary.last_logged_at = summary.row_count === 1 || String(record.logged_at) > summary.last_logged_at ? String(record.logged_at) : summary.last_logged_at;
    summary.from_logged_at = summary.first_logged_at;
    summary.to_logged_at = summary.last_logged_at;

    switch (String(record.attendance_type || '').toUpperCase()) {
      case 'AM_IN':
        summary.am_in_count += 1;
        break;
      case 'AM_OUT':
        summary.am_out_count += 1;
        break;
      case 'PM_IN':
        summary.pm_in_count += 1;
        break;
      case 'PM_OUT':
        summary.pm_out_count += 1;
        break;
      default:
        summary.unscheduled_count += 1;
        break;
    }
  }

  return [...groups.values()].sort((left, right) => (left.monthKey > right.monthKey ? 1 : -1));
};

const insertArchiveBatch = async (payload) => {
  const { data, error } = await supabase.from('attendance_archive_batches').insert(payload).select('id').single();
  if (error) throw error;
  return data.id;
};

const insertLearnerSummaries = async (rows) => {
  if (rows.length === 0) return;
  const { error } = await supabase.from('attendance_archive_learner_summaries').insert(rows);
  if (error) throw error;
};

const deleteRecordsById = async (recordIds) => {
  for (const ids of chunk(recordIds, 500)) {
    const { error } = await supabase.from('attendance_records').delete().in('id', ids);
    if (error) throw error;
  }
};

const refreshSummariesForGroup = async (groupRecords) => {
  if (groupRecords.length === 0) return;
  const firstDate = getManilaDateKey(groupRecords[0].logged_at);
  const lastDate = getManilaDateKey(groupRecords[groupRecords.length - 1].logged_at);
  if (!firstDate || !lastDate) return;
  const { error } = await supabase.rpc('attendance_refresh_summaries', {
    p_start_date: firstDate,
    p_end_date: lastDate,
  });
  if (error) throw error;
};

const main = async () => {
  const retentionMonths = Number(args.months || DEFAULT_RETENTION_MONTHS || 3);
  const selectedFrom = toText(args.from);
  const selectedTo = toText(args.to);
  const archiveReason =
    toText(args.reason) ||
    toText(process.env.ATTENDANCE_ARCHIVE_REASON) ||
    (selectedFrom && selectedTo ? 'manual-selected-range' : `older-than-${retentionMonths}-months`);

  let windowStartIso = '';
  let windowEndExclusiveIso = '';

  if (selectedFrom || selectedTo) {
    if (!selectedFrom || !selectedTo) {
      throw new Error('Archive range requires both --from and --to.');
    }
    windowStartIso = `${selectedFrom}T00:00:00+08:00`;
    const endExclusive = new Date(`${selectedTo}T00:00:00+08:00`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    windowEndExclusiveIso = endExclusive.toISOString();
  } else {
    const cutoff = new Date();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - retentionMonths);
    windowEndExclusiveIso = cutoff.toISOString();
  }

  const bounds = await getEligibleBounds(windowStartIso || '0001-01-01T00:00:00Z', windowEndExclusiveIso);
  if (!bounds) {
    console.log('No records eligible for archive.');
    return;
  }

  if (!windowStartIso) {
    windowStartIso = String(bounds.firstLoggedAt);
  }

  const { records, learnerIds } = await fetchEligibleRecords(windowStartIso, windowEndExclusiveIso);
  if (records.length === 0) {
    console.log('No records eligible for archive.');
    return;
  }

  const learnerDirectory = await fetchLearnerDirectory(learnerIds);

  const groups = groupRecordsByMonth(records, learnerDirectory);
  for (const group of groups) {
    const archiveBatchId = crypto.randomUUID();
    const groupLearnerSummaries = [...group.learnerSummaries.values()].map((summary) => ({
      ...summary,
      archive_batch_id: archiveBatchId,
      notes: archiveReason,
    }));

    const monthRecords = group.records;
    const rowCount = monthRecords.length;
    const learnerCount = groupLearnerSummaries.length;
    const archiveMonth = `${group.monthKey}-01`;
    const firstLoggedAt = String(monthRecords[0].logged_at);
    const lastLoggedAt = String(monthRecords[monthRecords.length - 1].logged_at);

    const summaryPayload = groupLearnerSummaries.map((summary) => ({
      learner_id: summary.learner_id,
      learner_name: summary.learner_name,
      learner_lrn: summary.learner_lrn,
      archive_month: summary.archive_month,
      from_logged_at: summary.from_logged_at,
      to_logged_at: summary.to_logged_at,
      row_count: summary.row_count,
      am_in_count: summary.am_in_count,
      am_out_count: summary.am_out_count,
      pm_in_count: summary.pm_in_count,
      pm_out_count: summary.pm_out_count,
      unscheduled_count: summary.unscheduled_count,
    }));

    const filePath = `archive://attendance/${group.monthKey}/${archiveBatchId}`;

    await insertArchiveBatch({
      id: archiveBatchId,
      archive_month: archiveMonth,
      from_logged_at: firstLoggedAt,
      to_logged_at: lastLoggedAt,
      row_count: rowCount,
      file_path: filePath,
      checksum_sha256: crypto.createHash('sha256').update(JSON.stringify(monthRecords)).digest('hex'),
      sheet_id: null,
      sheet_url: null,
      sheet_tab: 'Archive',
      archive_source: selectedFrom && selectedTo ? 'selected_range' : 'retention_window',
      archive_reason: archiveReason,
      learner_count: learnerCount,
      source_row_count: rowCount,
      summary_payload: summaryPayload,
      exported_at: new Date().toISOString(),
      notes: `range=${formatDateRangeLabel(firstLoggedAt, lastLoggedAt)}`,
    });

    await insertLearnerSummaries(
      groupLearnerSummaries.map((summary) => ({
        archive_batch_id: archiveBatchId,
        learner_id: summary.learner_id,
        learner_name: summary.learner_name,
        learner_lrn: summary.learner_lrn,
        archive_month: summary.archive_month,
        from_logged_at: summary.from_logged_at,
        to_logged_at: summary.to_logged_at,
        row_count: summary.row_count,
        am_in_count: summary.am_in_count,
        am_out_count: summary.am_out_count,
        pm_in_count: summary.pm_in_count,
        pm_out_count: summary.pm_out_count,
        unscheduled_count: summary.unscheduled_count,
        first_logged_at: summary.first_logged_at,
        last_logged_at: summary.last_logged_at,
        sheet_id: null,
        sheet_url: null,
        sheet_tab: 'Archive',
        archived_at: new Date().toISOString(),
        notes: archiveReason,
      })),
    );

    await refreshSummariesForGroup(monthRecords);

    await deleteRecordsById(monthRecords.map((record) => String(record.id)));

    const { count: remainingCount, error: remainingError } = await supabase
      .from('attendance_records')
      .select('id', { head: true, count: 'exact' })
      .in('id', monthRecords.map((record) => String(record.id)));
    if (remainingError) throw remainingError;
    if (remainingCount && remainingCount > 0) {
      throw new Error(`Purge failed for ${group.monthKey}: ${remainingCount} rows remain`);
    }

    await supabase
      .from('attendance_archive_batches')
      .update({ purged_at: new Date().toISOString() })
      .eq('id', archiveBatchId);

    console.log(`Archived ${rowCount} attendance records for ${getManilaMonthLabel(group.monthKey)} into archive summaries.`);
  }
};

main().catch((error) => {
  console.error('Attendance archive job failed:', error);
  process.exit(1);
});
