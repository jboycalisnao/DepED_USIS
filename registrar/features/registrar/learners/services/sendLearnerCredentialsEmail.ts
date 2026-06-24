import { supabase } from '../../../../lib/supabase';
import { Student } from '../../../../types';
import { loadUsisEmailHeaderImagePayload } from '../../../../../common/email/usisEmailHeaderImage';

type LearnerEmailSettings = {
  school_id: string;
  is_enabled: boolean;
  apps_script_web_app_url: string | null;
  apps_script_bearer_token: string | null;
  status_page_base_url: string;
  from_display_name: string;
  reply_to_email: string | null;
};

const USIS_EMAIL_HEADER_IMAGE_SRC = 'https://ik.imagekit.io/astrasolutions/Leon%20NHS/USIS/Leon-NHS_USIS-Header-Image-email.jpg';
const DEFAULT_SENDER_DISPLAY_NAME = 'Leon NHS - USIS';

const normalize = (value: unknown) => String(value ?? '').trim();

const resolveSenderDisplayName = (value: unknown) => {
  const normalized = normalize(value);
  if (!normalized) return DEFAULT_SENDER_DISPLAY_NAME;
  if (/^deped\s+usis\s+registrar$/i.test(normalized)) return DEFAULT_SENDER_DISPLAY_NAME;
  return normalized;
};

