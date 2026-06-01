import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_STATUS_URL = 'https://enroll.leonnhs.edu.ph/submission-status';

const normalize = (value: unknown) => String(value ?? '').trim();
const toEmail = (value: unknown) => normalize(value).toLowerCase();
const isLikelyEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const json = (res: VercelResponse, statusCode: number, payload: unknown) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service-role credentials are missing.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

const escapeHtml = (value: unknown) =>
  normalize(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildStatusLookupUrl = (baseUrl: string | null | undefined, submissionReferenceId: string) => {
  const resolvedBase = normalize(baseUrl) || DEFAULT_STATUS_URL;
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

const buildEnrollmentEmailHtml = (input: {
  learnerName: string;
  lrn: string;
  submissionReferenceId: string;
  statusLookupUrl: string;
  fromDisplayName: string;
}) => {
  const learnerName = escapeHtml(input.learnerName || '--');
  const lrn = escapeHtml(input.lrn || '--');
  const submissionReferenceId = escapeHtml(input.submissionReferenceId || '--');
  const statusLookupUrl = escapeHtml(input.statusLookupUrl || '#');
  const fromDisplayName = escapeHtml(input.fromDisplayName || 'Leon NHS - USIS Registrar');
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f6fb;font-family:'Segoe UI',sans-serif;color:#10233d;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:20px 12px;"><tr><td align="center"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5deea;border-radius:12px;overflow:hidden;"><tr><td style="background:#0f4c81;color:#ffffff;padding:16px 20px;"><div style="font-size:13px;font-weight:700;line-height:1.3;">Leon NHS - USIS</div><div style="font-size:22px;font-weight:700;line-height:1.2;margin-top:4px;">Enrollment Submission Confirmation</div></td></tr><tr><td style="padding:18px 20px;"><p style="margin:0 0 12px;font-size:14px;line-height:1.5;">Your online enrollment submission has been received.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e2ef;border-radius:12px;background:#f8fbff;"><tr><td style="padding:14px 14px 4px;font-size:12px;color:#415a77;">Learner Name</td></tr><tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${learnerName}</td></tr><tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">LRN</td></tr><tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${lrn}</td></tr><tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Submission Reference Number</td></tr><tr><td style="padding:0 14px 14px;font-size:16px;font-weight:700;">${submissionReferenceId}</td></tr></table><div style="margin-top:16px;"><a href="${statusLookupUrl}" style="display:inline-block;background:#0f4c81;color:#ffffff;text-decoration:none;border-radius:10px;padding:11px 14px;font-size:14px;font-weight:700;">Check Submission Status</a></div><p style="margin:12px 0 0;font-size:12px;color:#415a77;line-height:1.4;">If the button does not work, copy and open this link:<br /><a href="${statusLookupUrl}" style="color:#0f4c81;word-break:break-all;">${statusLookupUrl}</a></p></td></tr><tr><td style="border-top:1px solid #d5deea;padding:12px 20px;background:#f8fbff;font-size:12px;color:#415a77;">${fromDisplayName}<br />&copy; Leon NHS - USIS</td></tr></table></td></tr></table></body></html>`;
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
    const recipientEmail = toEmail(payload.email);
    if (!isLikelyEmail(recipientEmail)) return json(res, 200, { queued: false, reason: 'missing_or_invalid_email' });

    const schoolId = normalize(submission.school_id || payload.schoolId || '');
    if (!schoolId) return json(res, 200, { queued: false, reason: 'missing_school_id' });

    const { data: settings, error: settingsError } = await supabase
      .from('registrar_enrollment_email_settings')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();
    if (settingsError) throw settingsError;
    if (!settings || !(settings as any).is_enabled) return json(res, 200, { queued: false, reason: 'email_service_disabled' });

    const submissionReferenceId = normalize((submission as any).submission_reference_id);
    if (!submissionReferenceId) return json(res, 200, { queued: false, reason: 'missing_submission_reference' });

    const lrn = normalize(submission.lrn || payload.lrn || '');
    const learnerName = [normalize(submission.last_name || payload.lastName), normalize(submission.first_name || payload.firstName), normalize(submission.middle_name || payload.middleName)].filter(Boolean).join(', ');
    const statusLookupUrl = buildStatusLookupUrl((settings as any).status_page_base_url, submissionReferenceId);

    const queueRow = {
      submission_id: submission.id,
      school_id: schoolId,
      recipient_email: recipientEmail,
      recipient_name: learnerName || null,
      lrn: lrn || null,
      submission_reference_id: submissionReferenceId,
      status_lookup_url: statusLookupUrl,
      email_subject: `USIS Enrollment Submission Confirmation - ${submissionReferenceId}`,
      email_html: buildEnrollmentEmailHtml({
        learnerName,
        lrn,
        submissionReferenceId,
        statusLookupUrl,
        fromDisplayName: normalize((settings as any).from_display_name) || 'Leon NHS - USIS Registrar',
      }),
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
      const endpoint = normalize((settings as any).apps_script_web_app_url);
      const bearerToken = normalize((settings as any).apps_script_bearer_token);
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
            subject: `USIS Enrollment Submission Confirmation - ${submissionReferenceId}`,
            htmlContent: queueRow.email_html,
            html: queueRow.email_html,
            senderName: normalize((settings as any).from_display_name) || 'Leon NHS - USIS Registrar',
            fromDisplayName: normalize((settings as any).from_display_name) || 'Leon NHS - USIS Registrar',
            replyTo: normalize((settings as any).reply_to_email) || undefined,
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

