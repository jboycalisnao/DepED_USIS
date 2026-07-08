
export interface SerialLog {
  id: string;
  timestamp: Date;
  type: 'in' | 'out' | 'info' | 'error';
  text: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SerialOptions {
  baudRate: number;
  bufferSize?: number;
}

export interface Section {
  id: string;
  name: string | null;
  grade_level: string | null;
  adviser_name: string | null;
  strand: string | null;
  school_year_id: string | null;
  // Legacy fields for compatibility if any
  gradeLevel?: string;
  adviserName?: string;
  schoolYearId?: string;
}

export interface SchoolYearOption {
  id: string;
  label: string;
  is_active: boolean | null;
}

export interface Learner {
  id: string;
  lrn: string | null;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  contact_number: string | null;
  guardian_contact_number?: string | null;
  guardian_contact?: string | null;
  guardianContact?: string | null;
  parent_contact_number?: string | null;
  parent_contact?: string | null;
  parentContact?: string | null;
  guardian_name: string | null;
  father_name: string | null;
  mother_name: string | null;
  status: string | null;
  section_id: string | null;
  is_sslg: boolean | null;
  is_club_officer: boolean | null;
  is_athlete: boolean | null;
  is_artist: boolean | null;
  is_4ps: boolean | null;
  is_indigent: boolean | null;
  org_affiliations: any | null;
  enrollment_history: any | null;
  created_at: string | null;
  rfid?: string;
  // Enriched fields
  section_name?: string;
  grade_level?: string;
  // Legacy fields for compatibility
  firstName?: string | null;
  lastName?: string | null;
}

export interface AttendanceSmsSettings {
  apiKey: string;
  messageTemplate: string;
}

export interface AttendanceSmsRecipientState {
  enabledLearnerIds: string[];
}

export type SmsQueueStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface SmsQueueItem {
  id: string;
  learnerId: string;
  learnerName: string;
  phoneNumber: string;
  message: string;
  apiKey: string;
  status: SmsQueueStatus;
  attempts: number;
  queuedAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  responseMessage: string | null;
  errorMessage: string | null;
}

export type SmsQueueLogLevel = 'info' | 'success' | 'error';

export interface SmsQueueLogEntry {
  id: string;
  queueItemId: string;
  timestamp: string;
  level: SmsQueueLogLevel;
  title: string;
  detail: string | null;
}

export type AttendanceType = 'AM_IN' | 'AM_OUT' | 'PM_IN' | 'PM_OUT' | 'UNSCHEDULED';

export interface AttendanceRecord {
  id: string;
  learnerId: string;
  type: AttendanceType;
  timestamp: string;
  isLate?: boolean;
  synced?: boolean;
}

export type AttendanceReportMode = 'raw' | 'summary';

export interface AttendanceDailySummaryRow {
  learnerId: string;
  attendanceDate: string;
  amIn: string | null;
  amOut: string | null;
  pmIn: string | null;
  pmOut: string | null;
  unscheduledCount: number;
  lastStationNo: number | null;
}

export interface AttendanceReportResult {
  mode: AttendanceReportMode;
  rawRecords: AttendanceRecord[];
  summaryRows: AttendanceDailySummaryRow[];
}

export interface AttendanceWeeklySummaryRow {
  weekStart: string;
  sectionName: string;
  gradeLevel: string;
  learnerDays: number;
  expectedSlots: number;
  presentSlots: number;
  missingSlots: number;
}

export interface AttendanceMonthlySummaryRow {
  summaryMonth: string;
  sectionName: string;
  gradeLevel: string;
  learnerDays: number;
  expectedSlots: number;
  presentSlots: number;
  missingSlots: number;
}

export interface TimeSlot {
  start: string; // HH:mm format
  end: string;
}

export interface TimeSlotSettings {
  amIn: TimeSlot;
  amOut: TimeSlot;
  pmIn: TimeSlot;
  pmOut: TimeSlot;
}

export interface ScanResult {
  learner: Learner;
  type: AttendanceType;
  time: string;
  uid: string;
  isLate?: boolean;
  isDuplicate?: boolean;
}

export interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: any;
  writable: any;
}

export interface AttendanceWindow {
  start: string;
  end: string;
}

export interface AttendanceGradeRules {
  in: AttendanceWindow;
  out?: AttendanceWindow;
  lateAfter?: string;
}

export interface AttendanceScheduleConfig {
  grade7To10: {
    amIn: AttendanceGradeRules;
    amOut: AttendanceGradeRules;
    pmIn: AttendanceGradeRules;
    pmOut: AttendanceGradeRules;
  };
  grade11: {
    amIn: AttendanceGradeRules;
    amOut: AttendanceGradeRules;
  };
  grade12: {
    pmIn: AttendanceGradeRules;
    pmOut: AttendanceGradeRules;
  };
}

export interface AttendanceClassDayConfig {
  sunday: boolean;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
}

export type AttendanceNoClassDateConfig = string[];

export interface AttendanceDecision {
  type: AttendanceType;
  isLate: boolean;
  gradeBand: 'grade7To10' | 'grade11' | 'grade12';
  label: string;
  range: string;
}
