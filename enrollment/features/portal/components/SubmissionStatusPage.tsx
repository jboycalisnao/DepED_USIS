import { useEffect, useState } from 'react';
import {
  fetchSubmissionStatuses,
  type SubmissionStatusRow,
} from '../../enrollment-form/services/submissionStatus';
import type { SubmissionStatusAccessRecord } from '../../enrollment-form/services/submissionStatusAuth';

type Props = {
  access: SubmissionStatusAccessRecord;
  onLogout: () => void;
};

export function SubmissionStatusPage({ access, onLogout }: Props) {
  const [rows, setRows] = useState<SubmissionStatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSubmissionStatuses(access);
        if (!cancelled) setRows(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load submission records right now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [access]);

  return (
    <main className="page-frame">
      <div className="content-width">
        <section className="section-shell enrollment-hint">
          <nav className="enrollment-status-breadcrumb" aria-label="Submission status breadcrumb">
            <span>{new Date().getFullYear()}-{new Date().getFullYear() + 1}</span>
            <span>/</span>
            <span>First Semester</span>
            <span>/</span>
            <span>Dashboard</span>
          </nav>
          <header className="enrollment-status-hero" role="banner">
            <button type="button" className="secondary-button enrollment-status-signout" onClick={onLogout}>
              <svg viewBox="0 0 24 24" aria-hidden="true" className="enrollment-logout-icon">
                <path d="M3 4.5h10v15H3v-15Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13 12h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="m18 8 4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Sign Out</span>
            </button>
            <div className="enrollment-status-hero__shape enrollment-status-hero__shape--left" aria-hidden="true" />
            <div className="enrollment-status-hero__shape enrollment-status-hero__shape--right" aria-hidden="true" />
            <h2>Welcome back, {access.fullName || access.username}!</h2>
            <p>Always stay updated about your enrollment progress.</p>
          </header>
          <article className="notice-box enrollment-hint__box">
            <strong>Session Access</strong>
            <span>You are logged in as {access.username}. Use Sign Out when done.</span>
          </article>
          {loading ? (
            <article className="notice-box enrollment-hint__box">
              <strong>Loading</strong>
              <span>Retrieving submission history.</span>
            </article>
          ) : null}

          {error ? (
            <article className="notice-box enrollment-hint__box">
              <strong>System Notice</strong>
              <span>{error}</span>
            </article>
          ) : null}

          {!loading && !error ? (
            rows.length > 0 ? (
              <div className="portal-panel" style={{ marginTop: 12 }}>
                <div className="portal-panel__body" style={{ padding: 0 }}>
                  <table className="usis-table">
                    <thead>
                      <tr>
                        <th>Date Submitted</th>
                        <th>School Year</th>
                        <th>Target Grade</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>{new Date(row.createdAt).toLocaleString()}</td>
                          <td>{row.schoolYear}</td>
                          <td>{row.gradeToEnroll}</td>
                          <td className="enrollment-status-row-status">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <article className="notice-box enrollment-hint__box">
                <strong>No Records Yet</strong>
                <span>No enrollment submission was found for this learner account.</span>
              </article>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}
