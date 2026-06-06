import { useEffect, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  fetchLearnerAttendanceSnapshot,
  type LearnerAttendanceSnapshot,
} from '../../services/attendanceService';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchLearnerAttendanceSnapshot({ learnerId: session.learnerId, lrn: session.lrn });
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
  }, [session.learnerId, session.lrn]);

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

        {!isLoading && !error && snapshot.months.length > 0 ? (
          <MonthlyAttendanceTable months={snapshot.months} />
        ) : null}
      </section>
    </section>
  );
}

