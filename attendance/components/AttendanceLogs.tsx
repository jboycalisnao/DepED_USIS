import React, { useState } from 'react';
import {
  AttendanceDailySummaryRow,
  AttendanceRecord,
  AttendanceReportMode,
  AttendanceReportResult,
  Learner,
  AttendanceType,
} from '../types';
import ConfirmationModal from './ConfirmationModal';

interface AttendanceLogsProps {
  logs: AttendanceRecord[];
  learners: Learner[];
  onDelete: (record: AttendanceRecord) => void;
  onQueryRange: (fromDate: string, toDate: string) => Promise<AttendanceReportResult>;
}

const AttendanceLogs: React.FC<AttendanceLogsProps> = ({ logs, learners, onDelete, onQueryRange }) => {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [reportMode, setReportMode] = useState<AttendanceReportMode>('raw');
  const [reportRawRecords, setReportRawRecords] = useState<AttendanceRecord[] | null>(null);
  const [reportSummaryRows, setReportSummaryRows] = useState<AttendanceDailySummaryRow[] | null>(null);
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  const activeRawLogs = reportRawRecords || sortedLogs;
  const activeSummaryRows = reportSummaryRows || [];
  const syncedCount = activeRawLogs.filter((row) => row.synced).length;
  const pendingCount = activeRawLogs.length - syncedCount;

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

  const handleApplyRange = async () => {
    if (!fromDate || !toDate) return;
    setIsLoadingRange(true);
    try {
      const result = await onQueryRange(fromDate, toDate);
      setReportMode(result.mode);
      setReportRawRecords(result.rawRecords);
      setReportSummaryRows(result.summaryRows);
    } finally {
      setIsLoadingRange(false);
    }
  };

  const handleResetRange = () => {
    setFromDate('');
    setToDate('');
    setReportMode('raw');
    setReportRawRecords(null);
    setReportSummaryRows(null);
  };

  return (
    <section className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm animate-in fade-in duration-500">
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-primary-600 text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl leading-none">event_note</span>
            </div>
            <div>
              <p className="text-[12px] font-semibold text-gray-500">Attendance Journal</p>
              <h2 className="text-[28px] font-bold text-gray-900 leading-tight">Attendance Records</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-[280px]">
            <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
              <p className="text-[12px] text-gray-500">Total</p>
              <p className="text-[20px] font-bold text-gray-900">{sortedLogs.length}</p>
            </div>
            <div className="rounded-md border border-success-200 bg-success-50 px-4 py-3">
              <p className="text-[12px] text-success-700">Synced</p>
              <p className="text-[20px] font-bold text-success-700">{syncedCount}</p>
            </div>
            <div className="rounded-md border border-accent-200 bg-accent-50 px-4 py-3">
              <p className="text-[12px] text-accent-700">Pending</p>
              <p className="text-[20px] font-bold text-accent-700">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col md:flex-row md:items-end gap-3">
          <label className="flex flex-col gap-1 text-[12px] text-gray-600">
            <span>From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="h-10 rounded-md border border-gray-200 px-3 bg-white text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] text-gray-600">
            <span>To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="h-10 rounded-md border border-gray-200 px-3 bg-white text-[13px]"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleApplyRange()}
              disabled={!fromDate || !toDate || isLoadingRange}
              className="h-10 px-4 rounded-md border border-primary-600 bg-primary-600 text-white text-[12px] font-semibold disabled:opacity-50"
            >
              {isLoadingRange ? 'Loading...' : 'Apply'}
            </button>
            <button
              type="button"
              onClick={handleResetRange}
              className="h-10 px-4 rounded-md border border-gray-300 bg-white text-[12px] font-semibold text-gray-700"
            >
              Reset
            </button>
          </div>
          {reportRawRecords || reportSummaryRows ? (
            <span className={`inline-flex h-8 items-center px-3 rounded-md text-[12px] font-semibold border ${reportMode === 'summary' ? 'text-accent-700 bg-accent-50 border-accent-200' : 'text-success-700 bg-success-50 border-success-200'}`}>
              {reportMode === 'summary' ? 'Summary Mode (Historical)' : 'Raw Mode (Detailed)'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        {reportMode === 'summary' ? (
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
        ) : (
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
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) {
            const record = activeRawLogs.find((entry) => entry.id === deleteId);
            if (record) onDelete(record);
            setDeleteId(null);
          }
        }}
        title="Delete Record"
        message="Are you sure you want to permanently remove this attendance log? This action cannot be undone."
        confirmLabel="Delete Record"
      />
    </section>
  );
};

export default AttendanceLogs;
