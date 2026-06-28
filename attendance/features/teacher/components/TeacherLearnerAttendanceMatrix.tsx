import { useEffect, useMemo, useState } from 'react';
import { AttendanceRecord, AttendanceScheduleConfig, Learner } from '../../../types';
import { isAttendanceRecordLate, normalizeGradeBand } from '../../../utils/attendanceSchedule';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';

type Props = {
  accessLabel: string;
  learners: Learner[];
  scheduleConfig: AttendanceScheduleConfig;
  queryAttendanceRecordsByRange: (fromDate: string, toDate: string, learnerIds?: string[]) => Promise<AttendanceRecord[]>;
  onLogout: () => void;
};

const SLOT_TYPES = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT'] as const;
const MANILA_TIME_ZONE = 'Asia/Manila';

type LearnerMatrixDay = {
  day: number;
  dateKey: string;
  taps: AttendanceRecord[];
};

type LearnerMatrixMonth = {
  monthKey: string;
  monthLabel: string;
  days: LearnerMatrixDay[];
};

type LearnerMonthStats = {
  presentDays: number;
  lateDays: number;
  absentDays: number;
};

type LearnerReportRow = {
  learner: Learner;
  name: string;
  monthRecords: AttendanceRecord[];
  stats: LearnerMonthStats;
};

const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const getCurrentYearStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
};

const getMonthEnd = (monthKey: string) => {
  const monthEnd = new Date(`${monthKey}-01T00:00:00`);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);
  return `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(`${monthKey}-01T00:00:00`));

const formatAttendanceDate = (timestamp: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));

const formatAttendanceMonth = (timestamp: string) => formatAttendanceDate(timestamp).slice(0, 7);

const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const monthLabelFromKey = (monthKey: string) => {
  const parsed = new Date(`${monthKey}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return monthKey;
  return formatMonthLabel(monthKey);
};

const buildMonthMatrix = (monthKey: string, records: AttendanceRecord[]): LearnerMatrixMonth => {
  const daysByKey = new Map<string, AttendanceRecord[]>();
  records
    .filter((record) => formatAttendanceMonth(record.timestamp) === monthKey)
    .forEach((record) => {
      const dayKey = formatAttendanceDate(record.timestamp);
      const list = daysByKey.get(dayKey) || [];
      list.push(record);
      daysByKey.set(dayKey, list);
    });

  const monthStart = new Date(`${monthKey}-01T00:00:00`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);
  monthEnd.setDate(0);

  const days: LearnerMatrixDay[] = [];
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, '0');
    const dd = String(cursor.getDate()).padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    days.push({
      day: cursor.getDate(),
      dateKey,
      taps: (daysByKey.get(dateKey) || []).slice().sort((left, right) => new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime()),
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    days,
  };
};

const buildAvailableMonths = (records: AttendanceRecord[]) =>
  Array.from(new Set(records.map((record) => formatAttendanceMonth(record.timestamp)).filter(Boolean))).sort((left, right) => right.localeCompare(left));

const buildMonthOptions = (months: string[]) =>
  months.map((monthKey) => ({
    value: monthKey,
    label: formatMonthLabel(monthKey),
  }));

const normalizeGenderLabel = (gender: string | null | undefined) => {
  const normalized = String(gender || '').trim().toLowerCase();
  if (!normalized) return 'Other / Unspecified';
  if (normalized === 'm' || normalized === 'male' || normalized.startsWith('male')) return 'Male';
  if (normalized === 'f' || normalized === 'female' || normalized.startsWith('female')) return 'Female';
  return 'Other / Unspecified';
};

