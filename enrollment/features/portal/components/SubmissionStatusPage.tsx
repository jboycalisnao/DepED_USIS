import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { EnrollmentAnnouncementsModal } from '../../../../common/components/enrollment/EnrollmentAnnouncementsModal';
import { supabase } from '../../../lib/supabase';
import { lookupSubmissionStatus, lookupSubmissionStatusByIdentity, type SubmissionLookupResult } from '../../enrollment-form/services/submissionLookup';
import { useEnrollmentAnnouncements } from '../hooks/useEnrollmentAnnouncements';
import { fetchEnrollmentSchoolYear } from '../../../lib/enrollmentSchoolYear';

const normalizeStatus = (value: string) => String(value || '').trim().toLowerCase();

const resolveStatusTone = (value: string): 'info' | 'success' | 'warning' | 'danger' => {
  const normalized = normalizeStatus(value);
  if (normalized.includes('approved') || normalized.includes('enrolled') || normalized.includes('complete')) return 'success';
  if (normalized.includes('existing learner') || normalized.includes('previous learner') || normalized.includes('previously enrolled')) return 'info';
  if (normalized.includes('review') || normalized.includes('pending')) return 'warning';
  if (normalized.includes('reject') || normalized.includes('cancel') || normalized.includes('deny')) return 'danger';
  return 'info';
};

