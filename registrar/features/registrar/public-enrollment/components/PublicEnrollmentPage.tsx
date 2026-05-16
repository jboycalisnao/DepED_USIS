import { FormEvent, useMemo, useRef, useState } from 'react';
import { useEffect } from 'react';
import { RegistrarHeader } from '../../../../components/shell/RegistrarHeader';
import { RegistrarFooter } from '../../../../components/shell/RegistrarFooter';
import { SearchableSelect } from '../../../../components/ui/SearchableSelect';
import { supabase } from '../../../../lib/supabase';
import {
  deviceOptions,
  gradeLevelOptions,
  learnerCategoryOptions,
  modalityOptions,
  religionOptions,
  semesterOptions,
  studentTypeOptions,
} from '../data/enrollmentOptions';
import type { EnrollmentDraft } from '../types';
import { createPublicEnrollmentSubmission } from '../services/publicEnrollmentSubmissions';
import { normalizeSchoolYearPair, validatePublicEnrollmentDraft } from '../utils/validation';
import { fetchActiveDepedSchools } from '../services/depedApiClient';
import {
  fetchPsgcCitiesAndMunicipalities,
  fetchPsgcProvinces,
  fetchPsgcRegions,
  type PsgcLocation,
} from '../services/psgcApiClient';

import '../../../../styles/publicEnrollment.css';

const LEON_NHS_ID = '302522';
const LEON_NHS_NAME = 'Leon National High School';
const SAME_SCHOOL_LABEL = 'Same School';
const SHS_GRADES = new Set(['Grade 11', 'Grade 12']);

const initialDraft: EnrollmentDraft = {
  schoolId: LEON_NHS_ID,
  schoolYear: '2026-2027',
  schoolToEnroll: LEON_NHS_NAME,
  studentType: 'New Student',
  learnerCategory: SAME_SCHOOL_LABEL,
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
  motherTongue: '',
  religion: 'Roman Catholic',
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
  preferredModality: 'Face-to-face',
  deviceAccess: 'Smart Phone',
  hasInternet: 'Yes',
  consent: false,
};

type SchoolDirectoryEntry = {
  schoolId: string;
  schoolName: string;
};

type AddressSelection = {
  regionCode: string;
  provinceCode: string;
  cityCode: string;
  streetLine: string;
};

