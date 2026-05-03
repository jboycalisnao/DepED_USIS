
import { Position, Candidate, SchoolYear, GradeLevel, EnrollmentStatus, Student } from './types';
import depedSharedLogo from '../common/assets/Department_of_Education_(DepEd).svg.png';

export const POSITIONS = [
  Position.PRESIDENT,
  Position.VICE_PRESIDENT,
  Position.SECRETARY,
  Position.TREASURER,
  Position.AUDITOR,
  Position.PIO,
  Position.PROTOCOL_OFFICER,
  Position.GRADE_7_REP,
  Position.GRADE_8_REP,
  Position.GRADE_9_REP,
  Position.GRADE_10_REP,
  Position.GRADE_11_REP,
  Position.GRADE_12_REP,
  Position.STE_REP,
  Position.SPA_REP,
];

export const SCHOOL_YEARS: SchoolYear[] = [
  { id: `sy20262027`, label: `2026-2027`, isActive: true },
  { id: `sy20252026`, label: `2025-2026`, isActive: false },
];

export const CURRENT_SY_LABEL = `2026-2027`;
export const ELECTION_TITLE = "Learner Government (LG) Elections";

export const MOCK_STUDENTS: Student[] = []; 

// Fix: Added missing required fields (firstName, lastName, gradeLevel, gender, age, birthDate, email, mobileNo, homeAddress) to match Candidate interface definition
export const INITIAL_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Juan Dela Cruz',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    position: Position.PRESIDENT,
    gradeLevel: GradeLevel.GRADE_12,
    party: 'Angat Mag-aaral',
    imageUrl: 'https://picsum.photos/seed/juan/400/400',
    vision: 'Empowering every student through digital literacy and inclusive leadership.',
    votes: 0,
    gender: 'Male',
    age: 18,
    birthDate: '2008-05-15',
    email: 'juan.delacruz@example.edu.ph',
    mobileNo: '09123456789',
    homeAddress: 'Leon, Iloilo',
  },
  {
    id: 'c2',
    name: 'Maria Clara',
    firstName: 'Maria',
    lastName: 'Clara',
    position: Position.PRESIDENT,
    gradeLevel: GradeLevel.GRADE_12,
    party: 'Sulong Kabataan',
    imageUrl: 'https://picsum.photos/seed/maria/400/400',
    vision: 'Building a greener campus and promoting mental health awareness.',
    votes: 0,
    gender: 'Female',
    age: 17,
    birthDate: '2009-10-20',
    email: 'maria.clara@example.edu.ph',
    mobileNo: '09987654321',
    homeAddress: 'Leon, Iloilo',
  },
  {
    id: 'c3',
    name: 'Jose Rizalito',
    firstName: 'Jose',
    lastName: 'Rizalito',
    position: Position.VICE_PRESIDENT,
    gradeLevel: GradeLevel.GRADE_11,
    party: 'Angat Mag-aaral',
    imageUrl: 'https://picsum.photos/seed/jose/400/400',
    vision: 'Streamlining school events and fostering collaboration among clubs.',
    votes: 0,
    gender: 'Male',
    age: 16,
    birthDate: '2010-06-19',
    email: 'jose.rizalito@example.edu.ph',
    mobileNo: '09001112233',
    homeAddress: 'Leon, Iloilo',
  },
];

export const DEPED_COLORS = {
  blue: '#034F8B',
  red: '#E11C38',
  yellow: '#fcd116',
  white: '#ffffff',
  darkBlue: '#023e6d',
  inputBg: '#012a4a'
};

export const DEPED_LOGO_URL = depedSharedLogo;
export const DEPED_SEAL_URL = depedSharedLogo;
export const LEON_NHS_LOGO_URL = "https://ik.imagekit.io/astrasolutions/Leon%20NHS/leon%20nhs%20marks%20-%20upscaled/Leon%20NHS%20-%20Seal(Blue).png?tr=w-300,q-80";
export const LG_COMEA_LOGO_URL = "https://ik.imagekit.io/astrasolutions/Leon%20NHS/LG%20COMEA%20Logo.png?tr=w-400,q-80";
