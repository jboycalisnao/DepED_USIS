type EditableSubmissionSnapshot = {
  birthCertificateNo: string;
  lrn: string;
  email: string;
  extensionName: string;
  gender: string;
  placeOfBirth: string;
  height: string;
  weight: string;
  learnerContact: string;
  motherTongue: string;
  religion: string;
  is4Ps: string;
  fourPsHouseholdId: string;
  currentAddress: string;
  permanentAddress: string;
  fatherName: string;
  fatherContact: string;
  motherName: string;
  motherContact: string;
  guardianName: string;
  guardianContact: string;
  hasSpedNeed: string;
  preferredModality: string;
  deviceAccess: string;
  hasInternet: string;
};

export type SubmissionAuditTrailChange = {
  field: string;
  before: string;
  after: string;
};

export type SubmissionAuditTrailEntry = {
  id: string;
  action: string;
  at: string;
  detail: string;
  changes: SubmissionAuditTrailChange[];
};

const TRACKED_FIELDS: Array<{ key: keyof EditableSubmissionSnapshot; label: string }> = [
  { key: 'birthCertificateNo', label: 'PSA Birth Certificate No.' },
  { key: 'lrn', label: 'Learner Reference Number (LRN)' },
  { key: 'email', label: 'Email Address' },
  { key: 'extensionName', label: 'Extension Name' },
  { key: 'gender', label: 'Gender' },
  { key: 'placeOfBirth', label: 'Place of Birth' },
  { key: 'height', label: 'Height (cm)' },
  { key: 'weight', label: 'Weight (kg)' },
  { key: 'learnerContact', label: 'Learner Contact Number' },
  { key: 'motherTongue', label: 'Mother Tongue' },
  { key: 'religion', label: 'Religion' },
  { key: 'is4Ps', label: '4Ps Beneficiary' },
  { key: 'fourPsHouseholdId', label: '4Ps Household ID' },
  { key: 'currentAddress', label: 'Current Address' },
  { key: 'permanentAddress', label: 'Permanent Address' },
  { key: 'fatherName', label: "Father's Full Name" },
  { key: 'fatherContact', label: "Father's Contact Number" },
  { key: 'motherName', label: "Mother's Maiden Name" },
  { key: 'motherContact', label: "Mother's Contact Number" },
  { key: 'guardianName', label: "Legal Guardian's Name" },
  { key: 'guardianContact', label: "Guardian's Contact Number" },
  { key: 'hasSpedNeed', label: 'SPED Need' },
  { key: 'preferredModality', label: 'Preferred Learning Modality' },
  { key: 'deviceAccess', label: 'Preferred Device' },
  { key: 'hasInternet', label: 'Internet Access' },
];

const normalizeValue = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  return normalized || '--';
};

const createAuditId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const buildInformationVerificationAuditEntry = (
  previousDraft: EditableSubmissionSnapshot,
  nextDraft: EditableSubmissionSnapshot,
): SubmissionAuditTrailEntry => {
  const changes = TRACKED_FIELDS.map((field) => {
    const before = normalizeValue(previousDraft[field.key]);
    const after = normalizeValue(nextDraft[field.key]);
    return before === after
      ? null
      : {
          field: field.label,
          before,
          after,
        };
  }).filter(Boolean) as SubmissionAuditTrailChange[];

  const detail =
    changes.length > 0
      ? `Updated ${changes.length} field${changes.length === 1 ? '' : 's'}: ${changes
          .map((change) => `${change.field} (${change.before} -> ${change.after})`)
          .join('; ')}.`
      : 'Verified the submission with no field changes.';

  return {
    id: createAuditId(),
    action: 'Information Verification and Update',
    at: new Date().toISOString(),
    detail,
    changes,
  };
};
