import React from 'react';
import { Candidate, Position, User } from '../types';
import { POSITIONS, LEON_NHS_LOGO_URL, DEPED_SEAL_URL } from '../constants';
import { DEMO_LRN } from './DemoMode';

interface ConfirmationProps {
  candidates: Candidate[];
  selections: Record<string, string[]>;
  onLogout: () => void;
  user: User | null;
}

const Confirmation: React.FC<ConfirmationProps> = ({ candidates, selections, onLogout, user }) => {
  const isDemo = user?.studentId === DEMO_LRN;
  const timestamp = new Date().toLocaleString('en-PH', { 
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  const selectedPositions = POSITIONS.filter(pos => selections[pos] && selections[pos].length > 0);

  const getCandidateNames = (pos: string) => {
    const ids = selections[pos] || [];
    return ids.map(id => candidates.find(c => c.id === id)?.name).filter(Boolean).join(', ');
  };

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-4 md:py-8 bg-[#f8fafc]">
      <div className="bg-white rounded-[12px] shadow-sm max-w-5xl w-full overflow-hidden border border-[rgba(18,35,61,0.08)] flex flex-col md:flex-row min-h-[450px] animate-in fade-in zoom-in-95 duration-500">
        
        {/* Left Side: Identity & Branding */}
        <div className={`w-full md:w-2/5 p-8 text-white relative flex flex-col justify-between overflow-hidden ${isDemo ? 'bg-[#8a6a00]' : 'bg-[#0038a8]'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5 pointer-events-none transform translate-x-20 -translate-y-20">
            <img src={LEON_NHS_LOGO_URL} className="w-full h-full grayscale brightness-200" alt="" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-8">
              <img src={DEPED_SEAL_URL} className="h-12 w-auto" alt="DepEd" />
              <div className="h-8 w-px bg-white/20"></div>
              <img src={LEON_NHS_LOGO_URL} className="h-12 w-auto" alt="LNHS" />
            </div>
            
            <p className="text-[13px] font-bold text-white/70 uppercase tracking-[0.08em] mb-1">
              {isDemo ? 'Sandbox Simulation' : 'Official Submission'}
            </p>
            <h2 className="text-[24px] font-bold uppercase tracking-tight leading-none mb-6">
              {isDemo ? 'Demo Finalized' : 'Ballot Finalized'}
            </h2>
            
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div>
                <p className="text-[13px] font-bold text-white/70 uppercase tracking-[0.08em] mb-1">Voter Name</p>
                <h3 className="text-[24px] font-bold uppercase leading-tight">{user?.name}</h3>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-[13px] font-bold text-white/70 uppercase tracking-[0.08em] mb-1">LRN</p>
                  <p className="text-[13px] font-mono font-bold tracking-widest bg-white/10 px-2 py-1 rounded-[12px]">{user?.studentId}</p>
                </div>
                <div>
                  <p className="text-[13px] font-bold text-white/70 uppercase tracking-[0.08em] mb-1">Section</p>
                  <p className="text-[13px] font-bold uppercase">{user?.gradeLevel} - {user?.sectionName}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6">
            <div className="bg-white/5 p-3 rounded-[12px] border border-white/10 flex items-center space-x-3">
              <i className="fa-solid fa-clock text-white/60 text-[13px]"></i>
              <p className="text-[13px] font-bold text-white/90 uppercase tracking-tight">Timestamp: {timestamp}</p>
            </div>
          </div>
        </div>

        {/* Right Side: Ballot Summary & Logout */}
        <div className="w-full md:w-3/5 p-8 md:p-10 flex flex-col justify-between overflow-hidden">
          <div className="overflow-hidden flex flex-col flex-grow">
            <h4 className="text-[13px] font-bold text-[#68758d] mb-4 uppercase tracking-[0.08em] flex items-center">
              <i className={`fa-solid fa-list-check mr-2 ${isDemo ? 'text-amber-500' : 'text-[#034F8B]'}`}></i>
              Ballot Summary
            </h4>
            
            <div className="flex-grow overflow-y-auto pr-4 no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {selectedPositions.map(pos => (
                  <div key={pos} className="flex flex-col py-2 border-b border-gray-50">
                    <span className="text-[13px] font-bold text-[#68758d] uppercase tracking-[0.06em] mb-0.5">{pos}</span>
                    <span className={`text-[13px] font-bold uppercase truncate leading-tight ${isDemo ? 'text-[#8a6a00]' : 'text-[#0038a8]'}`}>
                      {getCandidateNames(pos)}
                    </span>
                  </div>
                ))}
                {selectedPositions.length === 0 && (
                  <div className="col-span-2 py-10 text-center italic text-[#98a2b3] text-[13px] font-bold uppercase border border-dashed border-[rgba(18,35,61,0.08)] rounded-[12px]">
                    Abstain (No Selections Made)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <div className={`p-4 rounded-[12px] flex items-start space-x-3 border ${isDemo ? 'bg-[#fff8db] border-[rgba(252,209,22,0.4)]' : 'bg-[#f4f8ff] border-[rgba(0,56,168,0.12)]'}`}>
              <i className={`fa-solid ${isDemo ? 'fa-triangle-exclamation text-[#8a6a00]' : 'fa-shield-halved text-[#0038a8]'} mt-0.5 text-[13px]`}></i>
              <p className={`text-[13px] font-bold leading-relaxed uppercase tracking-tight ${isDemo ? 'text-[#8a6a00]' : 'text-[#0038a8]'}`}>
                {isDemo 
                  ? 'DEMO MODE: This is a sandbox session. No information has been sent to the official servers.' 
                  : 'Your vote is securely recorded. For security, your session will be invalidated once you close this portal.'}
              </p>
            </div>
            
            <button
              onClick={onLogout}
              className={`w-full text-white py-4 rounded-[4px] font-bold text-[16px] uppercase transition-colors tracking-[0.06em] flex items-center justify-center group ${isDemo ? 'bg-[#8a6a00] hover:bg-[#715600]' : 'bg-[#ce1126] hover:bg-[#b10f21]'}`}
            >
              <span>{isDemo ? 'Exit Sandbox' : 'Close Session Safely'}</span>
              <i className={`fa-solid ${isDemo ? 'fa-door-open' : 'fa-power-off'} ml-3 group-hover:rotate-12 transition-transform`}></i>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Confirmation;