const escapeHtml = (value: unknown) =>
  normalize(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildDisplayName = (learner: Student) =>
  [learner.lastName, learner.firstName, learner.middleName].filter(Boolean).join(', ').trim() ||
  `${normalize(learner.firstName || 'Learner')} ${normalize(learner.lastName || '')}`.trim() ||
  'Learner';

export const buildLearnerCredentialsEmailHtml = (input: {
  learner: Student;
  schoolYearLabel?: string;
  sectionLabel?: string;
  fromDisplayName?: string;
  headerImageSrc?: string;
}) => {
  const learner = input.learner;
  const learnerName = escapeHtml(buildDisplayName(learner));
  const lrn = escapeHtml(learner.lrn || '-');
  const username = escapeHtml(learner.loginUsername || learner.lrn || '-');
  const password = escapeHtml(learner.loginPassword || '-');
  const recipientEmail = escapeHtml(learner.email || learner.microsoftUpn || '-');
  const microsoftEmail = escapeHtml(learner.microsoftUpn || '-');
  const sectionLabel = escapeHtml(input.sectionLabel || 'Unassigned');
  const schoolYearLabel = escapeHtml(input.schoolYearLabel || 'Current School Year');
  const headerImageSrc = escapeHtml(input.headerImageSrc || USIS_EMAIL_HEADER_IMAGE_SRC);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Learner Credentials</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:'Segoe UI',sans-serif;color:#10233d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:20px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5deea;border-radius:6px;overflow:hidden;">
            <tr>
              <td style="background:#ffffff;padding:16px 20px 12px;border-bottom:1px solid #d5deea;text-align:center;">
                <img src="${headerImageSrc}" alt="Leon NHS USIS Header" style="display:block;margin:0 auto;max-width:100%;width:320px;height:auto;object-fit:contain;" />
              </td>
            </tr>
            <tr>
              <td style="background:#0038A8;color:#ffffff;padding:16px 20px;text-align:center;">
                <div style="font-size:13px;font-weight:700;line-height:1.3;">Leon National High School</div>
                <div style="font-size:22px;font-weight:700;line-height:1.2;margin-top:4px;">Learner Account Credentials</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">Please keep this message confidential. It contains the learner's portal access details.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #9fb6d9;border-radius:6px;background:#f8fbff;">
                  <tr><td style="padding:14px 14px 4px;font-size:12px;color:#415a77;">Learner Name</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${learnerName}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">LRN</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${lrn}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Username</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${username}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Password</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${password}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Microsoft Email</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${microsoftEmail}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Section</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${sectionLabel}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">School Year</td></tr>
                  <tr><td style="padding:0 14px 14px;font-size:16px;font-weight:700;">${schoolYearLabel}</td></tr>
                </table>
                <div style="margin:16px 0 0;text-align:center;font-size:12px;line-height:1.5;color:#415a77;">
                  <p style="margin:0 0 6px;">If the learner cannot sign in, verify the stored username and password before resending.</p>
                  <p style="margin:0 0 6px;">If there are problems with their credentials, please reply to this email.</p>
                  <p style="margin:0 0 6px;font-weight:700;color:#0038A8;">Only the Bets for Leon NHS</p>
                  <p style="margin:0;">Recipient Address: ${recipientEmail}</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #9fb6d9;padding:12px 20px;background:#f8fbff;font-size:12px;color:#415a77;text-align:center;">
                <div style="margin:0 0 4px;font-weight:700;color:#0038A8;">Leon NHS - USIS</div>
                <div style="margin:0 0 4px;">&copy; Leon NHS - USIS</div>
                <div style="margin:0;">Only the Bets for Leon NHS</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const buildCredentialsEmailEnvelope = (input: {
  learner: Student;
  schoolYearLabel?: string;
  sectionLabel?: string;
  fromDisplayName?: string;
  headerImageSrc?: string;
}) => {
  const learner = input.learner;
  const recipientEmail = normalize(learner.email || learner.microsoftUpn);
  const username = normalize(learner.loginUsername || learner.lrn);
  const password = normalize(learner.loginPassword);

  if (!recipientEmail) {
    throw new Error('Learner email is not set. Add an email address before sending credentials.');
  }

  if (!username || !password) {
    throw new Error('Learner credentials are incomplete. Username and password are required before sending.');
  }

  const fromDisplayName = resolveSenderDisplayName(input.fromDisplayName);
  const htmlContent = buildLearnerCredentialsEmailHtml({
    learner,
    schoolYearLabel: input.schoolYearLabel,
    sectionLabel: input.sectionLabel,
    headerImageSrc: input.headerImageSrc || USIS_EMAIL_HEADER_IMAGE_SRC,
  });

  return {
    recipientEmail,
    subject: `Leon NHS - USIS Learner Credentials: ${buildDisplayName(learner)}.`,
    htmlContent,
    textContent: [
      'Learner Account Credentials',
      `Name: ${buildDisplayName(learner)}`,
      `LRN: ${normalize(learner.lrn) || '-'}`,
      `Username: ${username}`,
      `Password: ${password}`,
      `Microsoft Email: ${normalize(learner.microsoftUpn) || '-'}`,
      `Section: ${input.sectionLabel || 'Unassigned'}`,
      `School Year: ${input.schoolYearLabel || 'Current School Year'}`,
    ].join('\n'),
    learner: {
      id: normalize(learner.id),
      lrn: normalize(learner.lrn),
      firstName: normalize(learner.firstName),
      lastName: normalize(learner.lastName),
      middleName: normalize(learner.middleName),
      email: recipientEmail,
      username,
      password,
      microsoftEmail: normalize(learner.microsoftUpn),
      schoolYearLabel: input.schoolYearLabel || '',
      sectionLabel: input.sectionLabel || '',
    },
    fromDisplayName,
    headerImageSrc: input.headerImageSrc || USIS_EMAIL_HEADER_IMAGE_SRC,
  };
};

const buildStatusLookupUrl = (baseUrl: string | null | undefined, fallback: string) => {
  const resolvedBase = normalize(baseUrl) || fallback;
  try {
    const url = new URL(resolvedBase);
    return url.toString();
  } catch {
    return resolvedBase.replace(/\?+$/, '');
  }
};

export async function sendLearnerCredentialsViaWebhook(input: {
  learner: Student;
  schoolId: string;
  schoolYearLabel?: string;
  sectionLabel?: string;
}) {
  const schoolId = normalize(input.schoolId);
  if (!schoolId) {
    throw new Error('Learner school ID is missing.');
  }

  const { data, error } = await supabase
    .from('registrar_enrollment_email_settings')
    .select('*')
    .eq('school_id', schoolId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error(`Enrollment email settings not found for school ${schoolId}.`);

  const settings = data as LearnerEmailSettings;
  if (!settings.is_enabled) {
    throw new Error('Enrollment email service is disabled in Registrar Settings.');
  }

  const webhookUrl = normalize(settings.apps_script_web_app_url);
  if (!webhookUrl) {
    throw new Error('Apps Script Web App URL is not configured in Registrar Settings.');
  }

  const headerImagePayload = await loadUsisEmailHeaderImagePayload();
  const headerImageSrc = headerImagePayload.headerImageSrc;

  const envelope = buildCredentialsEmailEnvelope({
    learner: input.learner,
    schoolYearLabel: input.schoolYearLabel,
    sectionLabel: input.sectionLabel,
    fromDisplayName: settings.from_display_name,
    headerImageSrc,
  });

  const statusLookupUrl = buildStatusLookupUrl(settings.status_page_base_url, 'https://enroll.leonnhs.edu.ph/submission-status');

  const payload = {
    schoolId,
    webhookUrl,
    senderName: resolveSenderDisplayName(settings.from_display_name),
    fromDisplayName: resolveSenderDisplayName(settings.from_display_name),
    replyTo: normalize(settings.reply_to_email) || null,
    statusLookupUrl,
    headerImageSrc,
    headerImageBase64: headerImagePayload.headerImageBase64,
    headerImageMimeType: headerImagePayload.headerImageMimeType,
    headerImageName: headerImagePayload.headerImageName,
    learner: envelope.learner,
    email: envelope.recipientEmail,
    subject: envelope.subject,
    htmlContent: envelope.htmlContent,
    textContent: envelope.textContent,
    type: 'LEARNER_CREDENTIALS',
  };

  const response = await fetch('/api/credentials-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String((result as any)?.error || 'Unable to send learner credentials email.'));
  }

  return {
    sent: true,
    message: String((result as any)?.message || 'Learner credentials email sent via Google Apps Script webhook.'),
  };
}
