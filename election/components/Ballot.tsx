import React, { useRef, useEffect } from 'react';
import BallotPositionGroup from './BallotPositionGroup';
import { Position, Candidate, User } from '../types';
import { POSITIONS, LEON_NHS_LOGO_URL } from '../constants';
import { DEMO_LRN } from './DemoMode';

interface BallotProps {
  candidates: Candidate[];
  selections: Record<string, string[]>;
  onSelect: (position: Position, candidateIds: string[]) => void;
  onSubmit: () => void;
  currentUser: User | null;
}

const Ballot: React.FC<BallotProps> = ({ candidates, selections, onSelect, onSubmit, currentUser }) => {
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const submitButtonRef = useRef<HTMLDivElement>(null);

  const currentGrade = parseInt(currentUser?.gradeLevel?.replace(/[^0-9]/g, '') || '0');
  
  const isSTEStudent = currentUser?.strand?.toUpperCase() === 'STE';
  const isSPAStudent = currentUser?.strand?.toUpperCase() === 'SPA';
  const isDemoUser = currentUser?.studentId === DEMO_LRN;
  
  // Only JHS students have specialized ballots for STE/SPA
  const isSpecializedJHS = (isSTEStudent || isSPAStudent) && currentGrade <= 10;

  const shouldShowPosition = (pos: string) => {
    const posLower = pos.toLowerCase();
    
    if (isDemoUser && posLower.includes('spa representative')) {
      return false;
    }

    if (isDemoUser) {
      const isGradeRep = posLower.includes('grade') && posLower.includes('representative');
      if (isGradeRep) {
        const posGradeNum = parseInt(pos.replace(/[^0-9]/g, '') || '0');
        return posGradeNum === currentGrade + 1;
      }
      return true;
    }

    const isSTEPos = posLower.includes('ste representative');
    const isSPAPos = posLower.includes('spa representative');
    
    // 1. Specialized Representatives check
    if (isSTEPos) return isSTEStudent;
    if (isSPAPos) return isSPAStudent;

    // 2. Logic for general Grade Representatives
    const isGradeRep = posLower.includes('grade') && posLower.includes('representative');
    if (isGradeRep) {
      // IF STUDENT IS STE OR SPA, THEY MUST NEVER SEE REGULAR GRADE REPRESENTATIVES
      if (isSpecializedJHS) return false;

      // Extract number carefully from strings like "Grade 9 Representative"
      const matches = pos.match(/\d+/);
      const posGradeNum = matches ? parseInt(matches[0]) : 0;
      
      // SHS Grade 11 students vote for Grade 12 Reps for the coming year
      if (currentGrade === 11) return posGradeNum === 12;
      
      // Graduating Grade 12 students usually don't have a grade-level rep position
      if (currentGrade === 12) return false;

      // Regular JHS students vote for the rep of the grade they will be in next year (Current + 1)
      return posGradeNum === (currentGrade + 1);
    }
    
    return true;
  };

  const filteredPositions = POSITIONS.filter(shouldShowPosition);
  
  const lastPosition = filteredPositions[filteredPositions.length - 1];
  const isLastPositionTouched = lastPosition && selections[lastPosition]?.length > 0;

  useEffect(() => {
    if (filteredPositions.length > 0) {
      const firstPos = filteredPositions[0];
      const timer = setTimeout(() => {
        const element = sectionRefs.current[firstPos];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 600); 
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSelectionChange = (pos: Position, ids: string[]) => {
    onSelect(pos, ids);

    const currentIndex = filteredPositions.indexOf(pos as Position);
    const isLast = currentIndex === filteredPositions.length - 1;

    const isMultiSeat = [
      Position.GRADE_7_REP,
      Position.GRADE_8_REP, 
      Position.GRADE_9_REP, 
      Position.GRADE_10_REP, 
      Position.GRADE_11_REP,
      Position.GRADE_12_REP
    ].includes(pos);
    
    const limit = isMultiSeat ? 2 : 1;

    if (ids.length === limit && !isLast) {
      const nextPos = filteredPositions[currentIndex + 1];
      setTimeout(() => {
        const nextElement = sectionRefs.current[nextPos];
        if (nextElement) {
          nextElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 350);
    } 
    else if (isLast && ids.length > 0) {
      setTimeout(() => {
        submitButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 scale-[0.8] origin-top transition-transform duration-500 pb-32">
      <div className="mb-10 text-center">
        <div className="inline-block p-4 bg-blue-50 rounded-full mb-4">
           <img src={LEON_NHS_LOGO_URL} className="h-20 w-auto" alt="Leon NHS Seal" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Official Digital Ballot</h2>
        <p className="text-[#034F8B] font-bold text-sm uppercase tracking-widest mt-1">Leon National High School</p>
        
        <div className="flex flex-col items-center mt-4">
          <p className="text-gray-500 italic text-sm">Select your preferred candidates. Clicking a selected candidate again will deselect them.</p>
          <p className="text-[#034F8B] font-black text-[10px] uppercase tracking-widest mt-2">Note: All positions are optional. You may skip any position to abstain.</p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {isSpecializedJHS && !isDemoUser && (
              <div className="px-6 py-2 bg-[#fcd116] text-[#034F8B] rounded-full shadow-lg border-2 border-[#034F8B]">
                <p className="text-[10px] font-black uppercase tracking-widest">
                  <i className="fa-solid fa-star mr-2"></i>
                  Specialized Ballot: {currentUser?.strand} Program Eligible
                </p>
              </div>
            )}
            
            {currentGrade >= 11 && !isDemoUser && (
               <div className="px-6 py-2 bg-[#034F8B]/5 border border-[#034F8B]/20 rounded-full">
                  <p className="text-[10px] font-black text-[#034F8B] uppercase tracking-widest">
                    SHS Voter Category: {currentGrade === 11 ? 'Grade 12 Representative Eligible' : 'General Ballot'}
                  </p>
               </div>
            )}

            {isDemoUser && (
               <div className="px-6 py-2 bg-amber-500 text-white rounded-full shadow-lg">
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    <i className="fa-solid fa-flask-vial mr-2"></i>
                    Sandbox: Testing Multiseat Rules (Grade 7-12 Reps)
                  </p>
               </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {filteredPositions.map((pos, idx) => (
          <div key={pos} ref={el => { sectionRefs.current[pos] = el; }}>
            <BallotPositionGroup
              position={pos as Position}
              candidates={candidates.filter(c => c.position === pos)}
              selectedIds={selections[pos] || []}
              onSelectionChange={(ids) => handleSelectionChange(pos as Position, ids)}
              index={idx + 1}
            />
          </div>
        ))}
      </div>

      <div ref={submitButtonRef} className="mt-20 mb-10 flex justify-center no-print">
        <button
          onClick={onSubmit}
          className={`px-12 py-5 rounded-3xl font-black text-xl transform transition-all shadow-xl flex items-center border-4 border-white uppercase tracking-widest ${
            isLastPositionTouched 
            ? 'bg-[#E11C38] text-white hover:bg-red-700 scale-110 shadow-[0_25px_60px_-12px_rgba(225,28,56,0.7)] animate-pulse' 
            : 'bg-[#034F8B] text-white hover:bg-blue-800 scale-100 shadow-blue-900/20'
          }`}
        >
          <span>{isLastPositionTouched ? 'Ready! Submit Ballot' : 'Finalize & Submit Ballot'}</span>
          <i className={`fa-solid ${isLastPositionTouched ? 'fa-paper-plane' : 'fa-check'} ml-4 ${isLastPositionTouched ? 'animate-bounce' : ''}`}></i>
        </button>
      </div>
    </div>
  );
};

export default Ballot;