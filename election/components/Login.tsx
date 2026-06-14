import React from 'react';
import { UsisLoginModal } from '../../common/components/UsisLoginModal';
import { ElectionConfig, ElectionStatus } from '../types';

interface LoginProps {
  username: string;
  setUsername: (id: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onLogin: (e?: React.FormEvent) => void;
  isLoadingLearners: boolean;
  fetchProgress: number;
  config: ElectionConfig;
}

const Login: React.FC<LoginProps> = ({
  username,
  setUsername,
  password,
  setPassword,
  onLogin,
  isLoadingLearners,
  fetchProgress,
  config,
}) => {
  const isCurrentlyOpen = () => {
    if (config.status === ElectionStatus.MANUAL_OPEN) return true;
    if (config.status === ElectionStatus.MANUAL_CLOSED) return false;

    if (config.status === ElectionStatus.SCHEDULED) {
      const now = new Date().getTime();
      const start = config.startTime ? new Date(config.startTime).getTime() : 0;
      const end = config.endTime ? new Date(config.endTime).getTime() : Infinity;
      return now >= start && now <= end;
    }

    return false;
  };

  const isOpen = isCurrentlyOpen();

  return (
    <section className="flex-grow bg-[#f8fafc]">
      <div className="w-full px-[var(--page-inset)] py-4 md:py-6">
        <div className="mx-auto flex w-full max-w-[980px] flex-col items-center justify-center text-center">
          <div className="flex w-full flex-col items-center justify-center">
            {isOpen ? (
              <>
                <div className="w-full max-w-[720px]">
                  <UsisLoginModal
                    moduleKey="election"
                    title="Election Portal Access"
                    username={username}
                    password={password}
                    usernameLabel="LRN (Learner Reference Number)"
                    usernameInputMode="numeric"
                    passwordInputMode="text"
                    usernameAutoComplete="off"
                    passwordAutoComplete="off"
                    submitLabel="Login"
                    onUsernameChange={(val) => {
                      if (/^\d*$/.test(val)) {
                        setUsername(val.slice(0, 12));
                      }
                    }}
                    onPasswordChange={setPassword}
                    onSubmit={(event) => onLogin(event)}
                  />
                </div>

                {isLoadingLearners && (
                  <div className="mt-4 w-full max-w-[720px] rounded-full border border-[rgba(18,35,61,0.12)] bg-white p-1">
                    <div
                      className="h-2 rounded-full bg-[#0038a8] transition-all duration-300"
                      style={{ width: `${fetchProgress}%` }}
                    />
                  </div>
                )}

                <p className="mt-8 mb-0 max-w-[1100px] text-[13px] leading-[1.4] text-[#68758d]">
                  {config.allowedGradeLevel
                    ? `Access is limited to ${config.allowedGradeLevel} learners for this election cycle.`
                    : 'Enter your LRN and assigned password to continue.'}
                </p>
              </>
            ) : (
              <div className="modal-overlay modal-overlay--high" role="presentation">
                <div className="modal-backdrop" />
                <div className="modal-dialog modal-dialog--wide election-login-modal" role="dialog" aria-modal="true" aria-label="Portal status notice">
                  <div className="modal-dialog__header">
                    <div className="modal-dialog__title-group">
                      <p className="modal-dialog__eyebrow">Portal Status</p>
                      <h3>Portal Access Suspended</h3>
                    </div>
                  </div>
                  <div className="modal-dialog__body">
                    <div className="election-login-modal__notice">
                      <span className="material-symbols-outlined election-login-modal__icon" aria-hidden="true">
                        lock
                      </span>
                      <p>Election portal is temporarily closed.</p>
                      <p>
                        Stay tuned for further announcements or visit Leon NHS - LG Comea FB Page at this link{' '}
                        <a href="https://facebook.com/leonnhs.lgcomea" target="_blank" rel="noreferrer">
                          facebook.com/leonnhs.lgcomea
                        </a>
                        .
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
