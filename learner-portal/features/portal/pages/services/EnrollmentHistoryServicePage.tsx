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

const REFERENCE_SCHOOL_YEAR = '2025-2026';

const parseSchoolYearStart = (value: string) => {
  const match = String(value || '').trim().match(/(20\d{2})\s*-\s*(20\d{2})/);
  if (!match) return null;
  return Number(match[1]);
};

const isBeyondReferenceSchoolYear = (value: string) => {
  const startYear = parseSchoolYearStart(value);
  if (!startYear) return false;
  return startYear > 2025;
};

export function EnrollmentHistoryServicePage({ session }: EnrollmentHistoryServicePageProps) {
  const [snapshot, setSnapshot] = useState<EnrollmentSnapshot>({ history: [], currentEnrollment: null, currentStatus: 'Loading' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const records = [
    ...(snapshot.currentEnrollment ? [snapshot.currentEnrollment] : []),
    ...snapshot.history,
  ];
  const latestRecord = records[0] || null;
  const hasRecordsBeyondReference = records.some((record) => isBeyondReferenceSchoolYear(record.schoolYear));
  const policyMessage = 'USIS records are only from School Year 2025-2026 onwards.';

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
          {!isLoading && !error && latestRecord ? (
            <div className="learner-services-history__tags" aria-label="Enrollment reference tags">
              <span className="learner-services-history__tag">
                Reference School Year: <strong>{REFERENCE_SCHOOL_YEAR}</strong>
              </span>
              <span className="learner-services-history__tag">
                Latest record shown: <strong>{latestRecord.schoolYear || 'N/A'}</strong>
              </span>
              <span className="learner-services-history__tag">
                {hasRecordsBeyondReference ? 'Records beyond the reference year are present.' : 'No records beyond the reference year.'}
              </span>
            </div>
          ) : null}
        </header>

        <div className="learner-services-history__records">
          {!isLoading && !error && snapshot.currentEnrollment ? (
            <article className="learner-services-history__item">
              <p>
                <span>School Year</span>
                <strong>{snapshot.currentEnrollment.schoolYear || 'N/A'}</strong>
              </p>
              <p>
                <span>Grade Level</span>
                <strong>{snapshot.currentEnrollment.gradeLevel || 'N/A'}</strong>
              </p>
              <p>
                <span>Section</span>
                <strong>{snapshot.currentEnrollment.section || 'N/A'}</strong>
              </p>
              <p>
                <span>Status</span>
                <strong>{snapshot.currentEnrollment.status || 'N/A'}</strong>
              </p>
              <p>
                <span>Enrollment Date</span>
                <strong>{formatEnrollmentDate(snapshot.currentEnrollment.enrollmentDate)}</strong>
              </p>
            </article>
          ) : null}

          {isLoading ? <p className="learner-services-history__state">Loading enrollment history.</p> : null}
          {error ? <p className="learner-services-history__state">{error}</p> : null}
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
        </div>

        {!isLoading && !error ? (
          <p className="learner-services-history__state learner-services-history__policy-note">
            {policyMessage}
          </p>
        ) : null}
      </section>
    </section>
  );
}
