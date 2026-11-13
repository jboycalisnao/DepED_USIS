import type { IaSccOrganization, IaSccRequestStatus, IaSccServiceRequest } from '../types';

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function wrapUsisEmailHtml(params: {
  eyebrow: string;
  heading: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.heading)}</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;color:#12233d;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;margin:0 auto;">
    <tr>
      <td style="background-color:#ffffff;border:1px solid #dbe3ef;border-top:4px solid #0038a8;border-radius:12px;padding:24px;">
        <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;color:#0038a8;">${escapeHtml(params.eyebrow)}</p>
        <h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;font-weight:700;color:#12233d;">${escapeHtml(params.heading)}</h1>
        ${params.bodyHtml}
        <hr style="border:0;border-top:1px solid #e2e8f0;margin:20px 0 14px 0;" />
        <p style="margin:0;font-size:12px;line-height:1.55;color:#5c6b82;">
          Leon NHS USIS — Integrated Admin (School Coordinating Council) &bull; Leon National High School<br />
          This is an automated system notification. <strong>Please do not reply directly to this email</strong>; replies sent to this address are not monitored.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderSummaryRows(rows: Array<{ label: string; valueHtml: string }>): string {
  return rows
    .map(
      (row) => `<tr>
        <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#5c6b82;width:170px;vertical-align:top;border-bottom:1px solid #e2e8f0;">${escapeHtml(row.label)}</td>
        <td style="padding:8px 12px;font-size:14px;color:#12233d;vertical-align:top;border-bottom:1px solid #e2e8f0;">${row.valueHtml}</td>
      </tr>`,
    )
    .join('');
}

