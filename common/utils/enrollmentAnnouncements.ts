import type { EnrollmentAnnouncement } from '../types/enrollmentAnnouncements';

export const VERIFICATION_ANNOUNCEMENT_KEY = 'information-verification-and-update-default';

export const DEFAULT_VERIFICATION_ANNOUNCEMENT: EnrollmentAnnouncement = {
  id: VERIFICATION_ANNOUNCEMENT_KEY,
  announcementKey: VERIFICATION_ANNOUNCEMENT_KEY,
  title: 'Information Verification and Update',
  message: 'All learners who submitted their enrolment online shall check the information submitted and update if needed.',
  audience: 'enrollment',
  isActive: true,
  isPinned: true,
  isHighlighted: true,
  sortOrder: 0,
  createdAt: '',
  updatedAt: '',
};

export function normalizeEnrollmentAnnouncements(rows: EnrollmentAnnouncement[]) {
  return rows
    .filter((row) => row.isActive)
    .sort((left, right) => {
      if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
      if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder;
      return String(right.updatedAt || right.createdAt).localeCompare(String(left.updatedAt || left.createdAt));
    });
}

export function withVerificationAnnouncement(rows: EnrollmentAnnouncement[], includeDefaultAnnouncement: boolean) {
  const normalized = normalizeEnrollmentAnnouncements(rows);
  if (!includeDefaultAnnouncement) return normalized;
  if (normalized.some((row) => row.announcementKey === VERIFICATION_ANNOUNCEMENT_KEY)) return normalized;
  return [DEFAULT_VERIFICATION_ANNOUNCEMENT, ...normalized];
}

export function resolveLearnerEnrollmentAnnouncements(rows: EnrollmentAnnouncement[], isVerificationEnabled: boolean) {
  const normalized = normalizeEnrollmentAnnouncements(rows).filter((row) => row.announcementKey !== VERIFICATION_ANNOUNCEMENT_KEY);
  if (!isVerificationEnabled) return normalized;
  return [DEFAULT_VERIFICATION_ANNOUNCEMENT, ...normalized];
}
