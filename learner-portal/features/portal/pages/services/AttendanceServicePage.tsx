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
    classDayConfig: {
      sunday: false,
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: true,
    },
    noClassDates: [],
  });
  const [gradeLevel, setGradeLevel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const runLoad = async (options?: { forceRefresh?: boolean }) => {
    const forceRefresh = options?.forceRefresh === true;
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [nextSnapshot, profile] = await Promise.all([
        fetchLearnerAttendanceSnapshot({ learnerId: session.learnerId, lrn: session.lrn }, { forceRefresh }),
        fetchLearnerProfile({ learnerId: session.learnerId, lrn: session.lrn }),
      ]);
      setSnapshot(nextSnapshot);
      setGradeLevel(profile.gradeLevel || '');
      setLastLoadedAt(new Date().toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }));
    } catch (fetchError: any) {
      setError(fetchError?.message || 'Unable to load attendance records.');
    } finally {
      if (forceRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await runLoad();
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [session.learnerId, session.lrn]);

  return (
    <section className="section-shell learner-attendance-service" aria-label="Monthly attendance records">
      <div className="learner-attendance-service__topbar">
        <div className="learner-attendance-service__back-row">
          <Link to="/services" className="learner-attendance-service__back-button">
            <span className="material-symbols-outlined" aria-hidden="true">
              chevron_left
            </span>
            Back to Services
          </Link>
        </div>

        <div className="learner-attendance-service__actions">
          <div className="learner-attendance-service__timestamp">
            <span className="learner-attendance-service__timestamp-label">Last loaded from database</span>
            <strong>{lastLoadedAt || 'Not loaded yet'}</strong>
          </div>
          <button
            type="button"
            className="learner-attendance-service__refresh-button"
            onClick={() => void runLoad({ forceRefresh: true })}
            disabled={isLoading || isRefreshing}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              sync
            </span>
            {isRefreshing ? 'Refreshing...' : 'Refresh Records'}
          </button>
        </div>
      </div>

      {isLoading ? <p className="learner-services-history__state">Loading consolidated attendance history.</p> : null}
      {error ? <p className="learner-services-history__state">{error}</p> : null}
      {!isLoading && !error && snapshot.months.length === 0 ? (
        <p className="learner-services-history__state">No consolidated attendance history found for this learner yet.</p>
      ) : null}

      {!isLoading && !error && snapshot.months.length > 0 ? (
        <MonthlyAttendanceTable
          months={snapshot.months}
          gradeLevel={gradeLevel}
          classDayConfig={snapshot.classDayConfig}
          noClassDates={snapshot.noClassDates}
        />
      ) : null}
    </section>
  );
}
