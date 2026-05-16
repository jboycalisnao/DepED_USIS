import React, { useMemo, useState } from 'react';
import { useStore } from '../store';
import { EnrollmentRecord, GradeLevel, Student } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import LearnerDetailsModal from '../components/LearnerDetailsModal';
import { openLearnerInformationPrintWindow } from '../features/registrar/learners/utils/printLearnerInformation';

const LearnerList: React.FC = () => {
  const { learners, sections, activeSchoolYear, removeLearner, clearSectionLearners, loading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [clearingSection, setClearingSection] = useState<{ name: string; id: string } | null>(null);
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [revealedPasswordLearnerId, setRevealedPasswordLearnerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isLocked = activeSchoolYear.isLocked;

  const activeLearnersForYear = useMemo(() => {
    const activeSectionIds = new Set(sections.filter((s) => s.schoolYearId === activeSchoolYear.id).map((s) => s.id));

    return learners.filter((l) => {
      const studentSid = String(l.sectionId || '').trim();
      const currentEnrol = l.enrollments?.find((e) => e.schoolYear === activeSchoolYear.label);
      const hasActiveSection = studentSid && activeSectionIds.has(studentSid);
      const hasMatchingEnrollment = !!currentEnrol;
      const query = searchTerm.toLowerCase();
      const fullName = `${l.lastName}, ${l.firstName} ${l.middleName || ''}`.toLowerCase();
      const matchesSearch =
        fullName.includes(query) ||
        l.lrn.includes(query) ||
        String(l.loginUsername || '').toLowerCase().includes(query) ||
        String(l.loginStatus || '').toLowerCase().includes(query);

      return (hasActiveSection || hasMatchingEnrollment) && matchesSearch;
    });
  }, [learners, sections, activeSchoolYear, searchTerm]);

  const derivedHistory = useMemo(() => {
    if (!selectedStudent) return [];
    const allInstances = learners.filter((l) => l.lrn === selectedStudent.lrn);
    const historyMap = new Map<string, EnrollmentRecord>();

    allInstances.forEach((instance) => {
      const studentSid = String(instance.sectionId || '').trim();
      const section = sections.find((s) => String(s.id).trim() === studentSid);

      if (section) {
        const sy = section.schoolYearId.startsWith('sy')
          ? section.schoolYearId.replace('sy', '').replace(/(\d{2})(\d{2})/, '20$1-20$2')
          : section.schoolYearId;
        const syLabel = activeSchoolYear.id === section.schoolYearId ? activeSchoolYear.label : sy;
        const matchingEnrollment = instance.enrollments?.find((e) => e.schoolYear === syLabel);
        const actualEntryDate = matchingEnrollment?.enrollmentDate || new Date().toISOString().split('T')[0];

        historyMap.set(syLabel, {
          id: instance.id,
          schoolYear: syLabel,
          gradeLevel: section.gradeLevel,
          section: section.name,
          enrollmentDate: actualEntryDate,
          status: instance.status,
        });
      }
    });

    return Array.from(historyMap.values()).sort((a, b) => b.schoolYear.localeCompare(a.schoolYear));
  }, [selectedStudent, learners, sections, activeSchoolYear]);

  const groupedData = useMemo(() => {
    const groups: Record<string, Record<string, { students: Student[]; sectionId?: string }>> = {};

    activeLearnersForYear.forEach((student) => {
      const studentSid = String(student.sectionId || '').trim();
      const section = sections.find((sec) => String(sec.id).trim() === studentSid);

      let gradeLabel = 'Unassigned Registry';
      let sectionLabel = 'Pending Placement';
      let actualSectionId: string | undefined;

      if (section && section.schoolYearId === activeSchoolYear.id) {
        gradeLabel = section.gradeLevel;
        const progSuffix = section.strand ? ` [${section.strand}]` : '';
        sectionLabel = `${section.name}${progSuffix}`;
        actualSectionId = section.id;
      } else {
        const currentEnrollment = student.enrollments?.find((e) => e.schoolYear === activeSchoolYear.label);
        if (currentEnrollment) {
          gradeLabel = currentEnrollment.gradeLevel;
          sectionLabel = currentEnrollment.section || 'Unassigned Registry';
        }
      }

      if (!groups[gradeLabel]) groups[gradeLabel] = {};
      if (!groups[gradeLabel][sectionLabel]) groups[gradeLabel][sectionLabel] = { students: [], sectionId: actualSectionId };
      groups[gradeLabel][sectionLabel].students.push(student);
    });

    Object.keys(groups).forEach((grade) => {
      Object.keys(groups[grade]).forEach((section) => {
        groups[grade][section].students.sort((a, b) => {
          const genderOrder: Record<string, number> = { Male: 1, Female: 2, Other: 3 };
          const orderA = genderOrder[a.gender] || 4;
          const orderB = genderOrder[b.gender] || 4;
          if (orderA !== orderB) return orderA - orderB;
          return `${a.lastName}, ${a.firstName}`.toUpperCase().localeCompare(`${b.lastName}, ${b.firstName}`.toUpperCase());
        });
      });
    });

    return groups;
  }, [activeLearnersForYear, sections, activeSchoolYear]);

  const toggleGrade = (grade: string) => {
    const next = new Set(expandedGrades);
    if (next.has(grade)) next.delete(grade);
    else next.add(grade);
    setExpandedGrades(next);
  };

  const toggleSection = (sectionKey: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionKey)) next.delete(sectionKey);
    else next.add(sectionKey);
    setExpandedSections(next);
  };

  const GENDER_ORDER = ['Male', 'Female', 'Other'];

  return (
    <div className="registrar-learners-page">
      <div className="registrar-learners-page__search">
        <div className="registrar-learners-page__search-field">
          <span className="material-symbols-outlined registrar-learners-page__search-icon">search</span>
          <input
            type="text"
            placeholder={`Search ${activeLearnersForYear.length} learners in ${activeSchoolYear.label}...`}
            className="registrar-learners-page__search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm.trim() && (
            <button
              type="button"
              className="registrar-search-clear-btn"
              onClick={() => setSearchTerm('')}
              aria-label="Clear learner search"
              title="Clear"
            >
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
          )}
        </div>
        <div className="registrar-learners-page__meta-box">
          <span className="registrar-learners-page__meta-label">Active Registry</span>
          <span className="registrar-learners-page__meta-value">{activeLearnersForYear.length}</span>
        </div>
      </div>

      <div className="registrar-learners-page__groups">
        {Object.keys(groupedData).length > 0 ? (
          Object.keys(groupedData)
            .sort((a, b) => {
              const order = Object.values(GradeLevel);
              return order.indexOf(a as GradeLevel) - order.indexOf(b as GradeLevel);
            })
            .map((grade) => (
              <div key={grade} className="registrar-learners-page__grade">
                <button onClick={() => toggleGrade(grade)} className="registrar-learners-page__grade-toggle">
                  <div className="registrar-learners-page__grade-title">
                    <div className="registrar-learners-page__grade-icon">
                      <span className="material-symbols-outlined">{expandedGrades.has(grade) ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</span>
                    </div>
                    <div>
                      <h3 className="registrar-learners-page__grade-name">{grade}</h3>
                      <p className="registrar-learners-page__grade-count">{Object.keys(groupedData[grade]).length} Active Sections</p>
                    </div>
                  </div>
                </button>

                {expandedGrades.has(grade) && (
                  <div className="registrar-learners-page__sections">
                    {(Object.entries(groupedData[grade]) as [string, { students: Student[]; sectionId?: string }][])
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([sectionName, data]) => {
                        const sectionKey = grade + sectionName;
                        return (
                          <div key={sectionName} className="registrar-learners-page__section">
                            <div className="registrar-learners-page__section-head">
                              <button onClick={() => toggleSection(sectionKey)} className="registrar-learners-page__section-toggle">
                                <div className="registrar-learners-page__section-icon">
                                  <span className={`material-symbols-outlined ${expandedSections.has(sectionKey) ? 'is-open' : ''}`}>chevron_right</span>
                                </div>
                                <span className="registrar-learners-page__section-name">{sectionName}</span>
                                <span className="registrar-learners-page__section-count">- {data.students.length} Learners</span>
                              </button>

                              {!isLocked && data.sectionId && (
                                <div className="registrar-learners-page__section-actions">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClearingSection({ name: sectionName, id: data.sectionId! });
                                    }}
                                    className="registrar-learners-page__clear-btn"
                                  >
                                    <span className="material-symbols-outlined">person_remove</span>
                                    Clear Section
                                  </button>
                                </div>
                              )}
                            </div>

                            {expandedSections.has(sectionKey) && (
                              <div className="registrar-learners-page__table-wrap">
                                <table className="registrar-learners-page__table">
                                  <thead>
                                    <tr>
                                      <th>LRN</th>
                                      <th>Name</th>
                                      <th>Username</th>
                                      <th>Password</th>
                                      <th>Login</th>
                                      <th className="align-center">Sex</th>
                                      <th className="align-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {GENDER_ORDER.map((gender) => {
                                      const students = data.students.filter((s) => s.gender === gender);
                                      if (students.length === 0) return null;
                                      return (
                                        <React.Fragment key={gender}>
                                          <tr className="registrar-learners-page__gender-row">
                                            <td colSpan={7}>
                                              <span>{gender} - {students.length}</span>
                                            </td>
                                          </tr>
                                          {students.map((student) => (
                                            <tr key={student.id}>
                                              <td className="mono">{student.lrn}</td>
                                              <td>
                                                <div className="name">{student.lastName}, {student.firstName} {student.middleName || ''}</div>
                                              </td>
                                              <td>{student.loginUsername || 'Not Set'}</td>
                                              <td className="mono">
                                                {student.loginPassword
                                                  ? revealedPasswordLearnerId === student.id
                                                    ? student.loginPassword
                                                    : '*'.repeat(Math.min(student.loginPassword.length, 10))
                                                  : 'Not Set'}
                                              </td>
                                              <td><span className="login-state">{student.loginStatus || 'Active'}</span></td>
                                              <td className="align-center">
                                                <span className={`gender-badge ${student.gender === 'Male' ? 'male' : 'female'}`}>{student.gender}</span>
                                              </td>
                                              <td className="align-right">
                                                <div className="row-actions">
                                                  <button
                                                    onClick={() => setRevealedPasswordLearnerId((current) => (current === student.id ? null : student.id))}
                                                    className="icon-btn"
                                                    title={revealedPasswordLearnerId === student.id ? 'Hide Password' : 'Reveal Password'}
                                                  >
                                                    <span className="material-symbols-outlined">
                                                      {revealedPasswordLearnerId === student.id ? 'visibility_off' : 'visibility'}
                                                    </span>
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      const ok = openLearnerInformationPrintWindow({
                                                        learners: [student],
                                                        sections,
                                                        schoolYearLabel: activeSchoolYear.label,
                                                      });
                                                      if (!ok) setFeedback('Popup blocked. Allow popups for this site to print learner information sheet.');
                                                    }}
                                                    className="icon-btn"
                                                    title="Print Learner Information"
                                                  >
                                                    <span className="material-symbols-outlined">print</span>
                                                  </button>
                                                  {!isLocked && (
                                                    <button onClick={() => setDeletingStudent(student)} className="icon-btn danger">
                                                      <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          ))}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ))
        ) : (
          <div className="registrar-learners-page__empty">
            <span className="material-symbols-outlined">group_off</span>
            <p>No learners registered for this year</p>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!deletingStudent}
        type="danger"
        title="Remove Learner"
        message={`Delete ${deletingStudent?.lastName}, ${deletingStudent?.firstName} from the central registry?`}
        onConfirm={async () => {
          if (deletingStudent) await removeLearner(deletingStudent.id);
          setDeletingStudent(null);
        }}
        onCancel={() => setDeletingStudent(null)}
        isLoading={loading}
      />

      <ConfirmationModal
        isOpen={!!clearingSection}
        type="accent"
        title="Purge Section List"
        message={`Remove ALL learners currently enrolled in "${clearingSection?.name}"? The section itself will remain, but the registry will be cleared.`}
        onConfirm={async () => {
          if (clearingSection) await clearSectionLearners(clearingSection.id);
          setClearingSection(null);
        }}
        onCancel={() => setClearingSection(null)}
        isLoading={loading}
      />

      <LearnerDetailsModal student={selectedStudent} history={derivedHistory} onClose={() => setSelectedStudent(null)} />
      <ConfirmationModal
        isOpen={!!feedback}
        type="accent"
        title="Print Notice"
        message={feedback || ''}
        confirmLabel="Close"
        hideCancel
        onConfirm={() => setFeedback(null)}
      />
    </div>
  );
};

export default LearnerList;


