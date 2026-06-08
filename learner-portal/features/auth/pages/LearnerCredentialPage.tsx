import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  lookupLearnerCredentialByLrn,
  verifyLearnerNameMatch,
  type LearnerCredentialRecord,
} from '../services/credentialRecovery';

type LearnerCredentialPageProps = {
  onPrefillLogin: (username: string, password: string) => void;
};

export function LearnerCredentialPage({ onPrefillLogin }: LearnerCredentialPageProps) {
  const navigate = useNavigate();
  const [lrn, setLrn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [record, setRecord] = useState<LearnerCredentialRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifiedRecord, setVerifiedRecord] = useState<LearnerCredentialRecord | null>(null);
  const [copiedField, setCopiedField] = useState<'username' | 'password' | null>(null);

  const resetVerification = () => {
    setRecord(null);
    setVerifiedRecord(null);
    setFirstName('');
    setLastName('');
  };

  const handleLookup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setVerifiedRecord(null);
    const result = await lookupLearnerCredentialByLrn(lrn);
    setIsLoading(false);
    if (result.error || !result.record) {
      setRecord(null);
      setError(result.error || 'Unable to validate LRN.');
      return;
    }
    setRecord(result.record);
  };

  const handleNameVerification = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!record) return;
    const valid = verifyLearnerNameMatch({ firstName, lastName }, record);
    if (!valid) {
      setVerifiedRecord(null);
      setError('Name verification failed. Ensure first name and last name match the active learner record.');
      return;
    }
    setError(null);
    setVerifiedRecord(record);
  };

  const handleCopy = async (field: 'username' | 'password', value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1500);
    } catch {
      setError('Unable to copy value. Please copy it manually.');
    }
  };

  const handleContinueToLogin = () => {
    if (!verifiedRecord) return;
    onPrefillLogin(verifiedRecord.username, verifiedRecord.password);
    navigate('/login');
  };

  return (
    <section className="section-shell">
      <div className="usis-login-modal" aria-labelledby="learner-credential-title">
        <div className="usis-login-modal__card rounded-md">
          <div className="usis-login-modal__stripe" aria-hidden="true">
            <span className="usis-login-modal__stripe-blue" />
            <span className="usis-login-modal__stripe-red" />
            <span className="usis-login-modal__stripe-yellow" />
          </div>
          <header className="usis-login-modal__header">
            <h2 id="learner-credential-title">Get School Portal Credential</h2>
            <p className="learner-public-form__subtitle">
              Provide LRN and verify your name to retrieve your school portal access.
            </p>
          </header>

          <form className="usis-login-modal__form" onSubmit={handleLookup}>
            <label className="floating-field">
              <div className="floating-field__control">
                <input
                  value={lrn}
                  onChange={(event) => {
                    setLrn(event.target.value);
                    if (record || verifiedRecord) resetVerification();
                  }}
                  type="text"
                  name="lrn"
                  inputMode="numeric"
                  autoComplete="off"
                  required
                  placeholder=" "
                />
                <span>LRN</span>
              </div>
            </label>

            <button type="submit" className="primary-button usis-login-modal__submit learner-public-form__button" disabled={isLoading || Boolean(record)}>
              {isLoading ? 'Verifying LRN...' : record ? 'LRN Verified' : 'Verify LRN'}
            </button>
          </form>

          {record ? (
            <form className="usis-login-modal__form learner-public-form__verify" onSubmit={handleNameVerification}>
              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    type="text"
                    name="firstName"
                    autoComplete="given-name"
                    required
                    placeholder=" "
                  />
                  <span>First Name</span>
                </div>
              </label>

              <label className="floating-field">
                <div className="floating-field__control">
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    type="text"
                    name="lastName"
                    autoComplete="family-name"
                    required
                    placeholder=" "
                  />
                  <span>Last Name</span>
                </div>
              </label>

              <button
                type="submit"
                className="primary-button usis-login-modal__submit learner-public-form__button"
                disabled={Boolean(verifiedRecord)}
              >
                {verifiedRecord ? (
                  <span className="learner-public-form__verified-btn">
                    <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                      <path
                        d="M5 12.5 9.2 16.7 19 7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Identity Verified
                  </span>
                ) : (
                  'Confirm Name'
                )}
              </button>
            </form>
          ) : null}

          {verifiedRecord ? (
            <article className="learner-public-form__result" aria-live="polite">
              <h3>Credential Verified</h3>
              <p>
                Learner: <strong>{verifiedRecord.firstName} {verifiedRecord.lastName}</strong>
              </p>
              <div className="learner-public-form__copy-row">
                <p>
                  Username: <strong>{verifiedRecord.username}</strong>
                </p>
                <button
                  type="button"
                  className="learner-public-form__copy-btn"
                  onClick={() => handleCopy('username', verifiedRecord.username)}
                >
                  {copiedField === 'username' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="learner-public-form__copy-row">
                <p>
                  Password: <strong>{verifiedRecord.password}</strong>
                </p>
                <button
                  type="button"
                  className="learner-public-form__copy-btn"
                  onClick={() => handleCopy('password', verifiedRecord.password)}
                >
                  {copiedField === 'password' ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button
                type="button"
                className="primary-button learner-public-form__continue-btn"
                onClick={handleContinueToLogin}
              >
                Continue to Login
              </button>
            </article>
          ) : null}

          {error ? (
            <p className="learner-public-form__error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
