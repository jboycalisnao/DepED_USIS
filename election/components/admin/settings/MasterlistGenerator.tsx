import React, { useState, useRef } from 'react';
import { Student, Section, GradeLevel } from '../../../types';
import MasterlistDocument from './MasterlistDocument';
import { handleZipExport, handlePdfPrint } from './exportHandlers';

// Specifically requested SY for masterlists
const MASTERLIST_SY = "2025-2026";

interface MasterlistGeneratorProps {
  learnerDatabase: Student[];
  sections: Section[];
  schoolName: string;
}

const MasterlistGenerator: React.FC<MasterlistGeneratorProps> = ({ learnerDatabase, sections, schoolName }) => {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getStudentsForSection = (sectionId: string) => {
    return learnerDatabase
      .filter(l => l.sectionId === sectionId)
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
  };

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) ? prev.filter(id => id !== sectionId) : [...prev, sectionId]
    );
  };

  const handleSelectGrade = (grade: GradeLevel) => {
    const gradeSectionIds = sections.filter(s => s.gradeLevel === grade).map(s => s.id);
    setSelectedSections(prev => {
      const others = prev.filter(id => !gradeSectionIds.includes(id));
      const allSelected = gradeSectionIds.length > 0 && gradeSectionIds.every(id => prev.includes(id));
      return allSelected ? others : [...new Set([...prev, ...gradeSectionIds])];
    });
  };

  const handleClearSelection = () => {
    setSelectedSections([]);
    setShowPreview(false);
  };

  const onExportZip = async () => {
    if (!containerRef.current || selectedSections.length === 0) return;
    setIsProcessing(true);
    await handleZipExport(containerRef.current, selectedSections, sections, MASTERLIST_SY);
    setIsProcessing(false);
  };

  const onPrintPdf = () => {
    if (!containerRef.current || selectedSections.length === 0) return;
    handlePdfPrint(containerRef.current.innerHTML, MASTERLIST_SY);
  };

  const totalQueuedLearners = selectedSections.reduce((acc, id) => acc + getStudentsForSection(id).length, 0);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
      {/* Control Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 no-print gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#E11C38]">
            <i className="fa-solid fa-file-pdf text-xl"></i>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Bulk Masterlist Generator</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Targeting SY {MASTERLIST_SY}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setShowPreview(!showPreview)}
            disabled={selectedSections.length === 0}
            className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center border ${
              showPreview ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'
            }`}
          >
            <i className={`fa-solid ${showPreview ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
            {showPreview ? 'Hide Preview' : 'Show Live Preview'}
          </button>

          <button 
            onClick={handleClearSelection}
            disabled={selectedSections.length === 0 || isProcessing}
            className="bg-white text-gray-400 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-30 transition-all flex items-center border border-gray-100"
          >
            <i className="fa-solid fa-xmark mr-2"></i>
            Clear
          </button>

          <button 
            onClick={onExportZip}
            disabled={selectedSections.length === 0 || isProcessing}
            className="bg-blue-50 text-[#034F8B] px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 disabled:bg-gray-50 transition-all flex items-center border border-blue-100"
          >
            <i className={`fa-solid ${isProcessing ? 'fa-spinner animate-spin' : 'fa-file-zipper'} mr-2`}></i>
            {isProcessing ? 'Zipping...' : 'Zip PNGs'}
          </button>

          <button 
            onClick={onPrintPdf}
            disabled={selectedSections.length === 0}
            className="bg-[#034F8B] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-900/20 hover:bg-blue-800 disabled:bg-gray-200 transition-all flex items-center"
          >
            <i className="fa-solid fa-print mr-2"></i>
            Print PDF
          </button>
        </div>
      </div>

      {/* Grade Level Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 no-print max-h-80 overflow-y-auto p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
        {Object.values(GradeLevel).map(grade => {
          const gradeSecs = sections.filter(s => s.gradeLevel === grade);
          if (gradeSecs.length === 0) return null;
          const allGradeSelected = gradeSecs.length > 0 && gradeSecs.every(s => selectedSections.includes(s.id));
          
          return (
            <div key={grade} className="space-y-2">
              <button 
                onClick={() => handleSelectGrade(grade as GradeLevel)}
                className={`w-full text-left px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest border transition-all ${
                  allGradeSelected ? 'bg-[#034F8B] text-white border-[#034F8B]' : 'bg-white text-gray-400 border-gray-100'
                }`}
              >
                {grade} {allGradeSelected ? '✓' : '+'}
              </button>
              {gradeSecs.map(sec => {
                const count = getStudentsForSection(sec.id).length;
                return (
                  <label key={sec.id} className="flex items-center space-x-2 p-2 rounded-xl hover:bg-white cursor-pointer group transition-all">
                    <input 
                      type="checkbox" 
                      checked={selectedSections.includes(sec.id)} 
                      onChange={() => handleToggleSection(sec.id)}
                      className="w-4 h-4 accent-[#034F8B] rounded border-gray-300"
                    />
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-black uppercase tracking-tight ${selectedSections.includes(sec.id) ? 'text-[#034F8B]' : 'text-gray-500'}`}>
                        {sec.name}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">{count} Names</span>
                    </div>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center space-x-4">
        <div className="flex items-center bg-blue-50 px-4 py-2 rounded-full border border-blue-100">
          <i className="fa-solid fa-users-viewfinder text-[#034F8B] mr-2"></i>
          <p className="text-[10px] font-black text-[#034F8B] uppercase tracking-widest">
            {totalQueuedLearners.toLocaleString()} Registered Voters Queued
          </p>
        </div>
      </div>

      {/* LIVE PREVIEW AREA */}
      {showPreview && selectedSections.length > 0 && (
        <div className="mt-10 p-10 bg-gray-100 rounded-[3rem] border-4 border-dashed border-gray-200 overflow-x-auto">
          <div className="flex flex-col items-center space-y-10 scale-75 origin-top">
            {selectedSections.map((sectionId) => {
              const section = sections.find(s => s.id === sectionId);
              if (!section) return null;
              const students = getStudentsForSection(sectionId);
              return (
                <div key={`preview-${sectionId}`} className="shadow-2xl">
                  <MasterlistDocument 
                    section={section} 
                    students={students} 
                    schoolYear={MASTERLIST_SY} 
                    schoolName={schoolName}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* HIDDEN BUFFER: Required for html2canvas and print logic */}
      <div 
        ref={containerRef} 
        className="fixed opacity-0 pointer-events-none -left-[9999px]"
        style={{ width: '210mm' }}
      >
        {selectedSections.map((sectionId) => {
          const section = sections.find(s => s.id === sectionId);
          if (!section) return null;
          const students = getStudentsForSection(sectionId);
          
          return (
            <div key={sectionId}>
              <MasterlistDocument 
                section={section} 
                students={students} 
                schoolYear={MASTERLIST_SY} 
                schoolName={schoolName}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MasterlistGenerator;