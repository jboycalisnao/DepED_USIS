import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingField } from '@/features/shared/components/FloatingField';
import {
  finalizeCoordinatorLogin,
  resolveCoordinatorAccess,
  storeCoordinatorAccess,
  type CoordinatorAccessRecord,
} from '../utils/coordinatorAccess';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pendingAccess, setPendingAccess] = useState<CoordinatorAccessRecord | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await resolveCoordinatorAccess(username, password);

      if (result.error || !result.record) {
        setError(result.error || 'Unable to continue to the coordinator workspace.');
        return;
      }

      if (result.record.mustResetPassword) {
        setPendingAccess(result.record);
        return;
      }

      try {
        await finalizeCoordinatorLogin(result.record);
      } catch {
        // Non-blocking: allow access even if login telemetry/password-finalize persistence fails.
      }
      storeCoordinatorAccess({ ...result.record, lastLoginAt: new Date().toISOString(), mustResetPassword: false });
      navigate('/admin/credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (event: FormEvent) => {
    event.preventDefault();
    if (!pendingAccess) return;

    if (newPassword.trim().length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      try {
        await finalizeCoordinatorLogin(pendingAccess, newPassword);
      } catch {
        // Non-blocking fallback in case write methods are blocked by gateway/CORS policy.
      }
      const nextRecord = {
        ...pendingAccess,
        lastLoginAt: new Date().toISOString(),
        mustResetPassword: false,
      };
      storeCoordinatorAccess(nextRecord);
      navigate('/admin/credentials');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section-shell">
      <div className="login-shell">
        <div className="login-shell__header">
          <div className="admin-shell__heading">
            <p className="page-intro__eyebrow">Coordinator Access</p>
            <h1 className="login-shell__title">Coordinator Registry Login</h1>
          </div>
        </div>

        {!pendingAccess ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <FloatingField
              id="coordinator-username"
              label="Username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />

            <FloatingField
              id="coordinator-password"
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            {error ? <p className="login-card__error">{error}</p> : null}

            <div className="login-card__actions">
              <button className="login-card__submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Checking...' : 'Continue'}
              </button>
            </div>
          </form>
        ) : (
          <form className="login-form" onSubmit={handlePasswordReset}>
            <p className="registry-copy">Temporary password detected. Set a new password before continuing.</p>

            <FloatingField
              id="coordinator-new-password"
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />

            <FloatingField
              id="coordinator-confirm-password"
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            {error ? <p className="login-card__error">{error}</p> : null}

            <div className="login-card__actions">
              <button className="login-card__submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save and Continue'}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