export function buildAccountProvisionedNotificationEmail(params: {
  action: 'created' | 'updated';
  organization?: Pick<IaSccOrganization, 'name' | 'acronym'> | null;
  primaryEmail: string;
  tempPassword: string;
  orgUnitPath: string;
  coordinatorName?: string;
}): { subject: string; text: string; html: string } {
  const orgLabel = params.organization
    ? `${params.organization.name} (${params.organization.acronym})`
    : 'Student Organization / Club';
  const subjectPrefix = params.organization?.acronym
    ? `[Leon NHS USIS SCC • ${params.organization.acronym}]`
    : '[Leon NHS USIS SCC]';
  const actionLabel = params.action === 'updated' ? 'Updated' : 'Created';
  const statusLabel = params.action === 'updated' ? 'ACCOUNT UPDATED' : 'ACCOUNT PROVISIONED';

  const html = wrapUsisEmailHtml({
    eyebrow: 'Leon NHS USIS SCC • Leon National High School',
    heading: `Google Workspace Account ${actionLabel}`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:#12233d;">Good day,</p>
      <div style="margin:0 0 16px 0;padding:14px 16px;background-color:#ecfdf3;border:1px solid #abefc6;border-left:4px solid #027a48;border-radius:12px;">
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:#d1fadf;color:#027a48;font-size:12px;font-weight:700;">${statusLabel}</span>
        <p style="margin:8px 0 0 0;font-size:14px;line-height:1.5;color:#064e3b;">
          The institutional Google Workspace account for <strong>${escapeHtml(orgLabel)}</strong> has been ${escapeHtml(params.action)}.
        </p>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dbe3ef;border-radius:12px;background-color:#f8fafc;border-collapse:separate;margin:0 0 16px 0;">
        ${renderSummaryRows([
          { label: 'Primary Email', valueHtml: `<code>${escapeHtml(params.primaryEmail)}</code>` },
          { label: 'Temporary Password', valueHtml: `<code>${escapeHtml(params.tempPassword)}</code>` },
          { label: 'Organizational Unit', valueHtml: `<code>${escapeHtml(params.orgUnitPath)}</code>` },
          {
            label: 'Sign-In Portal',
            valueHtml: '<a href="https://mail.google.com" style="color:#0038a8;font-weight:700;">https://mail.google.com</a>',
          },
          ...(params.coordinatorName
            ? [{ label: 'Actioned By', valueHtml: escapeHtml(params.coordinatorName) }]
            : []),
        ])}
      </table>
      <div style="padding:12px 14px;background-color:#fffaeb;border:1px solid #fedf89;border-radius:12px;font-size:13px;line-height:1.5;color:#7a2e0e;">
        <strong>Security Reminder:</strong> Sign in promptly at mail.google.com, change this temporary password upon initial login, and enable 2-Step Verification.
      </div>
    `,
  });

  return {
    subject: `${subjectPrefix} Institutional Google Workspace Account ${actionLabel}`,
    text: [
      'Leon NHS USIS — Integrated Admin (School Coordinating Council)',
      'Leon National High School',
      '',
      `STATUS: [ ${statusLabel} ]`,
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
      'This is an automated institutional notification from Leon NHS USIS. Please do not reply directly to this email as replies to this address are not monitored.',
    ]
      .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
      .join('\n'),
    html,
  };
}

export function buildPasswordResetNotificationEmail(params: {
  organization?: Pick<IaSccOrganization, 'name' | 'acronym'> | null;
  primaryEmail: string;
  newPassword: string;
  changeAtNextLogin: boolean;
}): { subject: string; text: string; html: string } {
  const orgLine = params.organization
    ? `${params.organization.name} (${params.organization.acronym})`
    : params.primaryEmail;
  const tag = params.organization?.acronym || params.primaryEmail;

  const html = wrapUsisEmailHtml({
    eyebrow: 'Leon NHS USIS SCC • Leon National High School',
    heading: 'Google Workspace Password Reset Notice',
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:#12233d;">Good day,</p>
      <div style="margin:0 0 16px 0;padding:14px 16px;background-color:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #0038a8;border-radius:12px;">
        <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:#dbeafe;color:#0038a8;font-size:12px;font-weight:700;">PASSWORD RESET</span>
        <p style="margin:8px 0 0 0;font-size:14px;line-height:1.5;color:#1e3a8a;">
          The Google Workspace password for <strong>${escapeHtml(orgLine)}</strong> has been reset by the Integrated Admin Coordinator.
        </p>
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dbe3ef;border-radius:12px;background-color:#f8fafc;border-collapse:separate;">
        ${renderSummaryRows([
          { label: 'Account Email', valueHtml: `<code>${escapeHtml(params.primaryEmail)}</code>` },
          { label: 'Temporary Password', valueHtml: `<code>${escapeHtml(params.newPassword)}</code>` },
          {
            label: 'Password Change',
            valueHtml: escapeHtml(
              params.changeAtNextLogin ? 'Required upon next sign-in' : 'Optional at next sign-in',
            ),
          },
          {
            label: 'Sign-In Portal',
            valueHtml: '<a href="https://mail.google.com" style="color:#0038a8;font-weight:700;">https://mail.google.com</a>',
          },
        ])}
      </table>
    `,
  });

  return {
    subject: `[Leon NHS USIS SCC • ${tag}] Google Workspace Password Reset Notice`,
    text: [
      'Leon NHS USIS — Integrated Admin (School Coordinating Council)',
      'Leon National High School',
      '',
      'STATUS: [ PASSWORD RESET ]',
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
      'This is an automated institutional notification from Leon NHS USIS. Please do not reply directly to this email as replies to this address are not monitored.',
    ].join('\n'),
    html,
  };
}

const REQUEST_STATUS_TEXT: Record<IaSccRequestStatus, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
  provisioned: 'Provisioned & Ready',
  rejected: 'Rejected',
};

const REQUEST_STATUS_THEME: Record<
  IaSccRequestStatus,
  {
    badge: string;
    bg: string;
    border: string;
    accent: string;
    pillBg: string;
    textColor: string;
    summaryLine: string;
  }
