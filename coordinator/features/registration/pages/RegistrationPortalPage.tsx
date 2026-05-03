import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resolveRegistrationPortalAccess } from '@/features/access/utils/credentialRegistry';
import { FloatingField } from '@/features/shared/components/FloatingField';
import {
  getStoredRegistrationPortalAccess,
  storeRegistrationPortalAccess,
} from '../utils/registrationPortalAccess';

export function RegistrationPortalPage() {
  const navigate = useNavigate();
  const existingRegistrationAccess = getStoredRegistrationPortalAccess();
  const [regionCode, setRegionCode] = useState(existingRegistrationAccess?.regionCode || '');
  const [divisionCode, setDivisionCode] = useState(existingRegistrationAccess?.divisionCode || '');
  const [registrationCode, setRegistrationCode] = useState(existingRegistrationAccess?.registrationCode || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const record = await resolveRegistrationPortalAccess(regionCode, divisionCode, registrationCode);
      storeRegistrationPortalAccess(record);
      navigate('/registration/credentials');
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to continue to the credentials registration portal.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-shell">
      <div className="login-shell">
        <div className="login-shell__header">
          <div className="admin-shell__heading">
            <p className="page-intro__eyebrow">Registration Portal</p>
            <h1 className="login-shell__title">Credentials Registration</h1>
          </div>
        </div>

        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <form className="login-form" onSubmit={handleSubmit}>
              <FloatingField
                id="registration-region-code"
                label="Region Code"
                type="text"
                value={regionCode}
                onChange={(event) => setRegionCode(event.target.value.toUpperCase())}
              />

              <FloatingField
                id="registration-division-code"
                label="Division Code"
                type="text"
                value={divisionCode}
                onChange={(event) => setDivisionCode(event.target.value.toUpperCase())}
              />

              <FloatingField
                id="registration-registration-code"
                label="Registration Code"
                type="text"
                value={registrationCode}
                onChange={(event) => setRegistrationCode(event.target.value.toUpperCase())}
              />

              {error ? <p className="login-card__error">{error}</p> : null}

              <div className="login-card__actions">
                <button className="login-card__submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Checking...' : 'Open Portal'}
                </button>
              </div>
            </form>
          </div>
        </article>
      </div>
    </section>
  );
}
