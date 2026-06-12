import type { EnrollmentDraft } from '../types';
import type { PsgcLocation } from '../services/psgcApiClient';

export const LEON_NHS_ID = '302522';
export const LEON_NHS_NAME = 'Leon National High School';
export const SAME_SCHOOL_LABEL = 'Same School';

export type SchoolDirectoryEntry = {
  schoolId: string;
  schoolName: string;
};

export type AddressSelection = {
  regionCode: string;
  provinceCode: string;
  cityCode: string;
  barangayName: string;
  streetLine: string;
};

export const initialAddressSelection: AddressSelection = {
  regionCode: '',
  provinceCode: '',
  cityCode: '',
  barangayName: '',
  streetLine: '',
};

export const buildInitialEnrollmentDraft = (schoolYear = ''): EnrollmentDraft => ({
  schoolId: LEON_NHS_ID,
  schoolYear,
  schoolToEnroll: LEON_NHS_NAME,
  studentType: 'New Student',
  learnerCategory: SAME_SCHOOL_LABEL,
  previousSchool: '',
  previousSchoolYear: '',
  lastGradeLevel: '',
  gradeToEnroll: '',
  track: 'Academic Track',
  strand: '',
  semester: '1st Sem',
  birthCertificateNo: '',
  lrn: '',
  email: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extensionName: '',
  birthDate: '',
  height: '',
  weight: '',
  gender: '',
  placeOfBirth: '',
  learnerContact: '',
  motherTongue: '',
  religion: '',
  is4Ps: '',
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
});

export const initialDraft: EnrollmentDraft = buildInitialEnrollmentDraft();

export const digitsOnly = (value: string) => value.replace(/\D/g, '');
export const isValidEmailAddress = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

export const isValidMobileNumber = (value: string) => {
  const normalized = digitsOnly(String(value || '').trim());
  if (!normalized) return true;
  return /^09\d{9}$/.test(normalized);
};

export const parseGuidedDateInput = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const parsed = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (
      parsed.getFullYear() === Number(isoMatch[1]) &&
      parsed.getMonth() === Number(isoMatch[2]) - 1 &&
      parsed.getDate() === Number(isoMatch[3])
    ) {
      return parsed;
    }
    return null;
  }
  const digits = normalized.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const month = Number(digits.slice(0, 2));
  const day = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4, 8));
  if (!month || !day || !year) return null;
  const parsed = new Date(year, month - 1, day);
  if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) return null;
  return parsed;
};

export const depedSchoolToOption = (record: any): SchoolDirectoryEntry | null => {
  const schoolId = String(record?.beis_school_id || record?.school_id || record?.school_code || record?.schoolCode || record?.schoolId || record?.id || '').trim();
  const schoolName = String(record?.school_name || record?.schoolName || record?.name || '').trim();
  if (!schoolId || !schoolName) return null;
  return { schoolId, schoolName };
};

