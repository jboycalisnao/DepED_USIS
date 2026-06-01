import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

type ConfirmationState = {
  submissionReferenceId?: string;
  lrn?: string;
  fullName?: string;
};

export function SubmissionConfirmationPage() {
  const [showEnrollmentAdvisory, setShowEnrollmentAdvisory] = useState(true);
  const location = useLocation();
  const state = (location.state || {}) as ConfirmationState;
  const submissionReferenceId = String(state.submissionReferenceId || '').trim();
  const lrn = String(state.lrn || '').trim();
  const fullName = String(state.fullName || '').trim();

  const CheckIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
      <path d="M7.5 12.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const IdIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10h8M8 14h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  const PersonIcon = () => (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19c1.8-3.1 4.2-4.6 7-4.6s5.2 1.5 7 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  return (
    <main className="page-frame enrollment-public-enrollment">
      <div className="content-width">
        <section className="section-shell">
          {!showEnrollmentAdvisory ? (
          <div className="portal-panel enrollment-confirmation">
            <header className="portal-panel__header enrollment-confirmation__header">
              <div className="enrollment-confirmation__hero-icon"><CheckIcon /></div>
              <div>
                <h2>Submission Confirmation</h2>
                <p>Your enrollment form was received successfully.</p>
              </div>
            </header>
            <div className="portal-panel__body enrollment-confirmation__body">
              {!submissionReferenceId ? (
                <p className="enrollment-confirmation__error">
                  Submission reference details are unavailable. Please submit through the enrollment form again.
                </p>
              ) : null}
              <div className="enrollment-confirmation__details" role="group" aria-label="Submission details">
                <article className="enrollment-confirmation__item">
                  <span className="enrollment-confirmation__item-icon"><IdIcon /></span>
                  <div className="enrollment-confirmation__item-body">
                    <p className="enrollment-confirmation__label">Submission Reference ID</p>
                    <p className="enrollment-confirmation__value enrollment-confirmation__value--reference">{submissionReferenceId || '--'}</p>
                  </div>
                </article>
                <article className="enrollment-confirmation__item">
                  <span className="enrollment-confirmation__item-icon"><IdIcon /></span>
                  <div className="enrollment-confirmation__item-body">
                    <p className="enrollment-confirmation__label">LRN</p>
                    <p className="enrollment-confirmation__value">{lrn || '--'}</p>
                  </div>
                </article>
                <article className="enrollment-confirmation__item">
                  <span className="enrollment-confirmation__item-icon"><PersonIcon /></span>
                  <div className="enrollment-confirmation__item-body">
                    <p className="enrollment-confirmation__label">Learner Full Name</p>
                    <p className="enrollment-confirmation__value">{fullName || '--'}</p>
                  </div>
                </article>
              </div>
              <p className="enrollment-confirmation__instruction">
                Please take a screenshot or write down the Submission Reference ID and present it as proof of submission when requested by the school.
              </p>
              <div className="enrollment-confirmation__actions">
                <Link to="/submission-status" className="primary-button">Check Submission Status</Link>
                <Link to="/enrollment-form" className="secondary-button">Back to Enrollment Form</Link>
              </div>
            </div>
          </div>
          ) : null}
        </section>
      </div>
      {showEnrollmentAdvisory ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" />
          <div className="alert-modal alert-modal--warning" role="dialog" aria-modal="true" aria-labelledby="confirmation-advisory-title">
            <div className="alert-modal__content enrollment-advisory">
              <h3 id="confirmation-advisory-title">Important Enrollment Advisory</h3>
              <p>
                Filling out and submitting this online form <strong className="enrollment-advisory__highlight">DOES NOT mean you are already enrolled</strong>.
              </p>
              <p>
                You still need to <strong className="enrollment-advisory__highlight">submit the required documents on your scheduled date</strong> at the school.
              </p>
            </div>
            <div className="alert-modal__actions">
              <button type="button" className="alert-modal__blue" onClick={() => setShowEnrollmentAdvisory(false)}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
