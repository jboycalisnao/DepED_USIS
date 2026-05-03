import { supabase } from '@deped-usis/shared-supabase';
import type { SpPortalAdminAccess } from './spPortalAdminAccess';

export type AdminPortalStatus = 'open' | 'closed' | 'inactive';

export type AdminPortalRecord = {
  id: string;
  schoolId: string;
  schoolName: string;
  status: AdminPortalStatus;
  applicationUrl: string | null;
};

export type AdminApplicationRecord = {
  id: string;
  applicationNumber: string;
  learnerName: string;
  incomingGradeLevel: string;
  selectedProgramTrack: string;
  guardianName: string;
  guardianContact: string;
  email: string;
  status: string;
  submittedAt: string;
  portalId: string;
  schoolName: string;
};

type PortalRow = {
  id: string;
  school_id: string;
  school_name: string;
  status: AdminPortalStatus;
  application_url: string | null;
};

type ApplicationRow = {
  id: string;
  application_number: string;
  learner_last_name: string;
  learner_first_name: string;
  learner_middle_name: string | null;
  incoming_grade_level: string;
  selected_program_track: string;
  guardian_name: string | null;
  guardian_contact: string | null;
  email: string | null;
  status: string;
  submitted_at: string;
  portal_id: string;
};

export async function loadAdminPortals(access: SpPortalAdminAccess): Promise<AdminPortalRecord[]> {
  let query = supabase
    .from('sp_portal_school_portals')
    .select('id, school_id, school_name, status, application_url')
    .order('school_name');

  if (!access.isSuperAdmin) {
    query = query.eq('school_id', access.schoolId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Unable to load SP Portal records.');
  }

  return ((data || []) as PortalRow[]).map((portal) => ({
    id: portal.id,
    schoolId: portal.school_id,
    schoolName: portal.school_name,
    status: portal.status,
    applicationUrl: portal.application_url,
  }));
}

export async function loadAdminApplications(portals: AdminPortalRecord[]): Promise<AdminApplicationRecord[]> {
  const portalIds = portals.map((portal) => portal.id);
  const schoolByPortalId = new Map(portals.map((portal) => [portal.id, portal.schoolName]));

  if (portalIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('sp_portal_applications')
    .select(
      'id, application_number, learner_last_name, learner_first_name, learner_middle_name, incoming_grade_level, selected_program_track, guardian_name, guardian_contact, email, status, submitted_at, portal_id',
    )
    .in('portal_id', portalIds)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw new Error(error.message || 'Unable to load SP Portal applications.');
  }

  return ((data || []) as ApplicationRow[]).map((application) => ({
    id: application.id,
    applicationNumber: application.application_number,
    learnerName: [
      application.learner_last_name,
      application.learner_first_name,
      application.learner_middle_name,
    ]
      .filter(Boolean)
      .join(', '),
    incomingGradeLevel: application.incoming_grade_level,
    selectedProgramTrack: application.selected_program_track,
    guardianName: application.guardian_name || 'Not provided',
    guardianContact: application.guardian_contact || 'Not provided',
    email: application.email || 'Not provided',
    status: application.status,
    submittedAt: application.submitted_at,
    portalId: application.portal_id,
    schoolName: schoolByPortalId.get(application.portal_id) || 'SP Portal',
  }));
}

export async function updatePortalStatus(portalId: string, status: AdminPortalStatus) {
  const { error } = await supabase
    .from('sp_portal_school_portals')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', portalId);

  if (error) {
    throw new Error(error.message || 'Unable to update portal status.');
  }
}

export async function updateApplicationStatus(applicationId: string, status: string) {
  const { error } = await supabase
    .from('sp_portal_applications')
    .update({ status })
    .eq('id', applicationId);

  if (error) {
    throw new Error(error.message || 'Unable to update application status.');
  }
}
