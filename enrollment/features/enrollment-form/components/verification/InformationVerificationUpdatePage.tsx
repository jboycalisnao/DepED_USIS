import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UsisPageLoader from '../../../../../common/components/UsisPageLoader';
import { fetchInformationVerificationAndUpdateEnabled } from '../../services/enrollmentVerificationControls';
import {
  fetchPublicEnrollmentSubmissionById,
  fetchPublicEnrollmentSubmissionByReferenceId,
  updatePublicEnrollmentSubmissionRecord,
} from '../../services/publicEnrollmentSubmissions';
import { fetchPsgcBarangaysByLocality, fetchPsgcCitiesAndMunicipalitiesByProvince, fetchPsgcCitiesAndMunicipalitiesByRegion, fetchPsgcProvincesByRegion, fetchPsgcRegions, type PsgcLocation } from '../../services/psgcApiClient';
import {
  deviceOptions,
  gradeLevelOptions,
  learnerCategoryOptions,
  modalityOptions,
  religionOptions,
  semesterOptions,
  studentTypeOptions,
  trackOptions,
} from '../../data/enrollmentOptions';
import { buildAddressLine, initialAddressSelection, initialDraft, type AddressSelection, validateCommonFields } from '../../utils/enrollmentFormUtils';
import type { EnrollmentDraft } from '../../types';
import { buildInformationVerificationAuditEntry } from '../../../../../common/utils/enrollmentSubmissionAuditTrail';
import { InformationVerificationFormSections } from '../../../../../common/components/enrollment/InformationVerificationFormSections';
import { VerificationAddressSection } from './VerificationAddressSection';
import { supabase } from '../../../../lib/supabase';
import { fetchEnrollmentSchoolYear } from '../../../../lib/enrollmentSchoolYear';

const SHS_GRADES = new Set(['Grade 11', 'Grade 12']);
const SAME_SCHOOL_LABEL = 'Same School';
const gradeLevelOrder = gradeLevelOptions.map((level) => ({ label: level, value: Number(level.replace(/\D/g, '')) }));

const emptyDraft = (schoolId: string, schoolYear: string): EnrollmentDraft => ({
  ...initialDraft,
  schoolId,
  schoolYear,
});

const hasAddressInput = (selection: AddressSelection) =>
  Boolean(selection.regionCode || selection.provinceCode || selection.cityCode || selection.barangayName || selection.streetLine.trim());

const mapSubmissionToDraft = (row: any, fallbackSchoolId: string, fallbackSchoolYear: string): EnrollmentDraft => {
  const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
  return {
    ...emptyDraft(String(row?.school_id || payload.schoolId || fallbackSchoolId || ''), String(row?.school_year || payload.schoolYear || fallbackSchoolYear || '')),
    schoolToEnroll: String(payload.schoolToEnroll || '').trim() || String(row?.school_id || fallbackSchoolId || ''),
    studentType: String(payload.studentType || 'New Student'),
    learnerCategory: String(payload.learnerCategory || SAME_SCHOOL_LABEL),
    previousSchool: String(payload.previousSchool || ''),
    previousSchoolYear: String(payload.previousSchoolYear || ''),
    lastGradeLevel: String(payload.lastGradeLevel || ''),
    gradeToEnroll: String(row?.grade_to_enroll || payload.gradeToEnroll || ''),
    track: String(payload.track || 'Academic Track'),
    strand: String(payload.strand || ''),
    semester: String(payload.semester || '1st Sem'),
    birthCertificateNo: String(payload.birthCertificateNo || ''),
    lrn: String(row?.lrn || payload.lrn || ''),
    email: String(payload.email || row?.email || ''),
    lastName: String(row?.last_name || payload.lastName || ''),
    firstName: String(row?.first_name || payload.firstName || ''),
    middleName: String(row?.middle_name || payload.middleName || ''),
    extensionName: String(payload.extensionName || ''),
    birthDate: String(payload.birthDate || ''),
    gender: String(payload.gender || 'Male'),
    placeOfBirth: String(payload.placeOfBirth || ''),
    height: String(payload.height || ''),
    weight: String(payload.weight || ''),
    learnerContact: String(payload.learnerContact || ''),
    motherTongue: String(payload.motherTongue || ''),
    religion: String(payload.religion || 'Roman Catholic'),
    is4Ps: String(payload.is4Ps || 'No'),
    fourPsHouseholdId: String(payload.fourPsHouseholdId || ''),
    currentAddress: String(payload.currentAddress || ''),
    permanentAddress: String(payload.permanentAddress || ''),
    fatherName: String(payload.fatherName || ''),
    fatherContact: String(payload.fatherContact || ''),
    motherName: String(payload.motherName || ''),
    motherContact: String(payload.motherContact || ''),
    guardianName: String(payload.guardianName || ''),
    guardianContact: String(row?.guardian_contact || payload.guardianContact || ''),
    hasSpedNeed: String(payload.hasSpedNeed || 'No'),
    preferredModality: String(payload.preferredModality || 'Face-to-face'),
    deviceAccess: String(payload.deviceAccess || 'Smart Phone'),
    hasInternet: String(payload.hasInternet || 'Yes'),
    consent: Boolean(payload.consent ?? true),
  };
};