const buildLearnerMonthStats = (
  learnerMonthRecords: AttendanceRecord[],
  learner: Learner,
  scheduleConfig: AttendanceScheduleConfig,
  monthDays: LearnerMatrixDay[],
): LearnerMonthStats => {
  const gradeBand = normalizeGradeBand(String(learner.grade_level || ''));
  const requiredSlotTypes =
    gradeBand === 'grade11' ? (['AM_IN', 'AM_OUT'] as const) : gradeBand === 'grade12' ? (['PM_IN', 'PM_OUT'] as const) : SLOT_TYPES;
  const byDay = new Map<string, AttendanceRecord[]>();
  learnerMonthRecords.forEach((record) => {
    const dayKey = formatAttendanceDate(record.timestamp);
    const list = byDay.get(dayKey) || [];
    list.push(record);
    byDay.set(dayKey, list);
  });

  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;

  monthDays.forEach((day) => {
    const dayRecords = byDay.get(day.dateKey) || [];
    const hasAnyRecords = dayRecords.length > 0;
    const hasCompleteInOut = requiredSlotTypes.every((slotType) => dayRecords.some((record) => record.type === slotType));
    const hasLate = dayRecords.some((record) => isAttendanceRecordLate(record, learner, scheduleConfig));

    if (hasCompleteInOut) presentDays += 1;
    if (hasLate) lateDays += 1;
    if (!hasAnyRecords) absentDays += 1;
  });

  return { presentDays, lateDays, absentDays };
};

const groupLearnersByGender = (learners: Learner[]) => {
  const groups = new Map<string, Learner[]>();
  learners.forEach((learner) => {
    const key = normalizeGenderLabel(learner.gender);
    const list = groups.get(key) || [];
    list.push(learner);
    groups.set(key, list);
  });

  return [
    { key: 'Male', label: 'Male', learners: groups.get('Male') || [] },
    { key: 'Female', label: 'Female', learners: groups.get('Female') || [] },
    {
      key: 'Other / Unspecified',
      label: 'Other / Unspecified',
      learners: groups.get('Other / Unspecified') || [],
    },
  ].filter((group) => group.learners.length > 0);
};

const formatPrintDate = () =>
  new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date());

