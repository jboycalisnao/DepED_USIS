
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Student, Section, Candidate, GradeLevel, ElectionConfig } from '../../../types';
import { handleGradeResultsPrint } from './gradeResultsExportHandler';

interface GradeResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  learnerDatabase: Student[];
  sections: Section[];
  candidates: Candidate[];
  electionConfig: ElectionConfig;
  schoolYear: string;
}

const GradeResultsModal: React.FC<GradeResultsModalProps> = ({
  isOpen,
  onClose,
  learnerDatabase,
  sections,
  candidates,
  electionConfig,
  schoolYear
}) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(GradeLevel.GRADE_7);
  const [selectedProgram, setSelectedProgram] = useState<'REGULAR' | 'STE' | 'SPA'>('REGULAR');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const isConsolidated = selectedProgram !== 'REGULAR';

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await handleGradeResultsPrint(
        selectedGrade,
        selectedProgram,
        learnerDatabase,
        sections,
        candidates,
        electionConfig,
        schoolYear
      );
      onClose();
    } catch (err) {
      alert("Error generating PDF. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-white/10 transform animate-in zoom-in-95 duration-200">
        <div className="bg-[#034F8B] p-8 text-white text-center relative">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
            <i className="fa-solid fa-file-pdf text-2xl text-[#fcd116]"></i>
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight leading-none">Official PDF Tally</h3>
          <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mt-2">Statement of Votes Exporter</p>
          
          <button onClick={onClose} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Program Selector */}
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">1. Select Target Group</label>
            <div className="flex p-1 bg-gray-100 rounded-2xl gap-1">
              {(['REGULAR', 'STE', 'SPA'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedProgram(p)}
                  className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase transition-all ${
                    selectedProgram === p 
                      ? 'bg-white text-[#034F8B] shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {p === 'REGULAR' ? 'By Grade' : `Whole ${p}`}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selector */}
          <div className={`transition-all duration-300 ${isConsolidated ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
              {isConsolidated ? '2. Scope Automatically Locked' : '2. Select Target Grade Level'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(GradeLevel).filter(g => g !== GradeLevel.GRADE_12).map(grade => (
                <button
                  key={grade}
                  disabled={isConsolidated}
                  onClick={() => setSelectedGrade(grade)}
                  className={`py-4 rounded-2xl font-black text-[11px] uppercase transition-all border-2 ${
                    !isConsolidated && selectedGrade === grade 
                      ? 'bg-blue-50 border-[#034F8B] text-[#034F8B] shadow-md' 
                      : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-4 rounded-xl border flex items-start space-x-3 ${isConsolidated ? 'bg-blue-50 border-blue-100' : 'bg-amber-50 border-amber-100'}`}>
            <i className={`fa-solid ${isConsolidated ? 'fa-layer-group text-blue-500' : 'fa-circle-info text-amber-500'} mt-0.5 text-xs`}></i>
            <p className={`text-[9px] font-bold leading-relaxed uppercase tracking-tight ${isConsolidated ? 'text-blue-700' : 'text-amber-700'}`}>
              {isConsolidated 
                ? `Consolidated Mode: Generating a single report for all ${selectedProgram} sections (Grades 7, 8, 9, and 10 combined).`
                : `Segmented Mode: Reporting for Regular ${selectedGrade} learners only.`}
            </p>
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex flex-col gap-3">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-[#034F8B] text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center border-b-4 border-blue-950"
          >
            {isGenerating ? (
              <><i className="fa-solid fa-spinner animate-spin mr-3"></i> Tallying Scope...</>
            ) : (
              <><i className="fa-solid fa-print mr-3"></i> Generate {selectedProgram} Report</>
            )}
          </button>
          <button 
            onClick={onClose}
            className="w-full py-2 text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GradeResultsModal;
