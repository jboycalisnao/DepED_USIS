import { useEffect, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../../auth/services/learnerAccess';
import {
  fetchEnrollmentSnapshot,
  formatEnrollmentDate,
  type EnrollmentSnapshot,
} from '../../services/enrollmentHistoryService';

type EnrollmentHistoryServicePageProps = {
  session: LearnerPortalAccessRecord;
};

export function EnrollmentHistoryServicePage({ session }: EnrollmentHistoryServicePageProps) {
  const [snapshot, setSnapshot] = useState<EnrollmentSnapshot>({ history: [], currentStatus: 'Loading' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const next = await fetchEnrollmentSnapshot({ learnerId: session.learnerId, lrn: session.lrn });
        if (!cancelled) setSnapshot(next);
      } catch (fetchError: any) {
        if (!cancelled) setError(fetchError?.message || 'Unable to load enrollment history.');
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
          <h2>Enrollment History</h2>
          <p>Review enrollment records, sections, and current status.</p>
        </header>
      </div>

      <section className="learner-services-history" aria-label="Enrollment history list">
        <header className="learner-services-history__header">
          <h3>Enrollment Records</h3>
          <p>
            Current Enrollment Status: <strong>{snapshot.currentStatus || 'N/A'}</strong>
          </p>
        </header>

        {isLoading ? <p className="learner-services-history__state">Loading enrollment history.</p> : null}
        {error ? <p className="learner-services-history__state">{error}</p> : null}
        {!isLoading && !error && snapshot.history.length === 0 ? (
          <p className="learner-services-history__state">No enrollment history record found.</p>
        ) : null}

        {!isLoading && !error && snapshot.history.length > 0 ? (
          <div className="learner-services-history__list">
            {snapshot.history.map((item, index) => (
              <article key={`${item.schoolYear}-${item.section}-${index}`} className="learner-services-history__item">
                <p>
                  <span>School Year</span>
                  <strong>{item.schoolYear || 'N/A'}</strong>
                </p>
                <p>
                  <span>Grade Level</span>
                  <strong>{item.gradeLevel || 'N/A'}</strong>
                </p>
                <p>
                  <span>Section</span>
                  <strong>{item.section || 'N/A'}</strong>
                </p>
                <p>
                  <span>Status</span>
                  <strong>{item.status || 'N/A'}</strong>
                </p>
                <p>
                  <span>Enrollment Date</span>
                  <strong>{formatEnrollmentDate(item.enrollmentDate)}</strong>
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </section>
  );
}
