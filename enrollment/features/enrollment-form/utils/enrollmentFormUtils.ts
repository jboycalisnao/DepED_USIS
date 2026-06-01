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

export const initialDraft: EnrollmentDraft = {
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
  gender: 'Male',
  placeOfBirth: '',
  learnerContact: '',
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

export const digitsOnly = (value: string) => value.replace(/\D/g, '');

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
  [selection.streetLine, selection.barangayName, locationNameByCode(cities, selection.cityCode), locationNameByCode(provinces, selection.provinceCode), locationNameByCode(regions, selection.regionCode)]
    .map((part) => String(part || '').replace(/\b0{6}\b/g, '').trim())
    .filter(Boolean)
    .join(', ');

export const normalizeSchoolYearPair = (startYear: string, endYear: string) => {
  if (!/^\d{4}$/.test(startYear) || !/^\d{4}$/.test(endYear)) return null;
  const start = Number(startYear);
  const end = Number(endYear);
  if (end - start !== 1) return null;
  return `${startYear}-${endYear}`;
};

export const validateCommonFields = (
  draft: EnrollmentDraft,
  gradeLevelOrder: Array<{ label: string; value: number }>
): string | null => {
  const trimmedLrn = draft.lrn.trim();
  if (trimmedLrn && !/^\d{12}$/.test(trimmedLrn)) return 'Learner Reference Number (LRN) must be exactly 12 digits.';
  const trimmedBirthCert = draft.birthCertificateNo.trim();
  if (trimmedBirthCert && !/^\d{12}$/.test(trimmedBirthCert)) return 'PSA Birth Certificate No. must be exactly 12 digits.';
  if (draft.birthDate) {
    const birthDate = new Date(draft.birthDate);
    const now = new Date();
    if (!Number.isNaN(birthDate.getTime()) && birthDate > now) return 'Date of Birth cannot be in the future.';
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
