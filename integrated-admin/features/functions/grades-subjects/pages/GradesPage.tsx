import { useEffect, useMemo, useState } from 'react';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { UsisAlertModal } from '../../../../../common/components/UsisAlertModal';
import { UsisGradeSectionList, type UsisGradeSectionListGrade } from '../../../../../common/components/ui/UsisGradeSectionList';
import { getStoredIntegratedAdminAccess } from '../../../auth/services/integratedAdminAccess';
import { loadLearnersBySectionIds, loadQuarterGradesMap, loadTeacherSectionsAndSubjects, saveQuarterGradesForSubject, type LearnerQuarterGrades, type SectionLearner, type TeacherSectionSubject } from '../services/gradesPageService';

type SubjectLearnersPanelProps = {
  gradesByKey: Map<string, LearnerQuarterGrades>;
  learners: SectionLearner[];
  onGradeChange: (key: string, quarter: 'quarter1' | 'quarter2' | 'quarter3' | 'quarter4', value: string) => void;
  onSaveSubject: (subject: TeacherSectionSubject, learners: SectionLearner[]) => Promise<void>;
  savingSubjectKey: string;
  subjects: TeacherSectionSubject[];
};

const normalizeGenderGroup = (value: string) => {
  const normalized = String(value || '').toLowerCase();
  if (normalized.startsWith('m')) return 'Male';
  if (normalized.startsWith('f')) return 'Female';
  return 'Unspecified';
};

