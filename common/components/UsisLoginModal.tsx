import React, { useState } from 'react';
import usisIcon from '../assets/USIS_Icon.png';

type UsisLoginModalProps = {
  title: string;
  username: string;
  password: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function UsisLoginModal({
  title,
  username,
  password,
  isSubmitting = false,
  submitLabel = 'Login',
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: UsisLoginModalProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <section className="usis-login-modal" aria-labelledby="usis-login-title">
      <div className="usis-login-modal__card">
        <div className="usis-login-modal__stripe" aria-hidden="true">
          <span className="usis-login-modal__stripe-blue" />
          <span className="usis-login-modal__stripe-red" />
          <span className="usis-login-modal__stripe-yellow" />
        </div>
        <header className="usis-login-modal__header">
          <img className="usis-login-modal__logo" src={usisIcon} alt="USIS logo" />
          <h2 id="usis-login-title">{title}</h2>
        </header>

        <form className="usis-login-modal__form" onSubmit={onSubmit}>
          <label className="floating-field">
            <div className="floating-field__control">
              <input
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
                type="text"
                name="username"
                autoComplete="username"
                required
                placeholder=" "
              />
              <span>Username</span>
            </div>
          </label>

          <label className="floating-field">
            <div className="floating-field__control">
              <input
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                type={isPasswordVisible ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                placeholder=" "
                className="floating-field__input--password"
              />
              <span>Password</span>
              <button
                type="button"
                className="floating-field__password-toggle"
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                onClick={() => setIsPasswordVisible((visible) => !visible)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="floating-field__password-icon">
                  {isPasswordVisible ? (
                    <>
                      <path d="M3 5l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M10.6 6.5A10.7 10.7 0 0 1 12 6.4c5.2 0 9 5.6 9 5.6a17.2 17.2 0 0 1-3.4 3.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14.1 14.2A3 3 0 0 1 9.8 9.9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6.2 9A17.1 17.1 0 0 0 3 12s3.8 5.6 9 5.6c1.1 0 2.1-.2 3.1-.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                  ) : (
                    <>
                      <path d="M1.8 12s4-5.8 10.2-5.8S22.2 12 22.2 12 18.2 17.8 12 17.8 1.8 12 1.8 12Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </label>

          <button type="submit" className="primary-button usis-login-modal__submit" disabled={isSubmitting}>
            {isSubmitting ? 'Checking Access' : submitLabel}
          </button>
        </form>
      </div>
    </section>
  );
}
