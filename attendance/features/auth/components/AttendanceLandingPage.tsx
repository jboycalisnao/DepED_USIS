import { FormEvent, useState } from 'react';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';
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
            <UsisLoginModal
              moduleKey="attendance"
              title="Attendance Portal"
              username={username}
              password={password}
              isSubmitting={isSubmitting}
              submitLabel="Login"
              noticeTitle="Access Denied"
              noticeMessage={error || null}
              onDismissNotice={() => setError('')}
              onUsernameChange={setUsername}
              onPasswordChange={setPassword}
              onSubmit={handleSubmit}
            />
          </section>
        </div>
      </main>

      <UsisGlobalFooter />
    </>
  );
}
