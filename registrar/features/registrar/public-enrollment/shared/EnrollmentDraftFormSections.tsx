import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import type { EnrollmentDraft } from '../types';
import { deviceOptions, gradeLevelOptions, learnerCategoryOptions, modalityOptions, religionOptions, semesterOptions, studentTypeOptions, trackOptions } from '../data/enrollmentOptions';

type Props = {
  draft: EnrollmentDraft;
  onFieldChange: (name: keyof EnrollmentDraft, value: string) => void;
  availableStrands: string[];
  isSeniorHighTargetGrade: boolean;
  gradeToEnrollOptions?: string[];
  schoolIdReadOnly?: boolean;
  showFocusButtons?: boolean;
  onFocusSection?: (section: 'enrollmentContext' | 'learnerInfo' | 'addressInfo' | 'guardianInfo') => void;
  focusedSection?: 'enrollmentContext' | 'learnerInfo' | 'addressInfo' | 'guardianInfo' | null;
  onUnfocusSection?: () => void;
};

export default function EnrollmentDraftFormSections({
  draft,
  onFieldChange,
  availableStrands,
  isSeniorHighTargetGrade,
  gradeToEnrollOptions,
  schoolIdReadOnly = true,
  showFocusButtons = false,
  onFocusSection,
  focusedSection = null,
  onUnfocusSection,
}: Props) {
  const gradeTargets = gradeToEnrollOptions?.length ? gradeToEnrollOptions : [...gradeLevelOptions];

  return (
    <>
      <section className="registrar-public-enrollment__section"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><h3>Enrollment Context</h3>{showFocusButtons ? <div style={{ display: 'inline-flex', gap: 8 }}><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onFocusSection?.('enrollmentContext')} disabled={focusedSection === 'enrollmentContext'}>{focusedSection === 'enrollmentContext' ? 'Focused' : 'Focus'}</button><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onUnfocusSection?.()} disabled={focusedSection !== 'enrollmentContext'}>Unfocus</button></div> : null}</div><div className="floating-field-grid">
        <InputField label="School ID" value={draft.schoolId} onChange={(v) => onFieldChange('schoolId', v)} readOnly={schoolIdReadOnly} />
        <InputField label="School Year" value={draft.schoolYear} onChange={(v) => onFieldChange('schoolYear', v)} />
        <SelectField label="Learner Type" value={draft.studentType} onChange={(v) => onFieldChange('studentType', v)} options={studentTypeOptions as unknown as string[]} />
        <SelectField label="Learner Category" value={draft.learnerCategory} onChange={(v) => onFieldChange('learnerCategory', v)} options={learnerCategoryOptions as unknown as string[]} />
        <InputField label="School to Enroll" value={draft.schoolToEnroll} onChange={(v) => onFieldChange('schoolToEnroll', v)} />
        <InputField label="Previous School Attended" value={draft.previousSchool} onChange={(v) => onFieldChange('previousSchool', v)} />
        <InputField label="Last S.Y. Attended" value={draft.previousSchoolYear} onChange={(v) => onFieldChange('previousSchoolYear', v)} inputMode="numeric" maxLength={9} pattern="\\d{4}-\\d{4}" />
        <SelectField label="Last Grade Level Attended" value={draft.lastGradeLevel} onChange={(v) => onFieldChange('lastGradeLevel', v)} options={gradeLevelOptions as unknown as string[]} />
        <SelectField label="Grade Level to Enroll" value={draft.gradeToEnroll} onChange={(v) => onFieldChange('gradeToEnroll', v)} options={gradeTargets as unknown as string[]} />
        <SelectField label="Track" value={draft.track} onChange={(v) => onFieldChange('track', v)} options={trackOptions as unknown as string[]} disabled={!isSeniorHighTargetGrade} />
        <SelectField label="Preferred Strand" value={draft.strand} onChange={(v) => onFieldChange('strand', v)} options={availableStrands.filter(Boolean)} disabled={!isSeniorHighTargetGrade} />
        <SelectField label="Semester" value={draft.semester} onChange={(v) => onFieldChange('semester', v)} options={semesterOptions as unknown as string[]} disabled={!isSeniorHighTargetGrade || !draft.strand} />
      </div></section>

      <section className="registrar-public-enrollment__section"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><h3>Learner Personal Information</h3>{showFocusButtons ? <div style={{ display: 'inline-flex', gap: 8 }}><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onFocusSection?.('learnerInfo')} disabled={focusedSection === 'learnerInfo'}>{focusedSection === 'learnerInfo' ? 'Focused' : 'Focus'}</button><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onUnfocusSection?.()} disabled={focusedSection !== 'learnerInfo'}>Unfocus</button></div> : null}</div><div className="floating-field-grid">
        <InputField label="PSA Birth Certificate No." value={draft.birthCertificateNo} onChange={(v) => onFieldChange('birthCertificateNo', v)} />
        <InputField label="LRN" value={draft.lrn} onChange={(v) => onFieldChange('lrn', v)} inputMode="numeric" maxLength={12} pattern="\\d{12}" />
        <InputField label="Email Address" value={draft.email} onChange={(v) => onFieldChange('email', v)} type="email" />
        <InputField label="Last Name" value={draft.lastName} onChange={(v) => onFieldChange('lastName', v)} />
        <InputField label="First Name" value={draft.firstName} onChange={(v) => onFieldChange('firstName', v)} />
        <InputField label="Middle Name" value={draft.middleName} onChange={(v) => onFieldChange('middleName', v)} />
        <InputField label="Extension Name" value={draft.extensionName} onChange={(v) => onFieldChange('extensionName', v)} />
        <InputField label="Date of Birth" value={draft.birthDate} onChange={(v) => onFieldChange('birthDate', v)} type="date" />
        <SelectField label="Gender" value={draft.gender} onChange={(v) => onFieldChange('gender', v)} options={['Male', 'Female']} />
        <InputField label="Place of Birth" value={draft.placeOfBirth} onChange={(v) => onFieldChange('placeOfBirth', v)} />
        <InputField label="Learner Contact Number" value={draft.learnerContact} onChange={(v) => onFieldChange('learnerContact', v)} inputMode="tel" maxLength={15} />
        <InputField label="Mother Tongue" value={draft.motherTongue} onChange={(v) => onFieldChange('motherTongue', v)} />
        <SelectField label="Religion" value={draft.religion} onChange={(v) => onFieldChange('religion', v)} options={religionOptions as unknown as string[]} />
        <SelectField label="4Ps Beneficiary" value={draft.is4Ps} onChange={(v) => onFieldChange('is4Ps', v)} options={['Yes', 'No']} />
        <InputField label="4Ps Household ID" value={draft.fourPsHouseholdId} onChange={(v) => onFieldChange('fourPsHouseholdId', v)} />
      </div></section>

      <section className="registrar-public-enrollment__section"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><h3>Address Information</h3>{showFocusButtons ? <div style={{ display: 'inline-flex', gap: 8 }}><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onFocusSection?.('addressInfo')} disabled={focusedSection === 'addressInfo'}>{focusedSection === 'addressInfo' ? 'Focused' : 'Focus'}</button><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onUnfocusSection?.()} disabled={focusedSection !== 'addressInfo'}>Unfocus</button></div> : null}</div><div className="floating-field-grid">
        <InputField label="Current Address" value={draft.currentAddress} onChange={(v) => onFieldChange('currentAddress', v)} />
        <InputField label="Permanent Address" value={draft.permanentAddress} onChange={(v) => onFieldChange('permanentAddress', v)} />
      </div></section>

      <section className="registrar-public-enrollment__section"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><h3>Parent, Guardian, and Access</h3>{showFocusButtons ? <div style={{ display: 'inline-flex', gap: 8 }}><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onFocusSection?.('guardianInfo')} disabled={focusedSection === 'guardianInfo'}>{focusedSection === 'guardianInfo' ? 'Focused' : 'Focus'}</button><button type="button" className="secondary-button" style={{ minHeight: 34, padding: '0 10px' }} onClick={() => onUnfocusSection?.()} disabled={focusedSection !== 'guardianInfo'}>Unfocus</button></div> : null}</div><div className="floating-field-grid">
        <InputField label="Father's Full Name" value={draft.fatherName} onChange={(v) => onFieldChange('fatherName', v)} />
        <InputField label="Father's Contact Number" value={draft.fatherContact} onChange={(v) => onFieldChange('fatherContact', v)} inputMode="tel" maxLength={15} />
        <InputField label="Mother's Maiden Name" value={draft.motherName} onChange={(v) => onFieldChange('motherName', v)} />
        <InputField label="Mother's Contact Number" value={draft.motherContact} onChange={(v) => onFieldChange('motherContact', v)} inputMode="tel" maxLength={15} />
        <InputField label="Legal Guardian's Name" value={draft.guardianName} onChange={(v) => onFieldChange('guardianName', v)} />
        <InputField label="Guardian's Contact Number" value={draft.guardianContact} onChange={(v) => onFieldChange('guardianContact', v)} inputMode="tel" maxLength={15} />
        <SelectField label="SPED Need" value={draft.hasSpedNeed} onChange={(v) => onFieldChange('hasSpedNeed', v)} options={['Yes', 'No']} />
        <SelectField label="Preferred Learning Modality" value={draft.preferredModality} onChange={(v) => onFieldChange('preferredModality', v)} options={modalityOptions as unknown as string[]} />
        <SelectField label="Preferred Device" value={draft.deviceAccess} onChange={(v) => onFieldChange('deviceAccess', v)} options={deviceOptions as unknown as string[]} />
        <SelectField label="Internet Access" value={draft.hasInternet} onChange={(v) => onFieldChange('hasInternet', v)} options={['Yes', 'No']} />
      </div></section>
    </>
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
  return <label className="floating-field"><div className="floating-field__control"><input value={value} onChange={(event) => onChange(event.target.value)} type={type} readOnly={readOnly} disabled={disabled} inputMode={inputMode} maxLength={maxLength} pattern={pattern} placeholder=" " /><span>{label}</span></div></label>;
}

type SelectProps = { label: string; value: string; onChange: (value: string) => void; options: string[]; disabled?: boolean; };
function SelectField({ label, value, onChange, options, disabled = false }: SelectProps) {
  const normalizedOptions = options.map((option) => ({ value: option, label: option }));
  return <SearchableSelect label={label} placeholder={label} floatingLabel showLabel={false} value={value} onChange={onChange} disabled={disabled} options={normalizedOptions} />;
}
