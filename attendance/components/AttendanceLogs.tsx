import React, { useEffect, useMemo, useState } from 'react';
import {
  AttendanceDailySummaryRow,
  AttendanceRecord,
  AttendanceReportMode,
  AttendanceReportResult,
  Learner,
  AttendanceType,
} from '../types';
import ConfirmationModal from './ConfirmationModal';
import { buildAttendanceArchiveCommand } from '../features/reports/utils/archiveCommand';
import { ManualAttendanceModal, type ManualAttendanceFormValue } from './ManualAttendanceModal';

interface AttendanceLogsProps {
  logs: AttendanceRecord[];
  learners: Learner[];
  onDelete: (record: AttendanceRecord) => void;
  onDeleteMonthlyTap: (recordId: string) => Promise<{ ok: boolean; error: string | null }>;
  onQueryRange: (fromDate: string, toDate: string) => Promise<AttendanceReportResult>;
  onAddManualRecord: (learnerId: string, type: AttendanceType, timestamp: string) => Promise<{ ok: boolean; error: string | null }>;
}

const MONTHLY_TAP_ORDER: AttendanceType[] = ['AM_IN', 'AM_OUT', 'PM_IN', 'PM_OUT', 'UNSCHEDULED'];
const MANILA_TIME_ZONE = 'Asia/Manila';