const buildPrintableReportHtml = (sectionName: string, monthLabel: string, rows: LearnerReportRow[]) => {
  const totalLearners = rows.length;
  const totalPresent = rows.reduce((sum, row) => sum + row.stats.presentDays, 0);
  const totalLate = rows.reduce((sum, row) => sum + row.stats.lateDays, 0);
  const totalAbsent = rows.reduce((sum, row) => sum + row.stats.absentDays, 0);

  const rowsHtml = rows
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

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${sectionName} Attendance Report - ${monthLabel}</title>
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
        </style>
      </head>
      <body>
        <div class="report">
          <div class="report__header">
            <p class="report__eyebrow">Attendance Monthly Report</p>
            <h1 class="report__title">${sectionName}</h1>
            <p class="report__meta">Month: ${monthLabel} | Printed: ${formatPrintDate()}</p>
          </div>

          <div class="report__summary">
            <div class="report__stat">
              <p class="report__stat-label">Learners</p>
              <p class="report__stat-value">${totalLearners}</p>
            </div>
            <div class="report__stat">
              <p class="report__stat-label">Present Days</p>
              <p class="report__stat-value">${totalPresent}</p>
            </div>
            <div class="report__stat">
              <p class="report__stat-label">Late Days</p>
              <p class="report__stat-value">${totalLate}</p>
            </div>
            <div class="report__stat">
              <p class="report__stat-label">Absent Days</p>
              <p class="report__stat-value">${totalAbsent}</p>
            </div>
          </div>

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
              ${rowsHtml || '<tr><td colspan="7">No learners to report.</td></tr>'}
            </tbody>
          </table>

          <div class="report__footer">
            Generated by the Attendance module for ${sectionName}.
          </div>
        </div>
      </body>
    </html>
  `;
};

export default function TeacherLearnerAttendanceMatrix({
  accessLabel,
  learners,
  scheduleConfig,
  queryAttendanceRecordsByRange,
  onLogout,
}: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sectionLearners = useMemo(
    () =>
      learners
        .slice()
        .sort((left, right) => {
          const leftName = `${left.last_name || ''} ${left.first_name || ''}`.trim();
          const rightName = `${right.last_name || ''} ${right.first_name || ''}`.trim();
          return leftName.localeCompare(rightName);
        }),
    [learners],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fromDate = getCurrentYearStart();
        const toDate = getMonthEnd(getCurrentMonthKey());
        const nextRecords = await queryAttendanceRecordsByRange(
          fromDate,
          toDate,
          sectionLearners.map((learner) => String(learner.id)),
        );
        if (!cancelled) {
          setRecords(nextRecords);
          const months = buildAvailableMonths(nextRecords);
          if (months.length > 0) {
            setSelectedMonth((current) => (months.includes(current) ? current : months[0]));
          }
        }
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError?.message || 'Unable to load attendance records.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [queryAttendanceRecordsByRange, sectionLearners]);

  const availableMonths = useMemo(() => buildAvailableMonths(records), [records]);
  const monthOptions = useMemo(
    () => (availableMonths.length > 0 ? buildMonthOptions(availableMonths) : [{ value: selectedMonth, label: formatMonthLabel(selectedMonth) }]),
    [availableMonths, selectedMonth],
  );
  const selectedMonthMatrix = useMemo(() => buildMonthMatrix(selectedMonth, records), [records, selectedMonth]);
  const learnerIds = useMemo(() => new Set(sectionLearners.map((learner) => String(learner.id))), [sectionLearners]);
  const filteredLearners = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return sectionLearners;

    return sectionLearners.filter((learner) => {
      const fullName = `${learner.last_name || ''} ${learner.first_name || ''} ${learner.middle_name || ''}`.toLowerCase();
      const lrn = String(learner.lrn || '').toLowerCase();
      const section = String(learner.section_name || '').toLowerCase();
      const grade = String(learner.grade_level || '').toLowerCase();
      return fullName.includes(query) || lrn.includes(query) || section.includes(query) || grade.includes(query);
    });
  }, [sectionLearners, searchValue]);

  const learnerCards = useMemo(() => {
    const grouped = new Map<string, AttendanceRecord[]>();
    records.forEach((record) => {
      if (!learnerIds.has(String(record.learnerId))) return;
      const list = grouped.get(record.learnerId) || [];
      list.push(record);
      grouped.set(record.learnerId, list);
    });
    return grouped;
  }, [learnerIds, records]);

  const genderGroups = useMemo(() => groupLearnersByGender(filteredLearners), [filteredLearners]);

  const reportRows = useMemo<LearnerReportRow[]>(
    () =>
      sectionLearners.map((learner) => {
        const learnerRecords = learnerCards.get(String(learner.id)) || [];
        const learnerMonthRecords = learnerRecords.filter((record) => formatAttendanceMonth(record.timestamp) === selectedMonth);
        const name = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
        const stats = buildLearnerMonthStats(learnerMonthRecords, learner, scheduleConfig, selectedMonthMatrix.days);
        return {
          learner,
          name,
          monthRecords: learnerMonthRecords,
          stats,
        };
      }),
    [learnerCards, scheduleConfig, sectionLearners, selectedMonth, selectedMonthMatrix.days],
  );

  const handleCreateMonthlyReport = () => {
    const html = buildPrintableReportHtml(
      sectionLearners[0]?.section_name || accessLabel,
      selectedMonthMatrix.monthLabel,
      reportRows,
    );

    const iframe = document.createElement('iframe');
    iframe.title = `${selectedMonthMatrix.monthLabel} attendance report`;
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.srcdoc = html;

    const cleanup = () => {
      window.setTimeout(() => {
        iframe.remove();
      }, 1000);
    };

    iframe.onload = () => {
      const printTarget = iframe.contentWindow;
      if (!printTarget) {
        cleanup();
        return;
      }

      printTarget.focus();
      window.setTimeout(() => {
        printTarget.print();
        cleanup();
      }, 150);
    };

    document.body.appendChild(iframe);
  };

  const renderTapChip = (tap: AttendanceRecord, dayKey: string, tapIndex: number) => {
    const learner = sectionLearners.find((row) => String(row.id) === String(tap.learnerId));
    const isLate = isAttendanceRecordLate(tap, learner, scheduleConfig);

    return (
      <div
        key={`${dayKey}-${tap.type}-${tap.timestamp}-${tapIndex}`}
        className={`attendance-teacher-matrix__tap-item ${isLate ? 'attendance-teacher-matrix__tap-item--late' : ''} attendance-teacher-matrix__tap-item--${tap.type.toLowerCase()}`}
      >
        <span className="attendance-teacher-matrix__tap-meta">
          <span className="attendance-teacher-matrix__tap-type">{tap.type.replace('_', ' ')}</span>
          {isLate ? <span className="attendance-teacher-matrix__tap-badge">Late</span> : null}
        </span>
        <span className="attendance-teacher-matrix__tap-time">{formatTime(tap.timestamp) || '-'}</span>
      </div>
    );
  };

  return (
    <section className="section-card attendance-teacher-matrix attendance-teacher-matrix--full rounded-md">
      <div className="section-card__bar" />
      <div className="section-card__content">
        <div className="attendance-teacher-matrix__header">
          <div className="attendance-teacher-matrix__title-block">
            <div className="attendance-teacher-matrix__title-copy">
              <p className="attendance-teacher-matrix__eyebrow">Teacher Access</p>
              <h1>{accessLabel}</h1>
              <p>Learners are listed individually. Expanding a learner shows the monthly attendance matrix.</p>
            </div>
            <div className="attendance-teacher-matrix__title-actions">
              <button type="button" className="secondary-button rounded-md attendance-teacher-matrix__report-btn" onClick={handleCreateMonthlyReport}>
                Print Monthly Report
              </button>
              <button type="button" className="secondary-button rounded-md attendance-teacher-matrix__logout" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          </div>
          <div className="attendance-teacher-matrix__controls">
            <label
              className="floating-field attendance-teacher-matrix__search-field"
              data-has-value={searchValue.trim().length > 0 ? 'true' : 'false'}
            >
              <div className="floating-field__control attendance-teacher-matrix__search-control">
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder=" "
                  className="attendance-teacher-matrix__search-input rounded-md"
                  aria-label="Search learners"
                />
                <span>Search learners by name, LRN, section, or grade</span>
              </div>
            </label>
            <UsisSearchableSelect
              ariaLabel="Attendance month"
              className="attendance-teacher-matrix__month-select-wrap"
              floatingLabel
              label="Attendance month"
              allowTyping={false}
              forcePortalMenu
              options={monthOptions}
              onChange={setSelectedMonth}
              value={selectedMonth}
            />
          </div>
        </div>

        <div className="attendance-teacher-matrix__status-row">
          <p>
            Showing <strong>{selectedMonthMatrix.monthLabel}</strong> for {filteredLearners.length} of {sectionLearners.length} learners.
          </p>
        </div>

        {isLoading ? <p className="attendance-teacher-matrix__state">Loading attendance records.</p> : null}
        {error ? <p className="attendance-teacher-matrix__state attendance-teacher-matrix__state--error">{error}</p> : null}

        <div className="attendance-teacher-matrix__learner-list">
          {sectionLearners.length === 0 ? (
            <div className="attendance-teacher-matrix__empty rounded-md">
              <span className="material-symbols-outlined">folder_open</span>
              <p>No learners are assigned to this teacher section.</p>
            </div>
          ) : filteredLearners.length === 0 ? (
            <div className="attendance-teacher-matrix__empty rounded-md">
              <span className="material-symbols-outlined">search_off</span>
              <p>No learners match your search.</p>
            </div>
          ) : (
            genderGroups.map((group) => (
              <section key={group.key} className="attendance-teacher-matrix__gender-group">
                <div className="attendance-teacher-matrix__gender-group-header">
                  <h2>{group.label}</h2>
                  <span className="attendance-teacher-matrix__gender-group-count">{group.learners.length} learners</span>
                </div>

                <div className="attendance-teacher-matrix__gender-group-list">
                  {group.learners.map((learner) => {
                    const learnerRecords = learnerCards.get(String(learner.id)) || [];
                    const learnerMonthRecords = learnerRecords.filter((record) => formatAttendanceMonth(record.timestamp) === selectedMonth);
                    const fullName = `${learner.last_name || ''}, ${learner.first_name || ''}`.replace(/^,\s*/, '').trim();
                    const stats = buildLearnerMonthStats(learnerMonthRecords, learner, scheduleConfig, selectedMonthMatrix.days);

                    return (
                      <details key={learner.id} className="attendance-teacher-matrix__learner-card rounded-md">
                        <summary className="attendance-teacher-matrix__learner-summary">
                          <div className="attendance-teacher-matrix__learner-summary-main">
                            <strong>{fullName || 'Unnamed learner'}</strong>
                            <span>
                              {learner.lrn || 'No LRN'} | {learner.section_name || 'No Section'} | {normalizeGenderLabel(learner.gender)}
                            </span>
                          </div>
                          <div className="attendance-teacher-matrix__learner-summary-meta">
                            <span className="attendance-teacher-matrix__meta-pill">Present: {stats.presentDays}</span>
                            <span className="attendance-teacher-matrix__meta-pill">Late: {stats.lateDays}</span>
                            <span className="attendance-teacher-matrix__meta-pill">Absent: {stats.absentDays}</span>
                            <span className="material-symbols-outlined attendance-teacher-matrix__expand-icon">expand_more</span>
                          </div>
                        </summary>

                        <div className="attendance-teacher-matrix__learner-panel">
                          <div className="attendance-teacher-matrix__table-shell rounded-md">
                            <table className="attendance-teacher-matrix__table">
                              <colgroup>
                                <col className="attendance-teacher-matrix__month-col" />
                                <col className="attendance-teacher-matrix__type-col" />
                                {selectedMonthMatrix.days.map((day) => (
                                  <col key={day.dateKey} className="attendance-teacher-matrix__day-col" />
                                ))}
                              </colgroup>
                              <thead>
                                <tr>
                                  <th>Month</th>
                                  <th>Type</th>
                                  {selectedMonthMatrix.days.map((day) => (
                                    <th key={day.dateKey} title={`Day ${day.day}`}>
                                      {day.day}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {SLOT_TYPES.map((slotType, rowIndex) => {
                                  const monthCell =
                                    rowIndex === 0 ? (
                                      <td className="attendance-teacher-matrix__month-cell" rowSpan={SLOT_TYPES.length}>
                                        <div className="attendance-teacher-matrix__month-name">{selectedMonthMatrix.monthLabel}</div>
                                        <div className="attendance-teacher-matrix__month-key">{selectedMonth}</div>
                                      </td>
                                    ) : null;

                                  return (
                                    <tr key={`${learner.id}-${selectedMonth}-${slotType}`}>
                                      {monthCell}
                                      <td className={`attendance-teacher-matrix__type-cell attendance-teacher-matrix__type-cell--${slotType.toLowerCase()}`}>
                                        <span>{slotType.replace('_', ' ')}</span>
                                      </td>
                                      {selectedMonthMatrix.days.map((day) => {
                                        const taps = learnerMonthRecords.filter(
                                          (record) =>
                                            formatAttendanceDate(record.timestamp) === day.dateKey &&
                                            record.type === slotType,
                                        );
                                        const hasLate = taps.some((tap) => isAttendanceRecordLate(tap, learner, scheduleConfig));
                                        return (
                                          <td
                                            key={`${learner.id}-${selectedMonth}-${day.dateKey}-${slotType}`}
                                            className={`attendance-teacher-matrix__day-cell attendance-teacher-matrix__day-cell--${slotType.toLowerCase()} ${hasLate ? 'attendance-teacher-matrix__day-cell--late' : ''}`}
                                          >
                                            <div className="attendance-teacher-matrix__tap-list">
                                              {taps.length > 0 ? (
                                                taps.map((tap, tapIndex) => renderTapChip(tap, day.dateKey, tapIndex))
                                              ) : (
                                                <span className="attendance-teacher-matrix__tap-empty">-</span>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