> = {
  pending: {
    badge: 'PENDING REVIEW',
    bg: '#fffaeb',
    border: '#fedf89',
    accent: '#b54708',
    pillBg: '#fef0c7',
    textColor: '#7a2e0e',
    summaryLine: 'This service request is queued for review by the Integrated Admin Coordinator.',
  },
  under_review: {
    badge: 'UNDER REVIEW',
    bg: '#eef2ff',
    border: '#c7d2fe',
    accent: '#3730a3',
    pillBg: '#e0e7ff',
    textColor: '#312e81',
    summaryLine: 'This service request is currently under evaluation by the Integrated Admin Coordinator.',
  },
  approved: {
    badge: 'APPROVED',
    bg: '#eff6ff',
    border: '#bfdbfe',
    accent: '#0038a8',
    pillBg: '#dbeafe',
    textColor: '#1e3a8a',
    summaryLine: 'This service request has been approved and is ready for fulfillment.',
  },
  provisioned: {
    badge: 'PROVISIONED & READY',
    bg: '#ecfdf3',
    border: '#abefc6',
    accent: '#027a48',
    pillBg: '#d1fadf',
    textColor: '#064e3b',
    summaryLine: 'This service request has been fulfilled and its deliverables are now active.',
  },
  rejected: {
    badge: 'REJECTED',
    bg: '#fef3f2',
    border: '#fecdca',
    accent: '#b42318',
    pillBg: '#fee4e2',
    textColor: '#7a271a',
    summaryLine: 'This service request was declined. Please review the coordinator remarks below.',
  },
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
}): { subject: string; text: string; html: string } {
  const { request, nextStatus } = params;
  const statusLabel = REQUEST_STATUS_TEXT[nextStatus] || nextStatus;
  const theme = REQUEST_STATUS_THEME[nextStatus] || REQUEST_STATUS_THEME.pending;

  const lines = [
    'Leon NHS USIS — Integrated Admin (School Coordinating Council)',
    'Leon National High School',
    '',
    '====================================================',
    `REQUEST STATUS: [ ${theme.badge} ]`,
    theme.summaryLine,
    '====================================================',
    '',
    'Good day,',
    '',
    `Your SCC Digital Service Request (${request.trackingNumber}) for ${request.organizationName} (${request.organizationAcronym}) has been updated to: ${statusLabel.toUpperCase()}.`,
    '',
    'Request Summary:',
    `  Tracking Number:      ${request.trackingNumber}`,
    `  Service Requested:    ${request.serviceTitle}`,
    `  Request Title:        ${request.title}`,
    `  Submitted By:         ${request.requesterName} (${request.requesterPosition})`,
    `  Request Status:       ${statusLabel.toUpperCase()}`,
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

  const hasTermsAttachment =
    request.serviceKey === 'email_account' && nextStatus === 'provisioned';

  lines.push(
    ...(hasTermsAttachment
      ? [
          '',
          'Attached Document: Pre-filled @leonnhs.edu.ph Institutional Email Terms and Agreement (PDF). Please review, sign, and keep a copy for your organization records.',
        ]
      : []),
    '',
    'You may also view full status details inside the Leon NHS USIS SCC Portal: https://scc.leonnhs.edu.ph',
    '',
    'This is an automated institutional notification from Leon NHS USIS. Please do not reply directly to this email as replies to this address are not monitored.',
  );

  const deliverablesRows: Array<{ label: string; valueHtml: string }> = [];
  if (params.assignedEmail) {
    deliverablesRows.push({
      label: 'Assigned Email',
      valueHtml: `<code style="font-weight:700;color:#027a48;">${escapeHtml(params.assignedEmail)}</code>`,
    });
  }
  if (params.tempPassword) {
    deliverablesRows.push({
      label: 'Temporary Password',
      valueHtml: `<code style="font-weight:700;color:#12233d;">${escapeHtml(params.tempPassword)}</code>`,
    });
  }
  if (params.driveFolderUrl) {
    deliverablesRows.push({
      label: 'Shared Drive URL',
      valueHtml: `<a href="${escapeHtml(params.driveFolderUrl)}" style="color:#0038a8;font-weight:700;">${escapeHtml(params.driveFolderUrl)}</a>`,
    });
  }
  if (params.setupInstructions) {
    deliverablesRows.push({
      label: 'Instructions',
      valueHtml: escapeHtml(params.setupInstructions),
    });
  }

  const deliverablesHtml =
    nextStatus === 'provisioned' && deliverablesRows.length > 0
      ? `<div style="margin:16px 0 0 0;padding:14px 16px;background-color:#ecfdf3;border:1px solid #abefc6;border-radius:12px;">
          <p style="margin:0 0 10px 0;font-size:14px;font-weight:700;color:#027a48;">Provisioned Deliverables</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;border:1px solid #d1fadf;border-radius:8px;border-collapse:separate;">
            ${renderSummaryRows(deliverablesRows)}
          </table>
        </div>`
      : '';

  const html = wrapUsisEmailHtml({
    eyebrow: `Leon NHS USIS SCC • ${request.organizationAcronym}`,
    heading: `${request.trackingNumber} — Request Status Update`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:#12233d;">Good day,</p>
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.55;color:#12233d;">
        Your SCC Digital Service Request (<strong>${escapeHtml(request.trackingNumber)}</strong>) for
        <strong>${escapeHtml(request.organizationName)} (${escapeHtml(request.organizationAcronym)})</strong>
        has been updated.
      </p>

      <div style="margin:0 0 18px 0;padding:16px;background-color:${theme.bg};border:1px solid ${theme.border};border-left:4px solid ${theme.accent};border-radius:12px;">
        <p style="margin:0 0 6px 0;font-size:12px;font-weight:700;color:${theme.accent};">CURRENT REQUEST STATUS</p>
        <span style="display:inline-block;padding:6px 14px;border-radius:999px;background-color:${theme.pillBg};color:${theme.accent};font-size:14px;font-weight:700;">
          ${escapeHtml(theme.badge)}
        </span>
        <p style="margin:10px 0 0 0;font-size:13px;line-height:1.5;color:${theme.textColor};">
          ${escapeHtml(theme.summaryLine)}
        </p>
      </div>

      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #dbe3ef;border-radius:12px;background-color:#f8fafc;border-collapse:separate;">
        ${renderSummaryRows([
          { label: 'Tracking Number', valueHtml: `<code>${escapeHtml(request.trackingNumber)}</code>` },
          { label: 'Service Requested', valueHtml: escapeHtml(request.serviceTitle) },
          { label: 'Request Title', valueHtml: escapeHtml(request.title) },
          {
            label: 'Submitted By',
            valueHtml: `${escapeHtml(request.requesterName)} (${escapeHtml(request.requesterPosition)})`,
          },
          {
            label: 'Request Status',
            valueHtml: `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background-color:${theme.pillBg};color:${theme.accent};font-size:12px;font-weight:700;">${escapeHtml(statusLabel)}</span>`,
          },
          {
            label: 'Reviewed By',
            valueHtml: escapeHtml(params.reviewedBy || 'Integrated Admin Coordinator'),
          },
          ...(params.reviewerRemarks
            ? [
                {
                  label: 'Coordinator Remarks',
                  valueHtml: `<span style="font-weight:600;color:#12233d;">${escapeHtml(params.reviewerRemarks)}</span>`,
                },
              ]
            : []),
        ])}
      </table>

      ${deliverablesHtml}

      ${
        hasTermsAttachment
          ? `<div style="margin:16px 0 0 0;padding:12px 14px;background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;font-size:13px;line-height:1.5;color:#1e3a8a;">
              <strong>Attached Document:</strong> Your pre-filled <strong>@leonnhs.edu.ph Institutional Email Terms and Agreement (PDF)</strong> is attached to this email for review and signature.
            </div>`
          : ''
      }

      <p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:#5c6b82;">
        You may also view full status details inside the
        <a href="https://scc.leonnhs.edu.ph" target="_blank" rel="noopener noreferrer" style="color:#0038a8;font-weight:700;text-decoration:underline;">Leon NHS USIS SCC Portal (scc.leonnhs.edu.ph)</a>.
      </p>
    `,
  });

  return {
    subject: `[Leon NHS USIS SCC • ${request.organizationAcronym}] ${request.trackingNumber} ${statusLabel}: ${request.serviceTitle}`,
    text: lines.join('\n'),
    html,
  };
}

export function buildCustomOfficerAnnouncementEmail(params: {
  organizationName: string;
  organizationAcronym: string;
  subject: string;
  message: string;
}): { subject: string; text: string; html: string } {
  const htmlParagraphs = params.message
    .trim()
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#12233d;">${escapeHtml(block).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  return {
    subject: params.subject.trim(),
    text: [
      params.message.trim(),
      '',
      '---',
      'This is an automated institutional notification from Leon NHS USIS. Please do not reply directly to this email as replies to this address are not monitored.',
    ].join('\n'),
    html: wrapUsisEmailHtml({
      eyebrow: `Leon NHS USIS SCC • ${params.organizationName} (${params.organizationAcronym})`,
      heading: params.subject.trim(),
      bodyHtml: htmlParagraphs,
    }),
  };
}
