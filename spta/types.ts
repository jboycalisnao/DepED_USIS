
export enum UserRole {
  SUPER_ADMIN = 'Super Admin',
  SCHOOL_HEAD = 'School Head',
  SECRETARY = 'Secretary',
  TREASURER = 'Treasurer',
  AUDITOR = 'Auditor',
  ADVISER = 'Adviser',
  STUDENT = 'Student',
  OFFICER = 'Officer'
}

// Maps to "GradeLevel" column in DB
export enum GradeLevel {
  GRADE_7 = 'Grade 7',
  GRADE_8 = 'Grade 8',
  GRADE_9 = 'Grade 9',
  GRADE_10 = 'Grade 10',
  GRADE_11 = 'Grade 11',
  GRADE_12 = 'Grade 12',
  KINDER = 'Kindergarten',
  SPED = 'SPED'
}

export enum SSLGPosition {
  PRESIDENT = 'President',
  VICE_PRESIDENT = 'Vice President',
  SECRETARY = 'Secretary',
  TREASURER = 'Treasurer',
  AUDITOR = 'Auditor',
  PIO = 'PIO',
  PO = 'Peace Officer',
  GRADE_REP = 'Grade Level Representative'
}

export enum TransactionType {
  COLLECTION = 'Collection',
  EXPENSE = 'Expense',
  ADJUSTMENT = 'Adjustment',
  ALLOCATION = 'Allocation',
  REALLOCATION = 'Reallocation'
}

export enum ProjectStatus {
  PLANNED = 'Planned',
  ONGOING = 'Ongoing',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: string;
  password?: string;
}

export interface Learner {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  lrn: string;
  sectionId: string;
  guardianName?: string;
  fatherName?: string;
  motherName?: string;
  contactNumber?: string;
  birthDate?: string;
  gender: 'Male' | 'Female';
  status: string;
}

export interface Section {
  id: string;
  name: string;
  gradeLevel: string;
  schoolYearId?: string;
  adviserName?: string;
  roomNumber?: string;
  strand?: string;
  accessCode?: string;
}

export interface FinancialTransaction {
  id: string;
  date: string;
  amount: number;
  type: TransactionType;
  category: string;
  status: 'Posted' | 'Pending' | 'Cancelled';
  particulars: string;
  learnerId?: string;
  learnerName?: string;
  payee?: string;
  referenceNo?: string;
  disbursementCode?: string;
  fiscalYear?: number;
  quarter?: string;
  liquidationStatus?: string | null;
  liquidationDate?: string | null;
  auditStatus?: string;
  activityId?: string | null;
  isDeficit?: boolean;
  toCategory?: string;
  source?: string;
  recordedBy?: string;
  gradeSection?: string;
  schoolYear?: string;
  registrarSchoolYearId?: string;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  code?: string;
  status: ProjectStatus | string;
  budget?: number;
  startDate: string;
  endDate?: string;
  venue?: string;
  category?: string;
  objectives?: string;
}

export type Project = Activity;

export interface Resolution {
  id: string;
  number: string;
  seriesYear: string;
  title: string;
  content: {
    whereas: string[];
    resolved: string[];
  };
  status: string;
}

export interface Officer {
  id: string;
  name: string;
  position: SSLGPosition | string;
  gradeLevelRep?: string;
  committee?: string;
  termStart?: string;
  termEnd?: string;
  contactNumber?: string;
  status: string;
}

export interface FeeItem {
  name: string;
  amount: number;
  type: string;
  description?: string;
}

export interface MerchProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl?: string;
  description?: string;
}

export interface MerchOrder {
  id: string;
  customerName: string;
  date: string;
  total: number;
  status: 'Pending' | 'Paid' | 'Delivered' | 'Cancelled';
  paymentMethod: string;
  items: {
    productId: string;
    quantity: number;
    priceAtPurchase: number;
  }[];
}

