import { FormEvent, useState } from 'react';
import { lookupSubmissionStatus, type SubmissionLookupResult } from '../../enrollment-form/services/submissionLookup';

const normalizeStatus = (value: string) => String(value || '').trim().toLowerCase();

const resolveStatusTone = (value: string): 'info' | 'success' | 'warning' | 'danger' => {
  const normalized = normalizeStatus(value);
  if (normalized.includes('approved') || normalized.includes('enrolled') || normalized.includes('complete')) return 'success';
  if (normalized.includes('review') || normalized.includes('pending')) return 'warning';
  if (normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('deny')) return 'danger';
  return 'info';
};

export function SubmissionStatusPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionLookupResult | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const row = await lookupSubmissionStatus(query);
      if (!row) {
        setResult(null);
        setError('No submission found. Check your LRN or Submission Reference ID.');
        return;
      }
      setResult(row);
    } catch (e: any) {
      setResult(null);
      setError(e?.message || 'Unable to fetch submission status right now.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-frame enrollment-public-enrollment">
      <div className="content-width">
        <section className="section-shell">
          <div className="portal-panel">
            <div className="portal-panel__header">
              <h2>Submission Status Lookup</h2>
              <p>Enter LRN or Submission Reference ID to view current status and enrollment history.</p>
            </div>
            <div className="portal-panel__body" style={{ display: 'grid', gap: 12 }}>
              <form className="form-grid" style={{ gridTemplateColumns: 'minmax(280px, 1fr) auto' }} onSubmit={onSubmit}>
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder=" " />
                    <span>LRN or Submission Reference ID</span>
                  </div>
                </label>
                <button type="submit" className="primary-button" disabled={isLoading} style={{ minHeight: 56 }}>
                  {isLoading ? 'Checking...' : 'Lookup'}
                </button>
              </form>

              {result ? (
                <div className="portal-panel enrollment-lookup__result-panel" style={{ marginTop: 4 }}>
                  <div className="portal-panel__body enrollment-lookup__result-body">
                    {(() => {
                      const bestHistory = result.history.length ? [result.history[0]] : [];
                      return (
                        <>
                    <div className="enrollment-lookup__legend">
                      <span className="enrollment-status-tag enrollment-status-tag--success">Approved / Enrolled</span>
                      <span className="enrollment-status-tag enrollment-status-tag--warning">For Review / Pending</span>
                      <span className="enrollment-status-tag enrollment-status-tag--danger">Rejected / Cancelled</span>
                      <span className="enrollment-status-tag enrollment-status-tag--info">Recorded / Other</span>
                    </div>
                    <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))' }}>
                      <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--ref"><strong>Submission Ref</strong><span className="enrollment-lookup__mono">{result.submissionReferenceId || '--'}</span></div>
                      <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--lrn"><strong>LRN</strong><span className="enrollment-lookup__mono">{result.lrn || '--'}</span></div>
                      <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--name"><strong>Learner Name</strong><span>{result.fullName || '--'}</span></div>
                      <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--date"><strong>Date Submitted</strong><span>{result.submittedAt ? new Date(result.submittedAt).toLocaleString() : '--'}</span></div>
                      <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--sy"><strong>School Year</strong><span>{result.schoolYear}</span></div>
                      <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--status">
                        <strong>Current Status</strong>
                        <span className={`enrollment-status-tag enrollment-status-tag--${resolveStatusTone(result.currentStatus)}`}>{result.currentStatus}</span>
                      </div>
                    </div>

                    <div className="portal-panel enrollment-lookup__history-panel" style={{ marginTop: 4 }}>
                      <div className="portal-panel__header enrollment-lookup__history-header"><h3>Previous Enrollment History (Best Match)</h3></div>
                      <div className="portal-panel__body" style={{ padding: 0 }}>
                        <table className="usis-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>School Year</th>
                              <th>Grade Level</th>
                              <th>Section</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bestHistory.length ? (
                              bestHistory.map((row) => (
                                <tr key={row.id}>
                                  <td>{row.enrollmentDate ? new Date(row.enrollmentDate).toLocaleString() : '--'}</td>
                                  <td>{row.schoolYear}</td>
                                  <td>{row.gradeLevel}</td>
                                  <td>{row.section}</td>
                                  <td><span className={`enrollment-status-tag enrollment-status-tag--${resolveStatusTone(row.status)}`}>{row.status}</span></td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5}>No enrollment history found yet.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
      {error ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setError(null)} />
          <div className="alert-modal alert-modal--warning" role="dialog" aria-modal="true" aria-labelledby="submission-lookup-notice-title">
            <div className="alert-modal__content">
              <h3 id="submission-lookup-notice-title">Lookup Notice</h3>
              <p>{error}</p>
            </div>
            <div className="alert-modal__actions">
              <button type="button" className="alert-modal__blue" onClick={() => setError(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
