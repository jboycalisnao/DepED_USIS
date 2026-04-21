import React, { useRef, useEffect } from 'react';
import { DEPED_LOGO_URL, DEPED_SEAL_URL, LEON_NHS_LOGO_URL } from '../constants';
import { ElectionConfig, ElectionStatus } from '../types';

interface LoginProps {
  studentId: string;
  setStudentId: (id: string) => void;
  onLogin: (e?: React.FormEvent) => void;
  isLoadingLearners: boolean;
  fetchProgress: number;
  config: ElectionConfig;
}

const Login: React.FC<LoginProps> = ({ 
  studentId, 
  setStudentId, 
  onLogin, 
  isLoadingLearners, 
  fetchProgress,
  config
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

  // Automatic Redirection Logic: Trigger login immediately once 12 digits are reached
  useEffect(() => {
    const isNumericLRN = /^\d{12}$/.test(studentId);
    if (isNumericLRN && !isLoadingLearners && isOpen) {
      // Small timeout to ensure the state is fully applied before we redirect
      const timer = setTimeout(() => {
        onLogin(); // Call handler directly for faster, zero-click response
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [studentId, isLoadingLearners, isOpen, onLogin]);

  const handleClearCache = () => {
    if (confirm("Reset local system memory? This will clear cached voter lists and force a fresh sync with the cloud.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const getStatusMessage = () => {
    if (config.status === ElectionStatus.MANUAL_CLOSED) return "The election portal is currently closed by the administrator.";
    if (config.status === ElectionStatus.SCHEDULED) {
      const now = new Date().getTime();
      const start = config.startTime ? new Date(config.startTime).getTime() : 0;
      if (now < start) {
        return `Voting scheduled to begin on ${new Date(config.startTime!).toLocaleString()}.`;
      }
      return "The scheduled voting period has ended.";
    }
    return "Elections are not yet active.";
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-4 overflow-hidden bg-[#f8fafc]">
      <div className="bg-white rounded-[2rem] shadow-[0_15px_40px_rgba(0,0,0,0.08)] max-w-sm w-full overflow-hidden border border-gray-100 flex flex-col transform transition-all duration-300">
        <div className="bg-gradient-to-b from-blue-50 to-white p-5 sm:p-6 text-center border-b border-gray-50">
          <div className="flex justify-center items-center space-x-5 mb-3 sm:mb-4">
            <img src={DEPED_SEAL_URL} className="h-10 sm:h-12 w-auto drop-shadow-sm" alt="DepEd Seal" />
            <div className="h-8 sm:h-10 w-px bg-blue-100"></div>
            <img src={LEON_NHS_LOGO_URL} className="h-14 sm:h-16 w-auto drop-shadow-md" alt="Institution Seal" />
          </div>
          <div className="mb-1.5">
            <img src={DEPED_LOGO_URL} className="h-4 sm:h-5 w-auto mx-auto mb-1.5 opacity-80" alt="DepEd Logo" />
          </div>
          <h2 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight leading-none mb-1">
            {config.schoolName || 'Leon National High School'}
          </h2>
          <p className="text-[8px] sm:text-[9px] font-bold text-[#034F8B] uppercase tracking-[0.2em]">Digital Election Portal</p>
        </div>
        
        <div className="p-5 sm:p-6 flex-grow">
          {isOpen ? (
            <form ref={formRef} onSubmit={onLogin} className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-[8px] sm:text-[9px] font-black text-[#034F8B] uppercase tracking-[0.2em] mb-1.5 sm:mb-2 text-left">Learner Reference Number (LRN)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-blue-200">
                    <i className="fa-solid fa-user-graduate text-base"></i>
                  </span>
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
                    placeholder={isLoadingLearners ? `Syncing... ${fetchProgress}%` : "12-DIGIT LRN"}
                    disabled={isLoadingLearners}
                    className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#011a2e] border-2 border-[#034F8B] rounded-xl focus:ring-4 focus:ring-red-500/20 focus:border-[#E11C38] outline-none transition-all font-black text-sm sm:text-base text-white placeholder:text-blue-300/30 uppercase tracking-[0.1em] disabled:opacity-50 shadow-inner"
                  />
                </div>
                {isLoadingLearners && (
                  <div className="mt-2 w-full bg-gray-100 rounded-full h-1 overflow-hidden border border-gray-200">
                    <div 
                      className="bg-[#E11C38] h-full transition-all duration-300 shadow-[0_0_8px_rgba(225,28,56,0.4)]" 
                      style={{ width: `${fetchProgress}%` }}
                    ></div>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={isLoadingLearners}
                className="w-full bg-[#E11C38] text-white py-2.5 sm:py-3 px-4 rounded-xl font-black text-sm sm:text-base hover:bg-red-700 transform transition-all active:scale-95 shadow-lg shadow-red-900/10 flex items-center justify-center space-x-2.5 group disabled:bg-gray-400 uppercase tracking-widest"
              >
                {isLoadingLearners ? (
                  <>
                    <i className="fa-solid fa-circle-notch animate-spin text-xs"></i>
                    <span className="text-xs">Syncing...</span>
                  </>
                ) : (
                  <>
                    <span>Login to Ballot</span>
                    <i className="fa-solid fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-2 sm:py-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-lock text-lg text-red-500"></i>
              </div>
              <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-tight mb-1">Portal Access Suspended</h3>
              <p className="text-[9px] text-gray-500 font-medium leading-relaxed px-2">
                {getStatusMessage()}
              </p>
            </div>
          )}
          
          <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4 px-1">
            <p className="text-[7px] text-gray-400 font-bold uppercase tracking-[0.2em] flex items-center">
              <i className="fa-solid fa-shield-halved mr-1.5 text-green-500"></i>
              Verified Session
            </p>
            <button 
              type="button"
              onClick={handleClearCache}
              className="text-[7px] text-gray-300 hover:text-red-400 font-black uppercase tracking-[0.1em] transition-colors"
            >
              Reset Cache <i className="fa-solid fa-trash-can ml-1"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;