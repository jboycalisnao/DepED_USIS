import React from 'react';
import { User } from '../types';
import { LEON_NHS_LOGO_URL, DEPED_SEAL_URL } from '../constants';

interface IdentityConfirmationProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
}

const IdentityConfirmation: React.FC<IdentityConfirmationProps> = ({ user, onConfirm, onCancel }) => {
  const middleInitial = user.middleName ? ` ${user.middleName.charAt(0)}.` : '';
  const displayName = user.firstName 
    ? `${user.firstName}${middleInitial} ${user.lastName}` 
    : user.name;

  const isSpecialized = user.strand === 'STE' || user.strand === 'SPA';
  const categoryLabel = user.strand === 'STE' ? 'Special Science Program (STE)' : 
                        user.strand === 'SPA' ? 'Special Program in the Arts (SPA)' : 
                        'Regular Program';

  return (
    <div className="flex-grow flex items-center justify-center px-4 py-4 md:py-8 overflow-hidden bg-[#f8fafc]">
      <div className="bg-white rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.15)] max-w-4xl w-full overflow-hidden border border-gray-100 flex flex-col md:flex-row min-h-[400px] animate-in fade-in zoom-in-95 duration-500">
        
        {/* Left Side: Verification Status */}
        <div className="w-full md:w-2/5 bg-[#034F8B] p-10 text-center text-white relative flex flex-col justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
             <img src={LEON_NHS_LOGO_URL} className="w-4/5 h-auto grayscale brightness-200 rotate-12" alt="" />
          </div>
          
          <img 
            src={LEON_NHS_LOGO_URL} 
            className="h-24 w-auto mx-auto mb-6 drop-shadow-[0_10px_10px_rgba(0,0,0,0.3)] relative z-10" 
            alt="Leon NHS Seal" 
          />
          <h2 className="text-xl font-black text-white uppercase tracking-[0.2em] relative z-10 leading-tight">Verification Profile</h2>
          <div className="flex justify-center mt-4 relative z-10">
            <span className="bg-[#E11C38] text-white px-5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-lg border border-white/10">
              Syncing Record...
            </span>
          </div>
          <div className="mt-8 relative z-10 flex justify-center items-center space-x-2">
            <img src={DEPED_SEAL_URL} className="h-8 w-auto opacity-50" alt="DepEd" />
          </div>
        </div>

        {/* Right Side: Identity Details & Actions */}
        <div className="w-full md:w-3/5 p-8 md:p-10 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-[1.5rem] p-6 border border-gray-100 shadow-inner relative group overflow-hidden">
              <div className="absolute top-4 right-4 text-blue-100 group-hover:text-[#034F8B]/5 transition-colors">
                <i className="fa-solid fa-fingerprint text-5xl"></i>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Authenticated Learner</p>
                  <h3 className="text-2xl font-black text-gray-900 leading-tight uppercase">{displayName}</h3>
                </div>
                
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Official LRN</p>
                  <p className="text-base font-mono font-black text-[#034F8B] tracking-[0.2em] bg-white inline-block px-3 py-1 rounded-lg border border-blue-50 shadow-sm">
                    {user.studentId}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 flex items-center space-x-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#034F8B] shadow-sm">
                  <i className="fa-solid fa-graduation-cap text-xs"></i>
                </div>
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Grade & Section</p>
                  <p className="text-xs font-black text-[#034F8B] uppercase">{user.gradeLevel} - {user.sectionName || 'N/A'}</p>
                </div>
              </div>
              
              <div className={`p-4 rounded-xl border flex items-center space-x-4 ${isSpecialized ? 'bg-[#fcd116]/10 border-[#fcd116]/30' : 'bg-blue-50/30 border-blue-100'}`}>
                <div className={`w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm ${isSpecialized ? 'text-amber-600' : 'text-[#034F8B]'}`}>
                  <i className={`fa-solid ${isSpecialized ? 'fa-star' : 'fa-id-card-clip'} text-xs`}></i>
                </div>
                <div>
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Voter Category</p>
                  <p className={`text-xs font-black uppercase ${isSpecialized ? 'text-amber-700' : 'text-[#034F8B]'}`}>
                    {categoryLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 space-y-4">
             <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex items-start space-x-3">
              <i className="fa-solid fa-shield-halved text-[#E11C38] mt-1 text-xs"></i>
              <p className="text-[9px] font-bold text-red-800 leading-relaxed uppercase tracking-tight">
                By clicking proceed, you declare that the profile above is your own. Intentional misidentification is subject to school disciplinary action.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                className="w-full bg-[#E11C38] text-white py-4 rounded-2xl font-black text-base hover:bg-red-700 transform transition-all active:scale-95 shadow-xl shadow-red-900/20 flex items-center justify-center group uppercase tracking-widest border-b-4 border-red-900"
              >
                <span>Access Digital Ballot</span>
                <i className="fa-solid fa-arrow-right-long ml-4 group-hover:translate-x-1 transition-transform"></i>
              </button>
              <button
                onClick={onCancel}
                className="w-full py-1 font-black text-[9px] text-gray-400 hover:text-red-500 transition-colors uppercase tracking-[0.3em] flex items-center justify-center"
              >
                <i className="fa-solid fa-arrow-left mr-2"></i>
                Not me? Logout
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default IdentityConfirmation;