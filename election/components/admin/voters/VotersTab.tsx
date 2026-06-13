import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Student, User, Section, GradeLevel } from '../../../types';
import { useStore } from '../../../supabaseStore';
import { FloatingField } from '../../ui/FloatingField';
import MasterlistDocument from '../settings/MasterlistDocument';
import { handlePdfPrint, handleZipExport } from '../settings/exportHandlers';

interface VotersTabProps {
  learnerDatabase: Student[];
  voters: User[];
  sections: Section[];
  schoolName: string;
  onDeleteBallot: (lrn: string) => Promise<void>;
  showAlert: (title: string, message: string, type?: 'info' | 'warning' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
}

const VotersTab: React.FC<VotersTabProps> = ({
  learnerDatabase = [],
  voters = [],
  sections = [],
  schoolName = 'Leon National High School',
  onDeleteBallot,
  showAlert,
}) => {
  const store = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [auditBallot, setAuditBallot] = useState<any[] | null>(null);
  const [auditedUser, setAuditedUser] = useState<Student | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isProcessingDelete, setIsProcessingDelete] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const exportContainerRef = useRef<HTMLDivElement>(null);

  const gradeLevels = useMemo(() => Object.values(GradeLevel), []);
  const activeSchoolYear = store.activeSchoolYear?.label || '2025-2026';

  const closeAudit = () => {
    setAuditedUser(null);
    setAuditBallot(null);
  };

  const formatGradeLabel = (grade: string) => {
    const cleaned = String(grade || '').replace(/^GRADE_/i, 'Grade ');
    return cleaned === 'Grade 12' ? 'Grade 12 (Non-Voting)' : cleaned;
  };

  const getLearnerName = (learner: Student) => {
    const firstName = learner.firstName || '';
    const middleName = learner.middleName ? ` ${learner.middleName}` : '';
    const lastName = learner.lastName || '';
    return `${firstName}${middleName} ${lastName}`.trim();
  };

  const getLearnerLRN = (learner: Student) => learner.lrn || 'N/A';

  const getGenderChar = (learner: Student) => {
    const value = String(learner.gender || (learner as any).GENDER || '').toUpperCase();
    if (value.startsWith('M')) return 'M';
    if (value.startsWith('F')) return 'F';
    return 'U';
  };

  const getGradeLearners = (grade: string) => {
    return (learnerDatabase || []).filter((learner) => {
      const section = (sections || []).find((item) => item.id === learner.sectionId);
      return section?.gradeLevel === grade;
    });
  };

