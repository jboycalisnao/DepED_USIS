const STATUS_ORDER = ['Pending', 'Enrolled', 'Withdrawn', 'Graduated'] as const;

export type SubmissionStatus = (typeof STATUS_ORDER)[number];

const normalizeLabel = (value: string | null | undefined) => String(value || '').trim();

export function normalizeSubmissionStatus(value: string | null | undefined): SubmissionStatus {
  const normalized = normalizeLabel(value).toLowerCase();
  if (normalized === 'enrolled') return 'Enrolled';
  if (normalized === 'withdrawn') return 'Withdrawn';
  if (normalized === 'graduated') return 'Graduated';
  return 'Pending';
}

export function resolveSubmissionStatus(input: {
  sectionId?: string | null;
  status?: string | null;
  fallback?: string;
}): string {
  if (normalizeLabel(input.sectionId)) return 'Enrolled';
  const normalized = normalizeSubmissionStatus(input.status);
  if (normalized !== 'Pending') return normalized;
  return normalizeLabel(input.fallback) || 'Pending';
}

export function getSubmissionStatusTone(status: string): 'enrolled' | 'pending' | 'withdrawn' | 'graduated' {
  const normalized = normalizeSubmissionStatus(status);
  if (normalized === 'Enrolled') return 'enrolled';
  if (normalized === 'Withdrawn') return 'withdrawn';
  if (normalized === 'Graduated') return 'graduated';
  return 'pending';
}

export const submissionStatusOptions = STATUS_ORDER;
