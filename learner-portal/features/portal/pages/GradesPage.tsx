import { useEffect, useState } from 'react';
import type { LearnerPortalAccessRecord } from '../../auth/services/learnerAccess';
import { fetchLearnerGradesSnapshot, type LearnerGradesSnapshot } from '../services/learnerGradesService';

export function GradesPage({ session }: { session: LearnerPortalAccessRecord }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<LearnerGradesSnapshot>({ gradeLevel: '', rows: [], sectionName: '' });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const next = await fetchLearnerGradesSnapshot({ learnerId: session.learnerId, lrn: session.lrn });
        if (!isMounted) return;
        setSnapshot(next);
      } catch (loadError: any) {
        if (!isMounted) return;
        setError(loadError?.message || 'Unable to load learner grades right now.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => { isMounted = false; };
  }, [session.learnerId, session.lrn]);

  return (
    <section className="section-shell">
      <div className="portal-panel learner-tab-panel">
        <header className="portal-panel__header learner-tab-header">
          <h2>Grades</h2>
          <p>View your section subjects and published quarter grades.</p>
        </header>
        <div className="learner-grades-meta">
          <span><strong>Grade Level:</strong> {snapshot.gradeLevel || 'N/A'}</span>
          <span><strong>Section:</strong> {snapshot.sectionName || 'N/A'}</span>
        </div>
        {isLoading ? <p className="learner-services-history__state">Loading grades...</p> : null}
        {error ? <p className="learner-services-history__state">{error}</p> : null}
        {!isLoading && !error ? (
          <div className="learner-grades-table-wrap">
            <table className="learner-grades-table" aria-label="Learner grades">
              <thead>
                <tr>
                  <th>Subject Code</th>
                  <th>Subject Title</th>
                  <th>Type</th>
                  <th>1st Quarter</th>
                  <th>2nd Quarter</th>
                  <th>3rd Quarter</th>
                  <th>4th Quarter</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map((row) => (
                  <tr key={row.subjectCode}>
                    <td>{row.subjectCode}</td>
                    <td>{row.subjectTitle}</td>
                    <td>{row.subjectType}</td>
                    <td>{row.firstQuarter}</td>
                    <td>{row.secondQuarter}</td>
                    <td>{row.thirdQuarter}</td>
                    <td>{row.fourthQuarter}</td>
                  </tr>
                ))}
                {snapshot.rows.length === 0 ? (
                  <tr>
                    <td colSpan={7}>No section subjects assigned yet.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
