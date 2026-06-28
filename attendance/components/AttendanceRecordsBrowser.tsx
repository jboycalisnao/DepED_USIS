import React, { useEffect, useMemo, useState } from 'react';
import {
  AttendanceDailySummaryRow,
  AttendanceMonthlySummaryRow,
  AttendanceRecord,
  AttendanceScheduleConfig,
  Learner,
} from '../types';
import ConfirmationModal from './ConfirmationModal';
import { isAttendanceRecordLate } from '../utils/attendanceSchedule';

type SearchScope =
  | { kind: 'month'; monthKey: string; fromDate: string; toDate: string; label: string }
  | { kind: 'day'; monthKey: string; dayKey: string; fromDate: string; toDate: string; label: string };

type Props = {
  logs: AttendanceRecord[];
  learners: Learner[]; 
  scheduleConfig: AttendanceScheduleConfig;
  onDelete?: (record: AttendanceRecord) => Promise<void> | void;
  refreshAttendanceStatusByRange: (fromDate: string, toDate: string) => Promise<Set<string>>;
  loadRecordsByRange?: (fromDate: string, toDate: string) => Promise<AttendanceRecord[]>;
};

type MonthGroup = {
  monthKey: string;
  rows: AttendanceMonthlySummaryRow[];
  learnerDays: number;
  expectedSlots: number;
  presentSlots: number;
  missingSlots: number;
};

type DayGroup = {
  dateKey: string;
  rows: AttendanceDailySummaryRow[];
  learnerDays: number;
  expectedSlots: number;
  presentSlots: number;
  missingSlots: number;
  unscheduledCount: number;
};

const MONTH_LABEL_OPTIONS: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
const DAY_LABEL_OPTIONS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

const toIsoDate = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = `${value.getMonth() + 1}`.padStart(2, '0');
  const dd = `${value.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const endOfMonth = (monthKey: string) => {
  const monthStart = `${monthKey}-01`;
  const date = new Date(`${monthStart}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return toIsoDate(date);
};

const parseSearchScope = (rawValue: string): SearchScope | null => {
  const raw = String(rawValue || '').trim();
  if (!raw) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
    return {
      kind: 'month',
      monthKey,
      fromDate: `${monthKey}-01`,
      toDate: endOfMonth(monthKey),
      label: new Intl.DateTimeFormat('en-US', MONTH_LABEL_OPTIONS).format(new Date(`${monthKey}-01T00:00:00`)),
    };
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const monthKey = raw.slice(0, 7);
    return {
      kind: 'day',
      monthKey,
      dayKey: raw,
      fromDate: raw,
      toDate: raw,
      label: new Intl.DateTimeFormat('en-US', DAY_LABEL_OPTIONS).format(new Date(`${raw}T00:00:00`)),
    };
  }

  if (/^\d{4}-\d{2}$/.test(raw)) {
    const monthKey = raw;
    return {
      kind: 'month',
      monthKey,
      fromDate: `${monthKey}-01`,
      toDate: endOfMonth(monthKey),
      label: new Intl.DateTimeFormat('en-US', MONTH_LABEL_OPTIONS).format(new Date(`${monthKey}-01T00:00:00`)),
    };
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    if (/\d{1,2}/.test(raw)) {
      const dayKey = toIsoDate(parsed);
      const monthKey = dayKey.slice(0, 7);
      return {
        kind: 'day',
        monthKey,
        dayKey,
        fromDate: dayKey,
        toDate: dayKey,
        label: new Intl.DateTimeFormat('en-US', DAY_LABEL_OPTIONS).format(parsed),
      };
    }

    const monthKey = `${parsed.getFullYear()}-${`${parsed.getMonth() + 1}`.padStart(2, '0')}`;
    return {
      kind: 'month',
      monthKey,
      fromDate: `${monthKey}-01`,
      toDate: endOfMonth(monthKey),
      label: new Intl.DateTimeFormat('en-US', MONTH_LABEL_OPTIONS).format(new Date(`${monthKey}-01T00:00:00`)),
    };
  }

  return null;
};

const formatMonthLabel = (monthKey: string) =>
  new Intl.DateTimeFormat('en-US', MONTH_LABEL_OPTIONS).format(new Date(`${monthKey}-01T00:00:00`));

const formatDayLabel = (dayKey: string) =>
  new Intl.DateTimeFormat('en-US', DAY_LABEL_OPTIONS).format(new Date(`${dayKey}T00:00:00`));

