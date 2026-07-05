import { AttendanceRecord, AttendanceScheduleConfig, Learner } from '../../../../types';
import { isAttendanceRecordLate, normalizeGradeBand } from '../../../../utils/attendanceSchedule';

const MANILA_TIME_ZONE = 'Asia/Manila';

const formatAttendanceDate = (timestamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));

const formatTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatReadableDate = (value: string) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(parsed);
};

const formatPrintDate = () =>
  new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date());

const getManilaDateKey = (value = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);

const isWeekendDateKey = (dateKey: string) => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  const day = parsed.getDay();
  return day === 0 || day === 6;
};

const isFutureDateKey = (dateKey: string, referenceDateKey: string) => dateKey > referenceDateKey;

const isNoClassDateKey = (dateKey: string, noClassDates: string[]) => noClassDates.includes(dateKey);

const normalizeGenderLabel = (gender: string | null | undefined) => {
  const normalized = String(gender || '').trim().toLowerCase();
  if (!normalized) return 'Other / Unspecified';
  if (normalized === 'm' || normalized === 'male' || normalized.startsWith('male')) return 'Male';
  if (normalized === 'f' || normalized === 'female' || normalized.startsWith('female')) return 'Female';
  return 'Other / Unspecified';
};

const getRequiredSlotTypes = (learner: Learner) => {
  const gradeBand = normalizeGradeBand(String(learner.grade_level || ''));
  if (gradeBand === 'grade11') return ['AM_IN', 'AM_OUT'] as const;
  if (gradeBand === 'grade12') return ['PM_IN', 'PM_OUT'] as const;
  return ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'] as const;
};

type MonthlyReportRow = {
  learner: Learner;
  name: string;
  monthRecords: AttendanceRecord[];
  stats: {
    presentDays: number;
    lateDays: number;
    absentDays: number;
  };
};

type DailyReportRow = {
  learner: Learner;
  name: string;
  records: AttendanceRecord[];
  lateCount: number;
  unscheduledCount: number;
};

const buildReportHeader = (title: string, sectionName: string, subtitle: string, summaryItems: Array<{ label: string; value: string | number }>) => `
  <div class="report__header">
    <p class="report__eyebrow">${title}</p>
    <h1 class="report__title">${sectionName}</h1>
    <p class="report__meta">${subtitle} | Printed: ${formatPrintDate()}</p>
  </div>

  <div class="report__summary">
    ${summaryItems
      .map(
        (item) => `
          <div class="report__stat">
            <p class="report__stat-label">${item.label}</p>
            <p class="report__stat-value">${item.value}</p>
          </div>
        `,
      )
      .join('')}
  </div>
`;

const buildShell = (title: string, body: string) => `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page { size: landscape; margin: 14mm; }
        :root {
          --ink: #102a43;
          --blue: #123f9c;
          --line: #d6deeb;
          --muted: #5f6b7a;
        }
        body {
          margin: 0;
          font-family: Segoe UI, sans-serif;
          color: var(--ink);
          background: #fff;
        }
        .report {
          padding: 0;
        }
        .report__header {
          display: grid;
          gap: 4px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--line);
        }
        .report__eyebrow {
          margin: 0;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .report__title {
          margin: 0;
          color: var(--blue);
          font-size: 22px;
          font-weight: 700;
        }
        .report__meta {
          margin: 0;
          color: var(--muted);
          font-size: 12px;
        }
        .report__summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          margin: 0 0 16px;
        }
        .report__stat {
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 10px 12px;
        }
        .report__stat-label {
          margin: 0 0 4px;
          color: var(--muted);
          font-size: 11px;
          text-transform: uppercase;
        }
        .report__stat-value {
          margin: 0;
          color: var(--ink);
          font-size: 18px;
          font-weight: 700;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead th {
          padding: 10px 8px;
          border: 1px solid var(--line);
          background: #f7f9fc;
          color: var(--blue);
          font-size: 11px;
          text-transform: uppercase;
          text-align: left;
        }
        tbody td {
          padding: 9px 8px;
          border: 1px solid var(--line);
          font-size: 12px;
          vertical-align: top;
        }
        tbody tr:nth-child(even) td {
          background: #fbfcfe;
        }
        .is-center {
          text-align: center;
        }
        .report__footer {
          margin-top: 12px;
          color: var(--muted);
          font-size: 11px;
        }
        .report__notice {
          margin: 0 0 14px;
          padding: 10px 12px;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          background: #fffbeb;
          color: #92400e;
          font-size: 12px;
          font-weight: 600;
        }
        .report__muted {
          color: var(--muted);
        }
      </style>
    </head>
    <body>
      <div class="report">
        ${body}
      </div>
    </body>
  </html>
`;

