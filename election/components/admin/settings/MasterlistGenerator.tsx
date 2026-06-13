import React, { useMemo, useRef, useState } from 'react';
import { GradeLevel, Section, Student } from '../../../types';
import MasterlistDocument from './MasterlistDocument';
import { handlePdfPrint, handleZipExport } from './exportHandlers';

const MASTERLIST_SY = '2025-2026';

interface MasterlistGeneratorProps {
  learnerDatabase: Student[];
  sections: Section[];
  schoolName: string;
}

const MasterlistGenerator: React.FC<MasterlistGeneratorProps> = ({ learnerDatabase, sections, schoolName }) => {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sectionsByGrade = useMemo(
    () =>
      Object.values(GradeLevel).map((grade) => ({
        grade,
        items: sections.filter((section) => section.gradeLevel === grade),
      })),
    [sections],
  );

  const getStudentsForSection = (sectionId: string) =>
    learnerDatabase
      .filter((learner) => learner.sectionId === sectionId)
      .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));

  const handleToggleSection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const handleSelectGrade = (grade: GradeLevel) => {
    const gradeSectionIds = sections.filter((section) => section.gradeLevel === grade).map((section) => section.id);
    setSelectedSections((prev) => {
      const allSelected = gradeSectionIds.length > 0 && gradeSectionIds.every((id) => prev.includes(id));
      const withoutGrade = prev.filter((id) => !gradeSectionIds.includes(id));
      return allSelected ? withoutGrade : [...new Set([...prev, ...gradeSectionIds])];
    });
  };

  const handleClearSelection = () => {
    setSelectedSections([]);
  };

  const handleZip = async () => {
    if (!containerRef.current || selectedSections.length === 0) return;
    setIsProcessing(true);
    await handleZipExport(containerRef.current, selectedSections, sections, MASTERLIST_SY);
    setIsProcessing(false);
  };

  const handlePrint = () => {
    if (!containerRef.current || selectedSections.length === 0) return;
    handlePdfPrint(containerRef.current.innerHTML, MASTERLIST_SY);
  };

  const totalQueuedLearners = selectedSections.reduce((count, id) => count + getStudentsForSection(id).length, 0);

  return (
    <section className="election-page__control-card election-settings__masterlist-card">
      <div className="election-settings__section-header">
        <div className="election-settings__section-copy">
          <p className="election-settings__section-kicker">Bulk Masterlist Generator</p>
          <h3 className="election-settings__section-title">Select sections for PDF or ZIP export</h3>
          <p className="election-settings__section-subtitle">
            Select individual sections or mark an entire grade before exporting the masterlist.
          </p>
        </div>

        <div className="election-settings__section-actions">
          <button
            type="button"
            onClick={handleClearSelection}
            disabled={selectedSections.length === 0 || isProcessing}
            className="election-settings__secondary-action"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleZip}
            disabled={selectedSections.length === 0 || isProcessing}
            className="election-settings__primary-action election-settings__primary-action--soft"
          >
            {isProcessing ? 'Zipping...' : 'Zip PNGs'}
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={selectedSections.length === 0}
            className="election-settings__primary-action"
          >
            Print PDF
          </button>
        </div>
      </div>

      <div className="election-settings__masterlist-selector">
        {sectionsByGrade.map(({ grade, items }) => {
          if (items.length === 0) return null;

          const sectionIds = items.map((section) => section.id);
          const allSelected = sectionIds.length > 0 && sectionIds.every((id) => selectedSections.includes(id));
          const someSelected = sectionIds.some((id) => selectedSections.includes(id));
          const selectedCount = sectionIds.filter((id) => selectedSections.includes(id)).length;

          return (
            <article key={grade} className="election-settings__masterlist-grade">
              <label className={`election-settings__masterlist-grade-toggle${allSelected ? ' election-settings__masterlist-grade-toggle--active' : ''}`}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(node) => {
                    if (node) {
                      node.indeterminate = !allSelected && someSelected;
                    }
                  }}
                  onChange={() => handleSelectGrade(grade as GradeLevel)}
                />
                <span className="election-settings__masterlist-grade-title">{grade}</span>
                <span className="election-settings__masterlist-grade-meta">
                  {selectedCount} / {items.length} sections
                </span>
              </label>

              <div className="election-settings__masterlist-section-grid">
                {items.map((section) => {
                  const count = getStudentsForSection(section.id).length;
                  const checked = selectedSections.includes(section.id);

                  return (
                    <label
                      key={section.id}
                      className={`election-settings__masterlist-section${checked ? ' election-settings__masterlist-section--active' : ''}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => handleToggleSection(section.id)} />
                      <span className="election-settings__masterlist-section-copy">
                        <span className="election-settings__masterlist-section-name">{section.name}</span>
                        <span className="election-settings__masterlist-section-meta">
                          {section.adviserName || 'No adviser'} • {count} learners
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>

      <div className="election-settings__queue-chip">
        <span className="material-symbols-outlined" aria-hidden="true">
          groups
        </span>
        <p>{totalQueuedLearners.toLocaleString()} registered voters queued</p>
      </div>

      <div ref={containerRef} className="fixed -left-[9999px] opacity-0 pointer-events-none" style={{ width: '210mm' }}>
        {selectedSections.map((sectionId) => {
          const section = sections.find((entry) => entry.id === sectionId);
          if (!section) return null;
          const students = getStudentsForSection(sectionId);

          return (
            <div key={sectionId}>
              <MasterlistDocument section={section} students={students} schoolYear={MASTERLIST_SY} schoolName={schoolName} />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default MasterlistGenerator;
