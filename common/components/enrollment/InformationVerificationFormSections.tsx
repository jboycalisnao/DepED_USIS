import { ReactNode } from 'react';
import { UsisSearchableSelect } from '../ui/UsisSearchableSelect';

export type EnrollmentVerificationDraft = {
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
  height: string;
  weight: string;
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
  consent: boolean;
};

type FieldLockState = {
  enrollmentContext?: boolean;
  identityCore?: boolean;
};

type Props = {
  draft: EnrollmentVerificationDraft;
  onFieldChange: (name: keyof EnrollmentVerificationDraft, value: string | boolean) => void;
  availableStrands: string[];
  gradeToEnrollOptions: string[];
  isSeniorHighTargetGrade: boolean;
  addressSection: ReactNode;
  fieldLocks?: FieldLockState;
  studentTypeOptions: string[];
  learnerCategoryOptions: string[];
  trackOptions: string[];
  semesterOptions: string[];
  motherTongueOptions: string[];
  religionOptions: string[];
  modalityOptions: string[];
  deviceOptions: string[];
};

const inputClassName = 'w-full min-h-[56px] rounded-[12px] border border-surfaceVariant bg-white px-4 text-[14px] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface';

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled = false,
  inputMode,
  maxLength,
  pattern,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
  inputMode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal';
  maxLength?: number;
  pattern?: string;
}) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder=" " type={type} disabled={disabled} inputMode={inputMode} maxLength={maxLength} pattern={pattern} className={inputClassName} />
        <span>{label}</span>
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  disabled?: boolean;
}) {
  return (
    <UsisSearchableSelect
      ariaLabel={label}
      label={label}
      floatingLabel
      showLabel={false}
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={options.map((option) => ({ value: option, label: option }))}
      forceInlineMenu
    />
  );
}

