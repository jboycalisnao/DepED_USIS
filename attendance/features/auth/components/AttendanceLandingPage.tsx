import { FormEvent, useState } from 'react';
import { UsisGlobalFooter } from '../../../../common/footer/UsisGlobalFooter';
import { UsisUnifiedHeader } from '../../../../common/header/UsisUnifiedHeader';
import {
  resolveAttendanceAccess,
  storeAttendanceAccess,
  type AttendanceAccessRecord,
} from '../utils/attendanceAccess';

interface AttendanceLandingPageProps {
  onAuthenticated: (record: AttendanceAccessRecord) => void;
}

export default function AttendanceLandingPage({ onAuthenticated }: AttendanceLandingPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const result = await resolveAttendanceAccess(username, password);
      if (result.error || !result.record) {
        setError(result.error || 'Unable to sign in to attendance.');
        return;
      }

      storeAttendanceAccess(result.record);
      onAuthenticated(result.record);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="site-chrome">
        <div className="content-width">
          <UsisUnifiedHeader
            searchId="attendance-landing-search"
            searchLabel="Search attendance portal"
            searchPlaceholder="Keywords"
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearchSubmit={(event) => event.preventDefault()}
          />
          <nav className="kit-nav" aria-label="Attendance landing sections">
            <div className="kit-nav__grid">
              <a className="kit-nav__link kit-nav__link--active" href="#attendance-login-title">
                Access
              </a>
            </div>
          </nav>
        </div>
      </header>

      <main className="page-frame attendance-login-page">
        <div className="content-width">
          <section className="section-shell attendance-login">
            <section className="portal-panel attendance-login__panel" aria-labelledby="attendance-login-title">
              <header className="portal-panel__header">
                <p className="page-intro__eyebrow">USIS Subsystem</p>
                <h2 id="attendance-login-title">Attendance Portal</h2>
                <p>Sign in with your assigned USIS core attendance credential.</p>
              </header>

              <form className="attendance-login__form" onSubmit={handleSubmit}>
                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      placeholder=" "
                    />
                    <span>Username</span>
                  </div>
                </label>

                <label className="floating-field">
                  <div className="floating-field__control">
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      placeholder=" "
                    />
                    <span>Password</span>
                  </div>
                </label>

                {error ? <p className="login-card__error">{error}</p> : null}

                <div className="login-card__actions">
                  <button className="login-card__submit" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Checking Access...' : 'Secure Access'}
                  </button>
                </div>
              </form>
            </section>
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
    </>
  );
}