const getSyncStatusLabel = (record: AttendanceRecord) => (record.synced ? 'Synced' : 'Pending Sync');

const buildDailyRowsFromLogs = (records: AttendanceRecord[]) => {
  const sortedRecords = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const byDay = new Map<string, Map<string, AttendanceDailySummaryRow>>();

  sortedRecords.forEach((record) => {
    const attendanceDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(record.timestamp));

    const dayMap = byDay.get(attendanceDate) || new Map<string, AttendanceDailySummaryRow>();
    const existing =
      dayMap.get(record.learnerId) ||
      ({
        learnerId: record.learnerId,
        attendanceDate,
        amIn: null,
        amOut: null,
        pmIn: null,
        pmOut: null,
        unscheduledCount: 0,
        lastStationNo: null,
      } satisfies AttendanceDailySummaryRow);

    switch (record.type) {
      case 'AM_IN':
        existing.amIn = existing.amIn || record.timestamp;
        break;
      case 'AM_OUT':
        existing.amOut = existing.amOut || record.timestamp;
        break;
      case 'PM_IN':
        existing.pmIn = existing.pmIn || record.timestamp;
        break;
      case 'PM_OUT':
        existing.pmOut = existing.pmOut || record.timestamp;
        break;
      case 'UNSCHEDULED':
        existing.unscheduledCount += 1;
        break;
    }

    dayMap.set(record.learnerId, existing);
    byDay.set(attendanceDate, dayMap);
  });

  return Array.from(byDay.values())
    .flatMap((dayMap) => Array.from(dayMap.values()))
    .sort((a, b) => {
      if (a.attendanceDate !== b.attendanceDate) return b.attendanceDate.localeCompare(a.attendanceDate);
      return a.learnerId.localeCompare(b.learnerId);
    });
};

