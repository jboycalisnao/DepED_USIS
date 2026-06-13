import React, { useEffect, useMemo, useState } from 'react';
import { GradeLevel, Section, Student, User } from '../../../types';
import { handleOrganizationPerformancePrint, type OrganizationPrintScope } from './organizationPerformanceExportHandler';
import { UsisSearchableSelect, type UsisSearchableSelectOption } from '../../../../common/components/ui/UsisSearchableSelect';

interface OrganizationTabProps {
  sections: Section[];
  learnerDatabase: Student[];
  voters: User[];
  schoolName: string;
  electionName: string;
  schoolYearLabel: string;
}

const OrganizationTab: React.FC<OrganizationTabProps> = ({
  sections,
  learnerDatabase,
  voters,
  schoolName,
  electionName,
  schoolYearLabel,
}) => {
  const gradeLevels = useMemo(() => Object.values(GradeLevel), []);
  const [printScope, setPrintScope] = useState<OrganizationPrintScope>('overall');
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(gradeLevels[0]);
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const sectionOptions = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: `${section.gradeLevel} - ${section.name}`,
      })),
    [sections],
  );

  const printScopeOptions: UsisSearchableSelectOption[] = useMemo(
    () => [
      { value: 'overall', label: 'Overall' },
      { value: 'grade', label: 'Per Grade' },
      { value: 'section', label: 'Per Section' },
    ],
    [],
  );

  const gradeOptions: UsisSearchableSelectOption[] = useMemo(
    () =>
      gradeLevels.map((grade) => ({
        value: grade,
        label: grade,
      })),
    [gradeLevels],
  );

  const sectionSearchOptions: UsisSearchableSelectOption[] = useMemo(
    () =>
      sectionOptions.map((section) => ({
        value: section.id,
        label: section.label,
      })),
    [sectionOptions],
  );

  useEffect(() => {
    const firstGrade = gradeLevels.find((grade) => sections.some((section) => section.gradeLevel === grade));
    if (firstGrade) {
      setSelectedGrade(firstGrade);
    }
  }, [gradeLevels, sections]);

  useEffect(() => {
    const availableGradeSections = sections.filter((section) => section.gradeLevel === selectedGrade);
    if (printScope === 'grade' && availableGradeSections.length === 0) {
      const nextGrade = gradeLevels.find((grade) => sections.some((section) => section.gradeLevel === grade));
      if (nextGrade) setSelectedGrade(nextGrade);
    }
  }, [gradeLevels, printScope, sections, selectedGrade]);

  useEffect(() => {
    if (printScope === 'section' && !selectedSectionId && sectionOptions.length > 0) {
      setSelectedSectionId(sectionOptions[0].id);
    }
  }, [printScope, sectionOptions, selectedSectionId]);

  const handlePrint = () => {
    handleOrganizationPerformancePrint({
      sections,
      learnerDatabase,
      voters,
      schoolName,
      electionName,
      schoolYearLabel,
      scope: printScope,
      gradeLevel: selectedGrade,
      sectionId: selectedSectionId,
    });
  };

  const clearSelection = () => {
    setPrintScope('overall');
    const firstGrade = gradeLevels.find((grade) => sections.some((section) => section.gradeLevel === grade));
    if (firstGrade) setSelectedGrade(firstGrade);
    setSelectedSectionId(sectionOptions[0]?.id || '');
  };

  const getGradeMetrics = (grade: GradeLevel) => {
    const gradeSections = sections.filter((section) => section.gradeLevel === grade);
    const learnersInGrade = learnerDatabase.filter((learner) => {
      const section = sections.find((entry) => entry.id === learner.sectionId);
      return section?.gradeLevel === grade;
    });

    const totalGradeLearners = learnersInGrade.length;
    const votedInGrade = learnersInGrade.filter((learner) => voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted).length;
    const gradePercentage = totalGradeLearners > 0 ? Math.round((votedInGrade / totalGradeLearners) * 100) : 0;

    return { gradeSections, totalGradeLearners, votedInGrade, gradePercentage };
  };

  return (
    <div className="election-page election-page__organization">
      <div className="election-page__control-card election-page__organization-tools no-print">
        <div className="election-settings__summary-header election-settings__section-header--compact">
          <div className="election-settings__summary-copy">
            <p className="election-settings__summary-label">Organization Performance</p>
            <h3 className="election-settings__summary-title">Print overall, grade-level, or section-level turnout performance</h3>
            <p className="election-settings__section-subtitle">
              Choose a scope, then print the formatted performance report in a popup window.
            </p>
          </div>

          <div className="election-page__organization-print-controls">
            <div className="election-page__organization-select-field">
              <UsisSearchableSelect
                ariaLabel="Scope"
                floatingLabel
                forceInlineMenu
                label="Scope"
                options={printScopeOptions}
                onChange={(value) => setPrintScope(value as OrganizationPrintScope)}
                placeholder="Select scope"
                showLabel
                value={printScope}
              />
            </div>

            {printScope === 'grade' ? (
              <div className="election-page__organization-select-field">
                <UsisSearchableSelect
                  ariaLabel="Grade"
                  floatingLabel
                  forceInlineMenu
                  label="Grade"
                  options={gradeOptions}
                  onChange={(value) => setSelectedGrade(value as GradeLevel)}
                  placeholder="Select grade"
                  showLabel
                  value={selectedGrade}
                />
              </div>
            ) : null}

            {printScope === 'section' ? (
              <div className="election-page__organization-select-field election-page__organization-select-field--wide">
                <UsisSearchableSelect
                  ariaLabel="Section"
                  floatingLabel
                  forceInlineMenu
                  label="Section"
                  options={sectionSearchOptions}
                  onChange={(value) => setSelectedSectionId(value)}
                  placeholder="Select section"
                  showLabel
                  value={selectedSectionId}
                />
              </div>
            ) : null}

            <button type="button" onClick={clearSelection} className="election-settings__secondary-action">
              Clear
            </button>
            <button type="button" onClick={handlePrint} className="election-settings__primary-action">
              <span className="material-symbols-outlined" aria-hidden="true">
                print
              </span>
              Print Report
            </button>
          </div>
        </div>
      </div>

      <div className="election-page__organization-grid">
        {gradeLevels.map((grade) => {
          const gradeSections = sections.filter((section) => section.gradeLevel === grade);
          if (gradeSections.length === 0) return null;

          const { totalGradeLearners, votedInGrade, gradePercentage } = getGradeMetrics(grade);

          return (
            <section key={grade} className="election-page__grade-card election-page__grade-card--organization">
              <div className="election-page__hero-bar" aria-hidden="true">
                <span style={{ backgroundColor: '#0038a8' }} />
                <span style={{ backgroundColor: '#fcd116' }} />
                <span style={{ backgroundColor: '#ce1126' }} />
              </div>

              <div className="election-page__grade-header election-page__grade-header--organization">
                <div className="election-page__grade-title-wrap">
                  <h3 className="election-page__grade-title election-page__grade-title--organization">
                    <span className="material-symbols-outlined election-page__grade-title-icon" aria-hidden="true">
                      school
                    </span>
                    {grade}
                  </h3>
                </div>

                <div className="election-page__grade-summary-right election-page__grade-summary-right--organization">
                  <div className="election-page__grade-turnout">
                    <p className="election-page__grade-turnout-label">Grade Turnout</p>
                    <p className="election-page__grade-turnout-value">
                      {votedInGrade.toLocaleString()} / {totalGradeLearners.toLocaleString()} voters
                    </p>
                  </div>
                  <div className="election-page__grade-percentage election-page__grade-percentage--organization">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      monitoring
                    </span>
                    <span>{gradePercentage}%</span>
                  </div>
                </div>
              </div>

              <div className="election-page__grade-body election-page__grade-body--organization">
                <div className="election-page__organization-card-grid">
                  {gradeSections.map((section) => {
                    const sectionStudents = learnerDatabase.filter((learner) => learner.sectionId === section.id);
                    const studentCount = sectionStudents.length;
                    const votedCount = sectionStudents.filter((learner) => voters.find((voter) => voter.studentId === learner.lrn)?.hasVoted).length;
                    const sectionTurnout = studentCount > 0 ? Math.round((votedCount / studentCount) * 100) : 0;

                    return (
                      <article key={section.id} className="election-page__organization-card">
                        <div className="election-page__organization-card-header">
                          <div className="election-page__organization-card-copy">
                            <div className="election-page__organization-card-icon" aria-hidden="true">
                              <span className="material-symbols-outlined">groups</span>
                            </div>
                            <h4 className="election-page__organization-card-title">{section.name}</h4>
                            <p className="election-page__organization-card-adviser">
                              <span className="material-symbols-outlined" aria-hidden="true">
                                person
                              </span>
                              <span>{section.adviserName || 'No adviser'}</span>
                            </p>
                          </div>
                          <div className="election-page__organization-card-percent-wrap">
                            <span className="material-symbols-outlined election-page__organization-card-percent-icon" aria-hidden="true">
                              monitoring
                            </span>
                            <div className="election-page__organization-card-percent">{sectionTurnout}%</div>
                          </div>
                        </div>

                        <div className="election-page__organization-card-meta">
                          <p className="election-page__organization-card-meta-label">Section Tally</p>
                          <p className="election-page__organization-card-meta-value">
                            {votedCount} / {studentCount} votes
                          </p>
                        </div>

                        <div className="election-page__organization-card-bar" aria-hidden="true">
                          <span
                            className="election-page__organization-card-bar-fill"
                            style={{
                              width: `${sectionTurnout}%`,
                              backgroundColor: sectionTurnout > 80 ? '#16a34a' : sectionTurnout > 50 ? '#0038a8' : '#e11c38',
                            }}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default OrganizationTab;
