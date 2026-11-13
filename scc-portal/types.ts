export type SccRole =
  | 'club_president'
  | 'club_officer'
  | 'scc_officer'
  | 'scc_adviser'
  | 'scc_coordinator';

export type SccServiceKey =
  | 'email_account'
  | 'cloud_storage'
  | 'digital_id_pass'
  | 'broadcast_notice'
  | 'meeting_license'
  | 'portal_subpage';

export type SccRequestStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'provisioned'
  | 'rejected'
  | 'cancelled';

export type SccPriority = 'normal' | 'high' | 'urgent';

export interface SccOrganization {
  id: string;
  schoolId: string;
  name: string;
  acronym: string;
  category: string;
  adviserName: string;
  adviserEmail: string;
  adviserContact?: string;
  description: string;
  officialEmail?: string;
  status: 'active' | 'inactive';
  officerCount?: number;
  activeRequestsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SccOfficer {
  id: string;
  organizationId: string;
  lrn: string;
  fullName: string;
  position: string;
  gradeLevel: string;
  section: string;
  email: string;
  secondaryEmail?: string;
  contactNumber: string;
  termYear: string;
  isAuthorizedSignatory: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SccSession {
  userId: string;
  username: string;
  fullName: string;
  role: SccRole;
  organizationId: string;
  organizationName: string;
  organizationAcronym: string;
  adviserName: string;
  isCoordinator: boolean;
  schoolId: string;
  schoolName: string;
}

export interface SccDigitalService {
  key: SccServiceKey;
  title: string;
  subtitle: string;
  category: 'Communication' | 'Storage & Archival' | 'Event Tech' | 'Broadcast & Media' | 'Web & Space';
  description: string;
  requirements: string[];
  slaTurnaround: string;
  icon: string;
  isActive: boolean;
  sampleDeliverable: string;
}

export interface SccServiceRequest {
  id: string;
  trackingNumber: string;
  organizationId: string;
  organizationName: string;
  organizationAcronym: string;
  requesterAccountId: string;
  requesterName: string;
  requesterPosition: string;
  serviceKey: SccServiceKey;
  serviceTitle: string;
  title: string;
  justification: string;
  priority: SccPriority;
  status: SccRequestStatus;
  adviserEndorsement: boolean;
  createdAt: string;
  updatedAt: string;
  details: {
    requestedMailboxAlias?: string;
    notificationEmail?: string;
    dataPrivacyAccepted?: boolean;
    dataPrivacySignatory?: string;
    dataPrivacySignedAt?: string;
    targetUsernames?: string[];
    storageCapacity?: string;
    eventTitle?: string;
    eventDate?: string;
    estimatedAttendees?: number;
    broadcastHeadline?: string;
    broadcastChannels?: string[];
    meetingPlatform?: 'Google Meet' | 'Zoom';
    meetingDate?: string;
    customNotes?: string;
  };
  provisionedData?: {
    assignedEmail?: string;
    tempPassword?: string;
    driveUrl?: string;
    meetingUrl?: string;
    broadcastReferenceId?: string;
    setupInstructions?: string;
    provisionedAt?: string;
    provisionedBy?: string;
  };
  reviewerRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
