import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  buildEnrollmentEmailHtml,
  buildStatusLookupUrl,
  getSupabaseAdmin,
  normalize,
  type RegistrarEnrollmentEmailSettings,
} from './enrollment-email-shared.js';

const json = (res: VercelResponse, statusCode: number, payload: unknown) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const toEmail = (value: unknown) => normalize(value).toLowerCase();
const isLikelyEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const resolveSenderDisplayName = (value: unknown) => {
  const normalized = normalize(value);
  if (!normalized) return 'Leon NHS - USIS';
  if (/^deped\s+usis\s+registrar$/i.test(normalized)) return 'Leon NHS - USIS';
  return normalized;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
    const submissionId = normalize((req.body as any)?.submissionId);
    if (!submissionId) return json(res, 400, { error: 'submissionId is required.' });

    const supabase = getSupabaseAdmin();
    const { data: submission, error: submissionError } = await supabase
      .from('registrar_public_enrollment_submissions')
      .select('id,school_id,lrn,submission_reference_id,last_name,first_name,middle_name,payload')
      .eq('id', submissionId)
      .maybeSingle();
    if (submissionError) throw submissionError;
    if (!submission) return json(res, 404, { error: 'Submission not found.' });

    const payload = submission.payload && typeof submission.payload === 'object' ? (submission.payload as Record<string, any>) : {};
    const submissionLrn = normalize(submission.lrn || payload.lrn || '');
    let recipientEmail = toEmail(payload.email || (submission as any).email);
    let learnerFallback: Record<string, any> | null = null;

    if (!isLikelyEmail(recipientEmail) && submissionLrn) {
      const { data: learnerRow, error: learnerError } = await supabase
        .from('registrar_learners')
        .select('email,microsoft_upn,first_name,last_name,middle_name')
        .eq('lrn', submissionLrn)
        .maybeSingle();
      if (learnerError) throw learnerError;
      learnerFallback = learnerRow as Record<string, any> | null;
      recipientEmail = toEmail(learnerFallback?.email || learnerFallback?.microsoft_upn || '');
    }

    if (!isLikelyEmail(recipientEmail)) return json(res, 200, { queued: false, reason: 'missing_or_invalid_email' });

    const schoolId = normalize(submission.school_id || payload.schoolId || '');
    if (!schoolId) return json(res, 200, { queued: false, reason: 'missing_school_id' });

    const { data: settings, error: settingsError } = await supabase
      .from('registrar_enrollment_email_settings')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings || !(settings as RegistrarEnrollmentEmailSettings).is_enabled) {
      return json(res, 200, { queued: false, reason: 'email_service_disabled' });
    }

    const submissionReferenceId = normalize((submission as any).submission_reference_id);
    if (!submissionReferenceId) return json(res, 200, { queued: false, reason: 'missing_submission_reference' });

    const lrn = submissionLrn;
    const learnerName = [normalize(submission.last_name || payload.lastName || learnerFallback?.last_name), normalize(submission.first_name || payload.firstName || learnerFallback?.first_name), normalize(submission.middle_name || payload.middleName || learnerFallback?.middle_name)]
      .filter(Boolean)
      .join(', ');

    const statusLookupUrl = buildStatusLookupUrl((settings as RegistrarEnrollmentEmailSettings).status_page_base_url, submissionReferenceId);
    const subject = `USIS Enrollment Submission Confirmation - ${submissionReferenceId}`;
    const html = buildEnrollmentEmailHtml({
      learnerName,
      lrn,
      submissionReferenceId,
      statusLookupUrl,
      fromDisplayName: resolveSenderDisplayName((settings as RegistrarEnrollmentEmailSettings).from_display_name),
    });

    const queueRow = {
      submission_id: submission.id,
      school_id: schoolId,
      recipient_email: recipientEmail,
      recipient_name: learnerName || null,
      lrn: lrn || null,
      submission_reference_id: submissionReferenceId,
      status_lookup_url: statusLookupUrl,
      email_subject: subject,
      email_html: html,
      send_status: 'pending',
      attempts: 0,
      last_error: null,
      sent_at: null,
    };

    const { error: queueError } = await supabase
      .from('registrar_enrollment_email_queue')
      .upsert(queueRow, { onConflict: 'submission_id' });
    if (queueError) throw queueError;

    // Immediate send attempt (best effort). If this fails, row remains queued for retry/cron.
    try {
      const endpoint = normalize((settings as RegistrarEnrollmentEmailSettings).apps_script_web_app_url);
      const bearerToken = normalize((settings as RegistrarEnrollmentEmailSettings).apps_script_bearer_token);
      if (endpoint) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
        const dispatchResponse = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            type: 'ENROLLMENT_CONFIRMATION',
            email: recipientEmail,
            to: recipientEmail,
            subject,
            htmlContent: html,
            html,
            senderName: resolveSenderDisplayName((settings as RegistrarEnrollmentEmailSettings).from_display_name),
            fromDisplayName: resolveSenderDisplayName((settings as RegistrarEnrollmentEmailSettings).from_display_name),
            replyTo: normalize((settings as RegistrarEnrollmentEmailSettings).reply_to_email) || undefined,
          }),
        });
        if (dispatchResponse.ok) {
          await supabase
            .from('registrar_enrollment_email_queue')
            .update({
              send_status: 'sent',
              attempts: 1,
              last_error: null,
              sent_at: new Date().toISOString(),
            })
            .eq('submission_id', submission.id);
          return json(res, 200, { queued: true, sent_immediately: true });
        }

        const dispatchError = `Apps Script send failed (${dispatchResponse.status}): ${await dispatchResponse.text()}`;
        await supabase
          .from('registrar_enrollment_email_queue')
          .update({
            send_status: 'pending',
            attempts: 1,
            last_error: dispatchError,
          })
          .eq('submission_id', submission.id);
      }
    } catch (dispatchError: any) {
      await supabase
        .from('registrar_enrollment_email_queue')
        .update({
          send_status: 'pending',
          attempts: 1,
          last_error: normalize(dispatchError?.message || dispatchError) || 'Immediate dispatch failed.',
        })
        .eq('submission_id', submission.id);
    }

    return json(res, 200, { queued: true, sent_immediately: false });
  } catch (error: any) {
    return json(res, 500, { error: 'Unable to queue enrollment confirmation email.', details: error?.message || String(error) });
  }
}
