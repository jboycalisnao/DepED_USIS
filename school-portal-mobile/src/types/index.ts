export interface LearnerProfile {
  id: string;
  lrn: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  fullName: string;
  schoolId: string;
  schoolName: string;
  division: string;
  region: string;
  gradeLevel: string;
  section: string;
  trackStrand?: string;
  adviserName: string;
  schoolYear: string;
  status: 'Enrolled' | 'Graduated' | 'Transferred' | 'Pending';
  email?: string;
  guardianName?: string;
  guardianContact?: string;
  avatarUrl?: string;
  qrCodeToken?: string;
  enrollmentHistory?: Array<{
    id?: string;
    status?: string;
    section?: string;
    gradeLevel?: string;
    schoolYear?: string;
    enrollmentDate?: string;
  }>;
}

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  timeIn?: string;
  timeOut?: string;
  status: 'Present' | 'Late' | 'Absent' | 'Excused';
  remarks?: string;
}

export interface AttendanceSummary {
  present: number;
  late: number;
  absent: number;
  excused: number;
  totalDays: number;
  attendanceRate: number; // Percentage (e.g. 98)
}

export interface GradeSubject {
  id: string;
  subjectCode: string;
  subjectTitle: string;
  teacher: string;
  q1?: number;
  q2?: number;
  q3?: number;
  q4?: number;
  finalRating?: number;
  remarks: 'Passed' | 'Failed' | 'In Progress';
}

export interface DocumentRequest {
  id: string;
  trackingNumber: string;
  documentType: 'Form 137 / SF10' | 'Good Moral Certificate' | 'Certificate of Enrollment' | 'Form 138 / Report Card';
  requestDate: string;
  status: 'Pending' | 'Processing' | 'Ready for Pickup' | 'Completed';
  purpose: string;
  estimatedRelease?: string;
}

export interface PortalServiceItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'academic' | 'administrative' | 'welfare' | 'account';
  icon: string;
  badge?: string;
  routeKey: string;
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  category: 'Academic' | 'DepEd Advisory' | 'Activity' | 'Health';
  summary: string;
  date: string;
  isImportant?: boolean;
}

export type PortalTab = 'dashboard' | 'grades' | 'services' | 'profile';
