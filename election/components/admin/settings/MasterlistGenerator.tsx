import React, { useRef, useState } from 'react';
import { GradeLevel, Section, Student } from '../../../types';
import MasterlistDocument from './MasterlistDocument';
import { handlePdfPrint, handleZipExport } from './exportHandlers';

const MASTERLIST_SY = '2025-2026';

interface MasterlistGeneratorProps {
  learnerDatabase: Student[];
  sections: Section[];
  schoolName: string;
}

const MasterlistGenerator: React.FC<MasterlistGeneratorProps> = ({
  learnerDatabase,
  sections,
  schoolName,
}) => {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const getStudentsForSection = (sectionId: string) =>
    learnerDatabase
      .filter((learner) => learner.sectionId === sectionId)
      .sort((a, b) =>
        `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
      );

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId],
    );
  };

  const handleSelectGrade = (grade: GradeLevel) => {
    const gradeSectionIds = sections
      .filter((section) => section.gradeLevel === grade)
      .map((section) => section.id);

    setSelectedSections((prev) => {
      const others = prev.filter((id) => !gradeSectionIds.includes(id));
      const allSelected =
        gradeSectionIds.length > 0 &&
        gradeSectionIds.every((id) => prev.includes(id));

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

  const totalQueuedLearners = selectedSections.reduce(
    (count, id) => count + getStudentsForSection(id).length,
    0,
  );

  return (
    <div className="rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center no-print">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[12px] bg-red-50 text-[#E11C38]">
            <i className="fa-solid fa-file-pdf text-[16px]"></i>
          </div>
          <div>
            <h3 className="text-[16px] font-bold uppercase tracking-tight text-gray-900">
              Bulk Masterlist Generator
            </h3>
            <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Targeting SY {MASTERLIST_SY}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={selectedSections.length === 0}
            className={`flex items-center rounded-[12px] border px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] transition-colors ${
              showPreview
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-[rgba(18,35,61,0.14)] bg-white text-slate-500 hover:bg-slate-50'
            }`}
          >
            <i className={`fa-solid ${showPreview ? 'fa-eye-slash' : 'fa-eye'} mr-2`}></i>
            {showPreview ? 'Hide Preview' : 'Show Live Preview'}
          </button>

          <button
            onClick={handleClearSelection}
            disabled={selectedSections.length === 0 || isProcessing}
            className="flex items-center rounded-[12px] border border-[rgba(18,35,61,0.14)] bg-white px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
          >
            <i className="fa-solid fa-xmark mr-2"></i>
            Clear
          </button>

          <button
            onClick={onExportZip}
            disabled={selectedSections.length === 0 || isProcessing}
            className="flex items-center rounded-[12px] border border-blue-100 bg-blue-50 px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-[#034F8B] transition-colors hover:bg-blue-100 disabled:bg-gray-50"
          >
            <i
              className={`fa-solid ${
                isProcessing ? 'fa-spinner animate-spin' : 'fa-file-zipper'
              } mr-2`}
            ></i>
            {isProcessing ? 'Zipping...' : 'Zip PNGs'}
          </button>

          <button
            onClick={onPrintPdf}
            disabled={selectedSections.length === 0}
            className="flex items-center rounded-[12px] bg-[#ce1126] px-5 py-3 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#b10f21] disabled:bg-gray-200"
          >
            <i className="fa-solid fa-print mr-2"></i>
            Print PDF
          </button>
        </div>
      </div>

      <div className="grid max-h-80 grid-cols-1 gap-4 overflow-y-auto rounded-[12px] border border-dashed border-[rgba(18,35,61,0.14)] bg-slate-50 p-5 no-print sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Object.values(GradeLevel).map((grade) => {
          const gradeSections = sections.filter((section) => section.gradeLevel === grade);
          if (gradeSections.length === 0) return null;

          const allGradeSelected =
            gradeSections.length > 0 &&
            gradeSections.every((section) => selectedSections.includes(section.id));

          return (
            <div key={grade} className="space-y-2">
              <button
                onClick={() => handleSelectGrade(grade as GradeLevel)}
                className={`w-full rounded-[12px] border px-3 py-2 text-left text-[13px] font-bold uppercase tracking-[0.08em] transition-colors ${
                  allGradeSelected
                    ? 'border-[rgba(0,56,168,0.24)] bg-[#eef4ff] text-[#0038a8]'
                    : 'border-[rgba(18,35,61,0.14)] bg-white text-slate-500'
                }`}
              >
                {grade} {allGradeSelected ? '✓' : '+'}
              </button>

              {gradeSections.map((section) => {
                const count = getStudentsForSection(section.id).length;

                return (
                  <label
                    key={section.id}
                    className="group flex cursor-pointer items-center space-x-2 rounded-[12px] p-2 transition-colors hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSections.includes(section.id)}
                      onChange={() => handleToggleSection(section.id)}
                      className="h-4 w-4 rounded border-gray-300 accent-[#034F8B]"
                    />
                    <div className="flex flex-col">
                      <span
                        className={`text-[13px] font-bold uppercase tracking-tight ${
                          selectedSections.includes(section.id)
                            ? 'text-[#034F8B]'
                            : 'text-slate-600'
                        }`}
                      >
                        {section.name}
                      </span>
                      <span className="text-[13px] text-slate-500">{count} names</span>
                    </div>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center space-x-4">
        <div className="flex items-center rounded-[12px] border border-blue-100 bg-blue-50 px-4 py-3">
          <i className="fa-solid fa-users-viewfinder mr-2 text-[#034F8B]"></i>
          <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-[#034F8B]">
            {totalQueuedLearners.toLocaleString()} Registered Voters Queued
          </p>
        </div>
      </div>

      {showPreview && selectedSections.length > 0 ? (
        <div className="mt-8 overflow-x-auto rounded-[12px] border border-dashed border-[rgba(18,35,61,0.14)] bg-slate-50 p-6">
          <div className="origin-top scale-75 space-y-10">
            {selectedSections.map((sectionId) => {
              const section = sections.find((entry) => entry.id === sectionId);
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
      ) : null}

      <div
        ref={containerRef}
        className="fixed -left-[9999px] opacity-0 pointer-events-none"
        style={{ width: '210mm' }}
      >
        {selectedSections.map((sectionId) => {
          const section = sections.find((entry) => entry.id === sectionId);
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
