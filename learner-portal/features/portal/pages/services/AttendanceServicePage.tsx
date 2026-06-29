import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  fetchLearnerAttendanceSnapshot,
  type LearnerAttendanceSnapshot,
} from '../../services/attendanceService';
import { fetchLearnerProfile } from '../../services/learnerProfile';
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
  const [gradeLevel, setGradeLevel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [nextSnapshot, profile] = await Promise.all([
          fetchLearnerAttendanceSnapshot({ learnerId: session.learnerId, lrn: session.lrn }),
          fetchLearnerProfile({ learnerId: session.learnerId, lrn: session.lrn }),
        ]);
        if (!cancelled) setSnapshot(nextSnapshot);
        if (!cancelled) setGradeLevel(profile.gradeLevel || '');
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
    <section className="section-shell learner-attendance-service" aria-label="Monthly attendance records">
      <div className="learner-attendance-service__back-row">
        <Link to="/services" className="learner-attendance-service__back-button">
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_left
          </span>
          Back to Services
        </Link>
      </div>

      {isLoading ? <p className="learner-services-history__state">Loading consolidated attendance history.</p> : null}
      {error ? <p className="learner-services-history__state">{error}</p> : null}
      {!isLoading && !error && snapshot.months.length === 0 ? (
        <p className="learner-services-history__state">No consolidated attendance history found for this learner yet.</p>
      ) : null}

      {!isLoading && !error && snapshot.months.length > 0 ? (
        <MonthlyAttendanceTable months={snapshot.months} gradeLevel={gradeLevel} />
      ) : null}
    </section>
  );
}
