import { FormEvent, useMemo, useRef, useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsisSearchableSelect } from '../../../../common/components/ui/UsisSearchableSelect';
import { supabase } from '../../../lib/supabase';
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
import { fetchActiveDepedSchools } from '../services/depedApiClient';
import {
  fetchPsgcBarangaysByLocality,
  fetchPsgcCitiesAndMunicipalitiesByProvince,
  fetchPsgcCitiesAndMunicipalitiesByRegion,
  fetchPsgcProvincesByRegion,
  fetchPsgcRegions,
  type PsgcLocation,
} from '../services/psgcApiClient';
import {
  buildAddressLine,
  depedSchoolToOption,
  digitsOnly,
  initialAddressSelection,
  initialDraft,
  LEON_NHS_ID,
  LEON_NHS_NAME,
  normalizeSchoolYearPair,
  SAME_SCHOOL_LABEL,
  type AddressSelection,
  type SchoolDirectoryEntry,
  uniqueSchoolEntries,
  validateCommonFields,
} from '../utils/enrollmentFormUtils';
import { DateField, SelectField, TextField } from './form/FormFields';
import UsisPageLoader from '../../../../common/components/UsisPageLoader';

const gradeLevelOrder = gradeLevelOptions.map((level) => ({ label: level, value: Number(level.replace(/\D/g, '')) }));
const SHS_GRADES = new Set(['Grade 11', 'Grade 12']);
const getNextGradeLevel = (gradeLevel: string) => {
  const current = gradeLevelOrder.find((entry) => entry.label === gradeLevel);
  if (!current) return '';
  const next = gradeLevelOrder.find((entry) => entry.value === current.value + 1);
  return next?.label || '';
};

type LrnLookupState =
  | { status: 'empty'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'matched'; message: string }
  | { status: 'not_found'; message: string };

