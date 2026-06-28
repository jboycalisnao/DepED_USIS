import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';
import { UsisGlobalFooter } from '../../../../common/footer/UsisGlobalFooter';
import { UsisUnifiedHeader } from '../../../../common/header/UsisUnifiedHeader';
import {
  resolveTeacherAttendanceAccess,
  storeTeacherAttendanceAccess,
  type TeacherAttendanceAccessRecord,
} from '../utils/teacherAttendanceAccess';

interface TeacherAttendanceLandingPageProps {
  onAuthenticated: (record: TeacherAttendanceAccessRecord) => void;
}

export default function TeacherAttendanceLandingPage({ onAuthenticated }: TeacherAttendanceLandingPageProps) {
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
      const result = await resolveTeacherAttendanceAccess(username, password);
      if (result.error || !result.record) {
        setError(result.error || 'Unable to sign in to teacher attendance.');
        return;
      }

      storeTeacherAttendanceAccess(result.record);
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
            searchId="teacher-attendance-landing-search"
            searchLabel="Search teacher attendance portal"
            searchPlaceholder="Keywords"
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            onSearchSubmit={(event) => event.preventDefault()}
          />
          <nav className="kit-nav" aria-label="Teacher attendance landing sections">
            <div className="kit-nav__grid">
              <Link className="kit-nav__link" to="/">
                Access
              </Link>
              <a className="kit-nav__link kit-nav__link--active" href="#teacher-attendance-login-title">
                Teacher Access
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
              title="Teacher Attendance Portal"
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
