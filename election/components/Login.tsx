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

  const handleClearCache = () => {
    if (confirm('Reset local system memory? This will clear cached voter lists and force a fresh sync with the cloud.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const getStatusMessage = () => {
    if (config.status === ElectionStatus.MANUAL_CLOSED) {
      return 'The election portal is currently closed by the administrator.';
    }

    if (config.status === ElectionStatus.SCHEDULED) {
      const now = new Date().getTime();
      const start = config.startTime ? new Date(config.startTime).getTime() : 0;
      if (now < start) {
        return `Voting scheduled to begin on ${new Date(config.startTime!).toLocaleString()}.`;
      }
      return 'The scheduled voting period has ended.';
    }

    return 'Elections are not yet active.';
  };

  return (
    <section className="flex-grow bg-[#f8fafc]">
      <div className="w-full px-[var(--page-inset)] py-4 md:py-6">
        <div className="mx-auto flex w-full max-w-[980px] flex-col items-center text-center">
          <div className="mb-4 flex w-full max-w-[720px] items-center justify-center rounded-[12px] border border-[rgba(18,35,61,0.12)] bg-white px-6 py-5 text-center shadow-[0_10px_24px_rgba(18,35,61,0.06)]">
            <h2 className="m-0 text-[24px] font-black uppercase tracking-[-0.03em] text-[#0038a8]">
              {config.electionName || 'Learner Government Election'}
            </h2>
          </div>

          <div className="mt-2 flex w-full flex-col items-center">
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
              <div className="mt-8 w-full max-w-[720px] rounded-[12px] border border-[rgba(18,35,61,0.12)] bg-white px-8 py-10 text-center shadow-[0_18px_36px_rgba(18,35,61,0.08)]">
                <p className="m-0 text-[13px] font-bold uppercase tracking-[0.14em] text-[#8a8a8a]">
                  Portal Status
                </p>
                <h2 className="mt-3 mb-0 text-[24px] font-black uppercase tracking-[-0.03em] text-[#12233d]">
                  Portal Access Suspended
                </h2>
                <p className="mt-4 mb-0 text-[16px] leading-[1.5] text-[#68758d]">
                  {getStatusMessage()}
                </p>
              </div>
            )}

            <div className="mt-10 flex w-full max-w-[720px] items-center justify-between gap-4 border-t border-[rgba(18,35,61,0.12)] pt-5">
              <div />
              <button
                type="button"
                onClick={handleClearCache}
                className="rounded-[4px] border border-[rgba(18,35,61,0.12)] bg-white px-4 py-2 text-[13px] font-bold uppercase tracking-[0.08em] text-[#68758d] transition-colors hover:border-[#ce1126] hover:text-[#ce1126]"
              >
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;
