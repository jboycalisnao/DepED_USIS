import { useEffect, useState } from 'react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { Student } from '../../types';
import { supabase } from '../../lib/supabase';
import {
  deviceOptions,
  gradeLevelOptions,
  learnerCategoryOptions,
  modalityOptions,
  religionOptions,
  semesterOptions,
  studentTypeOptions,
  trackOptions,
} from '../../features/registrar/public-enrollment/data/enrollmentOptions';
import { normalizeLearnerType } from '../../features/registrar/public-enrollment/shared/learnerType';

type LearnerModalDraft = {
  schoolId: string;
  schoolYear: string;
  schoolToEnroll: string;
  studentType: string;
  learnerCategory: string;
  previousSchool: string;
  previousSchoolYear: string;
  lastGradeLevel: string;
  gradeToEnroll: string;
  track: string;
  strand: string;
  semester: string;
  birthCertificateNo: string;
  lrn: string;
  email: string;
  lastName: string;
  firstName: string;
  middleName: string;
  extensionName: string;
  birthDate: string;
  gender: string;
  placeOfBirth: string;
  learnerContact: string;
  motherTongue: string;
  religion: string;
  is4Ps: string;
  fourPsHouseholdId: string;
  currentAddress: string;
  permanentAddress: string;
  fatherName: string;
  fatherContact: string;
  motherName: string;
  motherContact: string;
  guardianName: string;
  guardianContact: string;
  hasSpedNeed: string;
  preferredModality: string;
  deviceAccess: string;
  hasInternet: string;
};

type Props = {
  student: Student | null;
  activeSchoolYearLabel: string;
  strandOptions: string[];
  loading: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess?: (message: string) => void;
  onSubmit: (id: string, updates: Partial<Student>) => Promise<{ error?: string }>;
};

const firstNonEmpty = (...values: Array<string | undefined | null>) =>
  values.map((v) => String(v || '').trim()).find(Boolean) || '';

