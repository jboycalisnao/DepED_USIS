import type { EnrollmentDraft } from '../types';

export function normalizeLearnerType(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.includes('cont')) return 'Continuing Learner';
  if (normalized.includes('transf') || normalized.includes('tranf')) return 'Transferee Learner';
  if (normalized.includes('new')) return 'New Learner';
  return value;
}

export function inferLearnerType(payload: EnrollmentDraft) {
  const category = String(payload.learnerCategory || '').trim().toLowerCase();
  const previousSchool = String(payload.previousSchool || '').trim().toLowerCase();
  const schoolToEnroll = String(payload.schoolToEnroll || '').trim().toLowerCase();
  const hasPriorSchoolYear = Boolean(String(payload.previousSchoolYear || '').trim());
  const hasLastGrade = Boolean(String(payload.lastGradeLevel || '').trim());
  if (
    category === 'same school' ||
    (previousSchool && schoolToEnroll && previousSchool === schoolToEnroll) ||
    hasPriorSchoolYear ||
    hasLastGrade
  ) {
    return 'Continuing Learner';
  }
  return 'New Learner';
}

