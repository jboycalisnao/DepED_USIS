import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { EnrollmentRecord, GradeLevel, Student } from '../types';
import ConfirmationModal from '../components/ConfirmationModal';
import LearnerDetailsModal from '../components/LearnerDetailsModal';
import { openLearnerInformationPrintWindow } from '../features/registrar/learners/utils/printLearnerInformation';
import { openGradeLevelSectionListPrintWindow, openSectionListPrintWindow } from '../features/registrar/learners/utils/printSectionList';
import { sendLearnerCredentialsViaWebhook } from '../features/registrar/learners/services/sendLearnerCredentialsEmail';
import LearnerEditModal from './learners/LearnerEditModal';
import { getActiveLearnersForYear } from '../services/dashboardService';
import { resolveAdviserLinkedSections, groupLearnersByLinkedSection } from './adviser-learners/utils/adviserLearnerAccess';
import { downloadAdviserSectionWorkbook } from './adviser-learners/utils/adviserLearnerWorkbook';
import { loadAdviserLearnerSnapshot, saveAdviserLearnerSnapshot } from './adviser-learners/utils/adviserLearnerCache';

const LearnerList: React.FC = () => {
  const { learners, sections, activeSchoolYear, availableStrands, registrarAccess, removeLearner, clearSectionLearners, updateLearner, loading } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [clearingSection, setClearingSection] = useState<{ name: string; id: string } | null>(null);
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [revealedPasswordLearnerId, setRevealedPasswordLearnerId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [sendingCredentialsStudent, setSendingCredentialsStudent] = useState<Student | null>(null);
  const previousHasSearchQueryRef = useRef(false);

  const isLocked = activeSchoolYear.isLocked;
  const isAdviserScopedAccess =
    registrarAccess?.coordinatorRole === 'school_usis_coordinator' &&
    resolveAdviserLinkedSections(
      sections,
      registrarAccess?.coordinatorName || '',
      registrarAccess?.coordinatorUsername || '',
      activeSchoolYear,
    ).length > 0;
  const adviserLinkedSections = resolveAdviserLinkedSections(
    sections,
    registrarAccess?.coordinatorName || '',
    registrarAccess?.coordinatorUsername || '',
    activeSchoolYear,
  );

  const baseActiveLearnersForYear = useMemo(() => getActiveLearnersForYear(learners, sections, activeSchoolYear), [learners, sections, activeSchoolYear]);

  const resolvePlacement = (student: Student) => {
    const studentSid = String(student.sectionId || '').trim();
    const section = sections.find((sec) => String(sec.id).trim() === studentSid);

    if (section && section.schoolYearId === activeSchoolYear.id) {
      return {
        gradeLevel: section.gradeLevel,
        sectionLabel: `${section.name}${section.strand ? ` [${section.strand}]` : ''}`,
        sectionId: section.id,
      };
    }

    return {
      gradeLevel: 'Unassigned Registry' as GradeLevel | 'Unassigned Registry',
      sectionLabel: 'Pending Placement',
      sectionId: undefined,
    };
  };

  const activeLearnersForYear = useMemo(() => {
    const query = searchTerm.toLowerCase();
    return baseActiveLearnersForYear.filter((l) => {
      const lastFirstMiddle = `${l.lastName}, ${l.firstName} ${l.middleName || ''}`.toLowerCase();
      const firstMiddleLast = `${l.firstName} ${l.middleName || ''} ${l.lastName}`.toLowerCase();
      const firstLastMiddle = `${l.firstName} ${l.lastName} ${l.middleName || ''}`.toLowerCase();
      const fullNameParts = [
        l.lastName,
        l.firstName,
        l.middleName || '',
        `${l.firstName} ${l.lastName}`,
        `${l.firstName} ${l.middleName || ''}`,
        `${l.middleName || ''} ${l.lastName}`,
      ]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
      return (
        lastFirstMiddle.includes(query) ||
        firstMiddleLast.includes(query) ||
        firstLastMiddle.includes(query) ||
        fullNameParts.includes(query) ||
        l.lrn.includes(query) ||
        String(l.loginUsername || '').toLowerCase().includes(query) ||
        String(l.loginStatus || '').toLowerCase().includes(query)
      );
    });
  }, [baseActiveLearnersForYear, searchTerm]);

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
      const placement = resolvePlacement(student);
      const gradeLabel = placement.gradeLevel;
      const sectionLabel = placement.sectionLabel;
      const actualSectionId = placement.sectionId;

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

  const adviserSectionGroups = useMemo(() => {
    if (!isAdviserScopedAccess) return [];
    return groupLearnersByLinkedSection(
      activeLearnersForYear,
      sections,
      registrarAccess?.coordinatorName || '',
      registrarAccess?.coordinatorUsername || '',
      activeSchoolYear,
    );
  }, [activeLearnersForYear, activeSchoolYear, isAdviserScopedAccess, registrarAccess?.coordinatorName, registrarAccess?.coordinatorUsername, sections]);

  const [cachedAdviserGroups, setCachedAdviserGroups] = useState<typeof adviserSectionGroups>([]);
  const [isAdviserCacheLoaded, setIsAdviserCacheLoaded] = useState(false);

  const visibleGroupedData = useMemo(() => {
    if (!isAdviserScopedAccess) return groupedData;
    const sourceGroups = adviserSectionGroups.length > 0 ? adviserSectionGroups : cachedAdviserGroups;
    const visible: Record<string, Record<string, { students: Student[]; sectionId?: string }>> = {};
    sourceGroups.forEach((group) => {
      const gradeLabel = group.section.gradeLevel;
      const sectionLabel = `${group.section.name}${group.section.strand ? ` [${group.section.strand}]` : ''}`;
      if (!visible[gradeLabel]) visible[gradeLabel] = {};
      visible[gradeLabel][sectionLabel] = {
        students: group.learners,
        sectionId: group.section.id,
      };
    });
    return visible;
  }, [adviserSectionGroups, cachedAdviserGroups, groupedData, isAdviserScopedAccess]);

  const adviserExport = () => {
    const exportGroups = adviserSectionGroups.length > 0 ? adviserSectionGroups : cachedAdviserGroups;
    if (!isAdviserScopedAccess || exportGroups.length === 0) return;
    const ok = downloadAdviserSectionWorkbook(exportGroups, activeSchoolYear.label, registrarAccess?.coordinatorName || 'Adviser');
    if (!ok) {
      setFeedback('No learners are available to export for your linked section.');
    }
  };

  const hasSearchQuery = searchTerm.trim().length > 0;

  useEffect(() => {
    if (isAdviserScopedAccess) {
      const nextGrades = new Set(Object.keys(visibleGroupedData));
      const nextSections = new Set(
        Object.entries(visibleGroupedData).flatMap(([grade, sectionsByGrade]) =>
          Object.keys(sectionsByGrade).map((sectionName) => grade + sectionName),
        ),
      );
      setExpandedGrades(nextGrades);
      setExpandedSections(nextSections);
      previousHasSearchQueryRef.current = hasSearchQuery;
      return;
    }

    if (hasSearchQuery) {
      const nextGrades = new Set<string>();
      const nextSections = new Set<string>();

      Object.entries(groupedData).forEach(([grade, sectionsByGrade]) => {
        const hasMatchingStudents = Object.values(sectionsByGrade).some((entry) => entry.students.length > 0);
        if (!hasMatchingStudents) return;

        nextGrades.add(grade);
        Object.entries(sectionsByGrade).forEach(([sectionName, entry]) => {
          if (entry.students.length > 0) {
            nextSections.add(grade + sectionName);
          }
        });
      });

      setExpandedGrades(nextGrades);
      setExpandedSections(nextSections);
      previousHasSearchQueryRef.current = true;
      return;
    }

    if (previousHasSearchQueryRef.current) {
      setExpandedGrades(new Set());
      setExpandedSections(new Set());
    }
    previousHasSearchQueryRef.current = false;
  }, [groupedData, hasSearchQuery, isAdviserScopedAccess, visibleGroupedData]);

  useEffect(() => {
    if (!isAdviserScopedAccess) return;
    const coordinatorUsername = registrarAccess?.coordinatorUsername || '';
    if (!coordinatorUsername) return;

    if (adviserSectionGroups.length > 0) {
      setCachedAdviserGroups(adviserSectionGroups);
      setIsAdviserCacheLoaded(true);
      void saveAdviserLearnerSnapshot(
        activeSchoolYear.id,
        activeSchoolYear.label,
        coordinatorUsername,
        registrarAccess?.coordinatorName || 'Adviser',
        adviserSectionGroups,
      );
      return;
    }

    if (isAdviserCacheLoaded) return;
    void loadAdviserLearnerSnapshot(activeSchoolYear.id, coordinatorUsername).then((snapshot) => {
      if (!snapshot?.groups?.length) return;
      setCachedAdviserGroups(snapshot.groups);
      setIsAdviserCacheLoaded(true);
    });
  }, [
    activeSchoolYear.id,
    activeSchoolYear.label,
    adviserSectionGroups,
    isAdviserScopedAccess,
    isAdviserCacheLoaded,
    registrarAccess?.coordinatorName,
    registrarAccess?.coordinatorUsername,
  ]);

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

  const printGradeLevelList = (grade: string) => {
    const gradeSections = Object.entries(visibleGroupedData[grade] || {})
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([sectionName, data]) => {
        const sectionForPrint = sections.find((section) => section.id === data.sectionId);
        return sectionForPrint
          ? {
              section: sectionForPrint,
              learners: data.students,
            }
          : null;
      })
      .filter(Boolean) as Array<{ section: Section; learners: Student[] }>;

    if (gradeSections.length === 0) {
      setFeedback('No section data available for this grade level.');
      return;
    }

    const ok = openGradeLevelSectionListPrintWindow({
      gradeLevel: grade,
      schoolYearLabel: activeSchoolYear.label,
      sections: gradeSections,
    });
    if (!ok) setFeedback('Popup blocked. Allow popups for this site to print the grade-level section list.');
  };

  const GENDER_ORDER = ['Male', 'Female', 'Other'];
  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
  };

  const openSendCredentials = (student: Student) => {
    setSendingCredentialsStudent(student);
  };

  return (
    <div className="registrar-learners-page">
      <div className="registrar-learners-page__search">
        {isAdviserScopedAccess ? (
          <>
            <div className="registrar-learners-page__meta-box registrar-learners-page__meta-box--wide">
              <span className="registrar-learners-page__meta-label">Linked Section</span>
              <span className="registrar-learners-page__meta-value">
                {adviserLinkedSections.map((section) => section.name).join(', ')}
              </span>
            </div>
            <button type="button" className="secondary-button" onClick={adviserExport} disabled={loading || adviserSectionGroups.length === 0}>
              <span className="material-symbols-outlined" aria-hidden="true">download</span>
              Download Excel
            </button>
          </>
        ) : (
          <>
            <div className="registrar-learners-page__search-field">
              <label className="floating-field">
                <div className="floating-field__control registrar-learners-page__search-control" data-has-value={hasSearchQuery ? 'true' : 'false'}>
                  <input
                    type="text"
                    placeholder=" "
                    className="registrar-learners-page__search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <span className="registrar-learners-page__search-label">
                    <span className="material-symbols-outlined" aria-hidden="true">search</span>
                    <span>Search Learners</span>
                  </span>
                  {hasSearchQuery && (
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
              </label>
            </div>
            <div className="registrar-learners-page__meta-box">
              <span className="registrar-learners-page__meta-label">Active Registry</span>
              <span className="registrar-learners-page__meta-value">{baseActiveLearnersForYear.length}</span>
            </div>
          </>
        )}
      </div>

      <div className="registrar-learners-page__groups">
        {Object.keys(visibleGroupedData).length > 0 ? (
          Object.keys(visibleGroupedData)
            .sort((a, b) => {
              const order = Object.values(GradeLevel);
              return order.indexOf(a as GradeLevel) - order.indexOf(b as GradeLevel);
            })
            .map((grade) => (
              (() => {
                const totalLearners = Object.values(visibleGroupedData[grade]).reduce((sum, entry) => sum + entry.students.length, 0);
                const totalSections = Object.keys(visibleGroupedData[grade]).length;

                return (
              <div key={grade} className="registrar-learners-page__grade">
                <div className="registrar-learners-page__grade-head">
                  <button
                    onClick={() => toggleGrade(grade)}
                    className="registrar-learners-page__grade-toggle"
                    aria-expanded={expandedGrades.has(grade)}
                  >
                    <div className="registrar-learners-page__grade-title">
                      <div className="registrar-learners-page__grade-icon">
                        <span className="material-symbols-outlined">{expandedGrades.has(grade) ? 'keyboard_arrow_down' : 'keyboard_arrow_right'}</span>
                      </div>
                      <div>
                        <h3 className="registrar-learners-page__grade-name">{grade}</h3>
                        <p className="registrar-learners-page__grade-count">{totalLearners} Total Learners in {totalSections} Sections</p>
                      </div>
                    </div>
                  </button>
                  <div className="registrar-learners-page__grade-actions">
                    <button
                      type="button"
                      className="registrar-learners-page__print-btn"
                      onClick={() => printGradeLevelList(grade)}
                      disabled={Object.keys(visibleGroupedData[grade] || {}).length === 0}
                    >
                      <span className="material-symbols-outlined">print</span>
                      Print Grade List
                    </button>
                  </div>
                </div>

                {expandedGrades.has(grade) && (
                  <div className="registrar-learners-page__sections">
                    {(Object.entries(visibleGroupedData[grade]) as [string, { students: Student[]; sectionId?: string }][])
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([sectionName, data]) => {
                        const sectionKey = grade + sectionName;
                        return (
                          <div key={sectionName} className="registrar-learners-page__section">
                            <div className="registrar-learners-page__section-head">
                              <button
                                onClick={() => toggleSection(sectionKey)}
                                className="registrar-learners-page__section-toggle"
                                aria-expanded={expandedSections.has(sectionKey)}
                              >
                                <div className="registrar-learners-page__section-icon">
                                  <span className={`material-symbols-outlined ${expandedSections.has(sectionKey) ? 'is-open' : ''}`}>chevron_right</span>
                                </div>
                                <span className="registrar-learners-page__section-name">{sectionName}</span>
                                <span className="registrar-learners-page__section-count">- {data.students.length} Learners</span>
                              </button>

                              <div className="registrar-learners-page__section-actions">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const sectionForPrint = sections.find((section) => section.id === data.sectionId);
                                    if (!sectionForPrint) return;
                                    const ok = openSectionListPrintWindow({
                                      gradeLevel: grade,
                                      learners: data.students,
                                      schoolYearLabel: activeSchoolYear.label,
                                      section: sectionForPrint,
                                    });
                                    if (!ok) setFeedback('Popup blocked. Allow popups for this site to print the section list.');
                                  }}
                                  className="registrar-learners-page__print-btn"
                                >
                                  <span className="material-symbols-outlined">print</span>
                                  Print Section List
                                </button>
                              </div>
                            </div>

                            {expandedSections.has(sectionKey) && (
                              <div className="registrar-learners-page__table-wrap">
                                <table className="registrar-learners-page__table">
                                  <thead>
                                    <tr>
                                      <th>LRN</th>
                                      <th>Name</th>
                                      <th>Username</th>
                                      {!isAdviserScopedAccess ? <th>Password</th> : null}
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
                                            <td colSpan={isAdviserScopedAccess ? 6 : 7}>
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
                                              {!isAdviserScopedAccess ? (
                                                <td className="mono">
                                                  {student.loginPassword
                                                    ? revealedPasswordLearnerId === student.id
                                                      ? student.loginPassword
                                                      : '*'.repeat(Math.min(student.loginPassword.length, 10))
                                                    : 'Not Set'}
                                                </td>
                                              ) : null}
                                              <td><span className="login-state">{student.loginStatus || 'Active'}</span></td>
                                              <td className="align-center">
                                                <span className={`gender-badge ${student.gender === 'Male' ? 'male' : 'female'}`}>{student.gender}</span>
                                              </td>
                                              <td className="align-right">
                                                <div className="row-actions">
                                                  {!isAdviserScopedAccess ? (
                                                    <button
                                                      onClick={() => setRevealedPasswordLearnerId((current) => (current === student.id ? null : student.id))}
                                                      className="icon-btn"
                                                      title={revealedPasswordLearnerId === student.id ? 'Hide Password' : 'Reveal Password'}
                                                    >
                                                      <span className="material-symbols-outlined">
                                                        {revealedPasswordLearnerId === student.id ? 'visibility_off' : 'visibility'}
                                                      </span>
                                                    </button>
                                                  ) : null}
                                                  <button
                                                    onClick={() => openEditStudent(student)}
                                                    className="icon-btn"
                                                    title="Edit Learner Information"
                                                  >
                                                    <span className="material-symbols-outlined">edit</span>
                                                  </button>
                                                  {!isAdviserScopedAccess ? (
                                                    <>
                                                      <button
                                                        onClick={() => openSendCredentials(student)}
                                                        className="icon-btn registrar-learners-page__email-btn"
                                                        title={student.email ? 'Send Credentials Email' : 'Learner email is not set'}
                                                        disabled={!student.email}
                                                      >
                                                        <span className="material-symbols-outlined">mail</span>
                                                      </button>
                                                      <button
                                                        onClick={async () => {
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
                                                    </>
                                                  ) : null}
                                                  {!isAdviserScopedAccess && !isLocked && (
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
                );
              })()
            ))
        ) : (
          <div className="registrar-learners-page__empty">
            <span className="material-symbols-outlined">group_off</span>
            <p>{isAdviserScopedAccess ? 'No learners are linked to your section for this school year.' : 'No learners registered for this year'}</p>
          </div>
        )}
      </div>

      {!isAdviserScopedAccess ? (
        <>
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
        </>
      ) : null}

      <LearnerDetailsModal student={selectedStudent} history={derivedHistory} onClose={() => setSelectedStudent(null)} />
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
      {!isAdviserScopedAccess ? (
        <ConfirmationModal
          isOpen={!!sendingCredentialsStudent}
          type="accent"
          title="Send Credentials Email"
          message={`Send login credentials to ${sendingCredentialsStudent?.lastName}, ${sendingCredentialsStudent?.firstName}? This will use ${sendingCredentialsStudent?.email || sendingCredentialsStudent?.microsoftUpn || 'the learner email address on record'}.`}
          onConfirm={async () => {
            if (!sendingCredentialsStudent) return;
            try {
              const section = sections.find((entry) => String(entry.id || '').trim() === String(sendingCredentialsStudent.sectionId || '').trim());
              const result = await sendLearnerCredentialsViaWebhook({
                learner: sendingCredentialsStudent,
                schoolId: String(registrarAccess?.schoolId || '302522').trim(),
                schoolYearLabel: activeSchoolYear.label,
                sectionLabel: section ? `${section.name}${section.strand ? ` [${section.strand}]` : ''}` : 'Unassigned',
              });
              setFeedback(result?.message || 'Learner credentials email sent.');
            } catch (error: any) {
              setFeedback(error?.message || 'Unable to send learner credentials email.');
            } finally {
              setSendingCredentialsStudent(null);
            }
          }}
          onCancel={() => setSendingCredentialsStudent(null)}
          isLoading={loading}
        />
      ) : null}
      <ConfirmationModal
        isOpen={!!feedback}
        type="accent"
        title="Notice"
        message={feedback || ''}
        confirmLabel="Close"
        hideCancel
        onConfirm={() => setFeedback(null)}
      />
    </div>
  );
};

export default LearnerList;


