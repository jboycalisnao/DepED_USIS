import React, { useRef, useEffect } from 'react';
import BallotPositionGroup from './BallotPositionGroup';
import { Position, Candidate, User } from '../types';
import { POSITIONS, LEON_NHS_LOGO_URL } from '../constants';
import { DEMO_LRN } from './DemoMode';
import { isRegularGradeRepresentativePosition } from '../utils/electionRules';

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
        const isGradeRep = isRegularGradeRepresentativePosition(pos as Position);
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
      const isGradeRep = isRegularGradeRepresentativePosition(pos as Position);
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

    const limit = isRegularGradeRepresentativePosition(pos) ? 2 : 1;

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
    <div className="mx-auto w-[min(1180px,calc(100%-32px))] px-[28px] py-8 pb-20">
      <div className="mb-10 text-center">
        <div className="inline-block p-4 bg-white rounded-[12px] border border-[rgba(18,35,61,0.08)] mb-4">
           <img src={LEON_NHS_LOGO_URL} className="h-16 w-auto" alt="Leon NHS Seal" />
        </div>
        <h2 className="text-[24px] font-bold text-[#12233d] uppercase tracking-tight">Official Digital Ballot</h2>
        <p className="text-[#0038a8] font-bold text-[13px] uppercase tracking-[0.08em] mt-1">Leon National High School</p>
        
        <div className="flex flex-col items-center mt-4">
          <p className="text-[#68758d] italic text-[16px]">Select your preferred candidates. Click a selected candidate again to clear that choice.</p>
          <p className="text-[#0038a8] font-bold text-[13px] uppercase tracking-[0.08em] mt-2">All positions are optional. You may skip any position to abstain.</p>
          
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {isSpecializedJHS && !isDemoUser && (
              <div className="px-5 py-2 bg-[#fff8db] text-[#0038a8] rounded-[12px] border border-[rgba(0,56,168,0.12)]">
                <p className="text-[13px] font-bold uppercase tracking-[0.08em]">
                  <i className="fa-solid fa-star mr-2"></i>
                  Specialized Ballot: {currentUser?.strand} Program Eligible
                </p>
              </div>
            )}
            
            {currentGrade >= 11 && !isDemoUser && (
               <div className="px-5 py-2 bg-[#f4f8ff] border border-[rgba(0,56,168,0.12)] rounded-[12px]">
                  <p className="text-[13px] font-bold text-[#0038a8] uppercase tracking-[0.08em]">
                    SHS Voter Category: {currentGrade === 11 ? 'Grade 12 Representative Eligible' : 'General Ballot'}
                  </p>
               </div>
            )}

            {isDemoUser && (
               <div className="px-5 py-2 bg-[#fff8db] text-[#8a6a00] rounded-[12px] border border-[rgba(252,209,22,0.4)]">
                  <p className="text-[13px] font-bold uppercase tracking-[0.08em]">
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

      <div ref={submitButtonRef} className="mt-16 mb-8 flex justify-center no-print">
        <button
          onClick={onSubmit}
          className={`px-8 py-4 rounded-[4px] font-bold text-[16px] transition-colors flex items-center uppercase tracking-[0.06em] ${
            isLastPositionTouched 
            ? 'bg-[#ce1126] text-white hover:bg-[#b10f21]' 
            : 'bg-[#0038a8] text-white hover:bg-[#002f8a]'
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
