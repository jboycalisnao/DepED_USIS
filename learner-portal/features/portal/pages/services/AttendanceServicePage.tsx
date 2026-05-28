import { useEffect, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  fetchLearnerAttendanceSnapshot,
  formatAttendanceDateTime,
  type LearnerAttendanceSnapshot,
} from '../../services/attendanceService';

type AttendanceServicePageProps = {
  session: LearnerPortalAccessRecord;
};

export function AttendanceServicePage({ session }: AttendanceServicePageProps) {
  const [snapshot, setSnapshot] = useState<LearnerAttendanceSnapshot>({ records: [], total: 0 });
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
          <p>Review all recorded attendance logs linked to your learner account.</p>
        </header>
      </div>

      <section className="learner-services-history" aria-label="Attendance records list">
        <header className="learner-services-history__header">
          <h3>Attendance Records</h3>
          <p>
            Total Entries: <strong>{snapshot.total}</strong>
          </p>
        </header>

        {isLoading ? <p className="learner-services-history__state">Loading attendance records.</p> : null}
        {error ? <p className="learner-services-history__state">{error}</p> : null}
        {!isLoading && !error && snapshot.records.length === 0 ? (
          <p className="learner-services-history__state">No attendance records found for this learner yet.</p>
        ) : null}

        {!isLoading && !error && snapshot.records.length > 0 ? (
          <div className="learner-services-history__list">
            {snapshot.records.map((item) => (
              <article key={item.id} className="learner-services-history__item">
                <p>
                  <span>Type</span>
                  <strong>{item.attendanceType || 'N/A'}</strong>
                </p>
                <p>
                  <span>Logged At</span>
                  <strong>{formatAttendanceDateTime(item.loggedAt)}</strong>
                </p>
                <p>
                  <span>Station</span>
                  <strong>{item.stationNo || 'N/A'}</strong>
                </p>
                <p>
                  <span>Source</span>
                  <strong>{item.source || 'rfid'}</strong>
                </p>
                <p>
                  <span>UID</span>
                  <strong>{item.scannedUid || 'N/A'}</strong>
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}

