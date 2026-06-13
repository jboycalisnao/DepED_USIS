
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
    <div className="modal-overlay modal-overlay--high">
      <div className="modal-backdrop" onClick={onClose} />
      <section className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="grade-results-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <p className="modal-dialog__eyebrow">Election Modal</p>
            <h3 id="grade-results-title">Official PDF Tally</h3>
            <p className="modal-dialog__eyebrow">Statement of Votes Exporter</p>
          </div>
          <button onClick={onClose} className="modal-dialog__close" aria-label="Close modal">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="modal-dialog__body space-y-8">
          {/* Program Selector */}
          <div>
            <label className="block text-[13px] font-bold uppercase text-[#68758d] mb-3">1. Select Target Group</label>
            <div className="flex p-1 bg-[#f1f5f9] rounded-[12px] gap-1">
              {(['REGULAR', 'STE', 'SPA'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedProgram(p)}
                  className={`flex-1 py-3 rounded-[12px] font-bold text-[13px] uppercase transition-all ${
                    selectedProgram === p 
                      ? 'bg-white text-[#0038a8] shadow-sm' 
                      : 'text-[#68758d] hover:text-[#12233d]'
                  }`}
                >
                  {p === 'REGULAR' ? 'By Grade' : `Whole ${p}`}
                </button>
              ))}
            </div>
          </div>

          {/* Grade Selector */}
          <div className={`transition-all duration-300 ${isConsolidated ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <label className="block text-[13px] font-bold text-[#68758d] uppercase mb-3">
              {isConsolidated ? '2. Scope Automatically Locked' : '2. Select Target Grade Level'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(GradeLevel).filter(g => g !== GradeLevel.GRADE_12).map(grade => (
                <button
                  key={grade}
                  disabled={isConsolidated}
                  onClick={() => setSelectedGrade(grade)}
                  className={`py-4 rounded-[12px] font-bold text-[13px] uppercase transition-all border ${
                    !isConsolidated && selectedGrade === grade 
                      ? 'bg-[#eef4ff] border-[#0038a8] text-[#0038a8] shadow-md' 
                      : 'bg-white border-[rgba(18,35,61,0.08)] text-[#68758d] hover:border-[rgba(0,56,168,0.2)]'
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-4 rounded-[12px] border flex items-start space-x-3 ${isConsolidated ? 'bg-[#eef4ff] border-[#dbeafe]' : 'bg-[#fff8db] border-[#fde68a]'}`}>
            <i className={`fa-solid ${isConsolidated ? 'fa-layer-group text-blue-500' : 'fa-circle-info text-amber-500'} mt-0.5 text-xs`} />
            <p className={`text-[13px] font-bold leading-relaxed uppercase ${isConsolidated ? 'text-[#034F8B]' : 'text-[#8a6a00]'}`}>
              {isConsolidated 
                ? `Consolidated Mode: Generating a single report for all ${selectedProgram} sections (Grades 7, 8, 9, and 10 combined).`
                : `Segmented Mode: Reporting for Regular ${selectedGrade} learners only.`}
            </p>
          </div>
        </div>

        <div className="modal-dialog__actions">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className="modal-dialog__blue w-full"
          >
            {isGenerating ? (
              <><i className="fa-solid fa-spinner animate-spin mr-3"></i> Tallying Scope...</>
            ) : (
              <><i className="fa-solid fa-print mr-3"></i> Generate {selectedProgram} Report</>
            )}
          </button>
          <button 
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </button>
        </div>
      </section>
    </div>,
    document.body
  );
};

export default GradeResultsModal;
