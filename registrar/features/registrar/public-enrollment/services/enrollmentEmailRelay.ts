import { supabase } from '../../../../lib/supabase';
import { loadUsisEmailHeaderImagePayload } from '../../../../../common/email/usisEmailHeaderImage';
import { buildEnrollmentConfirmationEmailHtml } from './email-template/buildEnrollmentConfirmationEmailHtml';

type EnrollmentEmailSettings = {
  school_id: string;
  is_enabled: boolean;
  apps_script_web_app_url: string | null;
  apps_script_bearer_token: string | null;
  status_page_base_url: string;
  from_display_name: string;
  reply_to_email: string | null;
};

const normalize = (value: unknown) => String(value ?? '').trim();

const resolveSenderDisplayName = (value: unknown) => {
  const normalized = normalize(value);
  if (!normalized) return 'Leon NHS - USIS';
  if (/^deped\s+usis\s+registrar$/i.test(normalized)) return 'Leon NHS - USIS';
  return normalized;
};

const buildStatusLookupUrl = (baseUrl: string | null | undefined, submissionReferenceId: string) => {
  const resolvedBase = normalize(baseUrl) || 'https://enroll.leonnhs.edu.ph/submission-status';
  try {
    const url = new URL(resolvedBase);
    url.searchParams.set('q', submissionReferenceId);
    return url.toString();
  } catch {
    const safeBase = resolvedBase.replace(/\?+$/, '');
    const joiner = safeBase.includes('?') ? '&' : '?';
    return `${safeBase}${joiner}q=${encodeURIComponent(submissionReferenceId)}`;
  }
};

export async function sendEnrollmentConfirmationViaWebhook(input: {
  submissionId: string;
  schoolId: string;
  submissionReferenceId: string;
  learnerName: string;
  recipientEmail: string;
  lrn: string;
}) {
  const schoolId = normalize(input.schoolId);
  if (!schoolId) throw new Error('Submission has no school ID.');

  const { data, error } = await supabase
    .from('registrar_enrollment_email_settings')
    .select('*')
    .eq('school_id', schoolId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Enrollment email settings not found for school ${schoolId}.`);

  const settings = data as EnrollmentEmailSettings;
  if (!settings.is_enabled) throw new Error('Enrollment email service is disabled in Registrar Settings.');

  const webhookUrl = normalize(settings.apps_script_web_app_url);
  if (!webhookUrl) throw new Error('Apps Script Web App URL is not configured.');

  const headerImagePayload = await loadUsisEmailHeaderImagePayload();
  const statusLookupUrl = buildStatusLookupUrl(settings.status_page_base_url, input.submissionReferenceId);
  const senderName = resolveSenderDisplayName(settings.from_display_name);
  const htmlContent = buildEnrollmentConfirmationEmailHtml({
    learnerName: normalize(input.learnerName),
    lrn: normalize(input.lrn),
    submissionReferenceId: normalize(input.submissionReferenceId),
    statusLookupUrl,
    senderName,
    headerImageSrc: headerImagePayload.headerImageSrc,
  });

  // Keep top-level fields to match existing working GAS relay implementation.
  const envelope = {
    type: 'ENROLLMENT_CONFIRMATION',
    email: normalize(input.recipientEmail),
    subject: `USIS Enrollment Submission Confirmation - ${normalize(input.submissionReferenceId)}`,
    senderName,
    headerImageSrc: headerImagePayload.headerImageSrc,
    headerImageBase64: headerImagePayload.headerImageBase64,
    headerImageMimeType: headerImagePayload.headerImageMimeType,
    headerImageName: headerImagePayload.headerImageName,
    htmlContent,
    replyTo: normalize(settings.reply_to_email) || null,
    // Keep payload for compatibility/future metadata handling.
    payload: {
      submissionId: normalize(input.submissionId),
      submissionReferenceId: normalize(input.submissionReferenceId),
      learnerName: normalize(input.learnerName),
      recipientEmail: normalize(input.recipientEmail),
      lrn: normalize(input.lrn),
      statusLookupUrl,
      fromDisplayName: senderName,
      replyTo: normalize(settings.reply_to_email) || null,
      token: normalize(settings.apps_script_bearer_token) || null,
    },
  };

  // GAS relay pattern: no-cors + text/plain body.
  await fetch(webhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(envelope),
  });
}
