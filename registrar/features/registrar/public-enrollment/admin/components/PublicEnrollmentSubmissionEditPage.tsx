import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../../../../../store';
import UsisPageLoader from '../../../../../../common/components/UsisPageLoader';
import type { EnrollmentDraft } from '../../types';
import { fetchPublicEnrollmentSubmissionById, updatePublicEnrollmentSubmissionRecord } from '../../services/publicEnrollmentSubmissions';
import { validatePublicEnrollmentDraft } from '../../utils/validation';
import { deviceOptions, gradeLevelOptions, learnerCategoryOptions, modalityOptions, religionOptions, semesterOptions, studentTypeOptions } from '../../data/enrollmentOptions';
import EnrollmentDraftFormSections from '../../shared/EnrollmentDraftFormSections';
import { inferLearnerType, normalizeLearnerType } from '../../shared/learnerType';
import { publishEnrollmentKioskState } from '../../kiosk/enrollmentKioskSync';

const SAME_SCHOOL_LABEL = 'Same School';
const SHS_GRADES = new Set(['Grade 11', 'Grade 12']);
const gradeLevelOrder = gradeLevelOptions.map((level) => ({ label: level, value: Number(level.replace(/\D/g, '')) }));

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

export default function PublicEnrollmentSubmissionEditPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { registrarAccess, availableStrands } = useStore();
  const schoolId = registrarAccess?.schoolId || '302522';
  const returnTo = String((location.state as { returnTo?: string } | null)?.returnTo || '').trim() || '/enroll';

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<EnrollmentDraft>(() => emptyDraft(schoolId));
  const isSeniorHighTargetGrade = SHS_GRADES.has(draft.gradeToEnroll);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const row = await fetchPublicEnrollmentSubmissionById(id);
        if (cancelled) return;
        if (!row) {
          setError('Submission record not found.');
          return;
        }
        const mappedDraft = {
          ...emptyDraft(row.school_id || schoolId),
          ...row.payload,
          schoolId: row.school_id || row.payload?.schoolId || schoolId,
          schoolYear: row.school_year || row.payload?.schoolYear || '',
          studentType: normalizeLearnerType(String(row.payload?.studentType || '')),
          lrn: row.lrn || row.payload?.lrn || '',
          email: row.payload?.email || '',
          firstName: row.first_name || row.payload?.firstName || '',
          middleName: row.middle_name || row.payload?.middleName || '',
          lastName: row.last_name || row.payload?.lastName || '',
          gradeToEnroll: row.grade_to_enroll || row.payload?.gradeToEnroll || '',
          guardianContact: row.guardian_contact || row.payload?.guardianContact || '',
          learnerContact: row.payload?.learnerContact || '',
        };
        const hasValidLearnerTypeOption = studentTypeOptions.includes(mappedDraft.studentType as (typeof studentTypeOptions)[number]);
        if (!String(mappedDraft.studentType || '').trim() || !hasValidLearnerTypeOption) {
          mappedDraft.studentType = inferLearnerType(mappedDraft);
        }
        setDraft(mappedDraft);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Unable to load submission.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, schoolId]);

  useEffect(() => {
    const isNewLearner = String(draft.studentType || '').toLowerCase().includes('new');
    if (!isNewLearner || draft.gradeToEnroll !== 'Grade 7' || draft.lastGradeLevel === 'Grade 6') return;
    setDraft((current) => ({ ...current, lastGradeLevel: 'Grade 6' }));
  }, [draft.studentType, draft.gradeToEnroll, draft.lastGradeLevel]);

  useEffect(() => {
    const currentGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
    const targetGrade = gradeLevelOrder.find((grade) => grade.label === draft.gradeToEnroll);
    const isContinuingLearner = String(draft.studentType || '').toLowerCase().includes('continuing');
    const sameSchoolBlocked = isContinuingLearner && draft.learnerCategory === SAME_SCHOOL_LABEL && draft.gradeToEnroll === 'Grade 7';
    const progressionBlocked = currentGrade && targetGrade ? targetGrade.value <= currentGrade.value : false;
    if (sameSchoolBlocked || progressionBlocked) setDraft((current) => ({ ...current, gradeToEnroll: '' }));
  }, [draft.lastGradeLevel, draft.gradeToEnroll, draft.learnerCategory, draft.studentType]);

  useEffect(() => {
    if (!isSeniorHighTargetGrade) {
      if (!draft.strand && !draft.semester) return;
      setDraft((current) => ({ ...current, strand: '', semester: '' }));
      return;
    }
    if (!draft.semester) setDraft((current) => ({ ...current, semester: semesterOptions[0] }));
  }, [isSeniorHighTargetGrade, draft.strand, draft.semester]);

  useEffect(() => {
    publishEnrollmentKioskState({
      isEditing: true,
      draft,
    });
    return () => {
      publishEnrollmentKioskState({
        isEditing: false,
        draft: null,
        focusedSection: null,
      });
    };
  }, [draft]);

  const updateField = (name: keyof EnrollmentDraft, value: string | boolean) => {
    if (typeof value === 'string') {
      if (name === 'lrn') return setDraft((c) => ({ ...c, [name]: value.replace(/\D/g, '').slice(0, 12) }));
      if (name === 'learnerContact' || name === 'fatherContact' || name === 'motherContact' || name === 'guardianContact') {
        return setDraft((c) => ({ ...c, [name]: value.replace(/[^\d+]/g, '').slice(0, 15) }));
      }
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

  const save = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const validationError = validatePublicEnrollmentDraft(draft);
      if (validationError) throw new Error(validationError);
      await updatePublicEnrollmentSubmissionRecord(id, {
        school_id: draft.schoolId.trim() || null,
        school_year: draft.schoolYear.trim() || null,
        lrn: draft.lrn.trim() || null,
        last_name: draft.lastName.trim() || null,
        first_name: draft.firstName.trim() || null,
        middle_name: draft.middleName.trim() || null,
        grade_to_enroll: draft.gradeToEnroll.trim() || null,
        guardian_contact: draft.guardianContact.trim() || null,
        payload: draft,
      });
      navigate(returnTo, { replace: true });
    } catch (e: any) {
      setError(e?.message || 'Unable to save submission.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading submission editor..." />;
  if (error && !draft.lrn && !draft.lastName && !draft.firstName) return <section className="portal-panel registrar-public-enrollment-submissions"><div className="portal-panel__body"><p>{error}</p><button type="button" className="secondary-button" onClick={() => navigate(returnTo, { replace: true })}>Back</button></div></section>;

  return (
    <section className="portal-panel registrar-public-enrollment-submissions">
      <div className="portal-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div><h2>Edit Submission</h2><p>Update learner enrollment details.</p></div>
        <button type="button" className="secondary-button" onClick={() => navigate(returnTo, { replace: true })}>Back to Submissions</button>
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
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" className="secondary-button" onClick={() => navigate(returnTo, { replace: true })} disabled={isSaving}>Cancel</button>
          <button type="button" className="primary-button" onClick={save} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Submission'}</button>
        </div>
      </div>
    </section>
  );
}