export const uniqueSchoolEntries = (rows: SchoolDirectoryEntry[]) => {
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

export const buildAddressLine = (selection: AddressSelection, regions: PsgcLocation[], provinces: PsgcLocation[], cities: PsgcLocation[]) =>
  Array.from(
    new Set(
      [selection.streetLine, selection.barangayName, locationNameByCode(cities, selection.cityCode), locationNameByCode(provinces, selection.provinceCode), locationNameByCode(regions, selection.regionCode)]
        .map((part) => String(part || '').replace(/\b0{6}\b/g, '').trim())
        .filter(Boolean)
        .map((part) => part.toLowerCase())
    )
  )
    .map((normalizedPart) =>
      [selection.streetLine, selection.barangayName, locationNameByCode(cities, selection.cityCode), locationNameByCode(provinces, selection.provinceCode), locationNameByCode(regions, selection.regionCode)]
        .map((part) => String(part || '').replace(/\b0{6}\b/g, '').trim())
        .find((part) => part.toLowerCase() === normalizedPart) || '',
    )
    .filter(Boolean)
    .join(', ');

const findBestMatch = (value: string, rows: PsgcLocation[]) => {
  const normalizedValue = String(value || '').toLowerCase();
  return [...rows]
    .filter((row) => normalizedValue.includes(String(row.name || '').toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)[0] || null;
};

export const inferAddressSelectionFromText = (
  value: string,
  regions: PsgcLocation[],
  provinces: PsgcLocation[],
  cities: PsgcLocation[],
  barangays: PsgcLocation[] = [],
): AddressSelection => {
  const normalizedValue = String(value || '').trim();
  const region = findBestMatch(normalizedValue, regions);
  const province = findBestMatch(normalizedValue, provinces);
  const city = findBestMatch(normalizedValue, cities);
  const barangay = findBestMatch(normalizedValue, barangays);

  return {
    regionCode: region?.code || '',
    provinceCode: province?.code || '',
    cityCode: city?.code || '',
    barangayName: barangay?.name || '',
    streetLine: normalizedValue,
  };
};

export const normalizeSchoolYearPair = (startYear: string, endYear: string) => {
  if (!/^\d{4}$/.test(startYear) || !/^\d{4}$/.test(endYear)) return null;
  const start = Number(startYear);
  const end = Number(endYear);
  if (end - start !== 1) return null;
  return `${startYear}-${endYear}`;
};

export const parseSchoolYearStart = (schoolYear: string) => {
  const match = String(schoolYear || '').trim().match(/^(\d{4})-(\d{4})$/);
  if (!match) return null;
  if (Number(match[2]) - Number(match[1]) !== 1) return null;
  return Number(match[1]);
};

export const buildPreviousSchoolYearOptions = (schoolYear: string, count = 5) => {
  const currentStart = parseSchoolYearStart(schoolYear);
  if (currentStart == null) return [];
  return Array.from({ length: count }, (_, index) => {
    const start = currentStart - (index + 1);
    const end = start + 1;
    const label = `${start}-${end}`;
    return { value: label, label };
  });
};

export const validateCommonFields = (
  draft: EnrollmentDraft,
  gradeLevelOrder: Array<{ label: string; value: number }>
): string | null => {
  const trimmedLrn = draft.lrn.trim();
  if (trimmedLrn && !/^\d{12}$/.test(trimmedLrn)) return 'Learner Reference Number (LRN) must be exactly 12 digits.';
  const trimmedBirthCert = draft.birthCertificateNo.trim();
  if (trimmedBirthCert && !/^\d{12}$/.test(trimmedBirthCert)) return 'PSA Birth Certificate No. must be exactly 12 digits.';
  if (!isValidEmailAddress(draft.email)) return 'Email Address must contain @ and a valid domain.';
  if (draft.birthDate) {
    const birthDate = parseGuidedDateInput(draft.birthDate);
    const now = new Date();
    if (!birthDate) return 'Date of Birth must use mm/dd/yyyy.';
    if (birthDate > now) return 'Date of Birth cannot be in the future.';
  }
  for (const entry of [
    { label: "Learner's Contact Number", value: draft.learnerContact },
    { label: "Father's Contact Number", value: draft.fatherContact },
    { label: "Mother's Contact Number", value: draft.motherContact },
    { label: "Guardian's Contact Number", value: draft.guardianContact },
  ]) {
    const normalized = digitsOnly(entry.value || '');
    if (normalized.length > 0 && normalized.length !== 11) {
      return `${entry.label} must contain exactly 11 digits.`;
    }
    if (normalized.length === 11 && !normalized.startsWith('09')) {
      return `${entry.label} must start with 09.`;
    }
  }
  const lastGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
  const nextGrade = gradeLevelOrder.find((grade) => grade.label === draft.gradeToEnroll);
  if (lastGrade && nextGrade && nextGrade.value <= lastGrade.value) return 'Grade Level to Enroll must be higher than Last Grade Level Attended.';
  if (draft.studentType === 'Continuing Student' && draft.learnerCategory === SAME_SCHOOL_LABEL && draft.gradeToEnroll === 'Grade 7') {
    return 'Grade 7 is not available when learner category is Same School for continuing learners.';
  }
  if (draft.previousSchool) {
    const [prevStart, prevEnd] = String(draft.previousSchoolYear || '').split('-');
    const normalized = normalizeSchoolYearPair(prevStart || '', prevEnd || '');
    if (!normalized) return 'Last S.Y. Attended must follow a valid one-year gap format (YYYY-YYYY).';

    const [currentStart] = String(draft.schoolYear || '').split('-');
    const prevStartNum = Number(prevStart);
    const currentStartNum = Number(currentStart);
    if (!Number.isNaN(prevStartNum) && !Number.isNaN(currentStartNum) && prevStartNum >= currentStartNum) {
      return 'Last S.Y. Attended must be earlier than the current School Year.';
    }
  }
  return null;
};