const buildDraft = (student: Student, activeSchoolYearLabel: string, latestSubmissionPayload?: Record<string, any>): LearnerModalDraft => {
  const history = Array.isArray(student.enrollments) ? [...student.enrollments] : [];
  const latestEntry = history[history.length - 1] as any;
  const latestWithPayload = history
    .reverse()
    .find((entry: any) => entry && typeof entry === 'object' && entry.submissionPayload && typeof entry.submissionPayload === 'object') as any;
  const payload = (latestWithPayload?.submissionPayload || {}) as Record<string, any>;
  const submissionPayload = (latestSubmissionPayload && typeof latestSubmissionPayload === 'object' ? latestSubmissionPayload : {}) as Record<string, any>;

  return {
    schoolId: firstNonEmpty(submissionPayload.schoolId, payload.schoolId, '302522'),
    schoolYear: firstNonEmpty(submissionPayload.schoolYear, payload.schoolYear, activeSchoolYearLabel),
    schoolToEnroll: firstNonEmpty(submissionPayload.schoolToEnroll, payload.schoolToEnroll),
    studentType: normalizeLearnerType(firstNonEmpty(submissionPayload.studentType, submissionPayload.student_type, payload.studentType, payload.student_type, payload.learnerType, payload.learner_type)) || studentTypeOptions[0],
    learnerCategory: firstNonEmpty(submissionPayload.learnerCategory, payload.learnerCategory, learnerCategoryOptions[0]),
    previousSchool: firstNonEmpty(submissionPayload.previousSchool, payload.previousSchool),
    previousSchoolYear: firstNonEmpty(
      submissionPayload.previousSchoolYear,
      submissionPayload.previous_school_year,
      payload.previousSchoolYear,
      payload.previous_school_year,
      payload.lastSchoolYearAttended,
      payload.last_school_year_attended,
      latestWithPayload?.schoolYear,
      latestEntry?.schoolYear,
    ),
    lastGradeLevel: firstNonEmpty(
      submissionPayload.lastGradeLevel,
      submissionPayload.last_grade_level,
      payload.lastGradeLevel,
      payload.last_grade_level,
      payload.gradeLevel,
      latestWithPayload?.gradeLevel,
      latestEntry?.gradeLevel,
    ),
    gradeToEnroll: firstNonEmpty(
      submissionPayload.gradeToEnroll,
      submissionPayload.grade_to_enroll,
      payload.gradeToEnroll,
      payload.grade_to_enroll,
      payload.targetGradeLevel,
      latestWithPayload?.gradeLevel,
      latestEntry?.gradeLevel,
    ),
    track: firstNonEmpty(submissionPayload.track, payload.track, 'Academic Track'),
    strand: firstNonEmpty(submissionPayload.strand, payload.strand),
    semester: firstNonEmpty(submissionPayload.semester, payload.semester, semesterOptions[0]),
    birthCertificateNo: firstNonEmpty(submissionPayload.birthCertificateNo, payload.birthCertificateNo),
    lrn: firstNonEmpty(student.lrn, submissionPayload.lrn, payload.lrn),
    email: firstNonEmpty(submissionPayload.email, student.email, payload.email),
    lastName: firstNonEmpty(submissionPayload.lastName, student.lastName, payload.lastName),
    firstName: firstNonEmpty(submissionPayload.firstName, student.firstName, payload.firstName),
    middleName: firstNonEmpty(submissionPayload.middleName, student.middleName, payload.middleName),
    extensionName: firstNonEmpty(submissionPayload.extensionName, payload.extensionName),
    birthDate: firstNonEmpty(submissionPayload.birthDate, student.birthDate, payload.birthDate),
    gender: firstNonEmpty(submissionPayload.gender, student.gender, payload.gender, 'Male'),
    placeOfBirth: firstNonEmpty(submissionPayload.placeOfBirth, payload.placeOfBirth),
    learnerContact: firstNonEmpty(submissionPayload.learnerContact, student.contactNumber, payload.learnerContact, payload.guardianContact),
    motherTongue: firstNonEmpty(submissionPayload.motherTongue, payload.motherTongue),
    religion: firstNonEmpty(submissionPayload.religion, payload.religion, religionOptions[0]),
    is4Ps: student.is4Ps ? 'Yes' : firstNonEmpty(submissionPayload.is4Ps, payload.is4Ps, 'No'),
    fourPsHouseholdId: firstNonEmpty(submissionPayload.fourPsHouseholdId, payload.fourPsHouseholdId),
    currentAddress: firstNonEmpty(submissionPayload.currentAddress, payload.currentAddress, student.address),
    permanentAddress: firstNonEmpty(submissionPayload.permanentAddress, payload.permanentAddress, student.address),
    fatherName: firstNonEmpty(submissionPayload.fatherName, student.father_name, payload.fatherName),
    fatherContact: firstNonEmpty(submissionPayload.fatherContact, payload.fatherContact),
    motherName: firstNonEmpty(submissionPayload.motherName, student.mother_name, payload.motherName),
    motherContact: firstNonEmpty(submissionPayload.motherContact, payload.motherContact),
    guardianName: firstNonEmpty(submissionPayload.guardianName, student.guardian_name, payload.guardianName),
    guardianContact: firstNonEmpty(submissionPayload.guardianContact, payload.guardianContact, student.contactNumber),
    hasSpedNeed: firstNonEmpty(submissionPayload.hasSpedNeed, payload.hasSpedNeed, 'No'),
    preferredModality: firstNonEmpty(submissionPayload.preferredModality, payload.preferredModality, modalityOptions[0]),
    deviceAccess: firstNonEmpty(submissionPayload.deviceAccess, payload.deviceAccess, deviceOptions[0]),
    hasInternet: firstNonEmpty(submissionPayload.hasInternet, payload.hasInternet, 'Yes'),
  };
};