export function SubmissionStatusPage() {
  const [query, setQuery] = useState('');
  const [firstNameQuery, setFirstNameQuery] = useState('');
  const [lastNameQuery, setLastNameQuery] = useState('');
  const [birthDateQuery, setBirthDateQuery] = useState('');
  const [showAnnouncementsModal, setShowAnnouncementsModal] = useState(false);
  const [hasOpenedAnnouncementsModal, setHasOpenedAnnouncementsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionLookupResult | null>(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [isVerificationEnabled, setIsVerificationEnabled] = useState(false);
  const { announcements, isLoading: areAnnouncementsLoading } = useEnrollmentAnnouncements();
  const currentStatusTone = result ? resolveStatusTone(result.currentStatus) : 'info';
  const currentStatusLabel = result ? normalizeStatus(result.currentStatus) : '';
  const hasCurrentSubmission = Boolean(result?.hasCurrentSubmission);
  const hasCurrentSchoolYearSection = Boolean(
    result?.history.some((row) => String(row.schoolYear || '').trim() === activeSchoolYear && String(row.section || '').trim()),
  );
  const hasPreviousSchoolYearHistory = Boolean(
    result &&
      activeSchoolYear &&
      result.history.some((row) => String(row.schoolYear || '').trim() && String(row.schoolYear || '').trim() !== activeSchoolYear) &&
      result.history.some((row) => /grade\s*(7|8|9|10|11)\b/i.test(String(row.gradeLevel || '').trim())),
  );
  const showEnrollmentBanner =
    Boolean(result) &&
    hasPreviousSchoolYearHistory &&
    !hasCurrentSubmission &&
    !hasCurrentSchoolYearSection;
  const currentStatusNote = result
    ? currentStatusLabel === 'graduated'
      ? 'You completed Grade 12 in a previous school year. Please enroll online for the current active school year.'
      : currentStatusLabel === 'previous learner'
        ? 'You have a previous enrollment record, but no section is assigned for the current school year.'
      : currentStatusLabel === 'submission received'
          ? 'Your enrollment submission was received and is waiting for section assignment.'
          : currentStatusLabel === 'information updated'
            ? 'Your learner information was updated and is waiting for section assignment.'
        : currentStatusTone === 'success'
          ? 'You are linked to an assigned section and are treated as enrolled.'
          : currentStatusTone === 'warning'
            ? 'Your submission is still under review.'
            : currentStatusTone === 'danger'
              ? 'Your submission was rejected or cancelled.'
              : 'Your record has been captured in the system.'
    : '';

  useEffect(() => {
    const run = async () => {
      const resolvedSchoolYear = await fetchEnrollmentSchoolYear();
      setActiveSchoolYear(String(resolvedSchoolYear.label || '').trim());
    };
    void run();
  }, []);

  useEffect(() => {
    if (hasOpenedAnnouncementsModal || areAnnouncementsLoading || !announcements.length) return;
    setShowAnnouncementsModal(true);
    setHasOpenedAnnouncementsModal(true);
  }, [announcements.length, areAnnouncementsLoading, hasOpenedAnnouncementsModal]);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase
          .from('registrar_enrollment_form_schedule')
          .select('information_verification_and_update_enabled')
          .eq('id', 1)
          .maybeSingle();
        setIsVerificationEnabled(Boolean((data as any)?.information_verification_and_update_enabled));
      } catch {
        setIsVerificationEnabled(false);
      }
    };
    void run();
  }, []);

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const prefill = String(search.get('q') || '').trim();
    if (!prefill) return;
    setQuery(prefill);
    void (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const row = await lookupSubmissionStatus(prefill);
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
    })();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const hasIdentityLookup = Boolean(
        isVerificationEnabled && firstNameQuery.trim() && lastNameQuery.trim() && birthDateQuery.trim(),
      );
      const hasPartialIdentityLookup =
        isVerificationEnabled && (firstNameQuery.trim() || lastNameQuery.trim() || birthDateQuery.trim()) && !hasIdentityLookup;
      if (hasPartialIdentityLookup) {
        setResult(null);
        setError('Enter first name, last name, and birth date to use the alternative lookup.');
        return;
      }
      const row = hasIdentityLookup
        ? await lookupSubmissionStatusByIdentity(firstNameQuery, lastNameQuery, birthDateQuery)
        : await lookupSubmissionStatus(query);
      if (!row) {
        setResult(null);
        setError(
          hasIdentityLookup
            ? 'No submission found. Check the learner name and birth date.'
            : 'No submission found. Check your LRN or Submission Reference ID.',
        );
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
    <main className="page-frame enrollment-public-enrollment enrollment-status-page">
      <div className="content-width">
        <section className="section-shell">
          <div className="portal-panel">
            <div className="portal-panel__header">
              <h2>Submission Status Lookup</h2>
              <p>Enter LRN or Submission Reference ID to view current status and enrollment history. When enabled, you may also look up by learner name and birth date.</p>
            </div>
            <div className="portal-panel__body enrollment-status-page__body">
              <form className="form-grid enrollment-status-page__lookup-form" onSubmit={onSubmit}>
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder=" " />
                    <span>LRN or Submission Reference ID</span>
                  </div>
                </label>
                <button type="submit" className="primary-button" disabled={isLoading}>
                  {isLoading ? 'Checking...' : 'Lookup'}
                </button>
              </form>

              {isVerificationEnabled ? (
                <section className="enrollment-status-page__identity-lookup">
                  <h3>Alternative Lookup</h3>
                  <p>Use learner name and birth date when the registrar enables Information Verification and Update.</p>
                  <div className="form-grid enrollment-status-page__identity-grid">
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input value={firstNameQuery} onChange={(event) => setFirstNameQuery(event.target.value)} placeholder=" " />
                        <span>First Name</span>
                      </div>
                    </label>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input value={lastNameQuery} onChange={(event) => setLastNameQuery(event.target.value)} placeholder=" " />
                        <span>Last Name</span>
                      </div>
                    </label>
                    <label className="floating-field">
                      <div className="floating-field__control">
                        <input value={birthDateQuery} onChange={(event) => setBirthDateQuery(event.target.value)} type="date" placeholder=" " />
                        <span>Birth Date</span>
                      </div>
                    </label>
                  </div>
                </section>
              ) : null}

              {showEnrollmentBanner && result ? (
                <div className="enrollment-lookup__handoff-banner" role="status" aria-live="polite">
                  <div className="enrollment-lookup__handoff-banner-copy">
                    <strong>{currentStatusLabel === 'graduated' ? 'Graduated learner detected' : 'Previous learner detected'}</strong>
                    <p>
                      {currentStatusLabel === 'graduated'
                        ? 'You completed Grade 12 in a previous school year. Please continue by submitting the online enrollment form.'
                        : 'You have a previous enrollment record, but not for the current active school year. Please continue by submitting the online enrollment form.'}
                    </p>
                  </div>
                  <Link to={`/enrollment-form?q=${encodeURIComponent(result.lrn)}`} className="primary-button enrollment-lookup__handoff-banner-action">
                    Open Enrollment Form
                  </Link>
                </div>
              ) : null}

              {result ? (
                <div className="portal-panel enrollment-lookup__result-panel" style={{ marginTop: 4 }}>
                  <div className="portal-panel__body enrollment-lookup__result-body">
                    {(() => {
                      const historyRows = result.history;
                      return (
                        <>
                          <div className="enrollment-lookup__legend enrollment-lookup__legend--soft">
                            <span className="enrollment-status-tag enrollment-status-tag--success">Approved / Enrolled</span>
                            <span className="enrollment-status-tag enrollment-status-tag--warning">For Review / Pending</span>
                            <span className="enrollment-status-tag enrollment-status-tag--danger">Rejected / Cancelled</span>
                            <span className="enrollment-status-tag enrollment-status-tag--info">Recorded / Other</span>
                          </div>
                          <div className={`enrollment-lookup__status-summary enrollment-lookup__status-summary--${currentStatusTone}`}>
                            <div className="enrollment-lookup__status-summary-label">
                              <strong>Current Status</strong>
                              <span>{currentStatusNote}</span>
                            </div>
                            <span className={`enrollment-status-tag enrollment-status-tag--${currentStatusTone}`}>
                              <span className="enrollment-lookup__status-dot" aria-hidden="true" />
                              {result.currentStatus}
                            </span>
                          </div>
                          <div className="form-grid enrollment-status-page__metrics-grid">
                            <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--ref"><strong>Submission Ref</strong><span className="enrollment-lookup__mono">{result.submissionReferenceId || '--'}</span></div>
                            <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--lrn"><strong>LRN</strong><span className="enrollment-lookup__mono">{result.lrn || '--'}</span></div>
                            <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--name"><strong>Learner Name</strong><span>{result.fullName || '--'}</span></div>
                            <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--date"><strong>Date Submitted</strong><span>{result.submittedAt ? new Date(result.submittedAt).toLocaleString() : '--'}</span></div>
                            <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--sy"><strong>School Year</strong><span>{result.schoolYear}</span></div>
                            <div className="notice-box enrollment-lookup__metric-card enrollment-lookup__metric-card--status">
                              <strong>Lookup Result</strong>
                              <span className="enrollment-lookup__metric-status-copy">{result.currentStatus}</span>
                            </div>
                          </div>

                          <div className="portal-panel enrollment-lookup__history-panel" style={{ marginTop: 4 }}>
                            <div className="portal-panel__header enrollment-lookup__history-header"><h3>Enrollment History</h3></div>
                            <div className="portal-panel__body enrollment-status-page__history-body">
                              <table className="usis-table">
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>School Year</th>
                                <th>Grade Level</th>
                                <th>Section</th>
                                <th>Status</th>
                                <th>Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historyRows.length ? (
                                historyRows.map((row) => (
                                  <tr key={row.id}>
                                        <td>{row.enrollmentDate ? new Date(row.enrollmentDate).toLocaleString() : '--'}</td>
                                        <td>{row.schoolYear}</td>
                                        <td>{row.gradeLevel}</td>
                                        <td>{row.section}</td>
                                        <td><span className={`enrollment-status-tag enrollment-status-tag--${resolveStatusTone(row.status)}`}>{row.status}</span></td>
                                        <td>
                                          {isVerificationEnabled &&
                                          row.source === 'submission' &&
                                          String(row.schoolYear || '').trim() === activeSchoolYear &&
                                          row.id ? (
                                            <Link to={`/enrollment-form/verify/${encodeURIComponent(row.id)}`} className="secondary-button">
                                              Verify
                                            </Link>
                                          ) : (
                                            '--'
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={6}>No enrollment history found yet.</td>
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
      <EnrollmentAnnouncementsModal
        open={showAnnouncementsModal}
        announcements={announcements}
        continueLabel="Continue to Submission Status"
        onClose={() => setShowAnnouncementsModal(false)}
      />
    </main>
  );
}




