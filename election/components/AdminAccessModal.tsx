
import React, { useState } from 'react';
import { DEPED_SEAL_URL } from '../constants';

interface AdminAccessModalProps {
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (code: string) => void;
}

const AdminAccessModal: React.FC<AdminAccessModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [code, setCode] = useState('');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[rgba(18,35,61,0.48)] backdrop-blur-sm">
      <div
        className="bg-white rounded-[12px] shadow-[0_12px_32px_rgba(18,35,61,0.16)] max-w-[560px] w-full overflow-hidden border border-[rgba(18,35,61,0.08)] transform scale-100 transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(18,35,61,0.08)] p-5">
          <div className="flex items-center gap-4">
            <img src={DEPED_SEAL_URL} className="h-10 w-auto" alt="DepEd" />
            <h3 className="m-0 text-[24px] font-bold tracking-[-0.03em] text-[#12233d]">Administrative Access</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white text-[16px] font-bold text-[#12233d] transition-colors hover:bg-[#f8fafc]"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="p-5">
          <p className="mb-4 text-[16px] leading-[1.7] text-[#68758d]">
            Enter the administrative access code to open the election dashboard.
          </p>
          <input 
            type="password" 
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            className="w-full px-4 py-4 bg-white border border-[rgba(18,35,61,0.12)] rounded-[12px] focus:border-[#0038a8] outline-none font-bold tracking-[0.12em] text-[16px] uppercase"
            onKeyDown={(e) => e.key === 'Enter' && onConfirm(code)}
          />

          <div className="mt-5 flex flex-wrap justify-end gap-3 border-t border-[rgba(18,35,61,0.08)] pt-5">
            <button
              onClick={onClose}
              className="rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white px-4 py-3 text-[13px] font-bold text-[#12233d] transition-colors hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(code)}
              className="rounded-[12px] bg-[#0038a8] px-4 py-3 text-[13px] font-bold text-white transition-colors hover:bg-[#002f8a]"
            >
              Authorize
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAccessModal;
