import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../../../../lib/supabase';
import { useStore } from '../../../../../store';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import type { EnrollmentDraft } from '../../types';
import { validatePublicEnrollmentDraft } from '../../utils/validation';
import { deviceOptions, gradeLevelOptions, learnerCategoryOptions, modalityOptions, religionOptions, semesterOptions, studentTypeOptions } from '../../data/enrollmentOptions';
import EnrollmentDraftFormSections from '../../shared/EnrollmentDraftFormSections';
import { normalizeLearnerType } from '../../shared/learnerType';
import { publishEnrollmentKioskState } from '../../kiosk/enrollmentKioskSync';

const SAME_SCHOOL_LABEL = 'Same School';
const SHS_GRADES = new Set(['Grade 11', 'Grade 12']);
const gradeLevelOrder = gradeLevelOptions.map((level) => ({ label: level, value: Number(level.replace(/\D/g, '')) }));

type LearnerEnrollmentHistoryRow = {
  id: string;
  schoolYear: string;
  gradeLevel: string;
  section: string;
  status: string;
  enrolledAt: string;
};

function normalizeSchoolYear(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const normalized = raw.replace(/^sy\s*/i, '').replace(/\s+/g, ' ');
  const match = normalized.match(/(20\d{2})\s*[-–]\s*(20\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return normalized.toLowerCase();
}

const insertEnrollmentHistoryRow = async (input: {
  learnerId: string;
  schoolYear: string;
  gradeLevel?: string;
  section?: string;
  status: string;
  submissionPayload?: Record<string, any>;
}) => {
  await supabase.from('registrar_enrollment_history').insert({
    learner_id: input.learnerId,
    school_year: input.schoolYear || '',
    grade_level: input.gradeLevel || null,
    section: input.section || null,
    status: input.status,
    enrollment_date: new Date().toISOString(),
    submission_payload: input.submissionPayload || {},
    source: 'registrar.public-enrollment',
  });
};

const emptyDraft = (schoolId: string): EnrollmentDraft => ({
  schoolId,
  schoolYear: '',
  schoolToEnroll: '',
  studentType: studentTypeOptions[0],
  learnerCategory: learnerCategoryOptions[0],
  previousSchool: '',
  previousSchoolYear: '',
  lastGradeLevel: '',
  gradeToEnroll: '',
  track: 'Academic Track',
  strand: '',
  semester: '',
  birthCertificateNo: '',
  lrn: '',
  email: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extensionName: '',
  birthDate: '',
  gender: 'Male',
  placeOfBirth: '',
  height: '',
  weight: '',
  learnerContact: '',
  motherTongue: '',
  religion: religionOptions[0],
  is4Ps: 'No',
  fourPsHouseholdId: '',
  currentAddress: '',
  permanentAddress: '',
  fatherName: '',
  fatherContact: '',
  motherName: '',
  motherContact: '',
  guardianName: '',
  guardianContact: '',
  hasSpedNeed: 'No',
  preferredModality: modalityOptions[0],
  deviceAccess: deviceOptions[0],
  hasInternet: 'Yes',
  consent: true,
});

export default function PublicEnrollmentPriorLearnerEditPage() {
  const { learnerId = '' } = useParams();
  const navigate = useNavigate();
  const { registrarAccess, availableStrands, patchLearnerInCache } = useStore();
  const schoolId = registrarAccess?.schoolId || '302522';
  const [activeSchoolYearLabel, setActiveSchoolYearLabel] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EnrollmentDraft>(() => emptyDraft(schoolId));
  const [resolvedLearnerId, setResolvedLearnerId] = useState('');
  const [resolvedSchoolId, setResolvedSchoolId] = useState(schoolId);
  const [latestPriorSchoolYear, setLatestPriorSchoolYear] = useState('');
  const [latestPriorGradeLevel, setLatestPriorGradeLevel] = useState('');
  const [isTaggingReEnroll, setIsTaggingReEnroll] = useState(false);
  const [deletingHistoryId, setDeletingHistoryId] = useState('');
  const [focusedSection, setFocusedSection] = useState<'enrollmentContext' | 'learnerInfo' | 'addressInfo' | 'guardianInfo' | null>(null);
  const [enrollmentHistoryRows, setEnrollmentHistoryRows] = useState<LearnerEnrollmentHistoryRow[]>([]);
  const isSeniorHighTargetGrade = SHS_GRADES.has(draft.gradeToEnroll);

  const formatDateTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '--';
    return date.toLocaleString();
  };

  useEffect(() => {
    const loadActiveSchoolYear = async () => {
      const { data } = await supabase.from('registrar_school_years').select('label').eq('is_active', true).limit(1).maybeSingle();
      setActiveSchoolYearLabel(String((data as any)?.label || '').trim());
    };
    void loadActiveSchoolYear();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: learnerError } = await supabase
          .from('registrar_learners')
          .select('id,school_id,lrn,first_name,middle_name,last_name,birth_date,gender,address,contact_number,guardian_name,father_name,mother_name,email')
          .eq('id', learnerId)
          .maybeSingle();
        if (learnerError || !data) throw new Error('Learner record not found.');

        const { data: learnerHistoryRows } = await supabase
          .from('registrar_enrollment_history')
          .select('id,school_year,grade_level,section,status,submission_payload,enrollment_date,created_at')
          .eq('learner_id', String((data as any).id || learnerId));
        const priorEntries = (learnerHistoryRows || [])
          .map((entry: any) => ({
            schoolYear: String(entry?.school_year || '').trim(),
            gradeLevel: String(entry?.grade_level || '').trim(),
            section: String(entry?.section || '').trim(),
            submissionPayload: entry?.submission_payload && typeof entry.submission_payload === 'object' ? entry.submission_payload : {},
            sortAt: new Date(String(entry?.enrollment_date || entry?.created_at || 0)).getTime(),
          }))
          .filter((entry: any) => {
            const sy = String(entry?.schoolYear || '').trim();
            if (!sy) return false;
            return !activeSchoolYearLabel || normalizeSchoolYear(sy) !== normalizeSchoolYear(activeSchoolYearLabel);
          })
          .sort((a: any, b: any) => a.sortAt - b.sortAt);
        const latestPriorEntry = priorEntries[priorEntries.length - 1] || {};
        const sourcePayload = (latestPriorEntry as any).submissionPayload || {};
        const sourceSchoolToEnroll = String(sourcePayload.schoolToEnroll || '').trim();
        const sourcePreviousSchool = String(sourcePayload.previousSchool || '').trim();

        const nextSchoolId = String((data as any).school_id || schoolId);
        const mappedDraft = {
          ...emptyDraft(nextSchoolId),
          ...sourcePayload,
          studentType: normalizeLearnerType(String(sourcePayload.studentType || 'Continuing Learner')) || 'Continuing Learner',
          learnerCategory: SAME_SCHOOL_LABEL,
          schoolId: nextSchoolId,
          schoolYear: String(activeSchoolYearLabel || (latestPriorEntry as any).schoolYear || ''),
          schoolToEnroll: sourceSchoolToEnroll,
          previousSchool: sourcePreviousSchool || sourceSchoolToEnroll,
          lrn: String((data as any).lrn || ''),
          email: String((data as any).email || sourcePayload.email || ''),
          lastName: String((data as any).last_name || sourcePayload.lastName || ''),
          firstName: String((data as any).first_name || sourcePayload.firstName || ''),
          middleName: String((data as any).middle_name || sourcePayload.middleName || ''),
          birthDate: String((data as any).birth_date || sourcePayload.birthDate || ''),
          gender: String((data as any).gender || sourcePayload.gender || 'Male'),
          currentAddress: String((data as any).address || sourcePayload.currentAddress || ''),
          permanentAddress: String(sourcePayload.permanentAddress || ''),
          learnerContact: String((data as any).contact_number || sourcePayload.learnerContact || ''),
          guardianName: String((data as any).guardian_name || sourcePayload.guardianName || ''),
          guardianContact: String(sourcePayload.guardianContact || ''),
          fatherName: String((data as any).father_name || sourcePayload.fatherName || ''),
          fatherContact: String(sourcePayload.fatherContact || ''),
          motherName: String((data as any).mother_name || sourcePayload.motherName || ''),
          motherContact: String(sourcePayload.motherContact || ''),
          gradeToEnroll: String((latestPriorEntry as any).gradeLevel || sourcePayload.gradeToEnroll || ''),
        };

        if (cancelled) return;
        setResolvedLearnerId(String((data as any).id || learnerId));
        setResolvedSchoolId(nextSchoolId);
        setLatestPriorSchoolYear(String((latestPriorEntry as any).schoolYear || '').trim());
        setLatestPriorGradeLevel(String((latestPriorEntry as any).gradeLevel || '').trim());
        setEnrollmentHistoryRows(
          (learnerHistoryRows || [])
            .map((entry: any) => ({
              id: String(entry?.id || crypto.randomUUID()),
              schoolYear: String(entry?.school_year || '').trim(),
              gradeLevel: String(entry?.grade_level || '').trim(),
              section: String(entry?.section || '').trim(),
              status: String(entry?.status || '').trim(),
              enrolledAt: String(entry?.enrollment_date || entry?.created_at || '').trim(),
            }))
            .sort((a, b) => new Date(b.enrolledAt || 0).getTime() - new Date(a.enrolledAt || 0).getTime()),
        );
        setDraft(mappedDraft);
        publishEnrollmentKioskState({
          selectedLearner: {
            id: String((data as any).id || learnerId),
            lrn: String((data as any).lrn || '').trim(),
            fullName: [String((data as any).last_name || '').trim(), String((data as any).first_name || '').trim(), String((data as any).middle_name || '').trim()]
              .filter(Boolean)
              .join(', ') || '--',
            latestSchoolYear: String((latestPriorEntry as any).schoolYear || '').trim(),
            latestGradeLevel: String((latestPriorEntry as any).gradeLevel || '').trim(),
            latestSection: String((latestPriorEntry as any).section || '').trim(),
          },
        });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load learner record.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [learnerId, schoolId, activeSchoolYearLabel]);

  useEffect(() => {
    const currentGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
    const targetGrade = gradeLevelOrder.find((grade) => grade.label === draft.gradeToEnroll);
    const sameSchoolBlocked = draft.learnerCategory === SAME_SCHOOL_LABEL && draft.gradeToEnroll === 'Grade 7';
    const progressionBlocked = currentGrade && targetGrade ? targetGrade.value <= currentGrade.value : false;
    if (sameSchoolBlocked || progressionBlocked) setDraft((current) => ({ ...current, gradeToEnroll: '' }));
  }, [draft.lastGradeLevel, draft.gradeToEnroll, draft.learnerCategory]);

  useEffect(() => {
    if (!isSeniorHighTargetGrade) {
      if (!draft.track && !draft.strand && !draft.semester) return;
      setDraft((current) => ({ ...current, track: '', strand: '', semester: '' }));
      return;
    }
    if (!draft.track) setDraft((current) => ({ ...current, track: 'Academic Track' }));
    if (!draft.semester) setDraft((current) => ({ ...current, semester: semesterOptions[0] }));
  }, [isSeniorHighTargetGrade, draft.track, draft.strand, draft.semester]);

  const deleteEnrollmentHistoryEntry = async (rowId: string) => {
    if (!rowId || !resolvedLearnerId) return;
    const confirmed = window.confirm('Delete this enrollment history record? This action cannot be undone.');
    if (!confirmed) return;
    setDeletingHistoryId(rowId);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from('registrar_enrollment_history').delete().eq('id', rowId);
      if (deleteError) throw deleteError;

      const nextRows = enrollmentHistoryRows.filter((entry) => entry.id !== rowId);
      setEnrollmentHistoryRows(nextRows);

      const latestPrior = nextRows
        .filter((entry) => {
          const sy = String(entry.schoolYear || '').trim();
          if (!sy) return false;
          return !activeSchoolYearLabel || normalizeSchoolYear(sy) !== normalizeSchoolYear(activeSchoolYearLabel);
        })
        .sort((a, b) => new Date(a.enrolledAt || 0).getTime() - new Date(b.enrolledAt || 0).getTime())
        .at(-1);
      setLatestPriorSchoolYear(String(latestPrior?.schoolYear || '').trim());
      setLatestPriorGradeLevel(String(latestPrior?.gradeLevel || '').trim());
    } catch (e: any) {
      setError(e?.message || 'Unable to delete enrollment history record.');
    } finally {
      setDeletingHistoryId('');
    }
  };

  useEffect(() => {
    publishEnrollmentKioskState({
      isEditing: true,
      draft,
    });
  }, [draft]);

  useEffect(() => {
    return () => {
      publishEnrollmentKioskState({
        isEditing: false,
        draft: null,
        focusedSection: null,
      });
    };
  }, []);

  const focusSectionInKiosk = (section: 'enrollmentContext' | 'learnerInfo' | 'addressInfo' | 'guardianInfo') => {
    setFocusedSection(section);
    publishEnrollmentKioskState({ focusedSection: section });
  };

  const unfocusSectionInKiosk = () => {
    setFocusedSection(null);
    publishEnrollmentKioskState({ focusedSection: null });
  };

  const updateField = (name: keyof EnrollmentDraft, value: string | boolean) => {
    if (typeof value === 'string') {
      if (name === 'lrn') return setDraft((c) => ({ ...c, [name]: value.replace(/\D/g, '').slice(0, 12) }));
      if (name === 'learnerContact' || name === 'fatherContact' || name === 'motherContact' || name === 'guardianContact') return setDraft((c) => ({ ...c, [name]: value.replace(/[^\d+]/g, '').slice(0, 15) }));
      if (name === 'previousSchoolYear') return setDraft((c) => ({ ...c, [name]: value.replace(/[^\d-]/g, '').slice(0, 9) }));
    }
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const availableGradeToEnrollOptions = useMemo(() => {
    const lastGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
    return gradeLevelOptions.filter((grade) => {
      if (draft.learnerCategory === SAME_SCHOOL_LABEL && grade === 'Grade 7') return false;
      if (!lastGrade) return true;
      const nextGrade = gradeLevelOrder.find((entry) => entry.label === grade);
      return Boolean(nextGrade && nextGrade.value > lastGrade.value);
    });
  }, [draft.lastGradeLevel, draft.learnerCategory]);

  const tagForReEnroll = async () => {
    setIsTaggingReEnroll(true);
    try {
      const { data: activeYearRow } = await supabase
        .from('registrar_school_years')
        .select('label')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      const activeSchoolYear = String((activeYearRow as any)?.label || '').trim();
      const sourceLastGrade = String(latestPriorGradeLevel || draft.lastGradeLevel || '').trim();
      const sourceLastGradeNum = Number(sourceLastGrade.replace(/\D/g, ''));
      const nextGradeLabel = Number.isFinite(sourceLastGradeNum)
        ? gradeLevelOrder.find((grade) => grade.value === sourceLastGradeNum + 1)?.label || ''
        : '';
      const enrolledSchool = String(draft.schoolToEnroll || draft.previousSchool || 'Leon National High School').trim();

      setDraft((current) => ({
        ...current,
        schoolYear: activeSchoolYear || current.schoolYear,
        studentType: 'Continuing Learner',
        learnerCategory: SAME_SCHOOL_LABEL,
        schoolToEnroll: enrolledSchool,
        previousSchool: enrolledSchool,
        previousSchoolYear: latestPriorSchoolYear || current.previousSchoolYear,
        lastGradeLevel: sourceLastGrade || current.lastGradeLevel,
        gradeToEnroll: nextGradeLabel || current.gradeToEnroll,
        track: current.track || 'Academic Track',
      }));
    } finally {
      setIsTaggingReEnroll(false);
    }
  };

  const save = async () => {
    if (!resolvedLearnerId) return;
    setIsSaving(true);
    setError(null);
    try {
      const validationError = validatePublicEnrollmentDraft(draft);
      if (validationError) throw new Error(validationError);

      const { data: existingLearner, error: findError } = await supabase
        .from('registrar_learners')
        .select('id')
        .eq('id', resolvedLearnerId)
        .maybeSingle();
      if (findError) throw findError;
      if (!existingLearner?.id) throw new Error('Learner record not found.');

      const updatePayload: Record<string, any> = {
        school_id: resolvedSchoolId || schoolId,
        lrn: draft.lrn.trim() || null,
        first_name: draft.firstName.trim() || null,
        middle_name: draft.middleName.trim() || null,
        last_name: draft.lastName.trim() || null,
        birth_date: draft.birthDate.trim() || null,
        gender: draft.gender.trim() || null,
        address: (draft.currentAddress || draft.permanentAddress).trim() || null,
        contact_number: draft.learnerContact.trim() || null,
        guardian_name: draft.guardianName.trim() || null,
        father_name: draft.fatherName.trim() || null,
        mother_name: draft.motherName.trim() || null,
        email: draft.email.trim() || null,
      };

      const nextEnrollmentHistory = [
        ...enrollmentHistoryRows.map((row) => ({
          id: row.id,
          schoolYear: row.schoolYear,
          gradeLevel: row.gradeLevel,
          section: row.section,
          enrollmentDate: row.enrolledAt,
          status: row.status,
        })),
        {
          id: crypto.randomUUID(),
          schoolYear: draft.schoolYear || '',
          gradeLevel: draft.gradeToEnroll || '',
          section: '',
          enrollmentDate: new Date().toISOString(),
          status: 'Information Updated',
          submissionPayload: draft as unknown as Record<string, any>,
        },
      ];

      updatePayload.enrollment_history = nextEnrollmentHistory;

      const { error: updateError } = await supabase.from('registrar_learners').update(updatePayload).eq('id', resolvedLearnerId);
      if (updateError) throw updateError;
      await patchLearnerInCache(resolvedLearnerId, {
        schoolYear: draft.schoolYear || undefined,
        lrn: draft.lrn.trim() || undefined,
        firstName: draft.firstName.trim() || undefined,
        middleName: draft.middleName.trim() || undefined,
        lastName: draft.lastName.trim() || undefined,
        birthDate: draft.birthDate.trim() || undefined,
        gender: draft.gender.trim() || undefined,
        address: (draft.currentAddress || draft.permanentAddress).trim() || undefined,
        contactNumber: draft.learnerContact.trim() || undefined,
        guardian_name: draft.guardianName.trim() || undefined,
        father_name: draft.fatherName.trim() || undefined,
        mother_name: draft.motherName.trim() || undefined,
        email: draft.email.trim() || undefined,
        enrollments: nextEnrollmentHistory as any,
      });
      await insertEnrollmentHistoryRow({
        learnerId: resolvedLearnerId,
        schoolYear: draft.schoolYear || '',
        gradeLevel: draft.gradeToEnroll || '',
        section: '',
        status: 'Information Updated',
        submissionPayload: draft as unknown as Record<string, any>,
      });

      navigate('/enroll');
    } catch (e: any) {
      setError(e?.message || 'Unable to update learner information.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading learner editor..." />;
  if (error && !draft.lrn && !draft.firstName && !draft.lastName) return <section className="portal-panel registrar-public-enrollment-submissions"><div className="portal-panel__body"><p>{error}</p><button type="button" className="secondary-button" onClick={() => navigate('/enroll')}>Back</button></div></section>;

  return (
    <section className="portal-panel registrar-public-enrollment-submissions">
      <div className="portal-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div><h2>Edit Previous-Year Learner Record</h2><p>Update learner details from historical enrollment record.</p></div>
        <div style={{ display: 'inline-flex', gap: 10 }}>
          <button type="button" className="secondary-button" onClick={tagForReEnroll} disabled={isTaggingReEnroll || isSaving}>
            {isTaggingReEnroll ? 'Tagging...' : 'Tag for Re-enroll'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/enroll')}>Back to Submissions</button>
        </div>
      </div>
      <div className="portal-panel__body" style={{ display: 'grid', gap: 18 }}>
        {error ? <div className="notice-box" style={{ color: 'var(--deped-red)' }}>{error}</div> : null}
        <EnrollmentDraftFormSections
          draft={draft}
          onFieldChange={(name, value) => updateField(name, value)}
          availableStrands={availableStrands.map((s) => s.acronym).filter(Boolean)}
          isSeniorHighTargetGrade={isSeniorHighTargetGrade}
          gradeToEnrollOptions={[...availableGradeToEnrollOptions]}
          schoolIdReadOnly
          showFocusButtons
          onFocusSection={focusSectionInKiosk}
          focusedSection={focusedSection}
          onUnfocusSection={unfocusSectionInKiosk}
        />
        <section className="table-card" aria-label="Learner enrollment history">
          <div style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--deped-blue)', borderBottom: '1px solid var(--line)' }}>
            Enrollment History
          </div>
          {enrollmentHistoryRows.length ? (
            <table className="usis-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>School Year</th>
                  <th>Grade Level</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {enrollmentHistoryRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.enrolledAt)}</td>
                    <td>{row.schoolYear || '--'}</td>
                    <td>{row.gradeLevel || '--'}</td>
                    <td>{row.section || '--'}</td>
                    <td>{row.status || '--'}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        style={{ minHeight: 32, padding: '0 10px' }}
                        onClick={() => deleteEnrollmentHistoryEntry(row.id)}
                        disabled={isSaving || deletingHistoryId === row.id}
                      >
                        {deletingHistoryId === row.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 14, color: 'var(--deped-muted)', fontSize: 13 }}>
              No enrollment history rows found for this learner.
            </div>
          )}
        </section>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="secondary-button" onClick={() => navigate('/enroll')} disabled={isSaving}>Cancel</button>
          <button type="button" className="primary-button" onClick={save} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Learner Information'}</button>
        </div>
      </div>
    </section>
  );
}