const buildMonthlyRows = (rows: MonthlyReportRow[]) =>
  rows
    .map(
      ({ learner, name, stats, monthRecords }) => `
        <tr>
          <td>${name || 'Unnamed learner'}</td>
          <td>${learner.lrn || 'No LRN'}</td>
          <td>${normalizeGenderLabel(learner.gender)}</td>
          <td class="is-center">${stats.presentDays}</td>
          <td class="is-center">${stats.lateDays}</td>
          <td class="is-center">${stats.absentDays}</td>
          <td class="is-center">${monthRecords.length}</td>
        </tr>
      `,
    )
    .join('');

const buildDailyCellValue = (records: AttendanceRecord[], learner: Learner, scheduleConfig: AttendanceScheduleConfig, type: AttendanceRecord['type']) => {
  const matching = records
    .filter((record) => record.type === type)
    .slice()
    .sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime());
  if (matching.length === 0) return '<span class="report__muted">-</span>';
  const values = matching
    .map((record) => {
      const label = formatTime(record.timestamp);
      const isLate = isAttendanceRecordLate(record, learner, scheduleConfig);
      return isLate ? `${label} (Late)` : label;
    })
    .join('<br />');
  return values;
};

const buildDailyRows = (rows: DailyReportRow[], scheduleConfig: AttendanceScheduleConfig) =>
  rows
    .map(
      ({ learner, name, records, lateCount, unscheduledCount }) => `
        <tr>
          <td>${name || 'Unnamed learner'}</td>
          <td>${learner.lrn || 'No LRN'}</td>
          <td>${normalizeGenderLabel(learner.gender)}</td>
          <td class="is-center">${buildDailyCellValue(records, learner, scheduleConfig, 'AM_IN')}</td>
          <td class="is-center">${buildDailyCellValue(records, learner, scheduleConfig, 'AM_OUT')}</td>
          <td class="is-center">${buildDailyCellValue(records, learner, scheduleConfig, 'PM_IN')}</td>
          <td class="is-center">${buildDailyCellValue(records, learner, scheduleConfig, 'PM_OUT')}</td>
          <td class="is-center">${unscheduledCount}</td>
          <td class="is-center">${lateCount}</td>
          <td class="is-center">${records.length}</td>
        </tr>
      `,
    )
    .join('');

const buildReportNotice = (message: string) => `
  <div class="report__notice">
    ${message}
  </div>
`;

export const buildMonthlyAttendanceReportHtml = (sectionName: string, monthLabel: string, rows: MonthlyReportRow[]) => {
  const totalLearners = rows.length;
  const totalPresent = rows.reduce((sum, row) => sum + row.stats.presentDays, 0);
  const totalLate = rows.reduce((sum, row) => sum + row.stats.lateDays, 0);
  const totalAbsent = rows.reduce((sum, row) => sum + row.stats.absentDays, 0);

  return buildShell(
    `${sectionName} Attendance Report - ${monthLabel}`,
    `
      ${buildReportHeader('Attendance Monthly Report', sectionName, `Month: ${monthLabel}`, [
        { label: 'Learners', value: totalLearners },
        { label: 'Present Days', value: totalPresent },
        { label: 'Late Days', value: totalLate },
        { label: 'Absent Days', value: totalAbsent },
      ])}

      <table>
        <thead>
          <tr>
            <th>Learner</th>
            <th>LRN</th>
            <th>Gender</th>
            <th class="is-center">Present</th>
            <th class="is-center">Late</th>
            <th class="is-center">Absent</th>
            <th class="is-center">Taps</th>
          </tr>
        </thead>
        <tbody>
          ${buildMonthlyRows(rows) || '<tr><td colspan="7">No learners to report.</td></tr>'}
        </tbody>
      </table>

      <div class="report__footer">
        Generated by the Attendance module for ${sectionName}.
      </div>
    `,
  );
};