  const getFilteredLearners = (learners: Student[]) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return learners;
    return learners.filter((learner) => {
      const name = getLearnerName(learner).toLowerCase();
      const lrn = getLearnerLRN(learner).toLowerCase();
      return name.includes(term) || lrn.includes(term);
    });
  };

  const getVoteCount = (learners: Student[]) => {
    return learners.filter((learner) => (voters || []).find((voter) => voter.studentId === getLearnerLRN(learner))?.hasVoted).length;
  };

  const handleToggleSectionSelection = (sectionId: string) => {
    setSelectedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId],
    );
  };

  const handleToggleGradeSelection = (grade: string) => {
    const gradeSectionIds = (sections || []).filter((section) => section.gradeLevel === grade).map((section) => section.id);
    setSelectedSections((prev) => {
      const allSelected = gradeSectionIds.length > 0 && gradeSectionIds.every((id) => prev.includes(id));
      const withoutGrade = prev.filter((id) => !gradeSectionIds.includes(id));
      return allSelected ? withoutGrade : [...new Set([...prev, ...gradeSectionIds])];
    });
  };

  const handleClearExportSelection = () => {
    setSelectedSections([]);
  };

  const handlePrintMasterlist = () => {
    if (!exportContainerRef.current || selectedSections.length === 0) return;
    handlePdfPrint(exportContainerRef.current.innerHTML, activeSchoolYear);
  };

  const handleZipMasterlist = async () => {
    if (!exportContainerRef.current || selectedSections.length === 0) return;
    setIsProcessingExport(true);
    try {
      await handleZipExport(exportContainerRef.current, selectedSections, sections, activeSchoolYear);
    } finally {
      setIsProcessingExport(false);
    }
  };

  const handleAudit = async (learner: Student) => {
    setIsAuditing(true);
    setAuditedUser(learner);
    try {
      const ballot = await store.fetchVoterBallot(getLearnerLRN(learner), store.activeSchoolYear?.id || '');
      setAuditBallot(ballot || []);
    } catch (error) {
      console.error('Audit fetch failed', error);
      setAuditBallot([]);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleDeleteVote = (learner: Student) => {
    const lrn = getLearnerLRN(learner);
    const name = getLearnerName(learner);

    showAlert(
      'Confirm Ballot Void',
      `Are you sure you want to permanently void the ballot cast by ${name} (LRN: ${lrn})? This will allow the student to vote again.`,
      'confirm',
      async () => {
        try {
          setIsProcessingDelete(true);
          await onDeleteBallot(lrn);
          closeAudit();
          showAlert('Ballot Voided', `Records for ${name} have been cleared.`, 'success');
        } catch (error) {
          showAlert('Action Failed', 'Could not void the ballot. Please check cloud connection.', 'error');
        } finally {
          setIsProcessingDelete(false);
        }
      }
    );
  };

  const renderAuditModal = () => {
    if (!auditedUser) return null;

    return createPortal(
      <div className="modal-overlay modal-overlay--high">
        <div className="modal-backdrop" onClick={closeAudit} />
        <section className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="voter-audit-title">
          <div className="modal-dialog__header">
            <div className="modal-dialog__title-group">
              <p className="modal-dialog__eyebrow">Election Modal</p>
              <h3 id="voter-audit-title">Voter Audit Report</h3>
              <p className="modal-dialog__eyebrow">Official ballot record</p>
            </div>
            <button type="button" onClick={closeAudit} className="modal-dialog__close" aria-label="Close audit modal">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="modal-dialog__body">
            <div className="mb-6 rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white p-5 shadow-sm">
              <p className="mb-2 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Voter Profile</p>
              <h4 className="text-[24px] font-bold text-[#12233d]">{getLearnerName(auditedUser)}</h4>
              <p className="mt-2 text-[16px] font-bold text-[#0038a8]">{getLearnerLRN(auditedUser)}</p>
            </div>

            <div className="space-y-4">
              <p className="border-b border-[rgba(18,35,61,0.08)] pb-3 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Identified Choices
              </p>
              {isAuditing ? (
                <div className="py-12 text-center">
                  <i className="fa-solid fa-circle-notch animate-spin text-3xl text-blue-500" />
                  <p className="mt-4 text-[13px] font-bold uppercase tracking-[0.12em] text-slate-500">Retrieving ballot data</p>
                </div>
              ) : auditBallot && auditBallot.length > 0 ? (
                <div className="space-y-3">
                  {auditBallot.map((item, idx) => {
                    const candidateRecord = Array.isArray(item.election_candidates)
                      ? item.election_candidates[0]
                      : item.election_candidates;

                    return (
                      <div key={idx} className="flex items-center justify-between rounded-[12px] border border-[rgba(18,35,61,0.08)] bg-white px-4 py-4 shadow-sm">
                        <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-slate-500">{item.position}</span>
                        <span className="text-[16px] font-bold uppercase text-[#0038a8]">
                          {candidateRecord?.name || 'Candidate record unavailable'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[12px] border border-red-100 bg-red-50 py-10 text-center">
                  <i className="fa-solid fa-box-open mb-2 text-3xl text-red-200" />
                  <p className="text-[13px] font-bold uppercase tracking-[0.12em] text-red-400">No ballot lines recorded for this LRN</p>
                </div>
              )}
            </div>
          </div>

          <div className="modal-dialog__actions">
            <button type="button" onClick={closeAudit}>
              Dismiss Audit View
            </button>
            <button
              type="button"
              onClick={() => handleDeleteVote(auditedUser)}
              disabled={isProcessingDelete}
              className="modal-dialog__primary"
            >
              <i className={`fa-solid ${isProcessingDelete ? 'fa-circle-notch animate-spin' : 'fa-trash-can'} mr-2`} />
              Permanently Void This Ballot
            </button>
          </div>
        </section>
      </div>,
      document.body
    );
  };

  const renderLearnerTable = (learnersList: Student[], label: string, icon: string) => {
    if (learnersList.length === 0) return null;

    const votedCount = getVoteCount(learnersList);

    return (
      <div className="election-page__table-card">
        <div className="election-page__table-card-header">
          <div className="election-page__table-card-title-wrap">
            <h4 className="election-page__table-card-title">
              <i className={`fa-solid ${icon}`} style={{ color: '#0038a8', marginRight: '8px' }} />
              {label}
            </h4>
          </div>
          <span className="election-page__table-card-count">
            {votedCount} / {learnersList.length} Cast
          </span>
        </div>
        <div className="election-page__table-wrap">
          <table className="election-page__table">
            <thead>
              <tr>
                <th>LRN Identification</th>
                <th>Full Legal Name</th>
                <th style={{ textAlign: 'right' }}>Election Action</th>
              </tr>
            </thead>
            <tbody>
              {learnersList
                .slice()
                .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                .map((learner) => {
                  const lrn = getLearnerLRN(learner);
                  const hasVoted = (voters || []).find((voter) => voter.studentId === lrn)?.hasVoted;
                  const isG12 = sections.find((section) => section.id === learner.sectionId)?.gradeLevel === GradeLevel.GRADE_12;

                  return (
                    <tr key={learner.id}>
                      <td className="election-page__vote-lrn">{lrn}</td>
                      <td>
                        <span className="election-page__vote-name">
                          {getLearnerName(learner)}
                          {learner.isSSLG && <span className="election-page__vote-officer">Officer</span>}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isG12 ? (
                          <span className="election-page__vote-status election-page__vote-status--none">
                            <i className="fa-solid fa-ban" style={{ marginRight: '6px' }} />
                            Non-Voter
                          </span>
                        ) : hasVoted ? (
                          <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleAudit(learner)}
                              className="election-page__candidate-table-action election-page__candidate-table-action--edit"
                            >
                              <i className="fa-solid fa-magnifying-glass-chart" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVote(learner)}
                              className="election-page__candidate-table-action election-page__candidate-table-action--duplicate"
                              title="Void Ballot"
                            >
                              <i className="fa-solid fa-trash-can" />
                            </button>
                          </div>
                        ) : (
                          <span className="election-page__vote-status election-page__vote-status--none">No Vote Yet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="election-page pb-20 relative">
      {renderAuditModal()}

      <div className="election-page__masterlist-bar election-page__control-card no-print">
        <div className="election-settings__summary-header">
          <div className="election-settings__summary-copy">
            <p className="election-settings__summary-label">Bulk Masterlist Export</p>
            <h3 className="election-settings__summary-title">Use the existing sections below to print the masterlist</h3>
            <p className="election-settings__section-subtitle">
              Tick the section checkboxes or the grade checkbox in the same list you already use for voter turnout.
            </p>
          </div>
          <div className="election-settings__section-actions">
            <span className="election-settings__section-note">{selectedSections.length} selected</span>
            <button
              type="button"
              onClick={handleClearExportSelection}
              disabled={selectedSections.length === 0 || isProcessingExport}
              className="election-settings__secondary-action"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleZipMasterlist}
              disabled={selectedSections.length === 0 || isProcessingExport}
              className="election-settings__primary-action election-settings__primary-action--soft"
            >
              {isProcessingExport ? 'Zipping...' : 'Zip PNGs'}
            </button>
            <button
              type="button"
              onClick={handlePrintMasterlist}
              disabled={selectedSections.length === 0}
              className="election-settings__primary-action"
            >
              Print PDF
            </button>
          </div>
        </div>
      </div>

      <section className="election-page__search-card" aria-label="Learner search">
        <div className="election-page__search-card-row">
          <div className="election-page__search-card-field">
            <FloatingField
              as="input"
              label="Search by LRN or learner name"
              aria-label="Search by LRN or learner name"
              placeholder=" "
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <span className="election-page__search-card-meta">{(learnerDatabase || []).length} cached learners</span>
        </div>
      </section>

      <div className="election-page__compact-grid">
        {gradeLevels.map((grade) => {
          const isG12 = grade === GradeLevel.GRADE_12;
          const gradeLearners = getGradeLearners(grade);
          const filteredGradeLearners = getFilteredLearners(gradeLearners);

          if (filteredGradeLearners.length === 0 && searchTerm) return null;

          const isExpanded = expandedGrades[grade] || searchTerm !== '';
          const gradeVotedCount = getVoteCount(filteredGradeLearners);
          const turnoutPercent = filteredGradeLearners.length > 0 ? Math.round((gradeVotedCount / filteredGradeLearners.length) * 100) : 0;
          const gradeSectionIds = (sections || []).filter((section) => section.gradeLevel === grade).map((section) => section.id);
          const selectedCount = gradeSectionIds.filter((id) => selectedSections.includes(id)).length;
          const allSelected = gradeSectionIds.length > 0 && gradeSectionIds.every((id) => selectedSections.includes(id));
          const someSelected = gradeSectionIds.some((id) => selectedSections.includes(id));

          return (
            <div key={grade} className="election-page__grade-card">
              <button
                type="button"
                onClick={() => setExpandedGrades((prev) => ({ ...prev, [grade]: !prev[grade] }))}
                className={`election-page__grade-header ${isExpanded ? 'election-page__grade-header--expanded' : ''}`}
              >
                <div className="election-page__grade-summary">
                  <div className="election-page__grade-summary-left">
                    <label className={`election-page__masterlist-select election-page__masterlist-select--grade${allSelected ? ' election-page__masterlist-select--active' : ''}`}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(node) => {
                          if (node) {
                            node.indeterminate = !allSelected && someSelected;
                          }
                        }}
                        onClick={(event) => event.stopPropagation()}
                        onChange={() => handleToggleGradeSelection(grade)}
                      />
                    </label>
                    <span className="material-symbols-outlined election-page__grade-toggle-icon" aria-hidden="true">
                      expand_more
                    </span>
                    <div className="election-page__grade-copy">
                      <h3 className="election-page__grade-title">{formatGradeLabel(grade)}</h3>
                      {!isG12 && (
                        <div className="election-page__grade-subcopy">
                          {gradeVotedCount} of {filteredGradeLearners.length} voters cast
                          {selectedCount > 0 ? ` · ${selectedCount} selected for masterlist` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="election-page__grade-summary-right">
                    {!isG12 ? (
                      <div className="election-page__grade-turnout">
                        <p className="election-page__grade-turnout-label">Grade Turnout</p>
                        <p className="election-page__grade-turnout-value">
                          {gradeVotedCount.toLocaleString()} / {filteredGradeLearners.length.toLocaleString()} voters
                        </p>
                      </div>
                    ) : (
                      <div className="election-page__grade-turnout election-page__grade-turnout--muted">
                        <p className="election-page__grade-turnout-label">Grade Turnout</p>
                        <p className="election-page__grade-turnout-value">Non-voting batch</p>
                      </div>
                    )}
                    <div className="election-page__grade-percentage">{turnoutPercent}%</div>
                  </div>
                </div>
              </button>

              {isExpanded ? (
                <div className="election-page__grade-body">
                  {(sections || [])
                    .filter((section) => section.gradeLevel === grade)
                    .map((section) => {
                      const sectionLearners = filteredGradeLearners.filter((learner) => learner.sectionId === section.id);
                      if (sectionLearners.length === 0 && searchTerm) return null;

                      const isSectionExpanded = expandedSections[section.id] || searchTerm !== '';
                      const sectionVotedCount = getVoteCount(sectionLearners);
                      const males = sectionLearners.filter((learner) => getGenderChar(learner) === 'M');
                      const females = sectionLearners.filter((learner) => getGenderChar(learner) === 'F');
                      const others = sectionLearners.filter((learner) => getGenderChar(learner) === 'U');

                      return (
                        <div key={section.id} className="election-page__section-card">
                          <button
                            type="button"
                            onClick={() => setExpandedSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                            className={`election-page__section-toggle ${isSectionExpanded ? 'election-page__section-toggle--expanded' : ''} ${isG12 ? 'election-page__section-toggle--grade12' : ''}`}
                          >
                            <div className="election-page__section-toggle-content">
                              <label className={`election-page__masterlist-select election-page__masterlist-select--section${selectedSections.includes(section.id) ? ' election-page__masterlist-select--active' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedSections.includes(section.id)}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={() => handleToggleSectionSelection(section.id)}
                                />
                              </label>
                              <div className="election-page__section-icon election-page__section-icon--section">
                                <span className="material-symbols-outlined">groups</span>
                              </div>
                              <div className="election-page__section-copy">
                                <span className="election-page__section-name">{section.name}</span>
                                <span className="election-page__section-group-subtitle">{section.adviserName}</span>
                              </div>
                            </div>

                            <div className="election-page__section-toggle-meta">
                              {!isG12 ? (
                                <div className="election-page__section-group-progress">
                                  <p className="election-page__section-group-progress-label">Turnout</p>
                                  <p className="election-page__section-group-progress-value">{sectionVotedCount} / {sectionLearners.length}</p>
                                </div>
                              ) : (
                                <span className="election-page__vote-status election-page__vote-status--none">Ineligible Batch</span>
                              )}
                              <span className="material-symbols-outlined election-page__section-toggle-icon" aria-hidden="true">
                                expand_more
                              </span>
                            </div>
                          </button>

                          {isSectionExpanded ? (
                            <div className="election-page__section-body">
                              {renderLearnerTable(males, 'Male Learners', 'fa-mars')}
                              {renderLearnerTable(females, 'Female Learners', 'fa-venus')}
                              {renderLearnerTable(others, 'Unclassified', 'fa-genderless')}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="fixed -left-[9999px] opacity-0 pointer-events-none" ref={exportContainerRef} style={{ width: '210mm' }}>
        {selectedSections.map((sectionId) => {
          const section = sections.find((entry) => entry.id === sectionId);
          if (!section) return null;
          const students = learnerDatabase.filter((learner) => learner.sectionId === sectionId);

          return (
            <div key={sectionId}>
              <MasterlistDocument
                section={section}
                students={students}
                schoolYear={activeSchoolYear}
                schoolName={schoolName}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VotersTab;


