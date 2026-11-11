export type IaSccRequestStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'provisioned'
  | 'rejected';

export type IaSccPriority = 'normal' | 'high' | 'urgent';

export type IaSccServiceKey =
  | 'email_account'
  | 'cloud_storage'
  | 'digital_id_pass'
  | 'broadcast_notice'
  | 'virtual_conferencing'
  | 'portal_subpage';

export type IaSccOrgStatus = 'active' | 'inactive' | 'pending';

export interface IaSccOrganization {
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
  status: IaSccOrgStatus;
  officerCount?: number;
  activeRequestsCount?: number;
}

export interface IaSccOfficer {
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
  source?: 'registrar' | 'manual';
  matchedTag?: string;
}

export interface IaSccLearnerCandidate {
  id: string;
  lrn: string;
  fullName: string;
  gradeLevel: string;
  section: string;
  email: string;
  secondaryEmail?: string;
  contactNumber: string;
  tags: string[];
}

export interface IaSccServiceRequest {
  id: string;
  trackingNumber: string;
  organizationId: string;
  organizationName: string;
  organizationAcronym: string;
  requesterAccountId: string;
  requesterName: string;
  requesterPosition: string;
  serviceKey: IaSccServiceKey;
  serviceTitle: string;
  title: string;
  justification: string;
  priority: IaSccPriority;
  status: IaSccRequestStatus;
  adviserEndorsement: boolean;
  createdAt: string;
  updatedAt: string;
  details: {
    requestedMailboxAlias?: string;
    targetUsernames?: string[];
    storageCapacity?: string;
    eventTitle?: string;
    eventDate?: string;
    estimatedAttendees?: number;
    broadcastHeadline?: string;
    broadcastChannels?: string[];
    meetingPlatform?: 'Google Meet' | 'Zoom';
    customNotes?: string;
  };
  provisionedData?: {
    assignedEmail?: string;
    tempPassword?: string;
    driveFolderUrl?: string;
    qrPassUrl?: string;
    setupInstructions?: string;
    provisionedAt?: string;
    provisionedBy?: string;
  };
  reviewerRemarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface IaSccRequestReviewPayload {
  status: IaSccRequestStatus;
  reviewerRemarks: string;
  reviewedBy: string;
  provisionedData?: IaSccServiceRequest['provisionedData'];
}

export interface IaSccGoogleUser {
  id: string;
  primaryEmail: string;
  firstName: string;
  lastName: string;
  fullName: string;
  orgUnitPath: string;
  suspended: boolean;
  changePasswordAtNextLogin: boolean;
  lastLoginTime?: string;
  creationTime?: string;
  isAdmin: boolean;
}

export interface SccSmtpStatus {
  ok: boolean;
  configured: boolean;
  host: string;
  port: number;
  from: string;
  fromName: string;
  missing: string[];
}

export interface SccOfficerRecipient {
  id: string;
  fullName: string;
  position: string;
  email: string;
  isPresident: boolean;
  isAuthorizedSignatory: boolean;
}

export interface SccNotificationResult {
  ok: boolean;
  host?: string;
  from?: string;
  sentTo: string[];
  ccSent: string[];
  error?: string;
}

export interface IaMailboxAvailabilityResult {
  email: string;
  available: boolean;
  registeredTo?: string;
  existsInDatabase: boolean;
  databaseConflictOrgId?: string;
  databaseReason?: string;
  existsInGoogleAdmin: boolean;
  googleAdminReason?: string;
  directoryChecked: boolean;
}

export interface IaSccAdviserCandidate {
  id: string;
  fullName: string;
  email: string;
  mobileNo: string;
  role: string;
  personnelType: 'teaching' | 'non_teaching' | 'coordinator';
  departmentName: string;
  isActive: boolean;
  username: string;
}
