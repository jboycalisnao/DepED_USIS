import { createClient } from '@supabase/supabase-js';
import { LearnerProfile, AttendanceRecord, GradeSubject, DocumentRequest, PortalAnnouncement } from '../types';

export const SUPABASE_URL = 'https://vubmvthbsnzzhmjbdces.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Ym12dGhic256emhtamJkY2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxMTIwMTMsImV4cCI6MjA4MDY4ODAxM30.woE4szCZ6PAbTU54Rf5b9oqr5QPS9aaBh_qRmLJ3B8k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export interface SupabaseAuthResult {
  success: boolean;
  error?: string;
  learner?: LearnerProfile;
}

/**
 * Real Supabase Authentication for School Portal
 * Validates LRN and password against registrar_learners in Supabase.
 */
export async function authenticateLearnerWithSupabase(
  usernameInput: string,
  passwordInput: string
): Promise<SupabaseAuthResult> {
  const normalizedUsername = usernameInput.replace(/\D/g, '').trim();
  const normalizedPassword = passwordInput.trim();

  if (!normalizedUsername || !normalizedPassword) {
    return { success: false, error: 'LRN and password are required.' };
  }

  if (!/^\d{12}$/.test(normalizedUsername)) {
    return { success: false, error: 'LRN must contain exactly 12 digits.' };
  }

  try {
    const { data, error } = await supabase
      .from('registrar_learners')
      .select(`
        id,
        lrn,
        first_name,
        middle_name,
        last_name,
        extension_name,
        birth_date,
        gender,
        address,
        contact_number,
        guardian_name,
        guardian_contact,
        email,
        login_username,
        login_password_plain,
        login_status,
        section_id,
        grade_to_enroll,
        last_grade_level,
        track,
        strand,
        school_year,
        status,
        rfid,
        enrollment_history,
        microsoft_upn,
        microsoft_account_status
      `)
      .eq('login_username', normalizedUsername)
      .limit(1)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        error: 'Unable to connect to the USIS database right now. Please check your connection.',
      };
    }

    if (!data) {
      return { success: false, error: 'Invalid school portal credentials.' };
    }

    const loginStatus = String(data.login_status || 'Active').trim();
    if (loginStatus.toLowerCase() !== 'active') {
      return {
        success: false,
        error: `Account is currently ${loginStatus}. Contact the school registrar.`,
      };
    }

    const validPassword =
      normalizedPassword === String(data.login_password_plain || '').trim();

    if (!validPassword) {
      return { success: false, error: 'Invalid school portal credentials.' };
    }

    // Resolve Section & Adviser if section_id is present
    let sectionName = 'Unassigned';
    let gradeLevel = data.grade_to_enroll || data.last_grade_level || 'Grade 12';
    let adviserName = 'Class Adviser';
    let trackStrand = [data.track, data.strand].filter(Boolean).join(' - ') || 'Senior High School';

    if (data.section_id) {
      const { data: sectionData } = await supabase
        .from('registrar_sections')
        .select('name, grade_level, adviser_name, strand')
        .eq('id', data.section_id)
        .maybeSingle();

      if (sectionData) {
        if (sectionData.name) sectionName = sectionData.name;
        if (sectionData.grade_level) gradeLevel = sectionData.grade_level;
        if (sectionData.adviser_name) adviserName = sectionData.adviser_name;
        if (sectionData.strand) trackStrand = sectionData.strand;
      }
    }

    const fullName = [
      data.last_name,
      [data.first_name, data.middle_name, data.extension_name].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', ');

    const learner: LearnerProfile = {
      id: data.id,
      lrn: data.lrn || normalizedUsername,
      firstName: data.first_name || '',
      middleName: data.middle_name || '',
      lastName: data.last_name || '',
      extensionName: data.extension_name || '',
      fullName: fullName || normalizedUsername,
      schoolId: '302522',
      schoolName: 'Leon National High School',
      division: 'Iloilo',
      region: 'Region VI - Western Visayas',
      gradeLevel: gradeLevel,
      section: sectionName,
      trackStrand: trackStrand,
      adviserName: adviserName,
      schoolYear: data.school_year || '2026-2027',
      status: (data.status as any) || 'Enrolled',
      email: data.microsoft_upn || data.email || `${data.lrn}@leonnhs.edu.ph`,
      guardianName: data.guardian_name || undefined,
      guardianContact: data.guardian_contact || data.contact_number || undefined,
      enrollmentHistory: Array.isArray(data.enrollment_history) ? data.enrollment_history : [],
    };

    return { success: true, learner };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'A network error occurred while communicating with Supabase.',
    };
  }
}

/**
 * Fetch real attendance logs for this learner from Supabase
 */
export async function fetchLearnerAttendanceFromSupabase(
  learnerId: string,
  lrn: string
): Promise<AttendanceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('id, logged_at, attendance_type, source, station_no')
      .or(`learner_id.eq.${learnerId},lrn.eq.${lrn}`)
      .order('logged_at', { ascending: false })
      .limit(30);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row) => {
      const dateObj = new Date(row.logged_at);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = days[dateObj.getDay()];
      const dateStr = row.logged_at.split('T')[0];
      const timeStr = dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });

      const type = String(row.attendance_type || '').toUpperCase();
      const status: AttendanceRecord['status'] = type.includes('LATE')
        ? 'Late'
        : type.includes('OUT')
        ? 'Present'
        : 'Present';

      return {
        id: row.id,
        date: dateStr,
        dayOfWeek,
        timeIn: timeStr,
        status,
        remarks: `Station ${row.station_no || '1'} (${row.source || 'RFID Tap'})`,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Fetch document requests for this learner from Supabase
 */
export async function fetchDocumentRequestsFromSupabase(
  learnerId: string,
  lrn: string
): Promise<DocumentRequest[]> {
  try {
    const { data, error } = await supabase
      .from('registrar_document_requests')
      .select('*')
      .or(`learner_id.eq.${learnerId},lrn.eq.${lrn}`)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      trackingNumber: row.tracking_number || `REQ-${row.id.slice(0, 8).toUpperCase()}`,
      documentType: row.document_type || 'Certificate of Enrollment',
      requestDate: (row.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
      status: row.status || 'Pending',
      purpose: row.purpose || 'Official School Requirement',
      estimatedRelease: row.estimated_release_date || '3 business days',
    }));
  } catch {
    return [];
  }
}