export interface ComplaintTicket {
  id: string;
  ticketNumber: string;
  category: string;
  adminNotes: string;
  status: 'Open' | 'Pending User Response' | 'Resolved';
  createdAt: string;
  complainantName?: string;
  complainantGrade?: string;
  complainantSection?: string;
  complainantDetails?: string;
}

export interface Organization {
  id: string;
  name: string;
  type: string;
  status: string;
  adviserName?: string;
  presidentName?: string;
  foundedYear?: string;
}

export enum DocType {
  CERT_PARTICIPATION = 'Certificate of Participation',
  CERT_RECOGNITION = 'Certificate of Recognition',
  CERT_APPEARANCE = 'Certificate of Appearance',
  GOOD_MORAL = 'Certificate of Good Moral',
  CLEARANCE = 'Clearance'
}

export interface DocumentRequest {
  id: string;
  controlNumber: string;
  learnerId: string;
  requestorName: string;
  type: DocType | string;
  purpose: string;
  dateIssued: string;
  status: string;
}

export interface WelfareProgram {
  id: string;
  title: string;
  date: string;
  type: string;
  venue?: string;
  description?: string;
  beneficiariesReached?: number;
  budget?: number;
  status: string;
}

export interface GuidanceReferral {
  id: string;
  caseId: string;
  studentName: string;
  gender?: string;
  gradeLevel?: string;
  section?: string;
  concernType: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  description?: string;
  referrer?: string;
  status: 'Pending' | 'Acknowledged' | 'In Progress' | 'Resolved' | 'Closed';
  date: string;
  actionTaken?: string;
  confidentialNotes?: string;
  followUpDate?: string;
}

export interface Hazard {
  id: string;
  location: string;
  type?: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  description?: string;
  status: string;
  dateIdentified?: string;
}

export interface EvacuationCenter {
  id: string;
  name: string;
  location: string;
  status: string;
  currentOccupancy: number;
  capacity?: number;
}

export interface DisasterLog {
  id: string;
  name: string;
  date: string;
  details: string;
}

export interface Incident {
  id: string;
  title: string;
  status: string;
  category: string;
  date: string;
}

export interface PortalFeature {
  title: string;
  icon: string;
  description: string;
  colorTheme: string;
  link?: string;
}

export interface SignatoryProfile {
  name: string;
  title: string;
}

export interface FinanceSettings {
  voucher: {
    prepared: SignatoryProfile;
    certified: SignatoryProfile;
    approved: SignatoryProfile;
  };
  liquidation: {
    checked: SignatoryProfile;
    noted: SignatoryProfile;
  };
  audit: {
    examined: SignatoryProfile;
    noted: SignatoryProfile;
  };
  daily: {
    prepared: SignatoryProfile;
    certified: SignatoryProfile;
    noted: SignatoryProfile;
  };
}

export interface QuarterSchedule {
  q1: { start: string; end: string };
  q2: { start: string; end: string };
  q3: { start: string; end: string };
  q4: { start: string; end: string };
}

export interface SystemConfig {
  appName?: string;
  themeColor?: string;
  schoolName?: string;
  schoolId?: string;
  schoolHeadName?: string;
  ptaPresidentName?: string;
  ptaTreasurerName?: string;
  schoolYear?: string;
  feeSchedule?: FeeItem[];
  contributionCategories?: string[];
  defaultContributionAmount?: number;
  financeSettings?: FinanceSettings;
  logoUrl?: string;
  faviconUrl?: string;
  footerText?: string;
  portalHeroTitle?: string;
  portalHeroSubtitle?: string;
  portalFeatures?: PortalFeature[];
  quarterSchedule?: QuarterSchedule;
  storeTitle?: string;
  storeSubtitle?: string;
  complaintCategories?: string[];
}

export interface Session {
  id: string;
  date: string;
  type: 'Regular' | 'Special' | 'Emergency';
  agenda: string;
  minutes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  attendees: string[];
}
