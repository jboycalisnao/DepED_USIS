import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingField } from '@/features/shared/components/FloatingField';
import {
  getStoredCoordinatorAccess,
  resolveCoordinatorAccess,
  storeCoordinatorAccess,
} from '../utils/coordinatorAccess';

export function LoginPage() {
  const navigate = useNavigate();
  const existingAccess = getStoredCoordinatorAccess();
  const [schoolId, setSchoolId] = useState(existingAccess?.schoolId || '123456');
  const [username, setUsername] = useState('election.coordinator');
  const [password, setPassword] = useState('Usis2026!');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await resolveCoordinatorAccess(schoolId, username, password);

      if (result.error || !result.record) {
        setError(result.error || 'Unable to continue to the coordinator workspace.');
        return;
      }

      storeCoordinatorAccess(result.record);
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

        <form className="login-form" onSubmit={handleSubmit}>
          <FloatingField
            id="coordinator-school-id"
            label="School ID"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={schoolId}
            onChange={(event) => setSchoolId(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />

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
      </div>
    </section>
  );
}
