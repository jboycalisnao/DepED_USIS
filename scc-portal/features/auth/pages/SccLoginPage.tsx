import React, { useState } from 'react';
import { UsisLoginModal } from '../../../../common/components/UsisLoginModal';
import { loginSccWithLearnerCredentials } from '../services/sccAuthService';
import type { SccSession } from '../../../types';

interface SccLoginPageProps {
  onLoginSuccess: (session: SccSession) => void;
}

export function SccLoginPage({ onLoginSuccess }: SccLoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorNotice('Please provide your 12-digit DepEd LRN and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorNotice(null);
      const session = await loginSccWithLearnerCredentials(username, password);
      onLoginSuccess(session);
    } catch (err: any) {
      setErrorNotice(err?.message || 'Login failed. Please check your learner credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="scc-login-container">
      <UsisLoginModal
        moduleKey="scc_portal"
        title="School Coordinating Council Portal"
        username={username}
        password={password}
        usernameLabel="LRN (Learner Reference Number)"
        usernameInputMode="numeric"
        usernamePattern="[0-9]{12}|[a-zA-Z0-9_]+"
        usernameMaxLength={12}
        usernameAutoComplete="off"
        passwordLabel="Password"
        submitLabel={isSubmitting ? 'Verifying Credentials...' : 'Sign In'}
        isSubmitting={isSubmitting}
        noticeMessage={errorNotice}
        noticeTitle="Authentication Notice"
        onDismissNotice={() => setErrorNotice(null)}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleSubmit}
        helperContent={
          <span className="scc-login-hint-text">
            Enter your official 12-digit DepEd Learner Reference Number (LRN) and school portal password. Access is restricted to learners tagged as club or organization officers in the Registrar Registry.
          </span>
        }
      />
    </div>
  );
}