const formatDateKeyInManila = (timestamp: string) => {
  const date = new Date(timestamp);
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

const getTapOrder = (type: AttendanceType) => {
  const index = MONTHLY_TAP_ORDER.indexOf(type);
  return index === -1 ? MONTHLY_TAP_ORDER.length : index;
};

const AttendanceLogs: React.FC<AttendanceLogsProps> = ({ logs, learners, onDelete, onDeleteMonthlyTap, onQueryRange, onAddManualRecord }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTapId, setDeleteTapId] = useState<string | null>(null);
  const getDefaultRange = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = `${now.getMonth() + 1}`.padStart(2, '0');
    return {
      fromDate: `${yyyy}-${mm}-01`,
      toDate: `${yyyy}-${mm}-${`${now.getDate()}`.padStart(2, '0')}`,
    };
  };

  const defaultRange = getDefaultRange();
  const [fromDate, setFromDate] = useState(defaultRange.fromDate);
  const [toDate, setToDate] = useState(defaultRange.toDate);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [reportMode, setReportMode] = useState<AttendanceReportMode>('raw');
  const [reportRawRecords, setReportRawRecords] = useState<AttendanceRecord[] | null>(null);
  const [reportSummaryRows, setReportSummaryRows] = useState<AttendanceDailySummaryRow[] | null>(null);
  const [archiveMonths, setArchiveMonths] = useState(3);
  const [archiveReason, setArchiveReason] = useState('older-than-3-months');
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const activeRawLogs = reportRawRecords !== null ? reportRawRecords : sortedLogs;
  const activeSummaryRows = reportSummaryRows ?? [];
  const isMonthlyTapView = reportRawRecords !== null && reportMode === 'raw';
  const syncedCount = activeRawLogs.filter((row) => row.synced).length;
  const pendingCount = activeRawLogs.length - syncedCount;
  const [expandedLearners, setExpandedLearners] = useState<Record<string, boolean>>({});

  const monthlyLearnerGroups = useMemo(() => {
    if (!isMonthlyTapView) return [];

    const learnerMap = new Map<string, {
      learner: Learner | null;
      latestTimestamp: number;
      days: Map<string, AttendanceRecord[]>;
    }>();

    activeRawLogs.forEach((record) => {
      const learner = learners.find((entry) => entry.id === record.learnerId) || null;
      const dateKey = formatDateKeyInManila(record.timestamp);
      if (!dateKey) return;

      const existing = learnerMap.get(record.learnerId) || {
        learner,
        latestTimestamp: 0,
        days: new Map<string, AttendanceRecord[]>(),
      };

      existing.learner = learner;
      existing.latestTimestamp = Math.max(existing.latestTimestamp, new Date(record.timestamp).getTime());
      const dayList = existing.days.get(dateKey) || [];
      dayList.push(record);
      existing.days.set(dateKey, dayList);
      learnerMap.set(record.learnerId, existing);
    });

    return Array.from(learnerMap.entries())
      .map(([learnerId, entry]) => {
        const days = Array.from(entry.days.entries())
          .map(([dateKey, taps]) => ({
            dateKey,
            taps: taps.sort((left, right) => {
              const orderDelta = getTapOrder(left.type) - getTapOrder(right.type);
              if (orderDelta !== 0) return orderDelta;
              return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
            }),
          }))
          .sort((left, right) => (left.dateKey < right.dateKey ? 1 : -1));

        return {
          learnerId,
          learner: entry.learner,
          latestTimestamp: entry.latestTimestamp,
          totalTaps: days.reduce((sum, day) => sum + day.taps.length, 0),
          days,
        };
      })
      .sort((left, right) => {
        const leftName = `${left.learner?.last_name || ''} ${left.learner?.first_name || ''}`.trim().toLowerCase();
        const rightName = `${right.learner?.last_name || ''} ${right.learner?.first_name || ''}`.trim().toLowerCase();
        if (leftName !== rightName) return leftName.localeCompare(rightName);
        return right.latestTimestamp - left.latestTimestamp;
      });
  }, [activeRawLogs, isMonthlyTapView, learners]);

  useEffect(() => {
    if (!isMonthlyTapView || monthlyLearnerGroups.length === 0) return;
    setExpandedLearners((current) => {
      if (Object.keys(current).length > 0) return current;
      return Object.fromEntries(monthlyLearnerGroups.map((group) => [group.learnerId, true]));
    });
  }, [isMonthlyTapView, monthlyLearnerGroups]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getLabelAndColor = (type: AttendanceType) => {
    switch (type) {
      case 'AM_IN':
        return { label: 'AM In', color: 'text-primary-700 bg-primary-50 border-primary-600/20' };
      case 'AM_OUT':
        return { label: 'AM Out', color: 'text-accent-700 bg-accent-50 border-accent-600/20' };
      case 'PM_IN':
        return { label: 'PM In', color: 'text-primary-700 bg-primary-50 border-primary-600/20' };
      case 'PM_OUT':
        return { label: 'PM Out', color: 'text-accent-700 bg-accent-50 border-accent-600/20' };
      case 'UNSCHEDULED':
        return { label: 'Unscheduled', color: 'text-gray-700 bg-gray-100 border-gray-300' };
      default:
        return { label: 'Unknown', color: 'text-gray-500 bg-gray-50 border-gray-200' };
    }
  };

  const loadRange = async (nextFromDate: string, nextToDate: string) => {
    if (!nextFromDate || !nextToDate) return;
    setIsLoadingRange(true);
    try {
      const result = await onQueryRange(nextFromDate, nextToDate);
      setReportMode(result.mode);
      setReportRawRecords(result.rawRecords);
      setReportSummaryRows(result.summaryRows);
    } finally {
      setIsLoadingRange(false);
    }
  };

  const handleApplyRange = async () => {
    await loadRange(fromDate, toDate);
  };

  const handleResetRange = () => {
    const nextRange = getDefaultRange();
    setFromDate(nextRange.fromDate);
    setToDate(nextRange.toDate);
    setReportMode('raw');
    setReportRawRecords(null);
    setReportSummaryRows(null);
    void loadRange(nextRange.fromDate, nextRange.toDate);
  };

  const handleUseArchivePreset = (months: number) => {
    setArchiveMonths(months);
    setArchiveReason(months === 3 ? 'older-than-3-months' : `older-than-${months}-months`);
    setArchiveStatus(`Archive preset set to older than ${months} month${months === 1 ? '' : 's'}.`);
  };

  const handleCopyArchiveCommand = async (useSelectedRange: boolean) => {
    const command = buildAttendanceArchiveCommand({
      fromDate,
      toDate,
      archiveMonths,
      archiveReason,
      useSelectedRange,
    });

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(command);
      setArchiveStatus('Archive command copied to clipboard.');
      return;
    }

    setArchiveStatus(`Archive command: ${command}`);
  };

  const composeTimestamp = (date: string, time: string) => {
    const safeDate = String(date || '').trim();
    const safeTime = String(time || '').trim();
    if (!safeDate || !safeTime) return '';
    const local = new Date(`${safeDate}T${safeTime}:00`);
    return Number.isNaN(local.getTime()) ? '' : local.toISOString();
  };

  const handleSubmitManualRecord = async (value: ManualAttendanceFormValue) => {
    const timestamp = composeTimestamp(value.date, value.time);
    if (!timestamp) {
      setManualError('Please provide a valid date and time.');
      return;
    }

    setIsManualSubmitting(true);
    setManualError(null);
    try {
      const result = await onAddManualRecord(value.learnerId, value.type, timestamp);
      if (!result.ok) {
        setManualError(result.error || 'Unable to save manual attendance record.');
        return;
      }
      setIsManualModalOpen(false);
      setArchiveStatus('Manual attendance record saved to monthly taps.');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  useEffect(() => {
    void loadRange(fromDate, toDate);
    // Load the monthly-taps-backed records as soon as the page opens.
    // The selected date range still remains editable for ad hoc reporting.
  }, []);

  useEffect(() => {
    if (reportRawRecords === null) return;
    void loadRange(fromDate, toDate);
  }, [logs.length]);

  const handleConfirmDelete = async () => {
    if (deleteTapId) {
      const result = await onDeleteMonthlyTap(deleteTapId);
      if (!result.ok) {
        setArchiveStatus(result.error || 'Unable to delete tap.');
        return;
      }
      setReportRawRecords((prev) => prev ? prev.filter((record) => record.id !== deleteTapId) : prev);
      setDeleteTapId(null);
      return;
    }

    if (deleteId) {
      const record = activeRawLogs.find((entry) => entry.id === deleteId);
      if (record) {
        onDelete(record);
        setReportRawRecords((prev) => prev ? prev.filter((entry) => entry.id !== deleteId) : prev);
      }
      setDeleteId(null);
    }
  };

  return (
    <section className="portal-panel attendance-records-page">
      <div className="portal-panel__header attendance-records-page__header">
        <div className="attendance-records-page__header-row">
          <div className="attendance-records-page__title-block">
            <p className="attendance-records-page__eyebrow">Attendance Journal</p>
            <h1>Attendance Records</h1>
          </div>
            <div className="attendance-records-page__stats">
            <div className="section-card attendance-records-page__stat-card">
              <div className="section-card__bar" />
              <div className="section-card__content">
                <h3>Total</h3>
                <p className="attendance-records-page__stat-value">{activeRawLogs.length}</p>
              </div>
            </div>
            <div className="section-card attendance-records-page__stat-card">
              <div className="section-card__bar" />
              <div className="section-card__content">
                <h3>Synced</h3>
                <p className="attendance-records-page__stat-value attendance-records-page__stat-value--success">{syncedCount}</p>
              </div>
            </div>
            <div className="section-card attendance-records-page__stat-card">
              <div className="section-card__bar" />
              <div className="section-card__content">
                <h3>Pending</h3>
                <p className="attendance-records-page__stat-value attendance-records-page__stat-value--warning">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="portal-panel__body attendance-records-page__body">
        <section className="section-card attendance-records-page__filters">
          <div className="section-card__bar" />
          <div className="section-card__content attendance-records-page__filters-content">
            <div className="attendance-records-page__filter-copy">
              <h3>Range Filter</h3>
              <p>Load monthly tap records or historical summaries using a selected date window.</p>
            </div>

            <div className="form-grid attendance-records-page__filter-grid">
              <label className="usis-date-time-picker">
                <small>From Date</small>
                <div className="usis-date-time-picker__control floating-field__control">
                  <input
                    type="date"
                    value={fromDate}
                    data-has-value={Boolean(fromDate)}
                    onChange={(event) => setFromDate(event.target.value)}
                  />
                  <span className="usis-date-time-picker__floating-label">From Date</span>
                </div>
              </label>
              <label className="usis-date-time-picker">
                <small>To Date</small>
                <div className="usis-date-time-picker__control floating-field__control">
                  <input
                    type="date"
                    value={toDate}
                    data-has-value={Boolean(toDate)}
                    onChange={(event) => setToDate(event.target.value)}
                  />
                  <span className="usis-date-time-picker__floating-label">To Date</span>
                </div>
              </label>
            </div>

            <div className="form-actions attendance-records-page__actions">
              <button
                type="button"
                onClick={() => void handleApplyRange()}
                disabled={!fromDate || !toDate || isLoadingRange}
                className="primary-button"
              >
                {isLoadingRange ? 'Loading...' : 'Apply'}
              </button>
              <button
                type="button"
                onClick={handleResetRange}
                className="secondary-button"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="secondary-button"
              >
                Manual Add Record
              </button>
            </div>

            {reportRawRecords || reportSummaryRows ? (
              <span
                className={`attendance-records-page__mode-badge ${reportMode === 'summary' ? 'is-summary' : 'is-raw'}`}
              >
                {reportMode === 'summary'
                  ? 'Summary Mode (Historical)'
                  : isMonthlyTapView
                    ? 'Monthly Taps Mode (Detailed)'
                    : 'Raw Mode (Detailed)'}
              </span>
            ) : null}
          </div>
        </section>

        <section className="section-card attendance-records-page__archive">
          <div className="section-card__bar" />
          <div className="section-card__content attendance-records-page__archive-content">
            <div className="attendance-records-page__archive-copy">
              <h3>Archive Actions</h3>
              <p>Prepare a custom archive command using the selected range or a preset retention window.</p>
            </div>

            <div className="attendance-records-page__archive-buttons">
              <button
                type="button"
                onClick={() => handleUseArchivePreset(3)}
                className="secondary-button"
              >
                3-Month Preset
              </button>
              <button
                type="button"
                onClick={() => handleUseArchivePreset(1)}
                className="secondary-button"
              >
                1-Month Preset
              </button>
              <button
                type="button"
                onClick={() => void handleCopyArchiveCommand(true)}
                disabled={!fromDate || !toDate}
                className="primary-button"
              >
                Copy Selected Range Command
              </button>
              <button
                type="button"
                onClick={() => void handleCopyArchiveCommand(false)}
                className="secondary-button"
              >
                Copy Preset Command
              </button>
            </div>

            <div className="form-grid attendance-records-page__archive-grid">
              <label className="floating-field">
                <small>Archive Reason</small>
                <div className="floating-field__control">
                  <input
                    type="text"
                    value={archiveReason}
                    onChange={(event) => setArchiveReason(event.target.value)}
                    placeholder="older-than-3-months"
                  />
                  <span>Archive Reason</span>
                </div>
              </label>
              <label className="floating-field">
                <small>Archive Months</small>
                <div className="floating-field__control">
                  <input
                    type="number"
                    min={1}
                    value={archiveMonths}
                    onChange={(event) => setArchiveMonths(Math.max(1, Number(event.target.value) || 3))}
                  />
                  <span>Archive Months</span>
                </div>
              </label>
              <div className="attendance-records-page__preview-wrap">
                <div className="notice-box attendance-records-page__preview">
                  <strong>Command Preview</strong>
                  <span className="attendance-records-page__preview-code">
                    {buildAttendanceArchiveCommand({
                      fromDate,
                      toDate,
                      archiveMonths,
                      archiveReason,
                      useSelectedRange: !!(fromDate && toDate),
                    })}
                  </span>
                </div>
              </div>
            </div>

            {archiveStatus ? (
              <p className="attendance-records-page__status">{archiveStatus}</p>
            ) : null}
            <p className="attendance-records-page__hint">
              The browser prepares the archive command. Run it from the attendance project root so the archive refresh and row purge can complete.
            </p>
          </div>
        </section>

        <div className="attendance-records-page__table-shell">
          {reportMode === 'summary' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600">Learner</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">Date</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">AM In</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">AM Out</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">PM In</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">PM Out</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">Unscheduled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeSummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-gray-400">No summary records for selected range.</td>
                    </tr>
                  ) : (
                    activeSummaryRows.map((row, index) => {
                      const learner = learners.find((entry) => entry.id === row.learnerId);
                      const dot = (value: string | null) => (value ? 'Present' : '-');
                      return (
                        <tr key={`${row.learnerId}-${row.attendanceDate}`} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                          <td className="px-6 py-4">
                            <div className="text-[15px] font-semibold text-gray-900">
                              {learner ? `${learner.last_name}, ${learner.first_name}` : row.learnerId}
                            </div>
                            <div className="text-[12px] text-gray-500">LRN: {learner?.lrn || 'INTERNAL'}</div>
                          </td>
                          <td className="px-6 py-4 text-center text-[13px] text-gray-600">{row.attendanceDate}</td>
                          <td className="px-6 py-4 text-center text-[13px]">{dot(row.amIn)}</td>
                          <td className="px-6 py-4 text-center text-[13px]">{dot(row.amOut)}</td>
                          <td className="px-6 py-4 text-center text-[13px]">{dot(row.pmIn)}</td>
                          <td className="px-6 py-4 text-center text-[13px]">{dot(row.pmOut)}</td>
                          <td className="px-6 py-4 text-center text-[13px] font-semibold text-gray-700">{row.unscheduledCount}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : isMonthlyTapView ? (
            <div className="attendance-records-page__group-list">
              {monthlyLearnerGroups.length === 0 ? (
                <div className="notice-box attendance-records-page__empty-state">
                  <strong>No monthly taps</strong>
                  <span>No attendance records were found for the selected range.</span>
                </div>
              ) : (
                monthlyLearnerGroups.map((group) => {
                  const learner = group.learner;
                  const isExpanded = expandedLearners[group.learnerId] !== false;
                  const learnerName = learner ? `${learner.last_name}, ${learner.first_name}` : group.learnerId;
                  return (
                    <section key={group.learnerId} className="section-card attendance-records-page__learner-card">
                      <div className="section-card__bar" />
                      <button
                        type="button"
                        className="attendance-records-page__learner-toggle"
                        onClick={() => setExpandedLearners((current) => ({ ...current, [group.learnerId]: !isExpanded }))}
                        aria-expanded={isExpanded}
                      >
                        <div className="attendance-records-page__learner-meta">
                          <div className="attendance-records-page__learner-name">{learnerName}</div>
                          <div className="attendance-records-page__learner-submeta">
                            <span>LRN: {learner?.lrn || 'INTERNAL'}</span>
                            <span>{learner?.grade_level || 'Unknown Grade'} | {learner?.section_name || 'No Section'}</span>
                          </div>
                        </div>
                        <div className="attendance-records-page__learner-summary">
                          <span className="attendance-records-page__learner-summary-item">
                            {group.days.length} day{group.days.length === 1 ? '' : 's'}
                          </span>
                          <span className="attendance-records-page__learner-summary-item">
                            {group.totalTaps} tap{group.totalTaps === 1 ? '' : 's'}
                          </span>
                          <span className="material-symbols-outlined" aria-hidden="true">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </button>

                      {isExpanded ? (
                        <div className="attendance-records-page__learner-days">
                          {group.days.map((day) => (
                            <article key={`${group.learnerId}-${day.dateKey}`} className="attendance-records-page__day-card">
                              <div className="attendance-records-page__day-header">
                                <div>
                                  <h3 className="attendance-records-page__day-title">{formatDate(day.dateKey)}</h3>
                                  <p className="attendance-records-page__day-subtitle">
                                    {day.taps.length} tap{day.taps.length === 1 ? '' : 's'} for this day
                                  </p>
                                </div>
                                <span className="attendance-records-page__day-badge">{day.dateKey}</span>
                              </div>

                              <div className="attendance-records-page__tap-list">
                                {day.taps.map((tap, tapIndex) => {
                                  const { label, color } = getLabelAndColor(tap.type);
                                  return (
                                    <div key={tap.id} className="attendance-records-page__tap-row">
                                      <div className="attendance-records-page__tap-row-main">
                                        <span className={`inline-flex px-3 py-1 rounded-md text-[12px] font-semibold border ${color}`}>
                                          {label}
                                        </span>
                                        <span className="attendance-records-page__tap-time">{formatTime(tap.timestamp)}</span>
                                        <span className="attendance-records-page__tap-sync">
                                          {tap.synced ? 'Synced' : 'Pending'}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTapId(tap.id)}
                                        className="attendance-records-page__tap-delete"
                                        title={`Delete ${label} tap ${tapIndex + 1}`}
                                      >
                                        <span className="material-symbols-outlined text-[18px] leading-none">delete</span>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </article>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600">Learner</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">Classification</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">Sync Status</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">Date</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-center">Time</th>
                    <th className="px-6 py-4 text-[12px] font-semibold text-gray-600 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeRawLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-400">
                          <span className="material-symbols-outlined text-5xl leading-none">inbox</span>
                          <p className="text-[14px] font-semibold">No attendance records yet.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    activeRawLogs.map((log, index) => {
                      const learner = learners.find((row) => row.id === log.learnerId);
                      const { label, color } = getLabelAndColor(log.type);
                      return (
                        <tr
                          key={log.id}
                          className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-primary-50/40 transition-colors`}
                        >
                          <td className="px-6 py-4">
                            <div className="text-[15px] font-semibold text-gray-900">
                              {learner ? `${learner.last_name}, ${learner.first_name}` : 'Unknown Learner'}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <div className="text-[12px] text-gray-500">LRN: {learner?.lrn || 'INTERNAL'}</div>
                              {learner ? (
                                <div className="text-[12px] text-primary-700/70">
                                  {learner.grade_level} | {learner.section_name}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-3 py-1 rounded-md text-[12px] font-semibold border ${color}`}>
                              {label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {log.synced ? (
                              <span className="inline-flex px-3 py-1 rounded-md text-[12px] font-semibold border text-success-700 bg-success-50 border-success-600/20">
                                Synced
                              </span>
                            ) : (
                              <span className="inline-flex px-3 py-1 rounded-md text-[12px] font-semibold border text-accent-700 bg-accent-50 border-accent-600/20">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center text-[13px] text-gray-600">{formatDate(log.timestamp)}</td>
                          <td className="px-6 py-4 text-center text-[14px] font-semibold text-gray-900 tabular-nums">
                            {formatTime(log.timestamp)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDeleteId(log.id);
                              }}
                              className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gray-200 text-gray-500 hover:text-accent-700 hover:border-accent-300 hover:bg-accent-50 transition-all"
                              title="Delete record"
                            >
                              <span className="material-symbols-outlined text-[20px] leading-none">delete</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteId || !!deleteTapId}
        onClose={() => {
          setDeleteId(null);
          setDeleteTapId(null);
        }}
        onConfirm={() => void handleConfirmDelete()}
        title="Delete Record"
        message={
          deleteTapId
            ? 'Are you sure you want to permanently remove this tap from the monthly taps record? This action cannot be undone.'
            : 'Are you sure you want to permanently remove this attendance log? This action cannot be undone.'
        }
        confirmLabel="Delete Record"
      />

      <ManualAttendanceModal
        isOpen={isManualModalOpen}
        learners={learners}
        isSubmitting={isManualSubmitting}
        errorMessage={manualError}
        onClose={() => {
          setIsManualModalOpen(false);
          setManualError(null);
        }}
        onSubmit={(value) => void handleSubmitManualRecord(value)}
      />
    </section>
  );
};

export default AttendanceLogs;
