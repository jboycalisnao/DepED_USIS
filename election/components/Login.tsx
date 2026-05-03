import React, { useRef } from 'react';
import userIcon from '../../common/assets/User_Icon.png';
import { ElectionConfig, ElectionStatus } from '../types';

interface LoginProps {
  studentId: string;
  setStudentId: (id: string) => void;
  electionCode: string;
  setElectionCode: (value: string) => void;
  showElectionCodeField: boolean;
  activeElectionCode: string;
  onLogin: (e?: React.FormEvent) => void;
  isLoadingLearners: boolean;
  fetchProgress: number;
  config: ElectionConfig;
}

const Login: React.FC<LoginProps> = ({
  studentId,
  setStudentId,
  electionCode,
  setElectionCode,
  showElectionCodeField,
  activeElectionCode,
  onLogin,
  isLoadingLearners,
  fetchProgress,
  config,
}) => {
  const formRef = useRef<HTMLFormElement>(null);

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
      <div className="mx-auto w-[min(1180px,calc(100%-32px))] px-[28px] py-10 md:py-14">
        <div className="mx-auto flex max-w-[980px] flex-col items-center text-center">
          <div className="w-full">
            <p className="m-0 text-[16px] font-normal leading-[1.25] text-black">
              Welcome to the DepED - Unified School Information System!
            </p>
            <h1 className="mt-2 mb-0 text-[24px] font-black uppercase leading-[1.05] tracking-[-0.03em] text-[#0038a8]">
              Learner Government Election Portal
            </h1>
            <p className="mt-1 mb-0 text-[24px] font-black uppercase leading-none text-[#ce1126]">
              Module
            </p>
          </div>

          <div className="mt-12 flex w-full flex-col items-center">
            <img
              src={userIcon}
              alt="User sign-in icon"
              className="h-[50px] w-[50px] object-contain"
            />

            {isOpen ? (
              <>
                <p className="mt-6 mb-0 text-[24px] font-black leading-[1.15] tracking-[-0.03em] text-black">
                  Please sign in to continue with voting:
                </p>

                <form
                  ref={formRef}
                  onSubmit={onLogin}
                  className="mt-7 flex w-full flex-col items-center"
                >
                  <label className="relative block w-full max-w-[720px] text-left">
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      autoFocus
                      value={studentId}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.toLowerCase() === 'admin' || /^\d*$/.test(val)) {
                          setStudentId(val.slice(0, 12));
                        }
                      }}
                      placeholder=" "
                      disabled={isLoadingLearners}
                      className="peer w-full rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white px-6 pt-8 pb-4 text-[16px] text-[#12233d] outline-none transition-all duration-200 placeholder:text-transparent focus:border-[rgba(0,56,168,0.44)] focus:shadow-[0_0_0_4px_rgba(0,56,168,0.08)] disabled:opacity-60"
                    />
                    <span className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-[13px] font-bold uppercase tracking-[0.08em] text-[#8a8a8a] transition-all duration-200 peer-focus:top-4 peer-focus:translate-y-0 peer-focus:text-[13px] peer-focus:text-[#0038a8] peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[13px] peer-[:not(:placeholder-shown)]:text-[#68758d]">
                      {isLoadingLearners ? `Syncing... ${fetchProgress}%` : 'Learner Reference Number (LRN)'}
                    </span>
                  </label>

                  {showElectionCodeField && (
                    <label className="relative mt-4 block w-full max-w-[720px] text-left">
                      <input
                        type="text"
                        required
                        value={electionCode}
                        onChange={(e) => setElectionCode(e.target.value.toUpperCase())}
                        placeholder=" "
                        disabled={isLoadingLearners}
                        className="peer w-full rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white px-6 pt-8 pb-4 text-[16px] uppercase text-[#12233d] outline-none transition-all duration-200 placeholder:text-transparent focus:border-[rgba(0,56,168,0.44)] focus:shadow-[0_0_0_4px_rgba(0,56,168,0.08)] disabled:opacity-60"
                      />
                      <span className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-[13px] font-bold uppercase tracking-[0.08em] text-[#8a8a8a] transition-all duration-200 peer-focus:top-4 peer-focus:translate-y-0 peer-focus:text-[13px] peer-focus:text-[#0038a8] peer-[:not(:placeholder-shown)]:top-4 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-[13px] peer-[:not(:placeholder-shown)]:text-[#68758d]">
                        Election Code
                      </span>
                    </label>
                  )}

                  {isLoadingLearners && (
                    <div className="mt-4 w-full max-w-[720px] rounded-full border border-[rgba(18,35,61,0.12)] bg-white p-1">
                      <div
                        className="h-2 rounded-full bg-[#0038a8] transition-all duration-300"
                        style={{ width: `${fetchProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="mt-5 w-full max-w-[720px] text-right">
                    <button
                      type="submit"
                      disabled={!studentId || (showElectionCodeField && !electionCode)}
                      className="rounded-[4px] bg-[#0038a8] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#002f8a] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Continue
                    </button>
                  </div>
                </form>

                <p className="mt-8 mb-0 max-w-[1100px] text-[13px] leading-[1.4] text-[#68758d]">
                  {showElectionCodeField
                    ? `Enter the active election code to continue. Current active code: ${activeElectionCode || 'Not yet generated'}.`
                    : 'Enter the 12-digit LRN. Once the learner is found in the registry, the election code field will appear before you proceed.'}
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
