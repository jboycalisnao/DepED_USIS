
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

export type AttendanceType = 'AM_IN' | 'AM_OUT' | 'PM_IN' | 'PM_OUT' | 'UNSCHEDULED';

export interface AttendanceRecord {
  id: string;
  learnerId: string;
  type: AttendanceType;
  timestamp: string;
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
  isDuplicate?: boolean;
}

export interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: any;
  writable: any;
}