function SubjectLearnersPanel({ gradesByKey, learners, onGradeChange, onSaveSubject, savingSubjectKey, subjects }: SubjectLearnersPanelProps) {
  return (
    <div className="registry-table-wrap">
      <div className="ia-teacher-grades-subject-list">
        {subjects.map((subject) => (
          <details key={`${subject.sectionId}-${subject.subjectCode}`} className="usis-grade-section-list__section ia-teacher-grades-subject-item" open>
            <summary className="usis-grade-section-list__section-toggle">
              <span className="usis-grade-section-list__section-head">
                <span className="usis-grade-section-list__section-icon">
                  <span className="material-symbols-outlined is-open">chevron_right</span>
                </span>
                <strong className="usis-grade-section-list__section-name">{subject.subjectCode}</strong>
                <small className="usis-grade-section-list__section-count">{subject.subjectTitle}</small>
              </span>
            </summary>
            <div className="ia-teacher-grades-learners">
              {learners.length === 0 ? (
                <p className="registry-copy">No learners found for this section.</p>
              ) : (
                <div className="ia-teacher-grades-grouped">
                  {['Male', 'Female', 'Unspecified'].map((group) => {
                    const rows = learners.filter((learner) => normalizeGenderGroup(learner.gender) === group);
                    if (rows.length === 0) return null;
                    return (
                      <section key={`${subject.sectionId}-${subject.subjectCode}-${group}`} className="ia-teacher-grades-gender-block">
                        <h4>{group}</h4>
                        <table className="registry-table ia-registry-table--enhanced">
                          <thead>
                            <tr>
                              <th>Learner Name</th>
                              <th>1st Quarter</th>
                              <th>2nd Quarter</th>
                              <th>3rd Quarter</th>
                              <th>4th Quarter</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((learner) => {
                              const key = `${subject.sectionId}::${subject.subjectCode}::${learner.id}`;
                              const grades = gradesByKey.get(key) || { quarter1: '', quarter2: '', quarter3: '', quarter4: '' };
                              return (
                                <tr key={learner.id}>
                                  <td>{learner.name}</td>
                                  <td><input className="ia-teacher-grades-input" value={grades.quarter1} onChange={(event) => onGradeChange(key, 'quarter1', event.target.value)} placeholder="--" /></td>
                                  <td><input className="ia-teacher-grades-input" value={grades.quarter2} onChange={(event) => onGradeChange(key, 'quarter2', event.target.value)} placeholder="--" /></td>
                                  <td><input className="ia-teacher-grades-input" value={grades.quarter3} onChange={(event) => onGradeChange(key, 'quarter3', event.target.value)} placeholder="--" /></td>
                                  <td><input className="ia-teacher-grades-input" value={grades.quarter4} onChange={(event) => onGradeChange(key, 'quarter4', event.target.value)} placeholder="--" /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </section>
                    );
                  })}
                  <div className="ia-teacher-grades-actions">
                    <button type="button" className="registry-action-button" onClick={() => { void onSaveSubject(subject, learners); }}>
                      {savingSubjectKey === `${subject.sectionId}::${subject.subjectCode}` ? 'Saving...' : 'Save Grades'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export function GradesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [successAlert, setSuccessAlert] = useState<{ title: string; message: string } | null>(null);
  const [assignments, setAssignments] = useState<TeacherSectionSubject[]>([]);
  const [learnersBySection, setLearnersBySection] = useState<Map<string, SectionLearner[]>>(new Map());
  const [gradesByKey, setGradesByKey] = useState<Map<string, LearnerQuarterGrades>>(new Map());
  const [savingSubjectKey, setSavingSubjectKey] = useState('');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const session = getStoredIntegratedAdminAccess();
        const accountId = String(session?.userId || '').trim();
        if (!accountId) throw new Error('No active coordinator session found.');
        const teacherAssignments = await loadTeacherSectionsAndSubjects(accountId);
        const sectionIds = Array.from(new Set(teacherAssignments.map((row) => row.sectionId)));
        const learners = await loadLearnersBySectionIds(
          teacherAssignments.map((row) => ({ sectionId: row.sectionId, sectionName: row.sectionName })),
        );
        const savedGrades = await loadQuarterGradesMap(sectionIds);
        if (!isMounted) return;
        setAssignments(teacherAssignments);
        setLearnersBySection(learners);
        setGradesByKey(savedGrades);
        setError('');
        setNotice('');
      } catch (nextError: any) {
        if (!isMounted) return;
        setError(nextError?.message || 'Unable to load grades page.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  const grouped = useMemo<UsisGradeSectionListGrade[]>(() => {
    const byGrade = new Map<string, TeacherSectionSubject[]>();
    assignments.forEach((row) => {
      const gradeKey = row.gradeLevel || 'Unassigned';
      const current = byGrade.get(gradeKey) || [];
      current.push(row);
      byGrade.set(gradeKey, current);
    });

    const gradeOrder = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
    const sortedGrades = Array.from(byGrade.keys()).sort((a, b) => {
      const ai = gradeOrder.indexOf(a);
      const bi = gradeOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    return sortedGrades.map((gradeKey) => {
      const gradeRows = byGrade.get(gradeKey) || [];
      const bySection = new Map<string, TeacherSectionSubject[]>();
      gradeRows.forEach((row) => {
        const current = bySection.get(row.sectionId) || [];
        current.push(row);
        bySection.set(row.sectionId, current);
      });

      const sections = Array.from(bySection.entries()).map(([sectionId, rows]) => ({
        content: (
          <SubjectLearnersPanel
            gradesByKey={gradesByKey}
            learners={learnersBySection.get(sectionId) || []}
            onGradeChange={(key, quarter, value) => {
              setGradesByKey((prev) => {
                const next = new Map(prev);
                const current = next.get(key) || { quarter1: '', quarter2: '', quarter3: '', quarter4: '' };
                next.set(key, { ...current, [quarter]: value });
                return next;
              });
            }}
            onSaveSubject={async (subject, sectionLearners) => {
              const subjectKey = `${subject.sectionId}::${subject.subjectCode}`;
              setSavingSubjectKey(subjectKey);
              try {
                await saveQuarterGradesForSubject({
                  rows: sectionLearners.map((learner) => {
                    const key = `${subject.sectionId}::${subject.subjectCode}::${learner.id}`;
                    const grades = gradesByKey.get(key) || { quarter1: '', quarter2: '', quarter3: '', quarter4: '' };
                    return {
                      learnerId: learner.id,
                      quarter1: grades.quarter1,
                      quarter2: grades.quarter2,
                      quarter3: grades.quarter3,
                      quarter4: grades.quarter4,
                    };
                  }),
                  sectionId: subject.sectionId,
                  subjectCode: subject.subjectCode,
                  subjectTitle: subject.subjectTitle,
                  teacherAccountId: subject.teacherAccountId,
                });
                setNotice(`${subject.subjectCode} grades saved.`);
                setSuccessAlert({
                  title: 'Grades Saved',
                  message: `${subject.subjectCode} grades were successfully saved.`,
                });
                setError('');
              } catch (nextError: any) {
                setError(nextError?.message || 'Unable to save grades.');
              } finally {
                setSavingSubjectKey('');
              }
            }}
            savingSubjectKey={savingSubjectKey}
            subjects={rows.slice().sort((a, b) => a.subjectCode.localeCompare(b.subjectCode))}
          />
        ),
        count: rows.length,
        key: sectionId,
        label: rows[0]?.sectionName || sectionId,
      }));

      return {
        countLabel: `${sections.length} section(s)`,
        key: gradeKey,
        label: gradeKey,
        sections,
      };
    });
  }, [assignments, gradesByKey, learnersBySection]);

  if (isLoading) return <UsisPageLoader message="Loading grades..." />;

  return (
    <div className="admin-panel registry-page--unified">
      {error ? <p className="login-card__error registry-feedback">{error}</p> : null}
      {notice ? <p className="registry-success">{notice}</p> : null}
      <div className="registry-layout">
        <article className="section-card">
          <div className="section-card__bar" />
          <div className="section-card__content">
            <div className="ia-subjects-page__header">
              <p className="section-card__eyebrow">Grades and Subjects</p>
              <h3>Grades</h3>
              <p className="registry-copy">View sections and subjects assigned to your account, with learners under each section subject.</p>
            </div>
            <UsisGradeSectionList
              className="ia-subjects-grade-list"
              emptyMessage="No section-subject assignments found for your account."
              grades={grouped}
            />
          </div>
        </article>
      </div>
      <UsisAlertModal
        open={Boolean(successAlert)}
        title={successAlert?.title || 'Success'}
        message={successAlert?.message || ''}
        tone="success"
        onClose={() => setSuccessAlert(null)}
      />
    </div>
  );
}
