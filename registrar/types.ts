export enum EnrollmentStatus {
  ENROLLED = 'Enrolled',
  PENDING = 'Pending',
  TRANSFER_OUT = 'Transfer Out',
  DROP_OUT = 'Drop Out',
  WITHDRAWN = 'Withdrawn',
  GRADUATED = 'Graduated'
}

// Alias for newer parser logic
export const LearnerStatus = EnrollmentStatus;

export const LEARNER_STATUS_OPTIONS: EnrollmentStatus[] = [
  EnrollmentStatus.ENROLLED,
  EnrollmentStatus.TRANSFER_OUT,
  EnrollmentStatus.DROP_OUT,
  EnrollmentStatus.WITHDRAWN,
  EnrollmentStatus.GRADUATED,
];

export const normalizeLearnerStatus = (status?: string | null): EnrollmentStatus => {
  const raw = String(status || '').trim().toLowerCase();
  if (raw === 'transfer out' || raw === 'transferred out' || raw === 'transfer_out') {
    return EnrollmentStatus.TRANSFER_OUT;
  }
  if (raw === 'drop out' || raw === 'dropped out' || raw === 'drop_out' || raw === 'dropped') {
    return EnrollmentStatus.DROP_OUT;
  }
  if (raw === 'withdrawn') {
    return EnrollmentStatus.WITHDRAWN;
  }
  if (raw === 'graduated') {
    return EnrollmentStatus.GRADUATED;
  }
  if (raw === 'pending') {
    return EnrollmentStatus.PENDING;
  }
  return EnrollmentStatus.ENROLLED;
};

export const getLearnerStatusTone = (status?: string | null): 'enrolled' | 'transfer-out' | 'drop-out' | 'withdrawn' | 'graduated' | 'pending' => {
  const normalized = normalizeLearnerStatus(status);
  switch (normalized) {
    case EnrollmentStatus.TRANSFER_OUT:
      return 'transfer-out';
    case EnrollmentStatus.DROP_OUT:
      return 'drop-out';
    case EnrollmentStatus.WITHDRAWN:
      return 'withdrawn';
    case EnrollmentStatus.GRADUATED:
      return 'graduated';
    case EnrollmentStatus.PENDING:
      return 'pending';
    case EnrollmentStatus.ENROLLED:
    default:
      return 'enrolled';
  }
};

export {
  normalizeSchoolYearKey,
  parseSchoolYearStartYear,
  resolveSchoolYearStartYear,
  resolvePreviousSchoolYear,
  isPreviousSchoolYear,
  isGrade12,
  findLearnerPreviousGrade12Record,
  isPreviousYearGrade12Graduate,
  resolveEffectiveLearnerStatus,
  wasLearnerEnrolledInYear,
  isPreviousYearUnreturnedLearner,
} from './utils/learnerStatusResolver';

export enum GradeLevel {
  KINDERGARTEN = 'Kindergarten',
  GRADE_1 = 'Grade 1',
  GRADE_2 = 'Grade 2',
  GRADE_3 = 'Grade 3',
  GRADE_4 = 'Grade 4',
  GRADE_5 = 'Grade 5',
  GRADE_6 = 'Grade 6',
  GRADE_7 = 'Grade 7',
  GRADE_8 = 'Grade 8',
  GRADE_9 = 'Grade 9',
  GRADE_10 = 'Grade 10',
  GRADE_11 = 'Grade 11',
  GRADE_12 = 'Grade 12'
}

export interface AcademicProgram {
  id: string;
  acronym: string;
  fullName: string;
}

export interface ReusableTag {
  id: string;
  label: string;
  category?: string;
  description?: string;
  color?: string;
  officerPositions?: string[];
  isActive?: boolean;
  createdAt?: string;
}

export interface Section {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  adviserName?: string;
  strand?: string;
  schoolYearId: string;
}

export interface Student {
  id: string;
  lrn: string;
  loginUsername?: string;
  loginPassword?: string;
  loginStatus?: string;
  lastLoginAt?: string;
  microsoftUserId?: string;
  microsoftUpn?: string;
  microsoftMailNickname?: string;
  microsoftAccountStatus?: string;
  microsoftLicenseSkuId?: string;
  microsoftCreatedAt?: string;
  microsoftLastSyncedAt?: string;
  profilePhotoDriveFileId?: string;
  profilePhotoMimeType?: string;
  profilePhotoUpdatedAt?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  birthDate: string;
  gender: string;
  address: string;
  contactNumber: string;
  guardian_contact?: string;
  guardian_name?: string;
  father_name?: string;
  mother_name?: string;
  status: EnrollmentStatus;
  sectionId?: string;
  schoolYear?: string;
  is4Ps?: boolean;
  tags?: string[];
  enrollments?: EnrollmentRecord[];
}

// Alias for newer parser logic
export type Learner = Student;

export interface EnrollmentRecord {
  id: string;
  schoolYear: string;
  gradeLevel: GradeLevel;
  section: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  submissionPayload?: Record<string, unknown>;
}

export interface SchoolYear {
  id: string;
  label: string;
  isActive: boolean;
  isLocked?: boolean;
}

export interface DashboardStats {
  totalStudents: number;
  newEnrollees: number;
  pendingApplications: number;
  withdrawnCount: number;
}
