
import React from 'react';
import { Candidate } from '../types';
import { optimizeImageUrl } from '../utils/imageUtils';
import { LEON_NHS_LOGO_URL } from '../constants';

interface CandidateCardProps {
  candidate: Candidate;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, isSelected, onSelect }) => {
  // We only need ~200px width for card display, saving significant bandwidth
  const optimizedUrl = candidate.imageUrl 
    ? optimizeImageUrl(candidate.imageUrl, 250, 75)
    : LEON_NHS_LOGO_URL;

  return (
    <div 
      onClick={() => onSelect(candidate.id)}
      className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
        isSelected 
          ? 'border-[#034F8B] bg-blue-50 ring-2 ring-blue-200 shadow-sm' 
          : 'border-gray-200 bg-white'
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 bg-[#034F8B] text-white rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-sm z-10">
          <i className="fa-solid fa-check text-xs"></i>
        </div>
      )}
      
      <img 
        src={optimizedUrl} 
        alt={candidate.name}
        loading="lazy"
        className="w-20 h-20 rounded-full object-cover mb-3 border-2 border-white shadow-sm bg-gray-50"
        onError={(e) => { (e.target as HTMLImageElement).src = LEON_NHS_LOGO_URL; }}
      />
      
      <h3 className="text-[16px] font-bold text-gray-900 text-center leading-tight">
        {candidate.name}
      </h3>
      <p className="text-xs font-semibold text-[#034F8B] mb-0.5">
        {candidate.party}
      </p>
      
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-500 italic line-clamp-2">
          "{candidate.vision}"
        </p>
      </div>

      <button
        className={`mt-3 w-full py-1.5 px-3 rounded-lg text-[13px] font-bold transition-all ${
          isSelected 
            ? 'bg-[#034F8B] text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isSelected ? 'SELECTED' : 'SELECT'}
      </button>
    </div>
  );
};

export default CandidateCard;