export function InformationVerificationFormSections({
  draft,
  onFieldChange,
  availableStrands,
  gradeToEnrollOptions,
  isSeniorHighTargetGrade,
  addressSection,
  fieldLocks = {},
  studentTypeOptions,
  learnerCategoryOptions,
  trackOptions,
  semesterOptions,
  motherTongueOptions,
  religionOptions,
  modalityOptions,
  deviceOptions,
}: Props) {
  const contextLocked = fieldLocks.enrollmentContext ?? true;
  const identityLocked = fieldLocks.identityCore ?? false;

  return (
    <>
      <section className="registrar-public-enrollment__section">
        <h3>1. Enrollment Context</h3>
        <div className="floating-field-grid">
          <Field label="School ID" value={draft.schoolId} onChange={(value) => onFieldChange('schoolId', value)} disabled={contextLocked} />
          <Field label="School Year" value={draft.schoolYear} onChange={(value) => onFieldChange('schoolYear', value)} disabled={contextLocked} />
          <SelectField label="Learner Type" value={draft.studentType} onChange={(value) => onFieldChange('studentType', value)} options={studentTypeOptions} disabled={contextLocked} />
          <SelectField label="Learner Category" value={draft.learnerCategory} onChange={(value) => onFieldChange('learnerCategory', value)} options={learnerCategoryOptions} disabled={contextLocked} />
          <Field label="School to Enroll" value={draft.schoolToEnroll} onChange={(value) => onFieldChange('schoolToEnroll', value)} disabled={contextLocked} />
          <Field label="Previous School Attended" value={draft.previousSchool} onChange={(value) => onFieldChange('previousSchool', value)} disabled={contextLocked} />
          <Field label="Last S.Y. Attended" value={draft.previousSchoolYear} onChange={(value) => onFieldChange('previousSchoolYear', value)} disabled={contextLocked} />
          <SelectField label="Last Grade Level Attended" value={draft.lastGradeLevel} onChange={(value) => onFieldChange('lastGradeLevel', value)} options={['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']} disabled={contextLocked} />
          <SelectField label="Grade Level to Enroll" value={draft.gradeToEnroll} onChange={(value) => onFieldChange('gradeToEnroll', value)} options={gradeToEnrollOptions} disabled={contextLocked} />
          <SelectField label="Track" value={draft.track} onChange={(value) => onFieldChange('track', value)} options={trackOptions} disabled={contextLocked || !isSeniorHighTargetGrade} />
          <SelectField label="Preferred Strand" value={draft.strand} onChange={(value) => onFieldChange('strand', value)} options={availableStrands} disabled={contextLocked || !isSeniorHighTargetGrade} />
          <SelectField label="Semester" value={draft.semester} onChange={(value) => onFieldChange('semester', value)} options={semesterOptions} disabled={contextLocked || !isSeniorHighTargetGrade || !draft.strand} />
        </div>
      </section>

      <section className="registrar-public-enrollment__section">
        <h3>2. Learner Personal Information</h3>
        <div className="floating-field-grid">
          <Field label="PSA Birth Certificate No." value={draft.birthCertificateNo} onChange={(value) => onFieldChange('birthCertificateNo', value)} inputMode="numeric" maxLength={12} pattern="[0-9]{12}" />
          <Field label="Learner Reference Number (LRN)" value={draft.lrn} onChange={(value) => onFieldChange('lrn', value)} inputMode="numeric" maxLength={12} pattern="[0-9]{12}" />
          <Field label="Email Address" value={draft.email} onChange={(value) => onFieldChange('email', value)} type="email" />
          <Field label="Last Name" value={draft.lastName} onChange={(value) => onFieldChange('lastName', value)} disabled={identityLocked} />
          <Field label="First Name" value={draft.firstName} onChange={(value) => onFieldChange('firstName', value)} disabled={identityLocked} />
          <Field label="Middle Name" value={draft.middleName} onChange={(value) => onFieldChange('middleName', value)} disabled={identityLocked} />
          <Field label="Extension Name" value={draft.extensionName} onChange={(value) => onFieldChange('extensionName', value)} />
          <Field label="Date of Birth" value={draft.birthDate} onChange={(value) => onFieldChange('birthDate', value)} type="date" disabled={identityLocked} />
          <SelectField label="Gender" value={draft.gender} onChange={(value) => onFieldChange('gender', value)} options={['Male', 'Female']} />
          <Field label="Place of Birth" value={draft.placeOfBirth} onChange={(value) => onFieldChange('placeOfBirth', value)} />
          <Field label="Height (cm)" value={draft.height} onChange={(value) => onFieldChange('height', value)} />
          <Field label="Weight (kg)" value={draft.weight} onChange={(value) => onFieldChange('weight', value)} />
          <Field label="Learner Contact Number" value={draft.learnerContact} onChange={(value) => onFieldChange('learnerContact', value)} inputMode="tel" maxLength={15} />
          <SelectField label="Mother Tongue" value={draft.motherTongue} onChange={(value) => onFieldChange('motherTongue', value)} options={motherTongueOptions} />
          <SelectField label="Religion" value={draft.religion} onChange={(value) => onFieldChange('religion', value)} options={religionOptions} />
          <SelectField label="4Ps Beneficiary" value={draft.is4Ps} onChange={(value) => onFieldChange('is4Ps', value)} options={['Yes', 'No']} />
          <Field label="4Ps Household ID" value={draft.fourPsHouseholdId} onChange={(value) => onFieldChange('fourPsHouseholdId', value)} />
        </div>
      </section>

      {addressSection}

      <section className="registrar-public-enrollment__section">
        <h3>4. Parent and Guardian Information</h3>
        <div className="floating-field-grid">
          <Field label="Father's Full Name" value={draft.fatherName} onChange={(value) => onFieldChange('fatherName', value)} />
          <Field label="Father's Contact Number" value={draft.fatherContact} onChange={(value) => onFieldChange('fatherContact', value)} inputMode="tel" maxLength={15} />
          <Field label="Mother's Maiden Name" value={draft.motherName} onChange={(value) => onFieldChange('motherName', value)} />
          <Field label="Mother's Contact Number" value={draft.motherContact} onChange={(value) => onFieldChange('motherContact', value)} inputMode="tel" maxLength={15} />
          <Field label="Legal Guardian's Name" value={draft.guardianName} onChange={(value) => onFieldChange('guardianName', value)} />
          <Field label="Guardian's Contact Number" value={draft.guardianContact} onChange={(value) => onFieldChange('guardianContact', value)} inputMode="tel" maxLength={15} />
        </div>
      </section>

      <section className="registrar-public-enrollment__section">
        <h3>5. Learning Modality and Access</h3>
        <div className="floating-field-grid">
          <SelectField label="Special Needs Education Program" value={draft.hasSpedNeed} onChange={(value) => onFieldChange('hasSpedNeed', value)} options={['Yes', 'No']} />
          <SelectField label="Preferred Learning Modality" value={draft.preferredModality} onChange={(value) => onFieldChange('preferredModality', value)} options={modalityOptions} />
          <SelectField label="Preferred Device" value={draft.deviceAccess} onChange={(value) => onFieldChange('deviceAccess', value)} options={deviceOptions} />
          <SelectField label="Internet Access" value={draft.hasInternet} onChange={(value) => onFieldChange('hasInternet', value)} options={['Yes', 'No']} />
        </div>
      </section>
    </>
  );
}