/**
 * Create a new document request in Supabase
 */
export async function createDocumentRequestInSupabase(input: {
  learnerId: string;
  lrn: string;
  documentType: string;
  purpose: string;
}): Promise<{ success: boolean; request?: DocumentRequest; error?: string }> {
  try {
    const trackingNumber = `REQ-2026-${Math.floor(10000 + Math.random() * 90000)}`;
    const { data, error } = await supabase
      .from('registrar_document_requests')
      .insert({
        learner_id: input.learnerId,
        lrn: input.lrn,
        document_type: input.documentType,
        purpose: input.purpose,
        tracking_number: trackingNumber,
        status: 'Pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      request: {
        id: data.id,
        trackingNumber: data.tracking_number || trackingNumber,
        documentType: data.document_type || input.documentType,
        requestDate: (data.created_at || '').split('T')[0],
        status: 'Pending',
        purpose: data.purpose || input.purpose,
        estimatedRelease: '3 business days',
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit document request.' };
  }
}

/**
 * Fetch official announcements from ia_learner_portal_notifications in Supabase
 */
export async function fetchPortalAnnouncementsFromSupabase(): Promise<PortalAnnouncement[]> {
  try {
    const { data, error } = await supabase
      .from('ia_learner_portal_notifications')
      .select('id, title, message, created_at, is_pinned')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.message,
      category: 'DepEd Advisory',
      date: new Date(row.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      isImportant: Boolean(row.is_pinned),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch real subjects and published grades for this learner from Supabase
 */
export async function fetchLearnerGradesFromSupabase(
  learnerId: string,
  lrn: string
): Promise<GradeSubject[]> {
  try {
    let learnerQuery = supabase.from('registrar_learners').select('*').limit(1);
    if (learnerId) learnerQuery = learnerQuery.eq('id', learnerId);
    else if (lrn) learnerQuery = learnerQuery.eq('lrn', lrn);
    else return [];

    const { data: learnerData } = await learnerQuery.maybeSingle();
    if (!learnerData) return [];

    let sectionId = learnerData.section_id || '';
    if (!sectionId && Array.isArray(learnerData.enrollment_history) && learnerData.enrollment_history.length > 0) {
      const latest = learnerData.enrollment_history[learnerData.enrollment_history.length - 1];
      if (latest?.section) {
        const { data: secByName } = await supabase
          .from('registrar_sections')
          .select('id')
          .eq('name', latest.section)
          .limit(1)
          .maybeSingle();
        if (secByName?.id) sectionId = secByName.id;
      }
    }

    if (!sectionId) return [];

    const { data: sectionSubjects, error: subErr } = await supabase
      .from('registrar_section_subjects')
      .select('id, subject_code, subject_title, instructor_name, is_core')
      .eq('section_id', sectionId)
      .order('subject_code', { ascending: true });

    if (subErr || !sectionSubjects || sectionSubjects.length === 0) {
      return [];
    }

    // Try loading published grades
    let gradeMap = new Map<string, { q1?: number; q2?: number; q3?: number; q4?: number }>();
    const { data: gradesData } = await supabase
      .from('registrar_section_subject_grades')
      .select('*')
      .or(`learner_id.eq.${learnerId},learner_lrn.eq.${lrn}`)
      .limit(100);

    if (gradesData && gradesData.length > 0) {
      gradesData.forEach((row: any) => {
        const code = String(row.subject_code || row.subjectCode || '').toUpperCase();
        if (code) {
          gradeMap.set(code, {
            q1: row.q1 != null ? Number(row.q1) : undefined,
            q2: row.q2 != null ? Number(row.q2) : undefined,
            q3: row.q3 != null ? Number(row.q3) : undefined,
            q4: row.q4 != null ? Number(row.q4) : undefined,
          });
        }
      });
    }

    return sectionSubjects.map((sub: any) => {
      const code = String(sub.subject_code || '').toUpperCase();
      const q = gradeMap.get(code);
      const quarters = [q?.q1, q?.q2, q?.q3, q?.q4].filter((n) => typeof n === 'number') as number[];
      const finalRating = quarters.length === 4
        ? Math.round(quarters.reduce((a, b) => a + b, 0) / 4)
        : quarters.length > 0
        ? Math.round(quarters.reduce((a, b) => a + b, 0) / quarters.length)
        : undefined;

      const remarks: GradeSubject['remarks'] =
        finalRating !== undefined
          ? finalRating >= 75
            ? 'Passed'
            : 'Failed'
          : 'In Progress';

      return {
        id: sub.id || sub.subject_code,
        subjectCode: sub.subject_code,
        subjectTitle: sub.subject_title || sub.subject_code,
        teacher: sub.instructor_name || 'Class Instructor',
        q1: q?.q1,
        q2: q?.q2,
        q3: q?.q3,
        q4: q?.q4,
        finalRating,
        remarks,
      };
    });
  } catch {
    return [];
  }
}
