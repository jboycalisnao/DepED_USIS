import { FormEvent, useMemo, useState } from 'react';
import { registrarSchoolIdentity } from '../../config/schoolIdentity';
import { SearchableDropdown } from '../../components/ui/SearchableDropdown';
import {
  deviceOptions,
  enrollmentTypes,
  gradeLevelOptions,
  learnerClassifications,
  learningModalities,
  religionOptions,
  schoolSources,
  semesterOptions,
  specialNeedsDiagnoses,
  specialNeedsManifestations,
  yesNoOptions,
} from './data';
import { initialPublicEnrollmentForm } from './defaults';
import { savePublicEnrollmentResponse } from './storage';
import type { PublicEnrollmentResponse } from './types';
import { AddressGroup, Field, GuardianGroup } from './components/EnrollmentFieldGroups';

const toOptions = (options: string[]) => options.map((option) => ({ value: option, label: option }));

export default function PublicEnrollmentPage() {
  const [form, setForm] = useState<PublicEnrollmentResponse>(initialPublicEnrollmentForm);
  const [submitted, setSubmitted] = useState(false);

  const optionSets = useMemo(() => ({
    enrollmentTypes: toOptions(enrollmentTypes),
    learnerClassifications: toOptions(learnerClassifications),
    schoolSources: toOptions(schoolSources),
    gradeLevels: toOptions(gradeLevelOptions),
    semesters: toOptions(semesterOptions),
    yesNo: toOptions(yesNoOptions),
    religions: toOptions(religionOptions),
    modalities: toOptions(learningModalities),
    devices: toOptions(deviceOptions),
    diagnoses: toOptions(specialNeedsDiagnoses),
    manifestations: toOptions(specialNeedsManifestations),
  }), []);

  const setField = <K extends keyof PublicEnrollmentResponse>(field: K, value: PublicEnrollmentResponse[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitForm = (event: FormEvent) => {
    event.preventDefault();
    const response = {
      ...form,
      id: crypto.randomUUID(),
      submittedAt: new Date().toISOString(),
      permanentAddress: form.samePermanentAddress === 'YES' ? form.currentAddress : form.permanentAddress,
    };
    savePublicEnrollmentResponse(response);
    setSubmitted(true);
    setForm(initialPublicEnrollmentForm);
  };

  return (
    <main className="public-enrollment-page">
      <div className="content-width">
        <section className="public-enrollment__header">
          <p className="page-intro__eyebrow">Basic Education Enrollment Form</p>
          <h1>{registrarSchoolIdentity.schoolName}</h1>
          <p>
            School ID {registrarSchoolIdentity.schoolId} - {registrarSchoolIdentity.division} - {registrarSchoolIdentity.region}
          </p>
        </section>

        {submitted && (
          <div className="notice-box public-enrollment__notice">
            <strong>Enrollment response submitted.</strong>
            <span>The registrar office can review this response from the registrar dashboard.</span>
          </div>
        )}

        <form className="section-card public-enrollment__form" onSubmit={submitForm}>
          <div className="section-card__content">
            <section className="public-enrollment__section">
              <h2>Enrollment Details</h2>
              <div className="form-grid">
                <SearchableDropdown label="Enrollment Type" options={optionSets.enrollmentTypes} value={form.enrollmentType} placeholder="Select enrollment type" onChange={(value) => setField('enrollmentType', value)} allowClear={false} />
                <SearchableDropdown label="Learner Classification" options={optionSets.learnerClassifications} value={form.learnerClassification} placeholder="Select classification" onChange={(value) => setField('learnerClassification', value)} allowClear={false} />
                <SearchableDropdown label="School Source" options={optionSets.schoolSources} value={form.schoolSource} placeholder="Search source" onChange={(value) => setField('schoolSource', value)} />
                <Field label="Previous School Attended" value={form.previousSchool} onChange={(value) => setField('previousSchool', value)} />
                <Field label="Last S.Y. Attended" value={form.lastSchoolYearAttended} onChange={(value) => setField('lastSchoolYearAttended', value)} />
                <SearchableDropdown label="Last Grade Level Attended" options={optionSets.gradeLevels} value={form.lastGradeLevelAttended} placeholder="Select previous grade" onChange={(value) => setField('lastGradeLevelAttended', value)} />
                <SearchableDropdown label="Grade Level to Enroll" options={optionSets.gradeLevels} value={form.gradeLevelToEnroll} placeholder="Select target grade" onChange={(value) => setField('gradeLevelToEnroll', value)} allowClear={false} />
                <Field label="School Year" value={form.schoolYear} onChange={(value) => setField('schoolYear', value)} required />
                <Field label="Track" value={form.track} onChange={(value) => setField('track', value)} />
                <Field label="Strand" value={form.strand} onChange={(value) => setField('strand', value)} />
                <SearchableDropdown label="Semester" options={optionSets.semesters} value={form.semester} placeholder="Select semester" onChange={(value) => setField('semester', value)} />
              </div>
            </section>

            <section className="public-enrollment__section">
              <h2>Learner Information</h2>
              <div className="form-grid">
                <Field label="PSA Birth Certificate No." value={form.psaBirthCertificateNo} onChange={(value) => setField('psaBirthCertificateNo', value)} />
                <Field label="Learner Reference No. (LRN)" value={form.lrn} onChange={(value) => setField('lrn', value)} />
                <Field label="Last Name" value={form.lastName} onChange={(value) => setField('lastName', value)} required />
                <Field label="First Name" value={form.firstName} onChange={(value) => setField('firstName', value)} required />
                <Field label="Middle Name" value={form.middleName} onChange={(value) => setField('middleName', value)} />
                <Field label="Extension Name" value={form.extensionName} onChange={(value) => setField('extensionName', value)} />
                <Field label="Date of Birth" type="date" value={form.birthDate} onChange={(value) => setField('birthDate', value)} required />
                <SearchableDropdown label="Gender" options={toOptions(['Male', 'Female'])} value={form.gender} placeholder="Select gender" onChange={(value) => setField('gender', value)} />
                <Field label="Place of Birth" value={form.placeOfBirth} onChange={(value) => setField('placeOfBirth', value)} />
                <SearchableDropdown label="IP Community" options={optionSets.yesNo} value={form.isIpCommunity} placeholder="Select answer" onChange={(value) => setField('isIpCommunity', value)} allowClear={false} />
                <Field label="If yes, specify IP community" value={form.ipCommunityName} onChange={(value) => setField('ipCommunityName', value)} />
                <Field label="Mother Tongue" value={form.motherTongue} onChange={(value) => setField('motherTongue', value)} />
                <SearchableDropdown label="Religion" options={optionSets.religions} value={form.religion} placeholder="Search religion" onChange={(value) => setField('religion', value)} />
                <SearchableDropdown label="4Ps Beneficiary" options={optionSets.yesNo} value={form.is4psBeneficiary} placeholder="Select answer" onChange={(value) => setField('is4psBeneficiary', value)} allowClear={false} />
                <Field label="4Ps Household ID Number" value={form.household4psId} onChange={(value) => setField('household4psId', value)} />
              </div>
            </section>

            <section className="public-enrollment__section">
              <AddressGroup title="Current Address" value={form.currentAddress} onChange={(value) => setField('currentAddress', value)} />
              <SearchableDropdown label="Permanent Address Same as Current" options={optionSets.yesNo} value={form.samePermanentAddress} placeholder="Select answer" onChange={(value) => setField('samePermanentAddress', value)} allowClear={false} />
              {form.samePermanentAddress === 'NO' && (
                <AddressGroup title="Permanent Address" value={form.permanentAddress} onChange={(value) => setField('permanentAddress', value)} />
              )}
            </section>

            <section className="public-enrollment__section">
              <h2>Parent / Guardian Information</h2>
              <GuardianGroup title="Father's Name" value={form.father} onChange={(value) => setField('father', value)} />
              <GuardianGroup title="Mother's Maiden Name" value={form.mother} onChange={(value) => setField('mother', value)} />
              <GuardianGroup title="Legal Guardian's Name" value={form.guardian} onChange={(value) => setField('guardian', value)} />
            </section>

            <section className="public-enrollment__section">
              <h2>Special Needs and Learning Modality</h2>
              <div className="form-grid">
                <SearchableDropdown label="Special Needs Education Program" options={optionSets.yesNo} value={form.hasSpecialNeeds} placeholder="Select answer" onChange={(value) => setField('hasSpecialNeeds', value)} allowClear={false} />
                <SearchableDropdown label="Medical Diagnosis" options={optionSets.diagnoses} value={form.specialNeedsDiagnosis} placeholder="Search diagnosis" onChange={(value) => setField('specialNeedsDiagnosis', value)} />
                <SearchableDropdown label="Observed Manifestation" options={optionSets.manifestations} value={form.specialNeedsManifestation} placeholder="Search manifestation" onChange={(value) => setField('specialNeedsManifestation', value)} />
                <SearchableDropdown label="PWD ID" options={optionSets.yesNo} value={form.hasPwdId} placeholder="Select answer" onChange={(value) => setField('hasPwdId', value)} allowClear={false} />
                <SearchableDropdown label="Preferred Learning Modality" options={optionSets.modalities} value={form.preferredLearningModality} placeholder="Search modality" onChange={(value) => setField('preferredLearningModality', value)} />
                <SearchableDropdown label="Preferred Device" options={optionSets.devices} value={form.preferredDevice} placeholder="Search device" onChange={(value) => setField('preferredDevice', value)} />
                <SearchableDropdown label="Device Shared" options={optionSets.yesNo} value={form.isDeviceShared} placeholder="Select answer" onChange={(value) => setField('isDeviceShared', value)} allowClear={false} />
                <SearchableDropdown label="Internet Connection" options={optionSets.yesNo} value={form.hasInternetConnection} placeholder="Select answer" onChange={(value) => setField('hasInternetConnection', value)} allowClear={false} />
              </div>
            </section>

            <section className="public-enrollment__consent">
              <label>
                <input
                  type="checkbox"
                  checked={form.consentAccepted}
                  required
                  onChange={(event) => setField('consentAccepted', event.target.checked)}
                />
                <span>
                  I certify that the information given is true and correct, and I allow the Department of Education to use the learner details to create or update the learner profile in LIS.
                </span>
              </label>
            </section>

            <div className="form-actions">
              <button className="primary-button" type="submit">Submit Enrollment Response</button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
