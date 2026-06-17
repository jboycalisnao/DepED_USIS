import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, normalize, type RegistrarEnrollmentEmailSettings } from './enrollment-email-shared.js';

type Json = Record<string, any>;

const json = (res: VercelResponse, statusCode: number, payload: Json) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const readBody = (req: VercelRequest): Json => {
  if (req.body && typeof req.body === 'object') return req.body as Json;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      return json(res, 405, { error: 'Method not allowed' });
    }

    const body = readBody(req);
    const schoolId = normalize(body.schoolId);
    const webhookUrl = normalize(body.webhookUrl);
    const recipientEmail = normalize(body.email);
    const subject = normalize(body.subject);
    const htmlContent = normalize(body.htmlContent);

    if (!schoolId) {
      return json(res, 400, { error: 'schoolId is required.' });
    }
    if (!recipientEmail || !subject || !htmlContent) {
      return json(res, 400, { error: 'email, subject, and htmlContent are required.' });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('registrar_enrollment_email_settings')
      .select('*')
      .eq('school_id', schoolId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return json(res, 404, { error: `Email settings not found for school ${schoolId}.` });
    }

    const settings = data as RegistrarEnrollmentEmailSettings;
    if (!settings.is_enabled) {
      return json(res, 403, { error: 'Enrollment email service is disabled in Registrar Settings.' });
    }

    const resolvedWebhookUrl = webhookUrl || normalize(settings.apps_script_web_app_url);
    if (!resolvedWebhookUrl) {
      return json(res, 400, { error: 'Apps Script Web App URL is not configured in Registrar Settings.' });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const bearerToken = normalize(settings.apps_script_bearer_token);
    if (bearerToken) {
      headers.Authorization = `Bearer ${bearerToken}`;
    }

    const envelope = {
      type: 'LEARNER_CREDENTIALS',
      email: recipientEmail,
      to: recipientEmail,
      subject,
      htmlContent,
      html: htmlContent,
      textContent: normalize(body.textContent) || undefined,
      senderName: normalize(body.senderName) || normalize(settings.from_display_name) || 'DepED USIS Registrar',
      fromDisplayName: normalize(body.fromDisplayName) || normalize(settings.from_display_name) || 'DepED USIS Registrar',
      replyTo: normalize(body.replyTo) || normalize(settings.reply_to_email) || null,
      statusLookupUrl: normalize(body.statusLookupUrl) || undefined,
      headerImageSrc: normalize(body.headerImageSrc) || undefined,
      learner: body.learner || {},
      payload: body.payload || body.learner || {},
    };

    const forwardResponse = await fetch(resolvedWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(envelope),
    });

    const forwardText = await forwardResponse.text().catch(() => '');
    let forwardJson: any = null;
    try {
      forwardJson = forwardText ? JSON.parse(forwardText) : null;
    } catch {
      forwardJson = null;
    }

    if (!forwardResponse.ok || forwardJson?.ok === false) {
      return json(res, 502, {
        error: forwardJson?.error || 'Apps Script webhook returned an error.',
        status: forwardResponse.status,
        details: forwardJson || forwardText,
      });
    }

    return json(res, 200, {
      sent: true,
      delivered: true,
      message: String(forwardJson?.sent ? 'Learner credentials email sent via Apps Script.' : 'Learner credentials email forwarded to Apps Script.'),
      appsScript: forwardJson || null,
    });
  } catch (error: any) {
    return json(res, 500, { error: 'Unable to forward learner credentials email.', details: error?.message || String(error) });
  }
}
