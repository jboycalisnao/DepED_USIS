
export enum EnrollmentStatus {
  ENROLLED = 'Enrolled',
  PENDING = 'Pending',
  WITHDRAWN = 'Withdrawn',
  GRADUATED = 'Graduated'
}

// Alias for newer parser logic
export const LearnerStatus = EnrollmentStatus;

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
