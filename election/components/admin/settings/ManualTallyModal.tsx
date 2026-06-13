
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Candidate, Position } from '../../../types';
import { POSITIONS, DEPED_SEAL_URL } from '../../../constants';

interface ManualTallyModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onPrint: (verifiedCandidates: Candidate[]) => void;
}

const ManualTallyModal: React.FC<ManualTallyModalProps> = ({ isOpen, onClose, candidates, onPrint }) => {
  const [manualVotes, setManualVotes] = useState<Record<string, number>>({});

  // Initialize with existing votes from DB
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, number> = {};
      candidates.forEach(c => {
        initial[c.id] = c.votes || 0;
      });
      setManualVotes(initial);
    }
  }, [isOpen, candidates]);

  if (!isOpen) return null;

  const handleVoteChange = (id: string, value: string) => {
    const num = parseInt(value) || 0;
    setManualVotes(prev => ({ ...prev, [id]: num }));
  };

  const syncFromSystem = () => {
    const synced: Record<string, number> = {};
    candidates.forEach(c => {
      synced[c.id] = c.votes || 0;
    });
    setManualVotes(synced);
  };

  const handleProceed = () => {
    const verifiedCandidates = candidates.map(c => ({
      ...c,
      votes: manualVotes[c.id] || 0
    }));
    onPrint(verifiedCandidates);
  };

  return createPortal(
    <div className="modal-overlay modal-overlay--high">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="manual-tally-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Election Modal</p>
            <h3 id="manual-tally-title">Official Tally Verification</h3>
            <p className="modal-dialog__eyebrow">Final Review & Manual Override Module</p>
          </div>
          <button onClick={onClose} className="modal-dialog__close" aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="modal-dialog__body space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-[#f8fbff] px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#68758d]">Registry Sync:</span>
              <button
                onClick={syncFromSystem}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-[rgba(0,56,168,0.12)] bg-[#eef4ff] px-4 py-3 text-[13px] font-bold uppercase text-[#0038a8]"
              >
                <i className="fa-solid fa-rotate mr-2" />
                Reset to Database Counts
              </button>
            </div>
            <div className="inline-flex items-center gap-2 rounded-[12px] border border-[rgba(194,138,0,0.16)] bg-[#fff8db] px-3 py-2 text-[13px] font-bold uppercase text-[#8a6a00]">
              <i className="fa-solid fa-circle-info" />
              <span>Manual changes affect the printed report only</span>
            </div>
          </div>

          <div className="space-y-12">
            {POSITIONS.map(pos => {
              const posCandidates = candidates.filter(c => c.position === pos);
              if (posCandidates.length === 0) return null;

              return (
                <section key={pos} className="overflow-hidden rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-[rgba(18,35,61,0.08)] bg-[#f8fbff] px-6 py-4">
                    <h4 className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#0038a8]">{pos}</h4>
                    <span className="text-[13px] font-bold uppercase text-[#68758d]">Input Encoded Counts</span>
                  </div>
                  <div className="p-6 divide-y divide-gray-50">
                    {posCandidates.map(c => (
                      <div key={c.id} className="py-4 flex items-center justify-between group">
                        <div className="flex items-center space-x-4">
                           <img 
                            src={c.imageUrl || DEPED_SEAL_URL} 
                            className="w-10 h-10 rounded-xl object-cover bg-gray-50" 
                            alt=""
                          />
                          <div>
                            <p className="text-sm font-black text-gray-900 uppercase">{c.name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{c.party}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-[8px] font-black text-gray-400 uppercase">Current DB</p>
                            <p className="text-xs font-bold text-blue-400">{c.votes || 0}</p>
                          </div>
                          <input 
                            type="number"
                            min="0"
                            value={manualVotes[c.id] || 0}
                            onChange={(e) => handleVoteChange(c.id, e.target.value)}
                            className="w-32 px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-[#034F8B] outline-none font-black text-lg text-center transition-all group-hover:bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="modal-dialog__actions">
            <div className="max-w-md">
              <p className="text-[13px] font-bold leading-relaxed text-[#68758d]">
                By proceeding, you verify that these manual counts have been cross-checked with official precinct tally sheets.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={onClose}>
                Cancel Review
              </button>
              <button onClick={handleProceed} className="modal-dialog__primary">
                <span>Generate Official Tally</span>
                <i className="fa-solid fa-print ml-3" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default ManualTallyModal;