export default function LearnerEditModal({ student, activeSchoolYearLabel, strandOptions, loading, onClose, onError, onSuccess, onSubmit }: Props) {
  const [draft, setDraft] = useState<LearnerModalDraft | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(false);
  const [availableSchoolYears, setAvailableSchoolYears] = useState<Array<{ id: string; label: string }>>([]);
  const [availableSections, setAvailableSections] = useState<Array<{ id: string; name: string; gradeLevel: string; strand?: string; schoolYearId: string }>>([]);
  const [selectedSchoolYearLabel, setSelectedSchoolYearLabel] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      if (!student) {
        setDraft(null);
        return;
      }

      // Immediate fallback so modal can render while fetching canonical record.
      setDraft(buildDraft(student, activeSchoolYearLabel));
      setIsLoadingRecord(true);
      try {
        const [{ data, error }, { data: schoolYearRows }, { data: sectionRows }, { data: submissionRows }] = await Promise.all([
          supabase
          .from('registrar_learners')
          .select('*')
          .eq('id', student.id)
          .maybeSingle(),
          supabase.from('registrar_school_years').select('id,label').order('label', { ascending: false }),
          supabase.from('registrar_sections').select('id,name,grade_level,strand,school_year_id').order('name', { ascending: true }),
          supabase
            .from('registrar_public_enrollment_submissions')
            .select('payload,created_at')
            .eq('lrn', String(student.lrn || '').trim())
            .order('created_at', { ascending: false })
            .limit(1),
        ]);
        if (cancelled || error || !data) return;

        const dbStudent: Student = {
          id: String((data as any).id || student.id),
          lrn: String((data as any).lrn || ''),
          firstName: String((data as any).first_name || ''),
          lastName: String((data as any).last_name || ''),
          middleName: String((data as any).middle_name || ''),
          email: String((data as any).email || ''),
          birthDate: String((data as any).birth_date || ''),
          gender: String((data as any).gender || 'Male'),
          address: String((data as any).address || ''),
          contactNumber: String((data as any).contact_number || ''),
          guardian_name: String((data as any).guardian_name || ''),
          father_name: String((data as any).father_name || ''),
          mother_name: String((data as any).mother_name || ''),
          sectionId: String((data as any).section_id || ''),
          enrollments: Array.isArray((data as any).enrollment_history) ? (data as any).enrollment_history : [],
          status: student.status,
          is4Ps: !!(data as any).is_4ps,
        };
        const latestSubmissionPayload = submissionRows?.[0]?.payload && typeof submissionRows[0].payload === 'object'
          ? (submissionRows[0].payload as Record<string, any>)
          : undefined;
        const nextDraft = buildDraft(dbStudent, activeSchoolYearLabel, latestSubmissionPayload);
        setDraft(nextDraft);
        const mappedSchoolYears = (schoolYearRows || []).map((row: any) => ({ id: String(row.id || ''), label: String(row.label || '') })).filter((row) => row.id && row.label);
        const mappedSections = (sectionRows || []).map((row: any) => ({
          id: String(row.id || ''),
          name: String(row.name || ''),
          gradeLevel: String(row.grade_level || ''),
          strand: String(row.strand || ''),
          schoolYearId: String(row.school_year_id || ''),
        })).filter((row) => row.id && row.schoolYearId);
        setAvailableSchoolYears(mappedSchoolYears);
        setAvailableSections(mappedSections);
        setSelectedSchoolYearLabel(nextDraft.schoolYear || activeSchoolYearLabel);
        setSelectedSectionId(String((data as any).section_id || student.sectionId || ''));
      } catch {
        // Keep fallback values if fetch fails.
      } finally {
        if (!cancelled) setIsLoadingRecord(false);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [student, activeSchoolYearLabel]);

  useEffect(() => {
    if (!draft) return;
    const learnerType = String(draft.studentType || '').toLowerCase();
    const isNewLearner = learnerType.includes('new');
    const isIncomingGrade7 = String(draft.gradeToEnroll || '').trim() === 'Grade 7';
    const hasLastGrade = String(draft.lastGradeLevel || '').trim().length > 0;
    if (!isNewLearner || !isIncomingGrade7 || hasLastGrade) return;
    setDraft((current) => (current ? { ...current, lastGradeLevel: 'Grade 6' } : current));
  }, [draft]);

  if (!student || !draft) return null;
  const isJuniorHighTargetGrade = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'].includes(String(draft.gradeToEnroll || '').trim());
  const lastGradeLevelOptions = ['Grade 6', ...gradeLevelOptions];

  const selectedSchoolYearId =
    availableSchoolYears.find((row) => row.label === (selectedSchoolYearLabel || draft.schoolYear))?.id || '';
  const sectionOptions = availableSections
    .filter((section) => section.schoolYearId === selectedSchoolYearId)
    .map((section) => ({
      value: section.id,
      label: `${section.name}${section.strand ? ` [${section.strand}]` : ''} - ${section.gradeLevel}`,
    }));

  return (
    <div className="modal-overlay">
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-dialog modal-dialog--wide" role="dialog" aria-modal="true" aria-labelledby="edit-learner-info-title">
        <div className="modal-dialog__header">
          <div className="modal-dialog__title-group">
            <h3 id="edit-learner-info-title">Edit Learner Information</h3>
            <p>{isLoadingRecord ? 'Loading learner record...' : student.lrn}</p>
          </div>
          <button type="button" className="modal-dialog__close" onClick={onClose} aria-label="Close edit learner information">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-dialog__body custom-scrollbar" style={{ paddingRight: 28 }}>
          <div className="grid gap-6">
            <section className="registrar-public-enrollment__section">
              <h3>Enrollment Context</h3>
              <div className="floating-field-grid">
                <InputField label="School ID" value={draft.schoolId} onChange={(value) => setDraft((current) => (current ? { ...current, schoolId: value } : current))} readOnly />
                <InputField label="School Year" value={draft.schoolYear} onChange={(value) => setDraft((current) => (current ? { ...current, schoolYear: value } : current))} />
                <SearchableSelect
                  label="Edit School Year Scope"
                  placeholder="Edit School Year Scope"
                  floatingLabel
                  showLabel={false}
                  value={selectedSchoolYearLabel || draft.schoolYear}
                  onChange={(value) => {
                    setSelectedSchoolYearLabel(value);
                    setDraft((current) => (current ? { ...current, schoolYear: value } : current));
                    setSelectedSectionId('');
                  }}
                  options={availableSchoolYears.map((row) => ({ value: row.label, label: row.label }))}
                />
                <SearchableSelect
                  label="Section (Selected School Year)"
                  placeholder="Section (Selected School Year)"
                  floatingLabel
                  showLabel={false}
                  value={selectedSectionId}
                  onChange={setSelectedSectionId}
                  options={sectionOptions}
                  disabled={!selectedSchoolYearId}
                />
                <SelectField label="Learner Type" value={draft.studentType} onChange={(value) => setDraft((current) => (current ? { ...current, studentType: value } : current))} options={studentTypeOptions as unknown as string[]} />
                <SelectField label="Learner Category" value={draft.learnerCategory} onChange={(value) => setDraft((current) => (current ? { ...current, learnerCategory: value } : current))} options={learnerCategoryOptions as unknown as string[]} />
                <InputField label="School to Enroll" value={draft.schoolToEnroll} onChange={(value) => setDraft((current) => (current ? { ...current, schoolToEnroll: value } : current))} />
                <InputField label="Previous School Attended" value={draft.previousSchool} onChange={(value) => setDraft((current) => (current ? { ...current, previousSchool: value } : current))} />
                <InputField label="Last S.Y. Attended" value={draft.previousSchoolYear} onChange={(value) => setDraft((current) => (current ? { ...current, previousSchoolYear: value } : current))} inputMode="numeric" maxLength={9} pattern="\\d{4}-\\d{4}" />
                <SelectField label="Last Grade Level Attended" value={draft.lastGradeLevel} onChange={(value) => setDraft((current) => (current ? { ...current, lastGradeLevel: value } : current))} options={lastGradeLevelOptions as unknown as string[]} />
                <SelectField label="Grade Level to Enroll" value={draft.gradeToEnroll} onChange={(value) => setDraft((current) => (current ? { ...current, gradeToEnroll: value } : current))} options={gradeLevelOptions as unknown as string[]} />
                <SelectField label="Track" value={draft.track} onChange={(value) => setDraft((current) => (current ? { ...current, track: value } : current))} options={trackOptions as unknown as string[]} disabled={isJuniorHighTargetGrade} />
                <SelectField label="Preferred Strand" value={draft.strand} onChange={(value) => setDraft((current) => (current ? { ...current, strand: value } : current))} options={strandOptions} disabled={isJuniorHighTargetGrade} />
                <SelectField label="Semester" value={draft.semester} onChange={(value) => setDraft((current) => (current ? { ...current, semester: value } : current))} options={semesterOptions as unknown as string[]} disabled={isJuniorHighTargetGrade} />
              </div>
            </section>
            <section className="registrar-public-enrollment__section">
              <h3>Learner Personal Information</h3>
              <div className="floating-field-grid">
                <InputField label="PSA Birth Certificate No." value={draft.birthCertificateNo} onChange={(value) => setDraft((current) => (current ? { ...current, birthCertificateNo: value } : current))} />
                <InputField label="LRN" value={draft.lrn} onChange={(value) => setDraft((current) => (current ? { ...current, lrn: value.replace(/\D/g, '').slice(0, 12) } : current))} inputMode="numeric" maxLength={12} pattern="\\d{12}" />
                <InputField label="Email Address" value={draft.email} onChange={(value) => setDraft((current) => (current ? { ...current, email: value } : current))} type="email" />
                <InputField label="Last Name" value={draft.lastName} onChange={(value) => setDraft((current) => (current ? { ...current, lastName: value } : current))} />
                <InputField label="First Name" value={draft.firstName} onChange={(value) => setDraft((current) => (current ? { ...current, firstName: value } : current))} />
                <InputField label="Middle Name" value={draft.middleName} onChange={(value) => setDraft((current) => (current ? { ...current, middleName: value } : current))} />
                <InputField label="Extension Name" value={draft.extensionName} onChange={(value) => setDraft((current) => (current ? { ...current, extensionName: value } : current))} />
                <InputField label="Date of Birth" value={draft.birthDate} onChange={(value) => setDraft((current) => (current ? { ...current, birthDate: value } : current))} type="date" />
                <SelectField label="Gender" value={draft.gender} onChange={(value) => setDraft((current) => (current ? { ...current, gender: value } : current))} options={['Male', 'Female']} />
                <InputField label="Place of Birth" value={draft.placeOfBirth} onChange={(value) => setDraft((current) => (current ? { ...current, placeOfBirth: value } : current))} />
                <InputField label="Learner Contact Number" value={draft.learnerContact} onChange={(value) => setDraft((current) => (current ? { ...current, learnerContact: value.replace(/\D/g, '').slice(0, 11) } : current))} inputMode="numeric" maxLength={11} />
                <InputField label="Mother Tongue" value={draft.motherTongue} onChange={(value) => setDraft((current) => (current ? { ...current, motherTongue: value } : current))} />
                <SelectField label="Religion" value={draft.religion} onChange={(value) => setDraft((current) => (current ? { ...current, religion: value } : current))} options={religionOptions as unknown as string[]} />
                <SelectField label="4Ps Beneficiary" value={draft.is4Ps} onChange={(value) => setDraft((current) => (current ? { ...current, is4Ps: value } : current))} options={['Yes', 'No']} />
                <InputField label="4Ps Household ID" value={draft.fourPsHouseholdId} onChange={(value) => setDraft((current) => (current ? { ...current, fourPsHouseholdId: value } : current))} />
              </div>
            </section>
            <section className="registrar-public-enrollment__section">
              <h3>Address Information</h3>
              <div className="floating-field-grid">
                <InputField label="Current Address" value={draft.currentAddress} onChange={(value) => setDraft((current) => (current ? { ...current, currentAddress: value } : current))} />
                <InputField label="Permanent Address" value={draft.permanentAddress} onChange={(value) => setDraft((current) => (current ? { ...current, permanentAddress: value } : current))} />
              </div>
            </section>
            <section className="registrar-public-enrollment__section">
              <h3>Parent, Guardian, and Access</h3>
              <div className="floating-field-grid">
                <InputField label="Father's Full Name" value={draft.fatherName} onChange={(value) => setDraft((current) => (current ? { ...current, fatherName: value } : current))} />
                <InputField label="Father's Contact Number" value={draft.fatherContact} onChange={(value) => setDraft((current) => (current ? { ...current, fatherContact: value.replace(/[^\d+]/g, '').slice(0, 15) } : current))} inputMode="tel" maxLength={15} />
                <InputField label="Mother's Maiden Name" value={draft.motherName} onChange={(value) => setDraft((current) => (current ? { ...current, motherName: value } : current))} />
                <InputField label="Mother's Contact Number" value={draft.motherContact} onChange={(value) => setDraft((current) => (current ? { ...current, motherContact: value.replace(/[^\d+]/g, '').slice(0, 15) } : current))} inputMode="tel" maxLength={15} />
                <InputField label="Legal Guardian's Name" value={draft.guardianName} onChange={(value) => setDraft((current) => (current ? { ...current, guardianName: value } : current))} />
                <InputField label="Guardian's Contact Number" value={draft.guardianContact} onChange={(value) => setDraft((current) => (current ? { ...current, guardianContact: value.replace(/[^\d+]/g, '').slice(0, 15) } : current))} inputMode="tel" maxLength={15} />
                <SelectField label="SPED Need" value={draft.hasSpedNeed} onChange={(value) => setDraft((current) => (current ? { ...current, hasSpedNeed: value } : current))} options={['Yes', 'No']} />
                <SelectField label="Preferred Learning Modality" value={draft.preferredModality} onChange={(value) => setDraft((current) => (current ? { ...current, preferredModality: value } : current))} options={modalityOptions as unknown as string[]} />
                <SelectField label="Preferred Device" value={draft.deviceAccess} onChange={(value) => setDraft((current) => (current ? { ...current, deviceAccess: value } : current))} options={deviceOptions as unknown as string[]} />
                <SelectField label="Internet Access" value={draft.hasInternet} onChange={(value) => setDraft((current) => (current ? { ...current, hasInternet: value } : current))} options={['Yes', 'No']} />
              </div>
            </section>
          </div>
        </div>
        <div className="modal-dialog__actions">
          <button type="button" className="modal-dialog__primary" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="modal-dialog__blue"
            onClick={async () => {
              const currentHistory = Array.isArray(student.enrollments) ? [...student.enrollments] : [];
              const scopedSchoolYear = selectedSchoolYearLabel || draft.schoolYear || activeSchoolYearLabel;
              const selectedSection = availableSections.find((section) => section.id === selectedSectionId);
              const submissionPayload = {
                ...draft,
                consent: true,
              };
              let matched = false;
              const nextHistory = currentHistory.length > 0
                ? currentHistory.map((entry: any) => {
                    if (String(entry?.schoolYear || '').trim() !== String(scopedSchoolYear || '').trim()) return entry;
                    matched = true;
                    return {
                      ...entry,
                      schoolYear: scopedSchoolYear,
                      gradeLevel: selectedSection?.gradeLevel || draft.gradeToEnroll || entry?.gradeLevel || draft.lastGradeLevel || '',
                      section: selectedSection?.name || entry?.section || '',
                      submissionPayload,
                    };
                  })
                : [];

              if (!matched) {
                nextHistory.push({
                  id: crypto.randomUUID(),
                  schoolYear: scopedSchoolYear,
                  gradeLevel: selectedSection?.gradeLevel || draft.gradeToEnroll || draft.lastGradeLevel || '',
                  section: selectedSection?.name || '',
                  enrollmentDate: new Date().toISOString(),
                  status: 'Information Updated',
                  submissionPayload,
                });
              }

              const result = await onSubmit(student.id, {
                lrn: draft.lrn.trim(),
                firstName: draft.firstName.trim(),
                lastName: draft.lastName.trim(),
                middleName: draft.middleName.trim(),
                email: draft.email.trim(),
                birthDate: draft.birthDate.trim(),
                gender: draft.gender.trim(),
                address: (draft.currentAddress || draft.permanentAddress || '').trim(),
                contactNumber: draft.learnerContact.trim(),
                guardian_name: draft.guardianName.trim(),
                father_name: draft.fatherName.trim(),
                mother_name: draft.motherName.trim(),
                is4Ps: draft.is4Ps === 'Yes',
                sectionId: selectedSectionId || undefined,
                enrollments: nextHistory as any,
              });
              if (result?.error) {
                onError(result.error);
                return;
              }
              onSuccess?.('Learner information saved successfully.');
              onClose();
            }}
            disabled={loading || isLoadingRecord}
          >
            Save Learner Information
          </button>
        </div>
      </div>
    </div>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  disabled?: boolean;
  inputMode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal';
  maxLength?: number;
  pattern?: string;
};

function InputField({ label, value, onChange, type = 'text', readOnly = false, disabled = false, inputMode, maxLength, pattern }: InputProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={type}
          readOnly={readOnly}
          disabled={disabled}
          inputMode={inputMode}
          maxLength={maxLength}
          pattern={pattern}
          placeholder=" "
        />
        <span>{label}</span>
      </div>
    </label>
  );
}

type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
};

function SelectField({ label, value, onChange, options, disabled = false }: SelectProps) {
  const normalizedOptions = options.map((option) => ({ value: option, label: option }));
  return (
    <SearchableSelect
      label={label}
      placeholder={label}
      floatingLabel
      showLabel={false}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={normalizedOptions}
    />
  );
}
