
import React from 'react';
import CandidateCard from './CandidateCard';
import { Position, Candidate } from '../types';

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
  // LOGIC: Regular Representatives (Grade 7-12) allow 2 seats. 
  // Specialized ones (STE, SPA) allow only 1.
  const posLower = position.toLowerCase();
  const isMultiSeatRep = posLower.includes('representative') && 
                         !posLower.includes('ste') && 
                         !posLower.includes('spa');
  
  const limit = isMultiSeatRep ? 2 : 1;
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
    <section className={`bg-white rounded-[2.5rem] p-8 shadow-sm border transition-all duration-500 ${
      currentCount > 0 ? 'border-green-100 bg-green-50/10' : 'border-gray-100'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-4 border-b border-gray-100 gap-4">
        <h3 className="text-xl font-extrabold text-[#034F8B] flex items-center">
          <span className={`rounded-xl w-10 h-10 flex items-center justify-center mr-4 text-sm font-black transition-colors ${
            currentCount > 0 ? (currentCount === limit ? 'bg-green-500 text-white' : 'bg-blue-500 text-white') : 'bg-[#034F8B] text-white'
          }`}>
            {index}
          </span>
          {position}
        </h3>
        <div className="flex items-center space-x-3">
          <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
            currentCount === limit 
              ? 'bg-green-500 text-white border-green-600 shadow-md' 
              : 'bg-blue-50 text-blue-400 border-blue-100'
          }`}>
            {currentCount === 0 ? `SELECT UP TO ${limit} (OPTIONAL)` : (currentCount === limit ? 'SELECTION COMPLETE' : `${currentCount}/${limit} SELECTED`)}
          </div>
          {currentCount > 0 && (
            <button 
              onClick={() => onSelectionChange([])}
              className="text-[10px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors p-2"
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
        <div className="py-12 text-center bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">No official candidates filed for this position</p>
        </div>
      )}
    </section>
  );
};

export default BallotPositionGroup;
