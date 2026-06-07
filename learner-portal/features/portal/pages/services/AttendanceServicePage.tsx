import { useEffect, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  fetchLearnerAttendanceSnapshot,
  type LearnerAttendanceSnapshot,
} from '../../services/attendanceService';
import {
  fetchLearnerAttendanceArchiveSnapshot,
  type LearnerAttendanceArchiveSnapshot,
} from '../../services/attendanceArchiveService';
import { ArchivedAttendanceSection } from './attendance/components/ArchivedAttendanceSection';
import { MonthlyAttendanceTable } from './attendance/components/MonthlyAttendanceTable';

type AttendanceServicePageProps = {
  session: LearnerPortalAccessRecord;
};

export function AttendanceServicePage({ session }: AttendanceServicePageProps) {
  const [snapshot, setSnapshot] = useState<LearnerAttendanceSnapshot>({
    months: [],
    totalMonths: 0,
    totalDays: 0,
    totalTaps: 0,
  });
  const [archiveSnapshot, setArchiveSnapshot] = useState<LearnerAttendanceArchiveSnapshot>({
    records: [],
    totalBatches: 0,
    totalRows: 0,
    totalTaps: 0,
    totalUnscheduled: 0,
    latestArchivedAt: '',
    latestArchivedRange: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiveLoading, setIsArchiveLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    const refresh = () => setRefreshNonce((current) => current + 1);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchLearnerAttendanceSnapshot(
          { learnerId: session.learnerId, lrn: session.lrn },
          { forceRefresh: refreshNonce > 0 },
        );
        if (!cancelled) setSnapshot(next);
      } catch (fetchError: any) {
        if (!cancelled) setError(fetchError?.message || 'Unable to load attendance records.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn, refreshNonce]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsArchiveLoading(true);
      setArchiveError(null);
      try {
        const next = await fetchLearnerAttendanceArchiveSnapshot(
          { learnerId: session.learnerId, lrn: session.lrn },
          { forceRefresh: refreshNonce > 0 },
        );
        if (!cancelled) setArchiveSnapshot(next);
      } catch (fetchError: any) {
        if (!cancelled) setArchiveError(fetchError?.message || 'Unable to load archived attendance records.');
      } finally {
        if (!cancelled) setIsArchiveLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn, refreshNonce]);

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Attendance Service</h2>
          <p>Consolidated monthly attendance with kiosk tap times for each day.</p>
        </header>
      </div>

      <section className="learner-services-history" aria-label="Monthly attendance records">
        <header className="learner-services-history__header">
          <div>
            <h3>Monthly Attendance Matrix</h3>
            <p>
              Total Months: <strong>{snapshot.totalMonths}</strong> | Total Tap Entries: <strong>{snapshot.totalTaps}</strong>
            </p>
          </div>
        </header>

        {isLoading ? <p className="learner-services-history__state">Loading consolidated attendance history.</p> : null}
        {error ? <p className="learner-services-history__state">{error}</p> : null}
        {!isLoading && !error && snapshot.months.length === 0 ? (
          <p className="learner-services-history__state">No consolidated attendance history found for this learner yet.</p>
        ) : null}

        {!isLoading && !error && snapshot.months.length > 0 ? <MonthlyAttendanceTable months={snapshot.months} /> : null}
      </section>

      <ArchivedAttendanceSection snapshot={archiveSnapshot} isLoading={isArchiveLoading} error={archiveError} />
    </section>
  );
}
