import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import usisIcon from '../assets/USIS_Icon.png';
import { supabase } from '@deped-usis/shared-supabase';

type UsisLoginModalProps = {
  title: string;
  username: string;
  password: string;
  usernameLabel?: string;
  passwordLabel?: string;
  usernameInputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  passwordInputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  usernameAutoComplete?: string;
  passwordAutoComplete?: string;
  isSubmitting?: boolean;
  submitLabel?: string;
  noticeMessage?: string | null;
  noticeTitle?: string;
  helperContent?: React.ReactNode;
  moduleKey?: string;
  onDismissNotice?: () => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function UsisLoginModal({
  title,
  username,
  password,
  usernameLabel = 'Username',
  passwordLabel = 'Password',
  usernameInputMode,
  passwordInputMode,
  usernameAutoComplete = 'username',
  passwordAutoComplete = 'current-password',
  isSubmitting = false,
  noticeMessage = null,
  noticeTitle = 'Login Notice',
  helperContent,
  moduleKey,
  onDismissNotice,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: UsisLoginModalProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isPortalBlocked, setIsPortalBlocked] = useState(false);
  const canUsePortal = typeof document !== 'undefined' && !!document.body;

  React.useEffect(() => {
    let isMounted = true;
    const loadGateState = async () => {
      if (!moduleKey) {
        if (isMounted) setIsPortalBlocked(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('ia_portal_controls')
          .select('is_enabled,mode')
          .eq('module_key', moduleKey)
          .limit(1)
          .maybeSingle();
        if (!isMounted || error || !data) return;
        const isBlocked = Boolean(data.is_enabled && data.mode !== 'live');
        setIsPortalBlocked(isBlocked);
      } catch {
        if (isMounted) setIsPortalBlocked(false);
      }
    };
    void loadGateState();
    return () => {
      isMounted = false;
    };
  }, [moduleKey]);

  const isFormDisabled = isSubmitting || isPortalBlocked;

  return (
    <section className="usis-login-modal" aria-labelledby="usis-login-title">
      <div className="usis-login-modal__card rounded-md">
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
                autoComplete={usernameAutoComplete}
                inputMode={usernameInputMode}
                disabled={isFormDisabled}
                required
                placeholder=" "
              />
              <span>{usernameLabel}</span>
            </div>
          </label>

          <label className="floating-field">
            <div className="floating-field__control">
              <input
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                type={isPasswordVisible ? 'text' : 'password'}
                name="password"
                autoComplete={passwordAutoComplete}
                inputMode={passwordInputMode}
                disabled={isFormDisabled}
                required
                placeholder=" "
                className="floating-field__input--password"
              />
              <span>{passwordLabel}</span>
              <button
                type="button"
                className="floating-field__password-toggle"
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                disabled={isFormDisabled}
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

          <button type="submit" className="primary-button usis-login-modal__submit" disabled={isFormDisabled}>
            {isSubmitting ? 'Logging In...' : 'Login'}
          </button>
          {isPortalBlocked ? (
            <p className="usis-login-modal__helper">Login is temporarily disabled while this portal is unavailable.</p>
          ) : null}
          {helperContent ? <div className="usis-login-modal__helper">{helperContent}</div> : null}
        </form>
      </div>

      {noticeMessage && canUsePortal
        ? createPortal(
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={onDismissNotice} />
          <div className="alert-modal alert-modal--danger usis-login-modal__notice rounded-md" role="dialog" aria-modal="true" aria-label={noticeTitle}>
            <div className="alert-modal__content">
              <h3>{noticeTitle}</h3>
              <p>{noticeMessage}</p>
            </div>
            <div className="alert-modal__actions">
              <button type="button" className="alert-modal__blue" onClick={onDismissNotice}>
                OK
              </button>
            </div>
          </div>
        </div>
          ,
          document.body
        )
        : null}
    </section>
  );
}
