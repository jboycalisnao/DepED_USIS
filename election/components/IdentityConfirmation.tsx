import React, { useEffect } from 'react';
import { User } from '../types';
import usisIcon from '../../common/assets/USIS_Icon.png';

interface IdentityConfirmationProps {
  user: User;
  onConfirm: () => void;
  onCancel: () => void;
}

const IdentityConfirmation: React.FC<IdentityConfirmationProps> = ({ user, onConfirm, onCancel }) => {
  useEffect(() => {
    const handleEnterToContinue = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.code === 'NumpadEnter') {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleEnterToContinue);
    return () => window.removeEventListener('keydown', handleEnterToContinue);
  }, [onConfirm]);

  const middleInitial = user.middleName ? ` ${user.middleName.charAt(0)}.` : '';
  const displayName = user.firstName 
    ? `${user.firstName}${middleInitial} ${user.lastName}` 
    : user.name;

  const isSpecialized = user.strand === 'STE' || user.strand === 'SPA';
  const categoryLabel = user.strand === 'STE' ? 'Special Science Program (STE)' : 
                        user.strand === 'SPA' ? 'Special Program in the Arts (SPA)' : 
                        'Regular Program';

  return (
    <div className="flex w-full flex-1 items-center justify-center bg-[#f8fafc] px-4 py-4 md:px-6">
      <div className="mx-auto w-full max-w-[1180px] rounded-[12px] border border-[#d7deea] bg-white shadow-[0_16px_40px_-24px_rgba(15,23,42,0.2)] animate-in fade-in zoom-in-95 duration-300">
        <div className="overflow-hidden rounded-t-[12px]" aria-hidden="true">
          <div className="h-[4px] bg-[#0038a8]" />
          <div className="h-[4px] bg-[#fcd116]" />
          <div className="h-[4px] bg-[#ce1126]" />
        </div>
        <div className="border-b border-[#d7deea] px-6 py-5 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <img src={usisIcon} className="h-[64px] w-[64px] object-contain" alt="USIS icon" />
              <div>
                <p className="text-[13px] font-semibold text-[#5f718b]">Verification Profile</p>
                <h2 className="mt-1 text-[24px] font-bold leading-none text-[#1f2f4a]">Identity Confirmation</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6 md:px-8 md:py-8">
          <div className="rounded-[12px] border border-[#d7deea] bg-[#f9fbff] p-5 md:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#5f718b]">Authenticated Learner</p>
                  <h3 className="mt-2 text-[24px] font-bold leading-tight text-[#1f2f4a]">{displayName}</h3>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#5f718b]">Official LRN</p>
                  <p className="mt-2 inline-flex rounded-[12px] border border-[#b9c9df] bg-white px-4 py-2 font-mono text-[16px] font-bold text-[#0038a8]">
                    {user.studentId}
                  </p>
                </div>
              </div>
              <div className="flex h-[56px] w-[56px] items-center justify-center rounded-[12px] bg-[#eaf1ff] text-[#0038a8]">
                <i className="fa-solid fa-fingerprint text-[24px]"></i>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-[12px] border border-[#d7deea] bg-[#fdfefe] p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] border border-[#c8d6ea] bg-white text-[#0038a8]">
                  <i className="fa-solid fa-graduation-cap text-[16px]"></i>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#5f718b]">Grade & Section</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#0038a8]">{user.gradeLevel} - {user.sectionName || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[12px] border border-[#d7deea] bg-[#fffdf5] p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px] border border-[#f3dc8f] bg-white text-[#b07a00]">
                  <i className={`fa-solid ${isSpecialized ? 'fa-star' : 'fa-id-card-clip'} text-[16px]`}></i>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[#5f718b]">Voter Category</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#8b6500]">{categoryLabel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#f1c5cb] bg-[#fff8f8] p-4">
            <div className="flex items-start gap-3">
              <i className="fa-solid fa-shield-halved mt-[2px] text-[16px] text-[#E11C38]"></i>
              <p className="text-[13px] font-bold leading-6 text-[#a62b37]">
                By clicking proceed, you declare that the profile above is your own. Intentional misidentification is subject to school disciplinary action.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#d7deea] px-6 py-5 md:flex-row md:justify-end md:px-8">
          <button
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-[12px] border border-[#d7deea] bg-white px-5 py-3 text-[13px] font-semibold text-[#5d6f8a] transition-colors hover:border-[#c6d2e2] hover:text-[#1f2f4a]"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Not Me? Logout
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-[12px] bg-[#E11C38] px-5 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#c91833]"
          >
            <span>Access Digital Ballot</span>
            <i className="fa-solid fa-arrow-right-long ml-3"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdentityConfirmation;