export default function InformationVerificationUpdatePage() {
  const { submissionId = '' } = useParams();
  const navigate = useNavigate();
  const draftBaselineRef = useRef<EnrollmentDraft | null>(null);

  const [submission, setSubmission] = useState<any | null>(null);
  const [draft, setDraft] = useState<EnrollmentDraft>(emptyDraft('', ''));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSchoolYear, setActiveSchoolYear] = useState('');
  const [verificationEnabled, setVerificationEnabled] = useState(false);
  const [availableStrands, setAvailableStrands] = useState<string[]>([]);
  const [regions, setRegions] = useState<PsgcLocation[]>([]);
  const [permanentProvinces, setPermanentProvinces] = useState<PsgcLocation[]>([]);
  const [currentProvinces, setCurrentProvinces] = useState<PsgcLocation[]>([]);
  const [permanentCities, setPermanentCities] = useState<PsgcLocation[]>([]);
  const [currentCities, setCurrentCities] = useState<PsgcLocation[]>([]);
  const [permanentBarangays, setPermanentBarangays] = useState<PsgcLocation[]>([]);
  const [currentBarangays, setCurrentBarangays] = useState<PsgcLocation[]>([]);
  const [permanentAddress, setPermanentAddress] = useState<AddressSelection>(initialAddressSelection);
  const [currentAddress, setCurrentAddress] = useState<AddressSelection>(initialAddressSelection);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  const isSeniorHighTargetGrade = SHS_GRADES.has(draft.gradeToEnroll);
  const gradeToEnrollOptions = useMemo(() => gradeLevelOptions, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let submissionRow = await fetchPublicEnrollmentSubmissionById(submissionId);
        if (!submissionRow) {
          submissionRow = await fetchPublicEnrollmentSubmissionByReferenceId(submissionId);
        }

        const [activeYearRow, verificationRow, strandsRow, regionRows] = await Promise.allSettled([
          fetchEnrollmentSchoolYear(),
          fetchInformationVerificationAndUpdateEnabled(),
          supabase.from('registrar_strands').select('acronym,full_name').order('acronym', { ascending: true }),
          fetchPsgcRegions(),
        ]);

        if (cancelled) return;
        if (!submissionRow) {
          setError('Submission record not found.');
          return;
        }

        const nextActiveSchoolYear = activeYearRow.status === 'fulfilled' ? String(activeYearRow.value.label || '').trim() : '';
        setActiveSchoolYear(nextActiveSchoolYear);
        setVerificationEnabled(verificationRow.status === 'fulfilled' ? Boolean(verificationRow.value) : false);
        setAvailableStrands(
          strandsRow.status === 'fulfilled' && Array.isArray((strandsRow.value as any)?.data)
            ? ((strandsRow.value as any).data as Array<any>).map((row) => String(row?.full_name || row?.acronym || '').trim()).filter(Boolean)
            : [],
        );
        setRegions(regionRows.status === 'fulfilled' ? regionRows.value : []);
        const nextDraft = mapSubmissionToDraft(submissionRow, '', nextActiveSchoolYear);
        setDraft(nextDraft);
        draftBaselineRef.current = nextDraft;
        setSubmission(submissionRow);
      } catch (fetchError: any) {
        if (!cancelled) setError(fetchError?.message || 'Unable to load verification form.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  useEffect(() => {
    if (!sameAsPermanent) return;
    setCurrentAddress(permanentAddress);
  }, [sameAsPermanent, permanentAddress]);

  useEffect(() => {
    if (!hasAddressInput(permanentAddress)) return;
    const nextPermanentAddress = buildAddressLine(permanentAddress, regions, permanentProvinces, permanentCities);
    setDraft((current) => ({ ...current, permanentAddress: nextPermanentAddress || current.permanentAddress }));
  }, [permanentAddress, regions, permanentProvinces, permanentCities]);

  useEffect(() => {
    if (sameAsPermanent) {
      const nextCurrent = buildAddressLine(permanentAddress, regions, permanentProvinces, permanentCities);
      if (!nextCurrent && !hasAddressInput(permanentAddress)) return;
      setDraft((current) => ({ ...current, currentAddress: nextCurrent || current.currentAddress }));
      return;
    }
    if (!hasAddressInput(currentAddress)) return;
    const nextCurrentAddress = buildAddressLine(currentAddress, regions, currentProvinces, currentCities);
    setDraft((current) => ({ ...current, currentAddress: nextCurrentAddress || current.currentAddress }));
  }, [sameAsPermanent, currentAddress, permanentAddress, regions, currentProvinces, currentCities, permanentProvinces, permanentCities]);

  useEffect(() => {
    const loadPermanentProvinces = async () => {
      if (!permanentAddress.regionCode) {
        setPermanentProvinces([]);
        return;
      }
      try {
        setPermanentProvinces(await fetchPsgcProvincesByRegion(permanentAddress.regionCode));
      } catch {
        setPermanentProvinces([]);
      }
    };
    void loadPermanentProvinces();
  }, [permanentAddress.regionCode]);

  useEffect(() => {
    const loadCurrentProvinces = async () => {
      if (sameAsPermanent) {
        setCurrentProvinces(permanentProvinces);
        return;
      }
      if (!currentAddress.regionCode) {
        setCurrentProvinces([]);
        return;
      }
      try {
        setCurrentProvinces(await fetchPsgcProvincesByRegion(currentAddress.regionCode));
      } catch {
        setCurrentProvinces([]);
      }
    };
    void loadCurrentProvinces();
  }, [sameAsPermanent, permanentProvinces, currentAddress.regionCode]);

  useEffect(() => {
    const loadPermanentCities = async () => {
      if (!permanentAddress.regionCode) {
        setPermanentCities([]);
        return;
      }
      try {
        if (permanentAddress.provinceCode) {
          setPermanentCities(await fetchPsgcCitiesAndMunicipalitiesByProvince(permanentAddress.provinceCode));
          return;
        }
        setPermanentCities(await fetchPsgcCitiesAndMunicipalitiesByRegion(permanentAddress.regionCode));
      } catch {
        setPermanentCities([]);
      }
    };
    void loadPermanentCities();
  }, [permanentAddress.regionCode, permanentAddress.provinceCode]);

  useEffect(() => {
    const loadCurrentCities = async () => {
      if (sameAsPermanent) {
        setCurrentCities(permanentCities);
        return;
      }
      if (!currentAddress.regionCode) {
        setCurrentCities([]);
        return;
      }
      try {
        if (currentAddress.provinceCode) {
          setCurrentCities(await fetchPsgcCitiesAndMunicipalitiesByProvince(currentAddress.provinceCode));
          return;
        }
        setCurrentCities(await fetchPsgcCitiesAndMunicipalitiesByRegion(currentAddress.regionCode));
      } catch {
        setCurrentCities([]);
      }
    };
    void loadCurrentCities();
  }, [sameAsPermanent, permanentCities, currentAddress.regionCode, currentAddress.provinceCode]);

  useEffect(() => {
    const loadPermanentBarangays = async () => {
      setPermanentBarangays(await fetchPsgcBarangaysByLocality(permanentAddress.cityCode));
    };
    void loadPermanentBarangays();
  }, [permanentAddress.cityCode]);

  useEffect(() => {
    const loadCurrentBarangays = async () => {
      const locality = sameAsPermanent ? permanentAddress.cityCode : currentAddress.cityCode;
      setCurrentBarangays(await fetchPsgcBarangaysByLocality(locality));
    };
    void loadCurrentBarangays();
  }, [sameAsPermanent, permanentAddress.cityCode, currentAddress.cityCode]);

  const updateField = (name: keyof EnrollmentDraft, value: string | boolean) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const save = async () => {
    if (!submission || !draftBaselineRef.current) return;
    setIsSaving(true);
    setError(null);
    try {
      const validationError = validateCommonFields(draft, gradeLevelOrder);
      if (validationError) {
        throw new Error(validationError);
      }

      const nextPayload = {
        ...(submission.payload && typeof submission.payload === 'object' ? submission.payload : {}),
        ...draft,
        auditTrail: [
          ...((submission.payload && typeof submission.payload === 'object' && Array.isArray((submission.payload as any).auditTrail) ? (submission.payload as any).auditTrail : []) as Array<any>),
          buildInformationVerificationAuditEntry(draftBaselineRef.current, draft),
        ],
        verificationUpdatedAt: new Date().toISOString(),
      };

      await updatePublicEnrollmentSubmissionRecord(submission.id, {
        school_id: submission.school_id || draft.schoolId || null,
        school_year: submission.school_year || draft.schoolYear || null,
        lrn: draft.lrn || null,
        last_name: submission.last_name || draft.lastName || null,
        first_name: submission.first_name || draft.firstName || null,
        middle_name: submission.middle_name || draft.middleName || null,
        grade_to_enroll: submission.grade_to_enroll || draft.gradeToEnroll || null,
        guardian_contact: draft.guardianContact?.trim() ? draft.guardianContact.trim() : null,
        payload: nextPayload as any,
      });

      navigate('/submission-status?q=' + encodeURIComponent(draft.lrn || submission.lrn || ''));
    } catch (saveError: any) {
      setError(saveError?.message || 'Unable to save verification update.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <UsisPageLoader message="Loading verification editor..." />;

  if (error) {
    return (
      <main className="page-frame registrar-public-enrollment">
        <div className="content-width">
          <section className="section-shell">
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h2>Information Verification and Update</h2>
              </div>
              <div className="portal-panel__body">
                <div className="notice-box">{error}</div>
                <button type="button" className="secondary-button" onClick={() => navigate('/submission-status')}>
                  Back to Submission Status
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!verificationEnabled || (activeSchoolYear && String(submission?.school_year || draft.schoolYear || '').trim() !== activeSchoolYear)) {
    return (
      <main className="page-frame registrar-public-enrollment">
        <div className="content-width">
          <section className="section-shell">
            <div className="portal-panel">
              <div className="portal-panel__header">
                <h2>Information Verification and Update</h2>
                <p>This verification feature is currently unavailable for the selected submission.</p>
              </div>
              <div className="portal-panel__body">
                <div className="notice-box">
                  <strong>Access Notice</strong>
                  <span>
                    {verificationEnabled
                      ? 'This submission is not tied to the current active school year.'
                      : 'The registrar has not enabled Information Verification and Update yet.'}
                  </span>
                </div>
                <button type="button" className="secondary-button" onClick={() => navigate('/submission-status')}>
                  Back to Submission Status
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-frame registrar-public-enrollment">
      <div className="content-width">
        <section className="section-shell">
          <div className="portal-panel registrar-public-enrollment__panel">
            <header className="portal-panel__header registrar-public-enrollment__hero">
              <div>
                <p className="registrar-public-enrollment__eyebrow">Information Verification and Update</p>
                <h2>Basic Education Enrollment Form</h2>
                <p>Review the submitted record, update the editable fields, and keep the locked identity data unchanged.</p>
              </div>
              <div className="registrar-public-enrollment__hero-meta">
                <div className="registrar-public-enrollment__hero-chip">
                  <span>School Year</span>
                  <strong>{draft.schoolYear || activeSchoolYear || '--'}</strong>
                </div>
                <div className="registrar-public-enrollment__hero-chip">
                  <span>Submission Ref</span>
                  <strong>{submission?.submission_reference_id || '--'}</strong>
                </div>
              </div>
            </header>

            <div className="portal-panel__body registrar-public-enrollment__form">
              <InformationVerificationFormSections
                draft={draft}
                onFieldChange={updateField}
                availableStrands={availableStrands}
                gradeToEnrollOptions={gradeToEnrollOptions}
                isSeniorHighTargetGrade={isSeniorHighTargetGrade}
                fieldLocks={{ enrollmentContext: true, identityCore: true }}
                studentTypeOptions={studentTypeOptions as unknown as string[]}
                learnerCategoryOptions={learnerCategoryOptions as unknown as string[]}
                trackOptions={trackOptions as unknown as string[]}
                semesterOptions={semesterOptions as unknown as string[]}
                motherTongueOptions={['Kinaray-a', 'Hiligaynon', 'Bisaya', 'Tagalog', 'English']}
                religionOptions={religionOptions as unknown as string[]}
                modalityOptions={modalityOptions as unknown as string[]}
                deviceOptions={deviceOptions as unknown as string[]}
                addressSection={
                  <VerificationAddressSection
                    existingPermanentAddress={draft.permanentAddress}
                    existingCurrentAddress={draft.currentAddress}
                    permanentAddress={permanentAddress}
                    currentAddress={currentAddress}
                    sameAsPermanent={sameAsPermanent}
                    setSameAsPermanent={setSameAsPermanent}
                    setPermanentAddress={setPermanentAddress}
                    setCurrentAddress={setCurrentAddress}
                    regions={regions}
                    permanentProvinces={permanentProvinces}
                    currentProvinces={currentProvinces}
                    permanentCities={permanentCities}
                    currentCities={currentCities}
                    permanentBarangays={permanentBarangays}
                    currentBarangays={currentBarangays}
                  />
                }
              />

              <div className="form-actions">
                <button type="button" className="secondary-button" onClick={() => navigate('/submission-status')} disabled={isSaving}>
                  Cancel
                </button>
                <button type="button" className="primary-button" onClick={() => void save()} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Verification Update'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
