
export enum Position {
  PRESIDENT = 'President',
  VICE_PRESIDENT = 'Vice President',
  SECRETARY = 'Secretary',
  TREASURER = 'Treasurer',
  AUDITOR = 'Auditor',
  PIO = 'Public Information Officer',
  PROTOCOL_OFFICER = 'Protocol Officer',
  GRADE_7_REP = 'Grade 7 Representative',
  GRADE_8_REP = 'Grade 8 Representative',
  GRADE_9_REP = 'Grade 9 Representative',
  GRADE_10_REP = 'Grade 10 Representative',
  GRADE_11_REP = 'Grade 11 Representative',
  GRADE_12_REP = 'Grade 12 Representative',
  STE_REP = 'STE Representative',
  SPA_REP = 'SPA Representative',
}

export enum GradeLevel {
  GRADE_7 = 'Grade 7',
  GRADE_8 = 'Grade 8',
  GRADE_9 = 'Grade 9',
  GRADE_10 = 'Grade 10',
  GRADE_11 = 'Grade 11',
  GRADE_12 = 'Grade 12',
}

export enum EnrollmentStatus {
  ENROLLED = 'Enrolled',
  PENDING = 'Pending',
  WITHDRAWN = 'Withdrawn',
}

export enum ElectionStatus {
  MANUAL_OPEN = 'OPEN',
  MANUAL_CLOSED = 'CLOSED',
  SCHEDULED = 'SCHEDULED',
}

export interface ElectionConfig {
  status: ElectionStatus;
  startTime: string | null;
  endTime: string | null;
  schoolName?: string;
  publicResultsEnabled?: boolean;
  publicTurnoutEnabled?: boolean;
}

export interface Section {
  id: string;
  name: string;
  gradeLevel: GradeLevel;
  adviserName: string;
  strand?: string;
  schoolYearId: string;
}

export interface Student {
  id: string;
  lrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string;
  gender: string;
  address: string;
  contactNumber: string;
  guardian_name?: string;
  status: EnrollmentStatus;
  sectionId?: string;
  isSSLG: boolean;
  isClubOfficer: boolean;
  isAthlete: boolean;
  isArtist: boolean;
  is4Ps: boolean;
  isIndigent: boolean;
  orgAffiliations: string[];
  father_name?: string;
  mother_name?: string;
}

export interface SchoolYear {
  id: string;
  label: string;
  is_active?: boolean;
  is_locked?: boolean;
  isActive?: boolean;
  isLocked?: boolean;
}

export interface Candidate {
  id: string;
  name: string; // Full name for display
  firstName: string;
  lastName: string;
  middleName?: string;
  extensionName?: string;
  position: Position;
  gradeLevel: GradeLevel;
  party: string;
  imageUrl: string;
  vision: string;
  votes: number;
  remarks?: string; // Encoder's remarks for missing info/audit
  
  // COC Profile Fields
  gender: string;
  age: number;
  birthDate: string;
  email: string;
  mobileNo: string;
  landline?: string;
  homeAddress: string;
  fatherName?: string;
  motherName?: string;
}

export interface User {
  studentId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  hasVoted: boolean;
  isAdmin: boolean;
  gradeLevel?: string;
  sectionName?: string;
  strand?: string;
}

export type AppView = 'login' | 'identity-confirmation' | 'ballot' | 'confirmation' | 'results' | 'admin' | 'public-results' | 'public-turnout';
