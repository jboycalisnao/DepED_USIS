import type { IaSccOrganization, IaSccRequestStatus, IaSccServiceRequest } from '../types';

export function buildAccountProvisionedNotificationEmail(params: {
  action: 'created' | 'updated';
  organization?: Pick<IaSccOrganization, 'name' | 'acronym'> | null;
  primaryEmail: string;
  tempPassword: string;
  orgUnitPath: string;
  coordinatorName?: string;
}): { subject: string; text: string } {
  const orgLabel = params.organization
    ? `${params.organization.name} (${params.organization.acronym})`
    : 'Student Organization / Club';
  const subjectPrefix = params.organization?.acronym
    ? `[DepED USIS SCC • ${params.organization.acronym}]`
    : '[DepED USIS SCC]';
  const actionLabel = params.action === 'updated' ? 'Updated' : 'Created';

  return {
    subject: `${subjectPrefix} Institutional Google Workspace Account ${actionLabel}`,
    text: [
      'DepED USIS — Integrated Admin (School Coordinating Council)',
      'Leon National High School',
      '',
      'Good day,',
      '',
      `The institutional Google Workspace account for ${orgLabel} has been ${params.action}.`,
      '',
      'Account Details:',
      `  Primary Email:        ${params.primaryEmail}`,
      `  Temporary Password:   ${params.tempPassword}`,
      `  Organizational Unit:  ${params.orgUnitPath}`,
      `  Sign-In Portal:       https://mail.google.com`,
      '',
      'Security Reminder:',
      '  - Please sign in immediately at mail.google.com and change this temporary password upon initial login.',
      '  - Enable 2-Step Verification to protect official organization correspondence.',
      '',
      params.coordinatorName ? `Actioned by: ${params.coordinatorName}` : '',
      '',
      'This is an automated institutional notice sent via DepED USIS Google SMTP.',
    ]
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n'),
  };
}

export function buildPasswordResetNotificationEmail(params: {
  organization?: Pick<IaSccOrganization, 'name' | 'acronym'> | null;
  primaryEmail: string;
  newPassword: string;
  changeAtNextLogin: boolean;
}): { subject: string; text: string } {
  const orgLine = params.organization
    ? `${params.organization.name} (${params.organization.acronym})`
    : params.primaryEmail;
  const tag = params.organization?.acronym || params.primaryEmail;

  return {
    subject: `[DepED USIS SCC • ${tag}] Google Workspace Password Reset Notice`,
    text: [
      'DepED USIS — Integrated Admin (School Coordinating Council)',
      'Leon National High School',
      '',
      'Good day,',
      '',
      `The Google Workspace password for ${orgLine} has been reset by the Integrated Admin Coordinator.`,
      '',
      'Updated Sign-In Details:',
      `  Account Email:        ${params.primaryEmail}`,
      `  Temporary Password:   ${params.newPassword}`,
      `  Password Change:      ${params.changeAtNextLogin ? 'Required upon next sign-in' : 'Optional at next sign-in'}`,
      `  Sign-In Portal:       https://mail.google.com`,
      '',
      'Please update your password once signed in and keep these credentials restricted to authorized officers.',
      '',
      'This is an automated institutional notice sent via DepED USIS Google SMTP.',
    ].join('\n'),
  };
}

const REQUEST_STATUS_TEXT: Record<IaSccRequestStatus, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  provisioned: 'Provisioned & Ready',
  rejected: 'Rejected',
};

export function buildServiceRequestNotificationEmail(params: {
  request: IaSccServiceRequest;
  nextStatus: IaSccRequestStatus;
  reviewerRemarks: string;
  reviewedBy: string;
  assignedEmail?: string;
  tempPassword?: string;
  driveFolderUrl?: string;
  setupInstructions?: string;
}): { subject: string; text: string } {
  const { request, nextStatus } = params;
  const statusLabel = REQUEST_STATUS_TEXT[nextStatus] || nextStatus;

  const lines = [
    'DepED USIS — Integrated Admin (School Coordinating Council)',
    'Leon National High School',
    '',
    'Good day,',
    '',
    `Your SCC Digital Service Request (${request.trackingNumber}) for ${request.organizationName} (${request.organizationAcronym}) has been updated.`,
    '',
    'Request Summary:',
    `  Tracking Number:      ${request.trackingNumber}`,
    `  Service Requested:    ${request.serviceTitle}`,
    `  Request Title:        ${request.title}`,
    `  Submitted By:         ${request.requesterName} (${request.requesterPosition})`,
    `  New Status:           ${statusLabel}`,
    `  Reviewed By:          ${params.reviewedBy || 'Integrated Admin Coordinator'}`,
  ];

  if (params.reviewerRemarks) {
    lines.push(`  Coordinator Remarks:  ${params.reviewerRemarks}`);
  }

  if (
    nextStatus === 'provisioned' &&
    (params.assignedEmail || params.driveFolderUrl || params.setupInstructions)
  ) {
    lines.push('', 'Provisioned Deliverables:');
    if (params.assignedEmail) {
      lines.push(`  Assigned Email:       ${params.assignedEmail}`);
    }
    if (params.tempPassword) {
      lines.push(`  Temporary Password:   ${params.tempPassword}`);
    }
    if (params.driveFolderUrl) {
      lines.push(`  Shared Drive URL:     ${params.driveFolderUrl}`);
    }
    if (params.setupInstructions) {
      lines.push(`  Instructions:         ${params.setupInstructions}`);
    }
  }

  lines.push(
    '',
    'You may also view full status details inside the DepED USIS SCC Portal.',
    '',
    'This is an automated institutional notice sent via DepED USIS Google SMTP.',
  );

  return {
    subject: `[DepED USIS SCC • ${request.organizationAcronym}] ${request.trackingNumber} ${statusLabel}: ${request.serviceTitle}`,
    text: lines.join('\n'),
  };
}