const initialAddressSelection: AddressSelection = {
  regionCode: '',
  provinceCode: '',
  cityCode: '',
  streetLine: '',
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const gradeLevelOrder = gradeLevelOptions.map((level) => ({ label: level, value: Number(level.replace(/\D/g, '')) }));

const depedSchoolToOption = (record: any): SchoolDirectoryEntry | null => {
  const schoolId = String(
    record?.beis_school_id ||
      record?.school_id ||
      record?.school_code ||
      record?.schoolCode ||
      record?.schoolId ||
      record?.id ||
      ''
  ).trim();
  const schoolName = String(record?.school_name || record?.schoolName || record?.name || '').trim();
  if (!schoolId || !schoolName) return null;
  return { schoolId, schoolName };
};

const uniqueSchoolEntries = (rows: SchoolDirectoryEntry[]) => {
  const seen = new Set<string>();
  const unique: SchoolDirectoryEntry[] = [];
  for (const row of rows) {
    const key = `${row.schoolId}::${row.schoolName.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }
  return unique;
};

const locationNameByCode = (rows: PsgcLocation[], code: string) => rows.find((row) => row.code === code)?.name || '';

const buildAddressLine = (selection: AddressSelection, regions: PsgcLocation[], provinces: PsgcLocation[], cities: PsgcLocation[]) =>
  [selection.streetLine, locationNameByCode(cities, selection.cityCode), locationNameByCode(provinces, selection.provinceCode), locationNameByCode(regions, selection.regionCode)]
    .filter(Boolean)
    .join(', ');


export default function PublicEnrollmentPage() {
  const [draft, setDraft] = useState<EnrollmentDraft>(initialDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const [previousSchoolOptions, setPreviousSchoolOptions] = useState<SchoolDirectoryEntry[]>([]);
  const [previousSchoolQuery, setPreviousSchoolQuery] = useState('');
  const latestPreviousSearchRequest = useRef(0);
  const [previousSchoolStartYear, setPreviousSchoolStartYear] = useState('');
  const [previousSchoolEndYear, setPreviousSchoolEndYear] = useState('');

  const [regions, setRegions] = useState<PsgcLocation[]>([]);
  const [provinces, setProvinces] = useState<PsgcLocation[]>([]);
  const [cities, setCities] = useState<PsgcLocation[]>([]);
  const [permanentAddress, setPermanentAddress] = useState<AddressSelection>(initialAddressSelection);
  const [currentAddress, setCurrentAddress] = useState<AddressSelection>(initialAddressSelection);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [strandOptions, setStrandOptions] = useState<Array<{ value: string; label: string }>>([]);
  const isSeniorHighTargetGrade = SHS_GRADES.has(draft.gradeToEnroll);

  useEffect(() => {
    const loadActiveSchoolYear = async () => {
      const { data, error } = await supabase.from('registrar_school_years').select('label').eq('is_active', true).limit(1).maybeSingle();
      if (!error && data?.label) {
        setDraft((current) => ({ ...current, schoolYear: String(data.label), schoolId: LEON_NHS_ID, schoolToEnroll: LEON_NHS_NAME }));
      }
    };
    loadActiveSchoolYear();
  }, []);

  useEffect(() => {
    const loadPsgc = async () => {
      try {
        const [regionRows, provinceRows, cityRows] = await Promise.all([
          fetchPsgcRegions(),
          fetchPsgcProvinces(),
          fetchPsgcCitiesAndMunicipalities(),
        ]);
        setRegions(regionRows);
        setProvinces(provinceRows);
        setCities(cityRows);
      } catch (error: any) {
        setModalNotice({
          type: 'error',
          title: 'PSGC API Notice',
          message: error?.message || 'Unable to load PSGC locations right now.',
        });
      }
    };
    loadPsgc();
  }, []);

  useEffect(() => {
    const loadStrands = async () => {
      const { data, error } = await supabase.from('registrar_strands').select('acronym, full_name').order('acronym', { ascending: true });
      if (!error && data?.length) {
        setStrandOptions(
          data.map((row) => ({
            value: String(row.acronym || '').trim(),
            label: String(row.full_name || row.acronym || '').trim(),
          }))
        );
      }
    };
    loadStrands();
  }, []);

  useEffect(() => {
    const query = previousSchoolQuery.trim();
    if (!query) {
      setPreviousSchoolOptions([]);
      return;
    }

    const requestId = ++latestPreviousSearchRequest.current;
    const timer = window.setTimeout(async () => {
      try {
        const rows = await fetchActiveDepedSchools(query);
        if (requestId !== latestPreviousSearchRequest.current) return;
        const mapped = uniqueSchoolEntries(rows.map(depedSchoolToOption).filter(Boolean) as SchoolDirectoryEntry[]);
        setPreviousSchoolOptions(mapped);
      } catch {
        if (requestId === latestPreviousSearchRequest.current) {
          setPreviousSchoolOptions([]);
        }
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [previousSchoolQuery]);

  useEffect(() => {
    const nextPermanentAddress = buildAddressLine(permanentAddress, regions, provinces, cities);
    setDraft((current) => ({ ...current, permanentAddress: nextPermanentAddress }));
  }, [permanentAddress, regions, provinces, cities]);

  useEffect(() => {
    if (sameAsPermanent) {
      setCurrentAddress(permanentAddress);
      return;
    }
    const nextCurrentAddress = buildAddressLine(currentAddress, regions, provinces, cities);
    setDraft((current) => ({ ...current, currentAddress: nextCurrentAddress }));
  }, [sameAsPermanent, permanentAddress, currentAddress, regions, provinces, cities]);

  useEffect(() => {
    if (!sameAsPermanent) return;
    const copied = buildAddressLine(permanentAddress, regions, provinces, cities);
    setDraft((current) => ({ ...current, currentAddress: copied }));
  }, [sameAsPermanent, permanentAddress, regions, provinces, cities]);

  useEffect(() => {
    const schoolYear = normalizeSchoolYearPair(previousSchoolStartYear, previousSchoolEndYear) || '';
    setDraft((current) => ({ ...current, previousSchoolYear: schoolYear }));
  }, [previousSchoolStartYear, previousSchoolEndYear]);

  useEffect(() => {
    const currentGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
    const targetGrade = gradeLevelOrder.find((grade) => grade.label === draft.gradeToEnroll);
    const sameSchoolBlocked = draft.learnerCategory === SAME_SCHOOL_LABEL && draft.gradeToEnroll === 'Grade 7';
    const progressionBlocked = currentGrade && targetGrade ? targetGrade.value <= currentGrade.value : false;
    if (sameSchoolBlocked || progressionBlocked) {
      setDraft((current) => ({ ...current, gradeToEnroll: '' }));
    }
  }, [draft.lastGradeLevel, draft.gradeToEnroll, draft.learnerCategory]);

  useEffect(() => {
    if (!isSeniorHighTargetGrade) {
      if (!draft.strand && !draft.semester) return;
      setDraft((current) => ({ ...current, strand: '', semester: '' }));
      return;
    }

    if (!draft.semester) {
      setDraft((current) => ({ ...current, semester: '1st Sem' }));
    }
  }, [isSeniorHighTargetGrade, draft.strand, draft.semester]);

  const updateField = (name: keyof EnrollmentDraft, value: string | boolean) => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handlePreviousSchoolStartYearChange = (value: string) => {
    const cleaned = digitsOnly(value).slice(0, 4);
    setPreviousSchoolStartYear(cleaned);
    if (cleaned.length === 4) {
      setPreviousSchoolEndYear(String(Number(cleaned) + 1));
    }
  };

  const handlePreviousSchoolEndYearChange = (value: string) => {
    const cleaned = digitsOnly(value).slice(0, 4);
    setPreviousSchoolEndYear(cleaned);
    if (cleaned.length === 4) {
      setPreviousSchoolStartYear(String(Number(cleaned) - 1));
    }
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

  const selectedPreviousSchoolValue = useMemo(() => {
    const selected = previousSchoolOptions.find((entry) => entry.schoolName === draft.previousSchool);
    return selected ? `${selected.schoolId}::${selected.schoolName}` : '';
  }, [draft.previousSchool, previousSchoolOptions]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalNotice(null);

    if (!draft.consent) {
      setModalNotice({
        type: 'error',
        title: 'Validation Notice',
        message: 'Please validate the privacy consent before continuing.',
      });
      return;
    }
    if (!draft.schoolId) {
      setModalNotice({
        type: 'error',
        title: 'Validation Notice',
        message: 'School ID is required before submitting the enrollment form.',
      });
      return;
    }

    const commonValidationError = validatePublicEnrollmentDraft(draft);
    if (commonValidationError) {
      setModalNotice({
        type: 'error',
        title: 'Validation Notice',
        message: commonValidationError,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createPublicEnrollmentSubmission(draft);
      setIsSubmitting(false);
      setModalNotice({
        type: 'success',
        title: 'Submission Complete',
        message: 'Enrollment form received. Proceed to confirmation slip generation.',
      });
    } catch (error: any) {
      setIsSubmitting(false);
      setModalNotice({
        type: 'error',
        title: 'Submission Failed',
        message: error?.message || 'Unable to submit enrollment form. Please try again.',
      });
    }
  };

  return (
    <>
      <RegistrarHeader />
      <main className="page-frame registrar-public-enrollment">
        <div className="content-width">
          <section className="section-shell">
            <div className="portal-panel">
              <header className="portal-panel__header">
                <h2>Basic Education Enrollment Form</h2>
                <p>This form is not for sale. Revised based on DepEd enrollment template.</p>
              </header>

              <form className="portal-panel__body registrar-public-enrollment__form" onSubmit={handleSubmit}>
                <section className="registrar-public-enrollment__section">
                  <div className="notice-box">
                    <strong>School to Enroll</strong>
                    <span>{LEON_NHS_NAME} ({LEON_NHS_ID})</span>
                  </div>
                </section>

                <section className="registrar-public-enrollment__section">
                  <h3>1. Enrollment Context</h3>
                  <div className="floating-field-grid">
                    <TextField label="School Year (Active Registrar Year)" value={draft.schoolYear} onChange={() => {}} disabled />
                    <SelectField label="Student Type" value={draft.studentType} onChange={(value) => updateField('studentType', value)} options={studentTypeOptions as unknown as string[]} />
                    <SelectField label="Learner Category" value={draft.learnerCategory} onChange={(value) => updateField('learnerCategory', value)} options={learnerCategoryOptions as unknown as string[]} />
                    <SearchableSelect
                      label="Previous School Attended"
                      placeholder="Search by school name or ID (DepEd API active schools)"
                      floatingLabel
                      showLabel={false}
                      value={selectedPreviousSchoolValue}
                      onChange={(value) => {
                        const selected = previousSchoolOptions.find((entry) => `${entry.schoolId}::${entry.schoolName}` === value);
                        updateField('previousSchool', selected?.schoolName || '');
                      }}
                      onQueryChange={setPreviousSchoolQuery}
                      requireQueryBeforeOptions
                      minQueryLength={1}
                      serverSearch
                      options={previousSchoolOptions.map((entry) => ({
                        value: `${entry.schoolId}::${entry.schoolName}`,
                        label: `${entry.schoolName} (${entry.schoolId})`,
                      }))}
                    />
                    <YearPairField
                      startYear={previousSchoolStartYear}
                      endYear={previousSchoolEndYear}
                      onStartYearChange={handlePreviousSchoolStartYearChange}
                      onEndYearChange={handlePreviousSchoolEndYearChange}
                    />
                    <SelectField
                      label="Last Grade Level Attended"
                      value={draft.lastGradeLevel}
                      onChange={(value) => updateField('lastGradeLevel', value)}
                      options={gradeLevelOptions as unknown as string[]}
                    />
                    <SelectField
                      label="Grade Level to Enroll"
                      value={draft.gradeToEnroll}
                      onChange={(value) => updateField('gradeToEnroll', value)}
                      options={availableGradeToEnrollOptions as unknown as string[]}
                    />
                    <SelectField
                      label="Preferred Strand (Optional - SHS only)"
                      value={draft.strand}
                      onChange={(value) => updateField('strand', value)}
                      options={[{ value: '', label: 'No strand selected' }, ...strandOptions]}
                      disabled={!isSeniorHighTargetGrade}
                    />
                    <SelectField
                      label="Semester"
                      value={draft.semester}
                      onChange={(value) => updateField('semester', value)}
                      options={semesterOptions as unknown as string[]}
                      disabled={!isSeniorHighTargetGrade || !draft.strand}
                    />
                  </div>
                </section>

                <section className="registrar-public-enrollment__section">
                  <h3>2. Learner Personal Information</h3>
                  <div className="floating-field-grid">
                    <TextField label="PSA Birth Certificate No." value={draft.birthCertificateNo} onChange={(value) => updateField('birthCertificateNo', value)} />
                    <TextField label="Learner Reference Number (LRN)" value={draft.lrn} onChange={(value) => updateField('lrn', value)} inputMode="numeric" maxLength={12} pattern="[0-9]{12}" />
                    <TextField label="Email Address" value={draft.email} onChange={(value) => updateField('email', value)} inputMode="email" type="email" />
                    <TextField label="Last Name" value={draft.lastName} onChange={(value) => updateField('lastName', value)} required />
                    <TextField label="First Name" value={draft.firstName} onChange={(value) => updateField('firstName', value)} required />
                    <TextField label="Middle Name" value={draft.middleName} onChange={(value) => updateField('middleName', value)} />
                    <TextField label="Extension Name" value={draft.extensionName} onChange={(value) => updateField('extensionName', value)} />
                    <DateField label="Date of Birth" value={draft.birthDate} onChange={(value) => updateField('birthDate', value)} required />
                    <SelectField label="Gender" value={draft.gender} onChange={(value) => updateField('gender', value)} options={['Male', 'Female']} />
                    <TextField label="Place of Birth" value={draft.placeOfBirth} onChange={(value) => updateField('placeOfBirth', value)} />
                    <TextField label="Mother Tongue" value={draft.motherTongue} onChange={(value) => updateField('motherTongue', value)} />
                    <SelectField label="Religion" value={draft.religion} onChange={(value) => updateField('religion', value)} options={religionOptions as unknown as string[]} />
                    <SelectField label="4Ps Beneficiary" value={draft.is4Ps} onChange={(value) => updateField('is4Ps', value)} options={['Yes', 'No']} />
                    <TextField label="4Ps Household ID" value={draft.fourPsHouseholdId} onChange={(value) => updateField('fourPsHouseholdId', value)} />
                  </div>
                </section>

                <section className="registrar-public-enrollment__section">
                  <h3>3. Address Information</h3>
                  <div className="notice-box">
                    <strong>Permanent Address</strong>
                    <span>Select location using PSGC lists, then add street or purok details.</span>
                  </div>
                  <div className="floating-field-grid">
                    <SelectField
                      label="Region (PSGC)"
                      value={permanentAddress.regionCode}
                      onChange={(value) => setPermanentAddress((current) => ({ ...current, regionCode: value }))}
                      options={regions.map((row) => ({ value: row.code, label: row.name }))}
                    />
                    <SelectField
                      label="Province (PSGC)"
                      value={permanentAddress.provinceCode}
                      onChange={(value) => setPermanentAddress((current) => ({ ...current, provinceCode: value }))}
                      options={provinces.map((row) => ({ value: row.code, label: row.name }))}
                    />
                    <SelectField
                      label="City / Municipality (PSGC)"
                      value={permanentAddress.cityCode}
                      onChange={(value) => setPermanentAddress((current) => ({ ...current, cityCode: value }))}
                      options={cities.map((row) => ({ value: row.code, label: row.name }))}
                    />
                    <TextField
                      label="Street / Barangay / Purok"
                      value={permanentAddress.streetLine}
                      onChange={(value) => setPermanentAddress((current) => ({ ...current, streetLine: value }))}
                    />
                  </div>
                  <label className="choice-row" style={{ marginTop: 12 }}>
                    <input type="checkbox" checked={sameAsPermanent} onChange={(event) => setSameAsPermanent(event.target.checked)} />
                    <span>Current address is same as permanent address.</span>
                  </label>
                  <div className="notice-box">
                    <strong>Current Address</strong>
                    <span>Update only when different from permanent address.</span>
                  </div>
                  <div className="floating-field-grid">
                    <SelectField
                      label="Region (PSGC)"
                      value={currentAddress.regionCode}
                      onChange={(value) => setCurrentAddress((current) => ({ ...current, regionCode: value }))}
                      options={regions.map((row) => ({ value: row.code, label: row.name }))}
                      disabled={sameAsPermanent}
                    />
                    <SelectField
                      label="Province (PSGC)"
                      value={currentAddress.provinceCode}
                      onChange={(value) => setCurrentAddress((current) => ({ ...current, provinceCode: value }))}
                      options={provinces.map((row) => ({ value: row.code, label: row.name }))}
                      disabled={sameAsPermanent}
                    />
                    <SelectField
                      label="City / Municipality (PSGC)"
                      value={currentAddress.cityCode}
                      onChange={(value) => setCurrentAddress((current) => ({ ...current, cityCode: value }))}
                      options={cities.map((row) => ({ value: row.code, label: row.name }))}
                      disabled={sameAsPermanent}
                    />
                    <TextField
                      label="Street / Barangay / Purok"
                      value={currentAddress.streetLine}
                      onChange={(value) => setCurrentAddress((current) => ({ ...current, streetLine: value }))}
                      disabled={sameAsPermanent}
                    />
                  </div>
                </section>

                <section className="registrar-public-enrollment__section">
                  <h3>4. Parent and Guardian Information</h3>
                  <div className="floating-field-grid">
                    <TextField label="Father's Full Name" value={draft.fatherName} onChange={(value) => updateField('fatherName', value)} />
                    <TextField label="Father's Contact Number" value={draft.fatherContact} onChange={(value) => updateField('fatherContact', value)} inputMode="tel" />
                    <TextField label="Mother's Maiden Name" value={draft.motherName} onChange={(value) => updateField('motherName', value)} />
                    <TextField label="Mother's Contact Number" value={draft.motherContact} onChange={(value) => updateField('motherContact', value)} inputMode="tel" />
                    <TextField label="Legal Guardian's Name" value={draft.guardianName} onChange={(value) => updateField('guardianName', value)} />
                    <TextField label="Guardian's Contact Number" value={draft.guardianContact} onChange={(value) => updateField('guardianContact', value)} inputMode="tel" />
                  </div>
                </section>

                <section className="registrar-public-enrollment__section">
                  <h3>5. Learning Modality and Access</h3>
                  <div className="floating-field-grid">
                    <SelectField label="Special Needs Education Program" value={draft.hasSpedNeed} onChange={(value) => updateField('hasSpedNeed', value)} options={['Yes', 'No']} />
                    <SelectField label="Preferred Learning Modality" value={draft.preferredModality} onChange={(value) => updateField('preferredModality', value)} options={modalityOptions as unknown as string[]} />
                    <SelectField label="Preferred Device" value={draft.deviceAccess} onChange={(value) => updateField('deviceAccess', value)} options={deviceOptions as unknown as string[]} />
                    <SelectField label="Internet Access" value={draft.hasInternet} onChange={(value) => updateField('hasInternet', value)} options={['Yes', 'No']} />
                  </div>
                </section>

                <section className="notice-box registrar-public-enrollment__consent">
                  <strong>Validate Entry</strong>
                  <label className="choice-row">
                    <input type="checkbox" checked={draft.consent} onChange={(event) => updateField('consent', event.target.checked)} />
                    <span>I certify that the information provided is true and correct and I authorize DepEd to process learner data in compliance with the Data Privacy Act of 2012.</span>
                  </label>
                </section>

                <div className="form-actions">
                  <button type="submit" className="primary-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting' : 'Next'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
      {modalNotice ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setModalNotice(null)} />
          <div
            className={`alert-modal ${
              modalNotice.type === 'success' ? 'alert-modal--success' : modalNotice.type === 'error' ? 'alert-modal--danger' : 'alert-modal--warning'
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="alert-modal__content">
              <h3>{modalNotice.title}</h3>
              <p>{modalNotice.message}</p>
            </div>
            <div className="alert-modal__actions">
              <button type="button" className="alert-modal__blue" onClick={() => setModalNotice(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <RegistrarFooter />
    </>
  );
}

type BaseFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  inputMode?: 'text' | 'search' | 'none' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal';
  maxLength?: number;
  pattern?: string;
  type?: string;
  disabled?: boolean;
};

function TextField({ label, value, onChange, required = false, inputMode, maxLength, pattern, type = 'text', disabled = false }: BaseFieldProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder=" "
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          pattern={pattern}
          type={type}
          disabled={disabled}
        />
        <span>{label}</span>
      </div>
    </label>
  );
}

function DateField({ label, value, onChange, required = false, disabled = false }: BaseFieldProps) {
  return (
    <label className="floating-field">
      <div className="floating-field__control">
        <input type="date" value={value} onChange={(event) => onChange(event.target.value)} placeholder=" " required={required} disabled={disabled} />
        <span>{label}</span>
      </div>
    </label>
  );
}

type YearPairFieldProps = {
  startYear: string;
  endYear: string;
  onStartYearChange: (value: string) => void;
  onEndYearChange: (value: string) => void;
};

function YearPairField({ startYear, endYear, onStartYearChange, onEndYearChange }: YearPairFieldProps) {
  return (
    <div style={{ gridColumn: 'span 2', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 8 }}>
      <div style={{ gridColumn: '1 / -1', marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--deped-muted)' }}>
          Last School Year Attended (Previous S.Y.)
        </span>
      </div>
      <label className="floating-field" style={{ marginBottom: 0 }}>
        <div className="floating-field__control">
          <input value={startYear} onChange={(event) => onStartYearChange(event.target.value)} placeholder=" " inputMode="numeric" maxLength={4} />
          <span>Start Year</span>
        </div>
      </label>
      <span style={{ fontWeight: 900, color: 'var(--deped-blue)' }}>-</span>
      <label className="floating-field" style={{ marginBottom: 0 }}>
        <div className="floating-field__control">
          <input value={endYear} onChange={(event) => onEndYearChange(event.target.value)} placeholder=" " inputMode="numeric" maxLength={4} />
          <span>End Year</span>
        </div>
      </label>
    </div>
  );
}

type SelectFieldProps = BaseFieldProps & {
  options: Array<{ value: string; label: string }> | string[];
};

function SelectField({ label, value, onChange, options, disabled = false }: SelectFieldProps) {
  const normalizedOptions =
    typeof options[0] === 'string'
      ? (options as string[]).map((option) => ({ value: option, label: option }))
      : (options as Array<{ value: string; label: string }>);

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
