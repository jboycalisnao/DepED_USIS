#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const RETENTION_DAYS = Number(process.env.ATTENDANCE_RETENTION_DAYS || 90);
const BUCKET = process.env.ATTENDANCE_ARCHIVE_BUCKET || 'attendance-archives';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const tmpDir = path.resolve(__dirname, '../.tmp');

const csvEscape = (value) => {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n')) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
};

const startOfMonthUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));

const nextMonthUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));

const yyyyMm = (date) => {
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  return `${y}-${m}`;
};

const isoDate = (date) => date.toISOString().slice(0, 10);

const ensureArchiveBucket = async () => {
  const { data: bucket } = await supabase.storage.getBucket(BUCKET);
  if (bucket) return;
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false });
  if (error && !String(error.message || '').toLowerCase().includes('already')) {
    throw error;
  }
};

const fetchRangeCount = async (fromIso, toIso, cutoffIso) => {
  const { count, error } = await supabase
    .from('attendance_records')
    .select('id', { head: true, count: 'exact' })
    .gte('logged_at', fromIso)
    .lt('logged_at', toIso)
    .lt('logged_at', cutoffIso);
  if (error) throw error;
  return count || 0;
};

const refreshSummariesForRange = async (fromDate, toDate) => {
  const { error } = await supabase.rpc('attendance_refresh_summaries', {
    p_start_date: fromDate,
    p_end_date: toDate,
  });
  if (error) throw error;
};

const exportMonthCsv = async (fromIso, toIso, cutoffIso, localCsvPath, hash) => {
  const headers = [
    'id',
    'learner_id',
    'attendance_type',
    'station_no',
    'scanned_uid',
    'logged_at',
    'source',
    'created_at',
  ];
  await fs.writeFile(localCsvPath, `${headers.join(',')}\n`, 'utf8');
  hash.update(`${headers.join(',')}\n`);

  let exported = 0;
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, learner_id, attendance_type, station_no, scanned_uid, logged_at, source, created_at')
      .gte('logged_at', fromIso)
      .lt('logged_at', toIso)
      .lt('logged_at', cutoffIso)
      .order('logged_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    const lines = data
      .map((row) =>
        [
          row.id,
          row.learner_id,
          row.attendance_type,
          row.station_no,
          row.scanned_uid,
          row.logged_at,
          row.source,
          row.created_at,
        ]
          .map(csvEscape)
          .join(','),
      )
      .join('\n');

    const payload = `${lines}\n`;
    await fs.appendFile(localCsvPath, payload, 'utf8');
    hash.update(payload);

    exported += data.length;
    offset += pageSize;
  }

  return exported;
};

const uploadArchiveCsv = async (storagePath, localCsvPath) => {
  const fileBuffer = await fs.readFile(localCsvPath);
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, fileBuffer, {
    contentType: 'text/csv',
    upsert: false,
  });
  if (error) throw error;
};

const deleteRange = async (fromIso, toIso, cutoffIso) => {
  const { error } = await supabase
    .from('attendance_records')
    .delete()
    .gte('logged_at', fromIso)
    .lt('logged_at', toIso)
    .lt('logged_at', cutoffIso);
  if (error) throw error;
};

const insertManifest = async (payload) => {
  const { data, error } = await supabase
    .from('attendance_archive_batches')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

const markPurged = async (id) => {
  const { error } = await supabase
    .from('attendance_archive_batches')
    .update({ purged_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

const run = async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  await ensureArchiveBucket();

  const now = new Date();
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const cutoffIso = cutoff.toISOString();
  const cutoffDay = isoDate(cutoff);

  const { data: firstRow, error: firstError } = await supabase
    .from('attendance_records')
    .select('logged_at')
    .lt('logged_at', cutoffIso)
    .order('logged_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstError) throw firstError;
  if (!firstRow) {
    console.log('No records eligible for archive/purge.');
    return;
  }

  const { data: lastRow, error: lastError } = await supabase
    .from('attendance_records')
    .select('logged_at')
    .lt('logged_at', cutoffIso)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  let cursor = startOfMonthUtc(new Date(firstRow.logged_at));
  const endMonth = startOfMonthUtc(new Date(lastRow.logged_at));

  while (cursor <= endMonth) {
    const monthStart = cursor;
    const monthEnd = nextMonthUtc(monthStart);
    const fromIso = monthStart.toISOString();
    const toIso = monthEnd.toISOString();
    const monthLabel = yyyyMm(monthStart);

    const monthCount = await fetchRangeCount(fromIso, toIso, cutoffIso);
    if (monthCount === 0) {
      cursor = monthEnd;
      continue;
    }

    const summaryStart = isoDate(monthStart);
    const summaryEndDate = new Date(Math.min(monthEnd.getTime(), cutoff.getTime()) - 1);
    const summaryEnd = isoDate(summaryEndDate);
    await refreshSummariesForRange(summaryStart, summaryEnd);

    const hash = crypto.createHash('sha256');
    const filename = `attendance-records-${monthLabel}.csv`;
    const localCsvPath = path.join(tmpDir, filename);
    const storagePath = `${monthLabel}/${filename}`;

    const exportedCount = await exportMonthCsv(fromIso, toIso, cutoffIso, localCsvPath, hash);
    const checksumSha256 = hash.digest('hex');

    if (exportedCount !== monthCount) {
      throw new Error(`Row count mismatch for ${monthLabel}: counted ${monthCount}, exported ${exportedCount}`);
    }

    await uploadArchiveCsv(storagePath, localCsvPath);

    const manifestId = await insertManifest({
      archive_month: `${monthLabel}-01`,
      from_logged_at: fromIso,
      to_logged_at: toIso,
      row_count: exportedCount,
      file_path: `${BUCKET}/${storagePath}`,
      checksum_sha256: checksumSha256,
      exported_at: new Date().toISOString(),
      notes: `retention_days=${RETENTION_DAYS}; cutoff_day=${cutoffDay}`,
    });

    await deleteRange(fromIso, toIso, cutoffIso);

    const remaining = await fetchRangeCount(fromIso, toIso, cutoffIso);
    if (remaining !== 0) {
      throw new Error(`Purge failed for ${monthLabel}: ${remaining} rows remain`);
    }

    await markPurged(manifestId);
    await fs.unlink(localCsvPath).catch(() => undefined);

    console.log(`Archived and purged ${exportedCount} rows for ${monthLabel}`);
    cursor = monthEnd;
  }
};

run().catch((error) => {
  console.error('Attendance archive job failed:', error);
  process.exit(1);
});
