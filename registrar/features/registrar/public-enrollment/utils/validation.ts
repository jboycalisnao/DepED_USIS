import { gradeLevelOptions } from '../data/enrollmentOptions';
import type { EnrollmentDraft } from '../types';

const SAME_SCHOOL_LABEL = 'Same School';

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const gradeLevelOrder = gradeLevelOptions.map((level) => ({ label: level, value: Number(level.replace(/\D/g, '')) }));

export const normalizeSchoolYearPair = (startYear: string, endYear: string) => {
  if (!/^\d{4}$/.test(startYear) || !/^\d{4}$/.test(endYear)) return null;
  const start = Number(startYear);
  const end = Number(endYear);
  if (end - start !== 1) return null;
  return `${startYear}-${endYear}`;
};

export const validatePublicEnrollmentDraft = (draft: EnrollmentDraft): string | null => {
  const trimmedLrn = draft.lrn.trim();
  if (trimmedLrn && !/^\d{12}$/.test(trimmedLrn)) {
    return 'Learner Reference Number (LRN) must be exactly 12 digits.';
  }

  if (draft.birthDate) {
    const birthDate = new Date(draft.birthDate);
    const now = new Date();
    if (!Number.isNaN(birthDate.getTime()) && birthDate > now) {
      return 'Date of Birth cannot be in the future.';
    }
  }

  const contactChecks: Array<{ label: string; value: string }> = [
    { label: "Father's Contact Number", value: draft.fatherContact },
    { label: "Mother's Contact Number", value: draft.motherContact },
    { label: "Guardian's Contact Number", value: draft.guardianContact },
  ];

  for (const entry of contactChecks) {
    const normalized = digitsOnly(entry.value || '');
    if (normalized.length > 0 && (normalized.length < 7 || normalized.length > 15)) {
      return `${entry.label} must contain 7 to 15 digits.`;
    }
  }

  const lastGrade = gradeLevelOrder.find((grade) => grade.label === draft.lastGradeLevel);
  const nextGrade = gradeLevelOrder.find((grade) => grade.label === draft.gradeToEnroll);
  if (lastGrade && nextGrade && nextGrade.value <= lastGrade.value) {
    return 'Grade Level to Enroll must be higher than Last Grade Level Attended.';
  }

  if (draft.learnerCategory === SAME_SCHOOL_LABEL && draft.gradeToEnroll === 'Grade 7') {
    return 'Grade 7 is not available when learner category is Same School.';
  }

  if (
    draft.previousSchool &&
    !normalizeSchoolYearPair(
      (draft.previousSchoolYear || '').split('-')[0] || '',
      (draft.previousSchoolYear || '').split('-')[1] || ''
    )
  ) {
    return 'Last S.Y. Attended must follow a valid one-year gap format (YYYY-YYYY).';
  }

  return null;
};
