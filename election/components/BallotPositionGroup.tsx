
import React from 'react';
import CandidateCard from './CandidateCard';
import { Position, Candidate } from '../types';
import { getMaxSelectionsForPosition } from '../utils/electionRules';

interface BallotPositionGroupProps {
  position: Position;
  candidates: Candidate[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  index: number;
}

const BallotPositionGroup: React.FC<BallotPositionGroupProps> = ({ 
  position, 
  candidates, 
  selectedIds = [], 
  onSelectionChange,
  index
}) => {
  const limit = getMaxSelectionsForPosition(position);
  const currentCount = selectedIds.length;

  const handleToggleCandidate = (candidateId: string) => {
    const isAlreadySelected = selectedIds.includes(candidateId);

    if (isAlreadySelected) {
      // Deselecting: always allowed
      onSelectionChange(selectedIds.filter(id => id !== candidateId));
    } else {
      if (limit === 1) {
        // Single seat: Replace current selection
        onSelectionChange([candidateId]);
      } else {
        // Multi seat: Add if under limit
        if (currentCount < limit) {
          onSelectionChange([...selectedIds, candidateId]);
        }
      }
    }
  };

  return (
    <section className={`bg-white rounded-[12px] p-6 shadow-sm border transition-colors ${
      currentCount > 0 ? 'border-[#22c55e]/20 bg-[#f7fff9]' : 'border-[rgba(18,35,61,0.08)]'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-4 border-b border-[rgba(18,35,61,0.08)] gap-4">
        <h3 className="text-[24px] font-bold text-[#0038a8] flex items-center">
          <span className={`rounded-[12px] w-10 h-10 flex items-center justify-center mr-4 text-[13px] font-bold transition-colors ${
            currentCount > 0 ? (currentCount === limit ? 'bg-[#22c55e] text-white' : 'bg-[#0038a8] text-white') : 'bg-[#0038a8] text-white'
          }`}>
            {index}
          </span>
          {position}
        </h3>
        <div className="flex items-center space-x-3">
          <div className={`px-4 py-2 rounded-[12px] border text-[13px] font-bold uppercase tracking-[0.06em] transition-colors ${
            currentCount === limit 
              ? 'bg-[#22c55e] text-white border-[#22c55e]' 
              : 'bg-[#f4f8ff] text-[#0038a8] border-[rgba(0,56,168,0.12)]'
          }`}>
            {currentCount === 0 ? `SELECT UP TO ${limit} (OPTIONAL)` : (currentCount === limit ? 'SELECTION COMPLETE' : `${currentCount}/${limit} SELECTED`)}
          </div>
          {currentCount > 0 && (
            <button 
              onClick={() => onSelectionChange([])}
              className="text-[13px] font-bold text-[#68758d] hover:text-[#ce1126] uppercase tracking-[0.06em] transition-colors p-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates.map(candidate => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            isSelected={selectedIds.includes(candidate.id)}
            onSelect={() => handleToggleCandidate(candidate.id)}
          />
        ))}
      </div>

      {candidates.length === 0 && (
        <div className="py-10 text-center bg-[#f8fafc] rounded-[12px] border border-dashed border-[rgba(18,35,61,0.12)]">
          <p className="text-[13px] font-bold text-[#68758d] uppercase tracking-[0.08em]">No official candidates filed for this position</p>
        </div>
      )}
    </section>
  );
};

export default BallotPositionGroup;
