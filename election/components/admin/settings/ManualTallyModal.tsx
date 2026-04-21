
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-2xl max-w-4xl w-full h-[90vh] flex flex-col overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#034F8B] p-8 text-white relative flex-shrink-0">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <i className="fa-solid fa-pen-to-square text-2xl text-[#fcd116]"></i>
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Official Tally Verification</h3>
              <p className="text-[10px] font-bold text-blue-200 uppercase tracking-[0.2em] mt-2">Final Review & Manual Override Module</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-2xl"></i>
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-8 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registry Sync:</span>
            <button 
              onClick={syncFromSystem}
              className="px-4 py-2 bg-blue-50 text-[#034F8B] rounded-lg font-black text-[9px] uppercase hover:bg-blue-100 border border-blue-100 transition-all flex items-center"
            >
              <i className="fa-solid fa-rotate mr-2"></i>
              Reset to Database Counts
            </button>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                <i className="fa-solid fa-circle-info"></i>
                <span className="uppercase">Manual changes affect the printed report only</span>
             </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-8 bg-gray-50/30 no-scrollbar">
          <div className="space-y-12">
            {POSITIONS.map(pos => {
              const posCandidates = candidates.filter(c => c.position === pos);
              if (posCandidates.length === 0) return null;

              return (
                <section key={pos} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-8 py-4 bg-gray-50/80 border-b border-gray-100 flex justify-between items-center">
                    <h4 className="text-[11px] font-black text-[#034F8B] uppercase tracking-widest">{pos}</h4>
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Input Encoded Counts</span>
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
        </div>

        {/* Footer */}
        <div className="p-8 bg-white border-t border-gray-100 flex items-center justify-between">
          <div className="max-w-md">
            <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase">
              By proceeding, you verify that these manual counts have been cross-checked with official precinct tally sheets.
            </p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onClose}
              className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase hover:text-gray-900 transition-colors"
            >
              Cancel Review
            </button>
            <button 
              onClick={handleProceed}
              className="bg-[#E11C38] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-red-900/20 hover:bg-red-700 transition-all active:scale-95 flex items-center"
            >
              <span>Generate Official Tally</span>
              <i className="fa-solid fa-print ml-3"></i>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ManualTallyModal;