const buildMonthlyRowsFromDailyRows = (dailyRows: AttendanceDailySummaryRow[], learners: Learner[]) => {
  const learnerMap = new Map<string, Learner>();
  learners.forEach((learner) => learnerMap.set(String(learner.id), learner));

  const monthlyMap = new Map<string, AttendanceMonthlySummaryRow>();
  dailyRows.forEach((row) => {
    const monthKey = String(row.attendanceDate || '').slice(0, 7);
    if (!monthKey) return;
    const learner = learnerMap.get(String(row.learnerId));
    const sectionName = learner?.section_name || 'No Section';
    const gradeLevel = learner?.grade_level || 'Unknown';
    const key = `${monthKey}|${sectionName}|${gradeLevel}`;
    const presentSlots =
      (row.amIn ? 1 : 0) +
      (row.amOut ? 1 : 0) +
      (row.pmIn ? 1 : 0) +
      (row.pmOut ? 1 : 0);

    const existing = monthlyMap.get(key);
    if (!existing) {
      monthlyMap.set(key, {
        summaryMonth: monthKey,
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

  return Array.from(monthlyMap.values()).sort((a, b) =>
    a.summaryMonth < b.summaryMonth ? 1 : a.summaryMonth > b.summaryMonth ? -1 : a.sectionName.localeCompare(b.sectionName),
  );
};

const sumDailyRows = (rows: AttendanceDailySummaryRow[]) =>
  rows.reduce(
    (acc, row) => {
      acc.learnerDays += 1;
      acc.expectedSlots += 4;
      acc.presentSlots +=
        (row.amIn ? 1 : 0) +
        (row.amOut ? 1 : 0) +
        (row.pmIn ? 1 : 0) +
        (row.pmOut ? 1 : 0);
      acc.missingSlots += 4 - ((row.amIn ? 1 : 0) + (row.amOut ? 1 : 0) + (row.pmIn ? 1 : 0) + (row.pmOut ? 1 : 0));
      acc.unscheduledCount += row.unscheduledCount || 0;
      return acc;
    },
    { learnerDays: 0, expectedSlots: 0, presentSlots: 0, missingSlots: 0, unscheduledCount: 0 },
  );

const sumMonthlyRows = (rows: AttendanceMonthlySummaryRow[]) =>
  rows.reduce(
    (acc, row) => {
      acc.learnerDays += row.learnerDays;
      acc.expectedSlots += row.expectedSlots;
      acc.presentSlots += row.presentSlots;
      acc.missingSlots += row.missingSlots;
      return acc;
    },
    { learnerDays: 0, expectedSlots: 0, presentSlots: 0, missingSlots: 0 },
  );

const AttendanceRecordsBrowser: React.FC<Props> = ({
  logs,
  learners,
  scheduleConfig,
  onDelete,
  refreshAttendanceStatusByRange,
  loadRecordsByRange,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [loadedRecords, setLoadedRecords] = useState<AttendanceRecord[] | null>(null);
  const canDelete = typeof onDelete === 'function';
  const effectiveLogs = loadRecordsByRange ? (loadedRecords || logs) : logs;

  const loadRecords = async (fromDate: string, toDate: string) => {
    if (!loadRecordsByRange) {
      await refreshAttendanceStatusByRange(fromDate, toDate);
      return;
    }

    const records = await loadRecordsByRange(fromDate, toDate);
    setLoadedRecords(records);
  };

  useEffect(() => {
    if (!loadRecordsByRange) return;
    const scope = parseSearchScope('');
    if (!scope) return;
    setIsLoadingOverview(true);
    void (async () => {
      try {
        const records = await loadRecordsByRange(scope.fromDate, scope.toDate);
        setLoadedRecords(records);
        setExpandedMonths(new Set([scope.monthKey]));
        setStatusMessage(`Loaded attendance records for ${scope.label}.`);
      } catch (error: any) {
        setStatusMessage(error?.message || 'Unable to load attendance records.');
      } finally {
        setIsLoadingOverview(false);
      }
    })();
  }, [loadRecordsByRange]);

  const rawRowsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    effectiveLogs.forEach((record) => {
      const dateKey = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(record.timestamp));
      const list = map.get(dateKey) || [];
      list.push(record);
      map.set(dateKey, list);
    });

    const output: Record<string, AttendanceRecord[]> = {};
    map.forEach((value, key) => {
      output[key] = value.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    });
    return output;
  }, [effectiveLogs]);

  const dailyRowsByMonth = useMemo(() => {
    const dailyRows = buildDailyRowsFromLogs(effectiveLogs);
    const map = new Map<string, AttendanceDailySummaryRow[]>();

    dailyRows.forEach((row) => {
      const monthKey = String(row.attendanceDate || '').slice(0, 7);
      const list = map.get(monthKey) || [];
      list.push(row);
      map.set(monthKey, list);
    });

    const output: Record<string, AttendanceDailySummaryRow[]> = {};
    map.forEach((value, key) => {
      output[key] = value;
    });
    return output;
  }, [effectiveLogs]);

  const monthlyRows = useMemo(() => buildMonthlyRowsFromDailyRows(buildDailyRowsFromLogs(effectiveLogs), learners), [effectiveLogs, learners]);

  const monthGroups = useMemo<MonthGroup[]>(() => {
    const groupMap = new Map<string, AttendanceMonthlySummaryRow[]>();
    for (const row of monthlyRows) {
      const monthKey = String(row.summaryMonth || '').slice(0, 7);
      if (!monthKey) continue;
      const list = groupMap.get(monthKey) || [];
      list.push(row);
      groupMap.set(monthKey, list);
    }

    return Array.from(groupMap.entries())
      .map(([monthKey, rows]) => ({
        monthKey,
        rows,
        ...sumMonthlyRows(rows),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [monthlyRows]);

  const groupedDaysByMonth = useMemo(() => {
    const map = new Map<string, DayGroup[]>();
    Object.entries(dailyRowsByMonth).forEach(([monthKey, rows]) => {
      const dayMap = new Map<string, AttendanceDailySummaryRow[]>();
      rows.forEach((row) => {
        const dateKey = String(row.attendanceDate || '').trim();
        if (!dateKey) return;
        const list = dayMap.get(dateKey) || [];
        list.push(row);
        dayMap.set(dateKey, list);
      });

      const groups = Array.from(dayMap.entries())
        .map(([dateKey, dayRows]) => ({
          dateKey,
          rows: dayRows,
          ...sumDailyRows(dayRows),
        }))
        .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

      map.set(monthKey, groups);
    });
    return map;
  }, [dailyRowsByMonth]);

  const loadOverview = async () => {
    const scope = parseSearchScope(searchValue);
    if (!scope) {
      setStatusMessage('Enter a month like 2026-06 or a day like 2026-06-08.');
      return;
    }

    setIsLoadingOverview(true);
    setStatusMessage(null);
    try {
      setExpandedDays(new Set());
      setExpandedMonths(new Set([scope.monthKey]));
      if (scope.kind === 'day') {
        setExpandedDays(new Set([scope.dayKey]));
      }
      await loadRecords(scope.fromDate, scope.toDate);
      setStatusMessage(`Loaded attendance records for ${scope.label}.`);
    } catch (error: any) {
      setStatusMessage(error?.message || 'Unable to load attendance records.');
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const loadMonth = async (monthKey: string) => {
    setIsLoadingOverview(true);
    setStatusMessage(null);
    try {
      setExpandedMonths((prev) => new Set(prev).add(monthKey));
      await loadRecords(`${monthKey}-01`, endOfMonth(monthKey));
      setStatusMessage(`Refreshed status for ${formatMonthLabel(monthKey)}.`);
    } catch (error: any) {
      setStatusMessage(error?.message || `Unable to load days for ${formatMonthLabel(monthKey)}.`);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const toggleMonth = async (monthKey: string) => {
    if (!dailyRowsByMonth[monthKey]) {
      await loadMonth(monthKey);
      return;
    }

    const next = new Set(expandedMonths);
    const willExpand = !next.has(monthKey);
    if (willExpand) next.add(monthKey);
    else next.delete(monthKey);
    setExpandedMonths(next);
  };

  const loadDay = async (monthKey: string, dayKey: string) => {
    setStatusMessage(null);
    try {
      setExpandedDays((prev) => new Set(prev).add(`${monthKey}:${dayKey}`));
      await loadRecords(dayKey, dayKey);
      setStatusMessage(`Refreshed status for ${formatDayLabel(dayKey)}.`);
    } catch (error: any) {
      setStatusMessage(error?.message || `Unable to load taps for ${formatDayLabel(dayKey)}.`);
    }
  };

  const toggleDay = async (monthKey: string, dayKey: string) => {
    const compoundKey = `${monthKey}:${dayKey}`;
    if (!rawRowsByDate[dayKey]) {
      await loadDay(monthKey, dayKey);
      return;
    }

    const next = new Set(expandedDays);
    const willExpand = !next.has(compoundKey);
    if (willExpand) next.add(compoundKey);
    else next.delete(compoundKey);
    setExpandedDays(next);
  };

  const handleDelete = async () => {
    if (!deleteTarget || !onDelete) return;
    await onDelete(deleteTarget);
    setDeleteTarget(null);
  };

  const learnerMap = useMemo(() => {
    const map = new Map<string, Learner>();
    learners.forEach((learner) => map.set(String(learner.id), learner));
    return map;
  }, [learners]);

  return (
    <section className="section-card attendance-records-page__history">
      <div className="section-card__bar" />
      <div className="section-card__content">
        <div className="attendance-records-page__history-header">
          <div>
            <h3>Historical Records</h3>
            <p>Search a month or day, then load only the records you want to inspect.</p>
          </div>
          <div className="attendance-records-page__history-controls">
            <label
              className="attendance-records-page__history-search-field floating-field__control"
              data-has-value={searchValue.trim().length > 0 ? 'true' : 'false'}
            >
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder=" "
                className="attendance-records-page__history-search"
                aria-label="Search month or day"
              />
              <span>Search month: 2026-06 | day: 2026-06-08</span>
            </label>
          <button type="button" className="primary-button" onClick={() => void loadOverview()} disabled={isLoadingOverview}>
            {isLoadingOverview ? 'Loading...' : 'Load Month/Day'}
          </button>
          </div>
        </div>

        {statusMessage ? <p className="attendance-records-page__status">{statusMessage}</p> : null}

        <div className="attendance-records-page__history-list">
          {monthGroups.length === 0 ? (
            <div className="attendance-records-page__empty attendance-records-page__empty--compact">
              <span className="material-symbols-outlined">folder_open</span>
              <p>No historical records loaded.</p>
            </div>
          ) : (
            monthGroups.map((month) => {
              const monthDays = groupedDaysByMonth.get(month.monthKey) || [];
              const isMonthOpen = expandedMonths.has(month.monthKey);
              return (
                <article key={month.monthKey} className="attendance-records-page__month-card">
                  <div className="attendance-records-page__month-toggle">
                    <button
                      type="button"
                      className="attendance-records-page__month-heading"
                      onClick={() => void toggleMonth(month.monthKey)}
                    >
                      <span className="material-symbols-outlined">{isMonthOpen ? 'expand_more' : 'chevron_right'}</span>
                      <div>
                        <strong>{formatMonthLabel(month.monthKey)}</strong>
                        <p>{month.rows.length} section record groups</p>
                      </div>
                    </button>
                    <div className="attendance-records-page__month-actions">
                      <div className="attendance-records-page__month-metrics">
                        <span>{month.learnerDays} learner days</span>
                        <span>{month.presentSlots}/{month.expectedSlots} slots</span>
                      </div>
                      <button
                        type="button"
                        className="attendance-records-page__load-btn"
                        onClick={() => void loadMonth(month.monthKey)}
                      >
                        Load Month
                      </button>
                    </div>
                  </div>

                  {isMonthOpen ? (
                    <div className="attendance-records-page__days">
                      {monthDays.length === 0 ? (
                        <div className="attendance-records-page__empty attendance-records-page__empty--compact">
                          <span className="material-symbols-outlined">event_busy</span>
                          <p>No daily records loaded for this month yet.</p>
                        </div>
                      ) : (
                        monthDays.map((day) => {
                          const compoundKey = `${month.monthKey}:${day.dateKey}`;
                          const isDayOpen = expandedDays.has(compoundKey);
                          const dayRawRecords = rawRowsByDate[day.dateKey] || [];
                          return (
                            <article key={compoundKey} className="attendance-records-page__day-card">
                              <div className="attendance-records-page__day-toggle">
                                <button
                                  type="button"
                                  className="attendance-records-page__day-heading"
                                  onClick={() => void toggleDay(month.monthKey, day.dateKey)}
                                >
                                  <span className="material-symbols-outlined">{isDayOpen ? 'expand_more' : 'chevron_right'}</span>
                                  <div>
                                    <strong>{formatDayLabel(day.dateKey)}</strong>
                                    <p>{day.learnerDays} learner day records</p>
                                  </div>
                                </button>
                                <div className="attendance-records-page__day-actions">
                                  <div className="attendance-records-page__day-metrics">
                                    <span>{day.presentSlots}/{day.expectedSlots} slots</span>
                                    <span>{day.unscheduledCount} unscheduled</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="attendance-records-page__load-btn"
                                    onClick={() => void loadDay(month.monthKey, day.dateKey)}
                                  >
                                    Load Day
                                  </button>
                                </div>
                              </div>

                              {isDayOpen ? (
                                <div className="attendance-records-page__raw-table-wrap">
                                  {dayRawRecords.length === 0 ? (
                                    <div className="attendance-records-page__empty attendance-records-page__empty--compact">
                                      <span className="material-symbols-outlined">history_toggle_off</span>
                                      <p>No detailed taps loaded for this day.</p>
                                    </div>
                                  ) : (
                                    <table className="attendance-records-page__raw-table">
                                      <thead>
                                        <tr>
                                          <th>Learner</th>
                                          <th>Type</th>
                                          <th>Time</th>
                                          <th>Status</th>
                                          {canDelete ? <th className="attendance-records-page__raw-table-action-head">Action</th> : null}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dayRawRecords.map((record) => {
                                          const learner = learnerMap.get(record.learnerId);
                                          const isLate = isAttendanceRecordLate(record, learner, scheduleConfig);
                                          return (
                                            <tr key={record.id}>
                                              <td>
                                                <strong>{learner ? `${learner.last_name}, ${learner.first_name}` : record.learnerId}</strong>
                                              </td>
                                              <td>
                                                <div className="attendance-records-page__type-cell">
                                                  <span>{record.type.replace('_', ' ')}</span>
                                                  {isLate ? <span className="attendance-records-page__late-pill">Late</span> : null}
                                                </div>
                                              </td>
                                              <td>{new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                                              <td>
                                                <div className="attendance-records-page__status-cell">
                                                  <span className={`attendance-records-page__sync-pill ${record.synced ? 'is-synced' : 'is-pending'}`}>
                                                    {getSyncStatusLabel(record)}
                                                  </span>
                                                  {isLate ? <span className="attendance-records-page__late-pill attendance-records-page__late-pill--status">Late</span> : null}
                                                </div>
                                              </td>
                                              {canDelete ? (
                                                <td className="attendance-records-page__raw-table-action-cell">
                                                  <button
                                                    type="button"
                                                    className="attendance-records-page__delete-btn"
                                                    onClick={() => setDeleteTarget(record)}
                                                    title="Delete tap"
                                                  >
                                                    <span className="material-symbols-outlined">delete</span>
                                                  </button>
                                                </td>
                                              ) : null}
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  )}
                                </div>
                              ) : null}
                            </article>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>

      {canDelete ? (
        <ConfirmationModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleDelete()}
          title="Delete Record"
          message="Are you sure you want to permanently remove this attendance tap?"
          confirmLabel="Delete Record"
        />
      ) : null}
    </section>
  );
};

export default AttendanceRecordsBrowser;
