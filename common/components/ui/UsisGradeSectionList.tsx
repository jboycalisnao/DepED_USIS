import { useEffect, useMemo, useState, type ReactNode } from 'react';

export type UsisGradeSectionListSection = {
  content: ReactNode;
  count: number;
  key: string;
  label: ReactNode;
};

export type UsisGradeSectionListGrade = {
  countLabel?: string;
  key: string;
  label: ReactNode;
  sections: UsisGradeSectionListSection[];
};

type UsisGradeSectionListProps = {
  autoExpandGradeKey?: string;
  autoExpandSectionKey?: string;
  className?: string;
  collapseSignal?: number;
  emptyMessage?: string;
  expandAll?: boolean;
  grades: UsisGradeSectionListGrade[];
};

export function UsisGradeSectionList({
  autoExpandGradeKey,
  autoExpandSectionKey,
  className = '',
  collapseSignal = 0,
  emptyMessage = 'No records found.',
  expandAll = false,
  grades,
}: UsisGradeSectionListProps) {
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const normalizedGrades = useMemo(
    () => grades.filter((grade) => Array.isArray(grade.sections) && grade.sections.length > 0),
    [grades],
  );

  useEffect(() => {
    if (!expandAll) return;
    const nextGrades = new Set(normalizedGrades.map((grade) => grade.key));
    const nextSections = new Set<string>();
    normalizedGrades.forEach((grade) => {
      grade.sections.forEach((section) => nextSections.add(`${grade.key}::${section.key}`));
    });
    setExpandedGrades(nextGrades);
    setExpandedSections(nextSections);
  }, [expandAll, normalizedGrades]);

  useEffect(() => {
    if (!autoExpandGradeKey) return;
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      next.add(autoExpandGradeKey);
      return next;
    });
  }, [autoExpandGradeKey]);

  useEffect(() => {
    if (!autoExpandGradeKey || !autoExpandSectionKey) return;
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.add(`${autoExpandGradeKey}::${autoExpandSectionKey}`);
      return next;
    });
  }, [autoExpandGradeKey, autoExpandSectionKey]);

  useEffect(() => {
    if (collapseSignal <= 0) return;
    setExpandedGrades(new Set());
    setExpandedSections(new Set());
  }, [collapseSignal]);

  const toggleGrade = (gradeKey: string) => {
    setExpandedGrades((prev) => {
      const next = new Set(prev);
      if (next.has(gradeKey)) next.delete(gradeKey);
      else next.add(gradeKey);
      return next;
    });
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionKey)) next.delete(sectionKey);
      else next.add(sectionKey);
      return next;
    });
  };

  if (normalizedGrades.length === 0) {
    return <p className="usis-grade-section-list__empty">{emptyMessage}</p>;
  }

  return (
    <div className={`usis-grade-section-list ${className}`.trim()}>
      {normalizedGrades.map((grade) => {
        const isGradeOpen = expandedGrades.has(grade.key);
        return (
          <article key={grade.key} className="usis-grade-section-list__grade">
            <button
              className="usis-grade-section-list__grade-toggle"
              onClick={() => toggleGrade(grade.key)}
              type="button"
            >
              <div className="usis-grade-section-list__grade-title">
                <span className="usis-grade-section-list__grade-icon">
                  <span className="material-symbols-outlined">
                    {isGradeOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}
                  </span>
                </span>
                <span>
                  <strong className="usis-grade-section-list__grade-name">{grade.label}</strong>
                  <small className="usis-grade-section-list__grade-count">
                    {grade.countLabel || `${grade.sections.length} Active Sections`}
                  </small>
                </span>
              </div>
            </button>

            {isGradeOpen ? (
              <div className="usis-grade-section-list__sections">
                {grade.sections.map((section) => {
                  const sectionKey = `${grade.key}::${section.key}`;
                  const isSectionOpen = expandedSections.has(sectionKey);
                  return (
                    <article key={sectionKey} className="usis-grade-section-list__section">
                      <button
                        className="usis-grade-section-list__section-toggle"
                        onClick={() => toggleSection(sectionKey)}
                        type="button"
                      >
                        <span className="usis-grade-section-list__section-head">
                          <span className="usis-grade-section-list__section-icon">
                            <span className={`material-symbols-outlined ${isSectionOpen ? 'is-open' : ''}`}>
                              chevron_right
                            </span>
                          </span>
                          <strong className="usis-grade-section-list__section-name">{section.label}</strong>
                          <small className="usis-grade-section-list__section-count">- {section.count} record(s)</small>
                        </span>
                      </button>
                      {isSectionOpen ? (
                        <div className="usis-grade-section-list__section-content">{section.content}</div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
