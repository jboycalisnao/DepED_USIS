import React, { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { Student } from '../../types';
import LearnerEditModal from '../learners/LearnerEditModal';
import { getActiveLearnersForYear } from '../../services/dashboardService';
import { groupLearnersByLinkedSection, resolveAdviserLinkedSections } from './utils/adviserLearnerAccess';
import { downloadAdviserSectionWorkbook } from './utils/adviserLearnerWorkbook';

const AdviserLearnersPage: React.FC = () => {
  const { learners, sections, activeSchoolYear, availableStrands, registrarAccess, updateLearner, loading } = useStore();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const linkedSections = useMemo(
    () => resolveAdviserLinkedSections(
      sections,
      registrarAccess?.coordinatorName || '',
      registrarAccess?.coordinatorUsername || '',
      activeSchoolYear,
    ),
    [sections, registrarAccess?.coordinatorName, registrarAccess?.coordinatorUsername, activeSchoolYear],
  );

  const sectionGroups = useMemo(
    () => groupLearnersByLinkedSection(
      getActiveLearnersForYear(learners, sections, activeSchoolYear),
      sections,
      registrarAccess?.coordinatorName || '',
      registrarAccess?.coordinatorUsername || '',
      activeSchoolYear,
    ),
    [activeSchoolYear, learners, registrarAccess?.coordinatorName, registrarAccess?.coordinatorUsername, sections],
  );

  const activeSectionGroup = sectionGroups[0] ? [sectionGroups[0]] : [];

  const totalLearners = useMemo(
    () => activeSectionGroup.reduce((count, group) => count + group.learners.length, 0),
    [activeSectionGroup],
  );

  const activeSection = activeSectionGroup[0] || null;
  const canAccessSectionLearners = Boolean(activeSection);

  const handleExport = () => {
    if (!canAccessSectionLearners) {
      setFeedback('No linked section found for this adviser account.');
      return;
    }
    const ok = downloadAdviserSectionWorkbook(activeSectionGroup, activeSchoolYear.label, registrarAccess?.coordinatorName || 'Adviser');
    if (!ok) {
      setFeedback('No learners are available to export for your linked section.');
    }
  };

  return (
    <div className="registrar-adviser-learners-page">
      <section className="section-card">
        <div className="section-card__bar" />
        <div className="section-card__content">
          <div className="registrar-adviser-learners-page__head">
            <div className="registrar-adviser-learners-page__summary">
              <p className="section-card__eyebrow">Adviser Section Access</p>
              <h3>My Section Learners</h3>
              <p>
                {canAccessSectionLearners
                  ? `Viewing learners for ${activeSection?.section.name || linkedSections[0]?.name} in SY ${activeSchoolYear.label}.`
                  : 'No linked section was found for this adviser account.'}
              </p>
            </div>
            <div className="registrar-adviser-learners-page__toolbar">
              <div className="status-badge status-badge--inactive">
                <span className="material-symbols-outlined" aria-hidden="true">groups</span>
                {totalLearners.toLocaleString()} Learners
              </div>
              <button type="button" className="secondary-button" onClick={handleExport} disabled={!canAccessSectionLearners || loading}>
                <span className="material-symbols-outlined" aria-hidden="true">download</span>
                Download Excel
              </button>
            </div>
          </div>

          {feedback ? <div className="notice-box registrar-adviser-learners-page__notice">{feedback}</div> : null}

          <div className="registrar-adviser-learners-page__sections">
            {activeSection ? (
              activeSectionGroup.map((group) => (
                <section key={group.section.id} className="section-card">
                  <div className="section-card__bar" />
                  <div className="section-card__content">
                    <div className="registrar-adviser-learners-page__section-head">
                      <div>
                        <p className="section-card__eyebrow">{group.section.gradeLevel}</p>
                        <h3>{group.section.name}</h3>
                        <p>{group.learners.length} learner(s) in this linked section.</p>
                      </div>
                      <span className="status-badge status-badge--open">
                        <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
                        Adviser Linked
                      </span>
                    </div>

                    <div className="registrar-learners-page__table-wrap">
                      <table className="registrar-learners-page__table">
                        <thead>
                          <tr>
                            <th>LRN</th>
                            <th>First Name</th>
                            <th>Middle Name</th>
                            <th>Last Name</th>
                            <th>Username</th>
                            <th>Login</th>
                            <th className="align-center">Sex</th>
                            <th className="align-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.learners.map((student) => (
                            <tr key={student.id}>
                              <td className="mono">{student.lrn}</td>
                              <td>{student.firstName}</td>
                              <td>{student.middleName || '-'}</td>
                              <td>{student.lastName}</td>
                              <td>{student.loginUsername || 'Not Set'}</td>
                              <td><span className="login-state">{student.loginStatus || 'Active'}</span></td>
                              <td className="align-center">
                                <span className={`gender-badge ${student.gender === 'Male' ? 'male' : 'female'}`}>{student.gender}</span>
                              </td>
                              <td className="align-right">
                                <div className="row-actions">
                                  <button type="button" onClick={() => setEditingStudent(student)} className="icon-btn" title="Edit Learner Information">
                                    <span className="material-symbols-outlined">edit</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {group.learners.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="registrar-learners-page__empty-row">
                                No learners linked to this section yet.
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              ))
            ) : (
              <div className="registrar-adviser-learners-page__empty">
                <span className="material-symbols-outlined" aria-hidden="true">lock</span>
                <p>No linked section is assigned to this adviser account.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <LearnerEditModal
        student={editingStudent}
        activeSchoolYearLabel={activeSchoolYear.label}
        strandOptions={availableStrands.map((strand) => strand.acronym).filter(Boolean)}
        loading={loading}
        onClose={() => setEditingStudent(null)}
        onError={(message) => setFeedback(message)}
        onSuccess={(message) => setFeedback(message)}
        onSubmit={updateLearner}
      />
    </div>
  );
};

export default AdviserLearnersPage;