export function EnrollmentFormPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<EnrollmentDraft>(initialDraft);
  const [isFormEnabled, setIsFormEnabled] = useState(true);
  const [formAvailabilityMessage, setFormAvailabilityMessage] = useState<string>('The online enrollment form is currently unavailable.');
  const [isFormAvailabilityLoading, setIsFormAvailabilityLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previousSchoolOptions, setPreviousSchoolOptions] = useState<SchoolDirectoryEntry[]>([]);
  const [previousSchoolQuery, setPreviousSchoolQuery] = useState('');
  const latestPreviousSearchRequest = useRef(0);
  const [regions, setRegions] = useState<PsgcLocation[]>([]);
  const [permanentProvinces, setPermanentProvinces] = useState<PsgcLocation[]>([]);
  const [currentProvinces, setCurrentProvinces] = useState<PsgcLocation[]>([]);
  const [permanentCities, setPermanentCities] = useState<PsgcLocation[]>([]);
  const [currentCities, setCurrentCities] = useState<PsgcLocation[]>([]);
  const [permanentBarangays, setPermanentBarangays] = useState<PsgcLocation[]>([]);
  const [currentBarangays, setCurrentBarangays] = useState<PsgcLocation[]>([]);
  const [modalNotice, setModalNotice] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const [permanentAddress, setPermanentAddress] = useState<AddressSelection>(initialAddressSelection);
  const [currentAddress, setCurrentAddress] = useState<AddressSelection>(initialAddressSelection);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [strandOptions, setStrandOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [lrnLookupState, setLrnLookupState] = useState<LrnLookupState>({
    status: 'empty',
    message: 'Enter a 12-digit LRN to unlock and continue the form.',
  });

  useEffect(() => {
    const loadFormAvailability = async () => {
      setIsFormAvailabilityLoading(true);
      try {
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('registrar_enrollment_form_schedule')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (!scheduleError && scheduleData) {
          const enabled = !!(scheduleData as any).enabled;
          const useDateRange = !!(scheduleData as any).use_date_range;
          const startDateRaw = String((scheduleData as any).start_date || '').trim();
          const endDateRaw = String((scheduleData as any).end_date || '').trim();

          if (!enabled) {
            setIsFormEnabled(false);
            setFormAvailabilityMessage('The online enrollment form is currently disabled by the registrar.');
            return;
          }

          if (useDateRange) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = startDateRaw ? new Date(startDateRaw) : null;
            const endDate = endDateRaw ? new Date(endDateRaw) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            if (endDate) endDate.setHours(0, 0, 0, 0);

            const beforeStart = !!startDate && today < startDate;
            const afterEnd = !!endDate && today > endDate;
            if (beforeStart || afterEnd) {
              setIsFormEnabled(false);
              setFormAvailabilityMessage(
                `The online enrollment form is only available from ${startDateRaw || 'the configured start date'} to ${endDateRaw || 'the configured end date'}.`,
              );
              return;
            }
          }

          setIsFormEnabled(true);
          return;
        }

        const { data, error } = await supabase
          .from('registrar_app_settings')
          .select('value_bool')
          .eq('key', 'enrollment_form_enabled')
          .maybeSingle();
        if (!error && data && typeof data.value_bool === 'boolean') {
          setIsFormEnabled(data.value_bool);
        } else {
          setIsFormEnabled(true);
        }
      } catch {
        setIsFormEnabled(true);
      } finally {
        setIsFormAvailabilityLoading(false);
      }
    };
    loadFormAvailability();
  }, []);

  useEffect(() => {
    const loadActiveSchoolYear = async () => {
      const { data, error } = await supabase.from('registrar_school_years').select('label').eq('is_active', true).limit(1).maybeSingle();
      if (!error && data?.label) setDraft((current) => ({ ...current, schoolYear: String(data.label), schoolId: LEON_NHS_ID, schoolToEnroll: LEON_NHS_NAME }));
    };
    loadActiveSchoolYear();
  }, []);

  useEffect(() => {
    const loadPsgc = async () => {
      try {
        const regionRows = await fetchPsgcRegions();
        setRegions(regionRows);
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
      if (!error && data?.length) setStrandOptions(data.map((row) => ({ value: String(row.acronym || '').trim(), label: String(row.full_name || row.acronym || '').trim() })));
    };
    loadStrands();
  }, []);

  useEffect(() => {
    const normalizedLrn = digitsOnly(draft.lrn || '');
    if (!normalizedLrn) {
      setLrnLookupState({ status: 'empty', message: 'Enter a 12-digit LRN to unlock and continue the form.' });
      return;
    }
    if (normalizedLrn.length !== 12) {
      setLrnLookupState({ status: 'invalid', message: 'LRN must be exactly 12 digits. Other fields stay locked.' });
      return;
    }

    let isCancelled = false;
    const loadLearnerByLrn = async () => {
      setLrnLookupState({ status: 'checking', message: 'Checking learner record by LRN...' });
      try {
        const { data, error } = await supabase
          .from('registrar_learners')
          .select('id,lrn,first_name,last_name,middle_name,birth_date,gender,address,contact_number,guardian_name,father_name,mother_name,is_4ps,email,enrollment_history')
          .eq('lrn', normalizedLrn)
          .maybeSingle();
        if (isCancelled) return;
        if (error) {
          setLrnLookupState({ status: 'invalid', message: 'Unable to validate LRN right now. Please try again.' });
          return;
        }

        if (!data) {
          setLrnLookupState({
            status: 'not_found',
            message: 'New Enrollment – No existing learner record found. Continue by completing the form.',
          });
          setDraft((current) => ({
            ...initialDraft,
            schoolYear: current.schoolYear,
            schoolId: current.schoolId || LEON_NHS_ID,
            schoolToEnroll: current.schoolToEnroll || LEON_NHS_NAME,
            lrn: normalizedLrn,
            studentType: 'New Student',
            learnerCategory: SAME_SCHOOL_LABEL,
            previousSchool: LEON_NHS_NAME,
          }));
          return;
        }

        const learnerId = String((data as any).id || '').trim();
        const { data: latestHistoryRow } = learnerId
          ? await supabase
              .from('registrar_enrollment_history')
              .select('school_year,grade_level,submission_payload,enrollment_date,created_at')
              .eq('learner_id', learnerId)
              .order('enrollment_date', { ascending: false, nullsFirst: false })
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null as any };

        const enrollmentHistory = Array.isArray((data as any).enrollment_history) ? ([...(data as any).enrollment_history] as Array<any>) : [];
        const latestEnrollmentLegacy = enrollmentHistory
          .filter((entry) => entry && typeof entry === 'object')
          .sort((a, b) => new Date(String(b.enrollmentDate || b.created_at || 0)).getTime() - new Date(String(a.enrollmentDate || a.created_at || 0)).getTime())[0];
        const latestSchoolYear = String((latestHistoryRow as any)?.school_year || latestEnrollmentLegacy?.schoolYear || '').trim();
        const latestGradeLevel = String((latestHistoryRow as any)?.grade_level || latestEnrollmentLegacy?.gradeLevel || '').trim();
        const nextGradeLevel = getNextGradeLevel(latestGradeLevel);
        const submissionPayload = (latestHistoryRow as any)?.submission_payload && typeof (latestHistoryRow as any).submission_payload === 'object'
          ? (latestHistoryRow as any).submission_payload
          : latestEnrollmentLegacy?.submissionPayload && typeof latestEnrollmentLegacy.submissionPayload === 'object'
            ? latestEnrollmentLegacy.submissionPayload
          : {};

        setDraft((current) => ({
          ...current,
          lrn: normalizedLrn,
          studentType: 'Continuing Student',
          learnerCategory: SAME_SCHOOL_LABEL,
          previousSchool: LEON_NHS_NAME,
          previousSchoolYear: latestSchoolYear || current.previousSchoolYear,
          lastGradeLevel: latestGradeLevel || current.lastGradeLevel,
          gradeToEnroll: nextGradeLevel || current.gradeToEnroll,
          email: String((data as any).email || submissionPayload.email || current.email || ''),
          firstName: String(data.first_name || submissionPayload.firstName || current.firstName || ''),
          lastName: String(data.last_name || submissionPayload.lastName || current.lastName || ''),
          middleName: String(data.middle_name || submissionPayload.middleName || current.middleName || ''),
          birthDate: data.birth_date ? String(data.birth_date) : String(submissionPayload.birthDate || current.birthDate || ''),
          height: String(submissionPayload.height || current.height || ''),
          weight: String(submissionPayload.weight || current.weight || ''),
          gender: String(data.gender || submissionPayload.gender || current.gender || 'Male'),
          placeOfBirth: String(submissionPayload.placeOfBirth || current.placeOfBirth || ''),
          motherTongue: String(submissionPayload.motherTongue || current.motherTongue || ''),
          religion: String(submissionPayload.religion || current.religion || ''),
          learnerContact: String((data as any).contact_number || submissionPayload.learnerContact || current.learnerContact || ''),
          guardianName: String(data.guardian_name || submissionPayload.guardianName || current.guardianName || ''),
          fatherName: String(data.father_name || submissionPayload.fatherName || current.fatherName || ''),
          motherName: String(data.mother_name || submissionPayload.motherName || current.motherName || ''),
          fatherContact: String(submissionPayload.fatherContact || current.fatherContact || ''),
          motherContact: String(submissionPayload.motherContact || current.motherContact || ''),
          guardianContact: String(submissionPayload.guardianContact || current.guardianContact || ''),
          is4Ps: data.is_4ps ? 'Yes' : String(submissionPayload.is4Ps || current.is4Ps || 'No'),
          fourPsHouseholdId: String(submissionPayload.fourPsHouseholdId || current.fourPsHouseholdId || ''),
          currentAddress: String((data as any).address || submissionPayload.currentAddress || current.currentAddress || ''),
          permanentAddress: String(submissionPayload.permanentAddress || current.permanentAddress || ''),
          hasSpedNeed: String(submissionPayload.hasSpedNeed || current.hasSpedNeed || 'No'),
          preferredModality: String(submissionPayload.preferredModality || current.preferredModality || ''),
          deviceAccess: String(submissionPayload.deviceAccess || current.deviceAccess || ''),
          hasInternet: String(submissionPayload.hasInternet || current.hasInternet || ''),
        }));
        setLrnLookupState({
          status: 'matched',
          message: 'Continuing Student - Record Update (For Updating Existing Records). Review and confirm existing information.',
        });
      } catch {
        if (!isCancelled) setLrnLookupState({ status: 'invalid', message: 'Unable to validate LRN right now. Please try again.' });
      }
    };
    loadLearnerByLrn();
    return () => {
      isCancelled = true;
    };
  }, [draft.lrn]);

  useEffect(() => {
    const loadPermanentProvinces = async () => {
      if (!permanentAddress.regionCode) {
        setPermanentProvinces([]);
        return;
      }
      try {
        const rows = await fetchPsgcProvincesByRegion(permanentAddress.regionCode);
        setPermanentProvinces(rows);
      } catch {
        setPermanentProvinces([]);
      }
    };
    loadPermanentProvinces();
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
        const rows = await fetchPsgcProvincesByRegion(currentAddress.regionCode);
        setCurrentProvinces(rows);
      } catch {
        setCurrentProvinces([]);
      }
    };
    loadCurrentProvinces();
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
    loadPermanentCities();
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
    loadCurrentCities();
  }, [sameAsPermanent, permanentCities, currentAddress.regionCode, currentAddress.provinceCode]);

  useEffect(() => {
    const loadPermanentBarangays = async () => {
      const rows = await fetchPsgcBarangaysByLocality(permanentAddress.cityCode);
      setPermanentBarangays(rows);
    };
    loadPermanentBarangays();
  }, [permanentAddress.cityCode]);

  useEffect(() => {
    const loadCurrentBarangays = async () => {
      const locality = sameAsPermanent ? permanentAddress.cityCode : currentAddress.cityCode;
      const rows = await fetchPsgcBarangaysByLocality(locality);
      setCurrentBarangays(rows);
    };
    loadCurrentBarangays();
  }, [sameAsPermanent, permanentAddress.cityCode, currentAddress.cityCode]);

  useEffect(() => {
    setPermanentAddress((current) => ({ ...current, provinceCode: '', cityCode: '', barangayName: '' }));
  }, [permanentAddress.regionCode]);

  useEffect(() => {
    if (!permanentAddress.provinceCode) return;
    setPermanentAddress((current) => ({ ...current, barangayName: '' }));
  }, [permanentAddress.provinceCode]);

  useEffect(() => {
    setPermanentAddress((current) => ({ ...current, barangayName: '' }));
  }, [permanentAddress.cityCode]);

  useEffect(() => {
    if (sameAsPermanent) return;
    setCurrentAddress((current) => ({ ...current, provinceCode: '', cityCode: '', barangayName: '' }));
  }, [sameAsPermanent, currentAddress.regionCode]);

  useEffect(() => {
    if (sameAsPermanent || !currentAddress.provinceCode) return;
    setCurrentAddress((current) => ({ ...current, barangayName: '' }));
  }, [sameAsPermanent, currentAddress.provinceCode]);

  useEffect(() => {
    if (sameAsPermanent) return;
    setCurrentAddress((current) => ({ ...current, barangayName: '' }));
  }, [sameAsPermanent, currentAddress.cityCode]);

  useEffect(() => {
    const query = previousSchoolQuery.trim();
    if (!query) return setPreviousSchoolOptions([]);
    const requestId = ++latestPreviousSearchRequest.current;
    const timer = window.setTimeout(async () => {
      try {
        const rows = await fetchActiveDepedSchools(query);
        if (requestId !== latestPreviousSearchRequest.current) return;
        setPreviousSchoolOptions(uniqueSchoolEntries(rows.map(depedSchoolToOption).filter(Boolean) as SchoolDirectoryEntry[]));
      } catch {
        if (requestId === latestPreviousSearchRequest.current) setPreviousSchoolOptions([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [previousSchoolQuery]);

  useEffect(() => {
    setDraft((current) => ({ ...current, permanentAddress: buildAddressLine(permanentAddress, regions, permanentProvinces, permanentCities) }));
  }, [permanentAddress, regions, permanentProvinces, permanentCities]);

  useEffect(() => {
    if (sameAsPermanent) return setCurrentAddress(permanentAddress);
    setDraft((current) => ({ ...current, currentAddress: buildAddressLine(currentAddress, regions, currentProvinces, currentCities) }));
  }, [sameAsPermanent, permanentAddress, currentAddress, regions, currentProvinces, currentCities]);

  useEffect(() => {
    if (!sameAsPermanent) return;
    setDraft((current) => ({ ...current, currentAddress: buildAddressLine(permanentAddress, regions, permanentProvinces, permanentCities) }));
  }, [sameAsPermanent, permanentAddress, regions, permanentProvinces, permanentCities]);

  useEffect(() => {
    if (draft.studentType !== 'New Student') return;
    if (draft.lastGradeLevel === 'Grade 6' && draft.gradeToEnroll === 'Grade 7') return;
    setDraft((current) => ({
      ...current,
      lastGradeLevel: 'Grade 6',
      gradeToEnroll: 'Grade 7',
    }));
  }, [draft.studentType, draft.lastGradeLevel, draft.gradeToEnroll]);

  useEffect(() => {
    const currentGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
    const targetGrade = gradeLevelOrder.find((grade) => grade.label === draft.gradeToEnroll);
    const sameSchoolBlocked = draft.studentType === 'Continuing Student' && draft.learnerCategory === SAME_SCHOOL_LABEL && draft.gradeToEnroll === 'Grade 7';
    const progressionBlocked = currentGrade && targetGrade ? targetGrade.value <= currentGrade.value : false;
    if (sameSchoolBlocked || progressionBlocked) setDraft((current) => ({ ...current, gradeToEnroll: '' }));
  }, [draft.lastGradeLevel, draft.gradeToEnroll, draft.learnerCategory, draft.studentType]);

  useEffect(() => {
    if (!draft.lastGradeLevel) return;
    const currentGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
    if (!currentGrade) return;

    const nextAllowed = gradeLevelOrder.find((grade) => {
      if (grade.value <= currentGrade.value) return false;
      if (draft.studentType === 'Continuing Student' && draft.learnerCategory === SAME_SCHOOL_LABEL && grade.label === 'Grade 7') return false;
      return true;
    });

    if (!nextAllowed) return;
    if (draft.gradeToEnroll === nextAllowed.label) return;
    setDraft((current) => ({ ...current, gradeToEnroll: nextAllowed.label }));
  }, [draft.lastGradeLevel, draft.learnerCategory, draft.studentType]);

  useEffect(() => {
    if (!draft.strand) setDraft((current) => ({ ...current, semester: '1st Sem' }));
  }, [draft.strand]);

  useEffect(() => {
    if (draft.studentType !== 'Continuing Student') return;
    setDraft((current) => ({
      ...current,
      learnerCategory: SAME_SCHOOL_LABEL,
      schoolId: LEON_NHS_ID,
      schoolToEnroll: LEON_NHS_NAME,
      previousSchool: LEON_NHS_NAME,
    }));
  }, [draft.studentType]);

  useEffect(() => {
    if (draft.learnerCategory !== SAME_SCHOOL_LABEL) return;
    setDraft((current) => ({
      ...current,
      schoolId: LEON_NHS_ID,
      schoolToEnroll: LEON_NHS_NAME,
      previousSchool: LEON_NHS_NAME,
    }));
  }, [draft.learnerCategory]);

  const updateField = (name: keyof EnrollmentDraft, value: string | boolean) => setDraft((current) => ({ ...current, [name]: value }));
  const handlePreviousSchoolYearChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    if (!digits) {
      updateField('previousSchoolYear', '');
      return;
    }

    const startYear = digits.slice(0, 4);
    if (startYear.length < 4) {
      updateField('previousSchoolYear', startYear);
      return;
    }

    const nextYear = String(Number(startYear) + 1).padStart(4, '0');
    const typedEndYear = digits.slice(4, 8);
    const endYear = typedEndYear.length === 4 ? typedEndYear : nextYear;
    const normalized = `${startYear}-${endYear}`;
    const [start, end] = normalized.split('-');
    const completed = normalizeSchoolYearPair(start || '', end || '');

    if (completed) {
      const [currentStart] = String(draft.schoolYear || '').split('-');
      const currentStartNum = Number(currentStart);
      const prevStartNum = Number(start);
      if (!Number.isNaN(currentStartNum) && !Number.isNaN(prevStartNum) && prevStartNum >= currentStartNum) {
        return;
      }
    }

    updateField('previousSchoolYear', normalized);
  };

  const availableGradeToEnrollOptions = useMemo(() => {
    const lastGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
    return gradeLevelOptions.filter((grade) => {
      if (draft.studentType === 'Continuing Student' && draft.learnerCategory === SAME_SCHOOL_LABEL && grade === 'Grade 7') return false;
      if (!lastGrade) return true;
      const nextGrade = gradeLevelOrder.find((entry) => entry.label === grade);
      return Boolean(nextGrade && nextGrade.value > lastGrade.value);
    });
  }, [draft.lastGradeLevel, draft.learnerCategory, draft.studentType]);

  const selectedPreviousSchoolValue = useMemo(() => {
    if (draft.learnerCategory === SAME_SCHOOL_LABEL) {
      return `${LEON_NHS_ID}::${LEON_NHS_NAME}`;
    }
    const selected = previousSchoolOptions.find((entry) => entry.schoolName === draft.previousSchool);
    return selected ? `${selected.schoolId}::${selected.schoolName}` : '';
  }, [draft.learnerCategory, draft.previousSchool, previousSchoolOptions]);
  const isSeniorHighTargetGrade = SHS_GRADES.has(draft.gradeToEnroll);
  const isLrnResolved = lrnLookupState.status === 'matched' || lrnLookupState.status === 'not_found';
  const isFormLockedByLrn = !isLrnResolved;

  useEffect(() => {
    if (isSeniorHighTargetGrade) return;
    if (!draft.strand && !draft.semester) return;
    setDraft((current) => ({ ...current, strand: '', semester: '' }));
  }, [isSeniorHighTargetGrade, draft.strand, draft.semester]);

  useEffect(() => {
    if (!isSeniorHighTargetGrade) return;
    if (draft.semester) return;
    setDraft((current) => ({ ...current, semester: '1st Sem' }));
  }, [isSeniorHighTargetGrade, draft.semester]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setModalNotice(null);
    if (isFormLockedByLrn) {
      setModalNotice({ type: 'error', title: 'Validation Notice', message: 'Please enter and validate a 12-digit LRN before continuing.' });
      return;
    }
    if (!draft.consent) {
      setModalNotice({ type: 'error', title: 'Validation Notice', message: 'Please validate the privacy consent before continuing.' });
      return;
    }
    if (!draft.schoolId) {
      setModalNotice({ type: 'error', title: 'Validation Notice', message: 'School ID is required before submitting the enrollment form.' });
      return;
    }
    const commonValidationError = validateCommonFields(draft, gradeLevelOrder);
    if (commonValidationError) {
      setModalNotice({ type: 'error', title: 'Validation Notice', message: commonValidationError });
      return;
    }
    setIsSubmitting(true);
    try {
      const created = await createPublicEnrollmentSubmission(draft);
      const fullName = [draft.lastName, draft.firstName, draft.middleName].filter(Boolean).join(', ');
      navigate('/submission-confirmation', {
        replace: true,
        state: {
          submissionReferenceId: created.submissionReferenceId,
          lrn: draft.lrn,
          fullName,
        },
      });
    } catch (error: any) {
      setModalNotice({ type: 'error', title: 'Submission Failed', message: error?.message || 'Unable to submit enrollment form. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFormAvailabilityLoading) {
    return <UsisPageLoader message="Loading public enrollment form..." />;
  }

  if (!isFormEnabled) {
    return (
      <main className="page-frame enrollment-public-enrollment">
        <div className="content-width">
          <section className="section-shell" style={{ display: 'grid', placeItems: 'center', minHeight: '56vh' }}>
            <div
              className="portal-panel"
              style={{
                width: 'min(100%, 720px)',
                borderRadius: 16,
                border: '1px solid rgba(18, 35, 61, 0.12)',
                boxShadow: '0 16px 40px rgba(18, 35, 61, 0.12)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: 6,
                  width: '100%',
                  background:
                    'linear-gradient(90deg, var(--deped-blue) 0 62%, var(--deped-yellow) 62% 82%, var(--deped-red) 82% 100%)',
                }}
              />
              <div className="portal-panel__body" style={{ padding: 30 }}>
                <div style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'rgba(0, 56, 168, 0.08)',
                      color: 'var(--deped-blue)',
                      border: '2px solid rgba(252, 209, 22, 0.45)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" fill="none">
                      <path d="M7 2v3M17 2v3M4.5 8.5h15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" strokeWidth="1.8" />
                      <path d="M9 12l6 0M10 15l4 0" stroke="#ce1126" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--deped-blue)' }}>
                    Enrollment Form Temporarily Disabled
                  </h2>
                  <p style={{ margin: 0, maxWidth: 560, fontSize: '16px', color: 'var(--deped-muted)', lineHeight: 1.5 }}>
                    {formAvailabilityMessage}
                  </p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 6 }}>
                    <a href="/requirements" className="secondary-button">View Requirements</a>
                    <a href="/submission-status/login" className="primary-button">Submission Status Login</a>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      maxWidth: 560,
                      fontSize: '13px',
                      color: 'var(--deped-muted)',
                      lineHeight: 1.35,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Contact the registrar for enrollment assistance.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--deped-yellow)' }} />
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--deped-red)' }} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-frame enrollment-public-enrollment">
      <div className="content-width">
        <section className="section-shell">
          <div className="portal-panel">
            <header className="portal-panel__header">
              <h2>Basic Education Enrollment Form</h2>
              <p>This form is not for sale. Revised based on DepEd enrollment template.</p>
            </header>
            <form className="portal-panel__body enrollment-public-enrollment__form" onSubmit={handleSubmit}>
              <section className="enrollment-public-enrollment__section">
                <p style={{ margin: 0, color: 'var(--deped-muted)', fontSize: '13px' }}>
                  School to Enroll: {LEON_NHS_NAME} ({LEON_NHS_ID})
                </p>
              </section>
              <section className="enrollment-public-enrollment__section">
                <h3>LRN Validation</h3>
                <div className="floating-field-grid">
                  <TextField
                    label={lrnLookupState.status === 'checking' ? 'Learner Reference Number (LRN) - Checking...' : 'Learner Reference Number (LRN)'}
                    value={draft.lrn}
                    onChange={(value) => updateField('lrn', digitsOnly(value).slice(0, 12))}
                    inputMode="numeric"
                    maxLength={12}
                    pattern="[0-9]{12}"
                    required
                  />
                </div>
                <p
                  style={{
                    margin: 0,
                    color:
                      lrnLookupState.status === 'matched'
                        ? 'var(--deped-blue)'
                        : lrnLookupState.status === 'invalid'
                          ? 'var(--deped-red)'
                          : 'var(--deped-muted)',
                    fontSize: '13px',
                    fontWeight: lrnLookupState.status === 'matched' ? 700 : 400,
                  }}
                >
                  {lrnLookupState.message}
                </p>
              </section>
              <fieldset
                disabled={isFormLockedByLrn}
                style={{
                  border: 0,
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gap: 20,
                  opacity: isFormLockedByLrn ? 0.65 : 1,
                }}
              >
              <section className="enrollment-public-enrollment__section">
                <h3>1. Enrollment Context</h3>
                <div className="floating-field-grid">
                  <TextField label="School Year" value={draft.schoolYear} onChange={() => {}} disabled />
                  <SelectField label="Student Type" value={draft.studentType} onChange={(value) => updateField('studentType', value)} options={studentTypeOptions as unknown as string[]} disabled={lrnLookupState.status === 'matched'} />
                  <SelectField
                    label="Learner Category"
                    value={draft.learnerCategory}
                    onChange={(value) => updateField('learnerCategory', value)}
                    options={learnerCategoryOptions as unknown as string[]}
                    disabled={draft.studentType === 'Continuing Student' || lrnLookupState.status === 'matched'}
                  />
                  <UsisSearchableSelect
                    ariaLabel="Previous School Attended"
                    label="Previous School Attended"
                    floatingLabel
                    showLabel={false}
                    value={selectedPreviousSchoolValue}
                    onChange={(value) => {
                      const selected = previousSchoolOptions.find((entry) => `${entry.schoolId}::${entry.schoolName}` === value);
                      updateField('previousSchool', selected?.schoolName || '');
                    }}
                    onQueryChange={setPreviousSchoolQuery}
                    requireQueryBeforeOptions={draft.learnerCategory !== SAME_SCHOOL_LABEL}
                    minQueryLength={1}
                    serverSearch
                    forceInlineMenu
                    disabled={draft.learnerCategory === SAME_SCHOOL_LABEL}
                    options={
                      draft.learnerCategory === SAME_SCHOOL_LABEL
                        ? [{ value: `${LEON_NHS_ID}::${LEON_NHS_NAME}`, label: `${LEON_NHS_NAME} (${LEON_NHS_ID})` }]
                        : previousSchoolOptions.map((entry) => ({ value: `${entry.schoolId}::${entry.schoolName}`, label: `${entry.schoolName} (${entry.schoolId})` }))
                    }
                  />
                  <TextField
                    label="Last School Year Attended (Previous S.Y.)"
                    value={draft.previousSchoolYear}
                    onChange={handlePreviousSchoolYearChange}
                    inputMode="numeric"
                    maxLength={9}
                  />
                  <SelectField label="Last Grade Level" value={draft.lastGradeLevel} onChange={(value) => updateField('lastGradeLevel', value)} options={gradeLevelOptions as unknown as string[]} disabled={draft.studentType === 'New Student'} />
                  <SelectField label="Grade Level to Enroll" value={draft.gradeToEnroll} onChange={(value) => updateField('gradeToEnroll', value)} options={availableGradeToEnrollOptions as unknown as string[]} disabled={draft.studentType === 'New Student'} />
                  <SelectField label="Preferred Strand (Optional - SHS only)" value={draft.strand} onChange={(value) => updateField('strand', value)} options={strandOptions} disabled={!isSeniorHighTargetGrade} />
                  <SelectField label="Semester" value={draft.semester} onChange={(value) => updateField('semester', value)} options={semesterOptions as unknown as string[]} disabled={!isSeniorHighTargetGrade || !draft.strand} />
                </div>
              </section>
              <section className="enrollment-public-enrollment__section">
                <h3>2. Learner Personal Information</h3>
                <div className="floating-field-grid">
                  <TextField label="PSA Birth Certificate No." value={draft.birthCertificateNo} onChange={(value) => updateField('birthCertificateNo', digitsOnly(value).slice(0, 12))} inputMode="numeric" maxLength={12} pattern="[0-9]{12}" />
                  <TextField label="Email Address" value={draft.email} onChange={(value) => updateField('email', value)} inputMode="email" type="email" />
                  <TextField label="Last Name" value={draft.lastName} onChange={(value) => updateField('lastName', value)} required />
                  <TextField label="First Name" value={draft.firstName} onChange={(value) => updateField('firstName', value)} required />
                  <TextField label="Middle Name" value={draft.middleName} onChange={(value) => updateField('middleName', value)} />
                  <TextField label="Extension Name" value={draft.extensionName} onChange={(value) => updateField('extensionName', value)} />
                  <DateField label="Date of Birth" value={draft.birthDate} onChange={(value) => updateField('birthDate', value)} required />
                  <TextField label="Height (cm)" value={draft.height} onChange={(value) => updateField('height', value)} inputMode="decimal" />
                  <TextField label="Weight (kg)" value={draft.weight} onChange={(value) => updateField('weight', value)} inputMode="decimal" />
                  <SelectField label="Gender" value={draft.gender} onChange={(value) => updateField('gender', value)} options={['Male', 'Female']} />
                  <TextField label="Place of Birth" value={draft.placeOfBirth} onChange={(value) => updateField('placeOfBirth', value)} />
                  <TextField label="Learner Contact Number" value={draft.learnerContact} onChange={(value) => updateField('learnerContact', digitsOnly(value).slice(0, 11))} inputMode="numeric" maxLength={11} pattern="[0-9]{11}" />
                  <TextField label="Mother Tongue" value={draft.motherTongue} onChange={(value) => updateField('motherTongue', value)} />
                  <SelectField label="Religion" value={draft.religion} onChange={(value) => updateField('religion', value)} options={religionOptions as unknown as string[]} />
                  <SelectField label="4Ps Beneficiary" value={draft.is4Ps} onChange={(value) => updateField('is4Ps', value)} options={['Yes', 'No']} />
                  <TextField label="4Ps Household ID" value={draft.fourPsHouseholdId} onChange={(value) => updateField('fourPsHouseholdId', value)} />
                </div>
              </section>
              <section className="enrollment-public-enrollment__section">
                <h3>3. Address Information</h3>
                <p style={{ margin: 0, color: 'var(--deped-muted)', fontSize: '13px' }}>
                  Permanent Address: Select Region first, then Province, then City or Municipality.
                </p>
                <div className="floating-field-grid">
                  <SelectField label="Region" value={permanentAddress.regionCode} onChange={(value) => setPermanentAddress((current) => ({ ...current, regionCode: value }))} options={regions.map((row) => ({ value: row.code, label: row.name }))} />
                  <SelectField label="Province" value={permanentAddress.provinceCode} onChange={(value) => setPermanentAddress((current) => ({ ...current, provinceCode: value, cityCode: '', barangayName: '' }))} options={permanentProvinces.map((row) => ({ value: row.code, label: row.name }))} disabled={!permanentAddress.regionCode} />
                  <SelectField label="City / Municipality" value={permanentAddress.cityCode} onChange={(value) => setPermanentAddress((current) => ({ ...current, cityCode: value }))} options={permanentCities.map((row) => ({ value: row.code, label: row.name }))} disabled={!permanentAddress.regionCode || (!permanentAddress.provinceCode && permanentProvinces.length > 0)} />
                  <SelectField label="Barangay" value={permanentAddress.barangayName} onChange={(value) => setPermanentAddress((current) => ({ ...current, barangayName: value }))} options={permanentBarangays.map((row) => ({ value: row.name, label: row.name }))} disabled={!permanentAddress.cityCode} />
                  <TextField label="Street / Barangay / Purok" value={permanentAddress.streetLine} onChange={(value) => setPermanentAddress((current) => ({ ...current, streetLine: value }))} />
                </div>
                <label className="choice-row" style={{ marginTop: 12 }}>
                  <input type="checkbox" checked={sameAsPermanent} onChange={(event) => setSameAsPermanent(event.target.checked)} />
                  <span>Current address is same as permanent address.</span>
                </label>
                <p style={{ margin: 0, color: 'var(--deped-muted)', fontSize: '13px' }}>
                  Current Address: Update only when different from permanent address.
                </p>
                <div className="floating-field-grid">
                  <SelectField label="Region" value={currentAddress.regionCode} onChange={(value) => setCurrentAddress((current) => ({ ...current, regionCode: value }))} options={regions.map((row) => ({ value: row.code, label: row.name }))} disabled={sameAsPermanent} />
                  <SelectField label="Province" value={currentAddress.provinceCode} onChange={(value) => setCurrentAddress((current) => ({ ...current, provinceCode: value, cityCode: '', barangayName: '' }))} options={currentProvinces.map((row) => ({ value: row.code, label: row.name }))} disabled={sameAsPermanent || !currentAddress.regionCode} />
                  <SelectField label="City / Municipality" value={currentAddress.cityCode} onChange={(value) => setCurrentAddress((current) => ({ ...current, cityCode: value }))} options={currentCities.map((row) => ({ value: row.code, label: row.name }))} disabled={sameAsPermanent || !currentAddress.regionCode || (!currentAddress.provinceCode && currentProvinces.length > 0)} />
                  <SelectField label="Barangay" value={currentAddress.barangayName} onChange={(value) => setCurrentAddress((current) => ({ ...current, barangayName: value }))} options={currentBarangays.map((row) => ({ value: row.name, label: row.name }))} disabled={sameAsPermanent || !currentAddress.cityCode} />
                  <TextField label="Street / Barangay / Purok" value={currentAddress.streetLine} onChange={(value) => setCurrentAddress((current) => ({ ...current, streetLine: value }))} disabled={sameAsPermanent} />
                </div>
              </section>
              <section className="enrollment-public-enrollment__section">
                <h3>4. Parent and Guardian Information</h3>
                <div className="floating-field-grid">
                  <TextField label="Father's Full Name" value={draft.fatherName} onChange={(value) => updateField('fatherName', value)} />
                  <TextField label="Father's Contact Number" value={draft.fatherContact} onChange={(value) => updateField('fatherContact', digitsOnly(value).slice(0, 11))} inputMode="numeric" maxLength={11} pattern="[0-9]{11}" />
                  <TextField label="Mother's Maiden Name" value={draft.motherName} onChange={(value) => updateField('motherName', value)} />
                  <TextField label="Mother's Contact Number" value={draft.motherContact} onChange={(value) => updateField('motherContact', digitsOnly(value).slice(0, 11))} inputMode="numeric" maxLength={11} pattern="[0-9]{11}" />
                  <TextField label="Legal Guardian's Name" value={draft.guardianName} onChange={(value) => updateField('guardianName', value)} />
                  <TextField label="Guardian's Contact Number" value={draft.guardianContact} onChange={(value) => updateField('guardianContact', digitsOnly(value).slice(0, 11))} inputMode="numeric" maxLength={11} pattern="[0-9]{11}" />
                </div>
              </section>
              <section className="enrollment-public-enrollment__section">
                <h3>5. Learning Modality and Access</h3>
                <div className="floating-field-grid">
                  <SelectField label="Special Needs Education Program" value={draft.hasSpedNeed} onChange={(value) => updateField('hasSpedNeed', value)} options={['Yes', 'No']} />
                  <SelectField label="Preferred Learning Modality" value={draft.preferredModality} onChange={(value) => updateField('preferredModality', value)} options={modalityOptions as unknown as string[]} />
                  <SelectField label="Preferred Device" value={draft.deviceAccess} onChange={(value) => updateField('deviceAccess', value)} options={deviceOptions as unknown as string[]} />
                  <SelectField label="Internet Access" value={draft.hasInternet} onChange={(value) => updateField('hasInternet', value)} options={['Yes', 'No']} />
                </div>
              </section>
              <section className="enrollment-public-enrollment__section enrollment-public-enrollment__consent">
                <strong>Validate Entry</strong>
                <label className="choice-row">
                  <input type="checkbox" checked={draft.consent} onChange={(event) => updateField('consent', event.target.checked)} />
                  <span>I certify that the information provided is true and correct and I authorize DepEd to process learner data in compliance with the Data Privacy Act of 2012.</span>
                </label>
              </section>
              <div className="form-actions">
                <button type="submit" className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Submitting' : 'Next'}</button>
              </div>
              </fieldset>
            </form>
          </div>
        </section>
      </div>
      {modalNotice ? (
        <div className="modal-overlay modal-overlay--high" role="presentation">
          <div className="modal-backdrop" onClick={() => setModalNotice(null)} />
          <div className={`alert-modal ${modalNotice.type === 'success' ? 'alert-modal--success' : modalNotice.type === 'error' ? 'alert-modal--danger' : 'alert-modal--warning'}`} role="dialog" aria-modal="true">
            <div className="alert-modal__content">
              <h3>{modalNotice.title}</h3>
              <p>{modalNotice.message}</p>
            </div>
            <div className="alert-modal__actions">
              <button type="button" className="alert-modal__blue" onClick={() => setModalNotice(null)}>OK</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