export const buildDailyAttendanceReportHtml = (
  sectionName: string,
  attendanceDate: string,
  rows: DailyReportRow[],
  scheduleConfig: AttendanceScheduleConfig,
  options?: { noClassDay?: boolean },
) => {
  const totalLearners = rows.length;
  const totalTaps = rows.reduce((sum, row) => sum + row.records.length, 0);
  const totalLate = rows.reduce((sum, row) => sum + row.lateCount, 0);
  const totalUnscheduled = rows.reduce((sum, row) => sum + row.unscheduledCount, 0);
  const noClassDay = Boolean(options?.noClassDay);

  return buildShell(
    `${sectionName} Daily Attendance Report - ${attendanceDate}`,
    `
      ${buildReportHeader('Attendance Daily Report', sectionName, `Date: ${formatReadableDate(attendanceDate)}`, [
        { label: 'Learners', value: totalLearners },
        { label: 'Taps', value: totalTaps },
        { label: 'Late Taps', value: totalLate },
        { label: 'Unscheduled', value: totalUnscheduled },
      ])}

      ${noClassDay ? buildReportNotice('No class was scheduled on this day. Attendance records are shown only if they were recorded manually.') : ''}

      <table>
        <thead>
          <tr>
            <th>Learner</th>
            <th>LRN</th>
            <th>Gender</th>
            <th class="is-center">AM IN</th>
            <th class="is-center">AM OUT</th>
            <th class="is-center">PM IN</th>
            <th class="is-center">PM OUT</th>
            <th class="is-center">Unscheduled</th>
            <th class="is-center">Late</th>
            <th class="is-center">Records</th>
          </tr>
        </thead>
        <tbody>
          ${buildDailyRows(rows, scheduleConfig) || '<tr><td colspan="10">No learners to report.</td></tr>'}
        </tbody>
      </table>

      <div class="report__footer">
        Generated by the Attendance module for ${sectionName} on ${formatReadableDate(attendanceDate)}.
      </div>
    `,
  );
};

export const buildMonthlyAttendanceRows = (
  sectionLearners: Learner[],
  learnerCards: Map<string, AttendanceRecord[]>,
  selectedMonth: string,
  monthDays: string[],
  scheduleConfig: AttendanceScheduleConfig,
  noClassDates: string[] = [],
) =>
  sectionLearners.map((learner) => {
    const learnerRecords = learnerCards.get(String(learner.id)) || [];
    const monthRecords = learnerRecords.filter((record) => formatAttendanceDate(record.timestamp).slice(0, 7) === selectedMonth);
    const name = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
    const gradeBand = normalizeGradeBand(String(learner.grade_level || ''));
    const requiredSlotTypes =
      gradeBand === 'grade11' ? (['AM_IN', 'AM_OUT'] as const) : gradeBand === 'grade12' ? (['PM_IN', 'PM_OUT'] as const) : (['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'] as const);
    const byDay = new Map<string, AttendanceRecord[]>();

    monthRecords.forEach((record) => {
      const dayKey = formatAttendanceDate(record.timestamp);
      const list = byDay.get(dayKey) || [];
      list.push(record);
      byDay.set(dayKey, list);
    });

    let presentDays = 0;
    let lateDays = 0;
    let absentDays = 0;
    const currentDateKey = getManilaDateKey();
    monthDays.forEach((dayKey) => {
      if (isWeekendDateKey(dayKey) || isNoClassDateKey(dayKey, noClassDates) || isFutureDateKey(dayKey, currentDateKey)) {
        return;
      }

      const dayRecords = byDay.get(dayKey) || [];
      const hasAnyRecords = dayRecords.length > 0;
      const hasCompleteInOut = requiredSlotTypes.every((slotType) => dayRecords.some((record) => record.type === slotType));
      const hasLate = dayRecords.some((record) => isAttendanceRecordLate(record, learner, scheduleConfig));

      if (hasCompleteInOut) presentDays += 1;
      if (hasLate) lateDays += 1;
      if (!hasAnyRecords) absentDays += 1;
    });

    return {
      learner,
      name,
      monthRecords,
      stats: {
        presentDays,
        lateDays,
        absentDays,
      },
    } satisfies MonthlyReportRow;
  });

export const buildDailyAttendanceRows = (
  sectionLearners: Learner[],
  records: AttendanceRecord[],
  selectedDate: string,
  scheduleConfig: AttendanceScheduleConfig,
  noClassDates: string[] = [],
) =>
  isNoClassDateKey(selectedDate, noClassDates)
    ? []
    : sectionLearners
        .map((learner) => {
          const learnerRecords = records.filter((record) => String(record.learnerId) === String(learner.id));
          const dayRecords = learnerRecords.filter((record) => formatAttendanceDate(record.timestamp) === selectedDate);
          const name = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
          const lateCount = dayRecords.filter((record) => isAttendanceRecordLate(record, learner, scheduleConfig)).length;
          const unscheduledCount = dayRecords.filter((record) => record.type === 'UNSCHEDULED').length;

          return {
            learner,
            name,
            records: dayRecords,
            lateCount,
            unscheduledCount,
          } satisfies DailyReportRow;
        })
        .filter((row) => row.records.length > 0);
