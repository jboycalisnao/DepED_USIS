
import React from 'react';
import { DEPED_LOGO_URL, DEPED_SEAL_URL, LEON_NHS_LOGO_URL, ELECTION_TITLE } from '../constants';
import { getCachedImage } from '../utils/imagePersistence';

interface HeaderProps {
  onLogout?: () => void;
  currentUser?: string | null;
  onAdminClick?: () => void;
  schoolName?: string;
  electionYear?: string;
}

const Header: React.FC<HeaderProps> = ({ onLogout, currentUser, onAdminClick, schoolName, electionYear }) => {
  const isAdmin = currentUser === 'System Administrator';

  const handleAdminIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onAdminClick) onAdminClick();
  };

  const depedSeal = getCachedImage('deped_seal', DEPED_SEAL_URL);
  const leonNhsLogo = getCachedImage('leon_nhs_logo', LEON_NHS_LOGO_URL);
  const depedLogo = getCachedImage('deped_logo', DEPED_LOGO_URL);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <img 
                src={depedSeal} 
                alt="DepEd Seal" 
                className="h-14 w-auto object-contain" 
              />
              <img 
                src={leonNhsLogo} 
                alt="Institution Seal" 
                className="h-14 w-auto object-contain" 
              />
              <div className="h-10 w-px bg-gray-200 hidden sm:block"></div>
              <img 
                src={depedLogo} 
                alt="DepEd Logo" 
                className="h-12 w-auto object-contain hidden lg:block" 
              />
            </div>
            <div className="hidden lg:block pl-2">
              <h1 className="text-lg font-bold text-[#034F8B] leading-tight uppercase tracking-tight">
                {schoolName || 'Leon National High School'}
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-[#E11C38] uppercase">
                {ELECTION_TITLE}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {currentUser && (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <p className="text-[10px] uppercase text-gray-400 font-bold tracking-tighter">
                    {isAdmin ? 'Management' : 'Authorized Voter'}
                  </p>
                  <span className={`text-sm font-bold ${isAdmin ? 'text-[#034F8B]' : 'text-gray-800'}`}>
                    {currentUser}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-lg text-white bg-[#E11C38] hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all shadow-sm"
                >
                  <i className="fa-solid fa-right-from-bracket mr-2"></i>
                  Sign Out
                </button>
              </div>
            )}
            {!currentUser && (
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-end">
                  <span className="text-[#034F8B] font-black text-sm uppercase">SY {electionYear || '----'}</span>
                  <span className="text-[11px] text-[#034F8B]/60 font-black uppercase tracking-[0.15em]">Election Portal</span>
                </div>
                <button 
                  onClick={handleAdminIconClick}
                  type="button"
                  title="Admin Dashboard Access"
                  className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 shadow-inner group transition-all hover:bg-blue-600 hover:border-blue-700 active:scale-95 cursor-pointer flex items-center justify-center"
                >
                  <i className="fa-solid fa-user-shield text-[#034F8B] text-xl opacity-80 group-hover:opacity-100 group-hover:text-white transition-colors"></i>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="h-1 bg-gradient-to-r from-[#034F8B] via-[#fcd116] to-[#E11C38]"></div>
    </header>
  );
};

export default Header;
