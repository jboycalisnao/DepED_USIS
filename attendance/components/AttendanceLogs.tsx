import React, { useState } from 'react';
import {
  AttendanceRecord,
  AttendanceType,
  AttendanceScheduleConfig,
  Learner,
} from '../types';
import AttendanceRecordsBrowser from './AttendanceRecordsBrowser';
import { ManualAttendanceModal, type ManualAttendanceFormValue } from './ManualAttendanceModal';

interface AttendanceLogsProps {
  logs: AttendanceRecord[];
  learners: Learner[];
  scheduleConfig: AttendanceScheduleConfig;
  onDelete: (record: AttendanceRecord) => Promise<void> | void;
  onAddManualRecord: (learnerId: string, type: AttendanceType, timestamp: string) => Promise<{ ok: boolean; error: string | null }>;
  refreshAttendanceStatusByRange: (fromDate: string, toDate: string) => Promise<Set<string>>;
}

const AttendanceLogs: React.FC<AttendanceLogsProps> = ({
  logs,
  learners,
  scheduleConfig,
  onDelete,
  onAddManualRecord,
  refreshAttendanceStatusByRange,
}) => {
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const syncedCount = logs.filter((row) => row.synced).length;
  const pendingCount = logs.length - syncedCount;

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
    } finally {
      setIsManualSubmitting(false);
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
                <p className="attendance-records-page__stat-value">{logs.length}</p>
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
              <h3>Quick Actions</h3>
              <p>Use the search field below to load only the month or day you need.</p>
            </div>

            <div className="form-actions attendance-records-page__actions">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(true)}
                className="secondary-button"
              >
                Manual Add Record
              </button>
            </div>
          </div>
        </section>

        <AttendanceRecordsBrowser
          logs={logs}
          learners={learners}
          scheduleConfig={scheduleConfig}
          onDelete={onDelete}
          refreshAttendanceStatusByRange={refreshAttendanceStatusByRange}
        />
      </div>

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
