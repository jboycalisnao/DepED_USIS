import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UsisLoginModal } from '../../common/components/UsisLoginModal';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (u: string, p: string) => boolean | Promise<boolean>;
  schoolName?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, schoolName }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await Promise.resolve(onLogin(username, password));
      if (success) {
        setUsername('');
        setPassword('');
        onClose();
      } else {
        setError('Incorrect username or password.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high" role="presentation">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-shell modal-shell--compact" role="dialog" aria-modal="true" aria-label="Cashier login">
        <UsisLoginModal
          title={schoolName ? `${schoolName} SPTA Portal` : 'SPTA Portal'}
          username={username}
          password={password}
          isSubmitting={isLoading}
          noticeTitle="Login Failed"
          noticeMessage={error}
          onDismissNotice={() => setError(null)}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
        />
      </div>
    </div>,
    document.body
  );
};
