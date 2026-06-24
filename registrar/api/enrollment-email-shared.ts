import { createClient } from '@supabase/supabase-js';

export type RegistrarEnrollmentEmailSettings = {
  school_id: string;
  is_enabled: boolean;
  apps_script_web_app_url: string | null;
  apps_script_bearer_token: string | null;
  status_page_base_url: string;
  from_display_name: string;
  reply_to_email: string | null;
};

const DEFAULT_STATUS_URL = 'https://enroll.leonnhs.edu.ph/submission-status';

export const normalize = (value: unknown) => String(value ?? '').trim();

export const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase service-role credentials are missing.');
  }
  return createClient(supabaseUrl, serviceRoleKey);
};

export const buildStatusLookupUrl = (baseUrl: string | null | undefined, submissionReferenceId: string) => {
  const fallback = DEFAULT_STATUS_URL;
  const resolvedBase = normalize(baseUrl) || fallback;
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

export const escapeHtml = (value: unknown) =>
  normalize(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const buildEnrollmentEmailHtml = (input: {
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
  const fromDisplayName = escapeHtml(input.fromDisplayName || 'Leon NHS - USIS');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Enrollment Submission Confirmation</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:'Segoe UI',sans-serif;color:#10233d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:20px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5deea;border-radius:6px;overflow:hidden;">
            <tr>
              <td style="background:#0038A8;color:#ffffff;padding:16px 20px;">
                <div style="font-size:13px;font-weight:700;line-height:1.3;">Leon NHS - USIS</div>
                <div style="font-size:22px;font-weight:700;line-height:1.2;margin-top:4px;">Enrollment Submission Confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">Your online enrollment submission has been received.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e2ef;border-radius:6px;background:#f8fbff;">
                  <tr><td style="padding:14px 14px 4px;font-size:12px;color:#415a77;">Learner Name</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${learnerName}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">LRN</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${lrn}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Submission Reference Number</td></tr>
                  <tr><td style="padding:0 14px 14px;font-size:16px;font-weight:700;">${submissionReferenceId}</td></tr>
                </table>
                <div style="margin-top:16px;">
                  <a href="${statusLookupUrl}" style="display:inline-block;background:#0038A8;color:#ffffff;text-decoration:none;border-radius:6px;padding:11px 14px;font-size:14px;font-weight:700;">Check Submission Status</a>
                </div>
                <p style="margin:12px 0 0;font-size:12px;color:#415a77;line-height:1.4;">If the button does not work, copy and open this link:<br /><a href="${statusLookupUrl}" style="color:#0038A8;word-break:break-all;">${statusLookupUrl}</a></p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #d5deea;padding:12px 20px;background:#f8fbff;font-size:12px;color:#415a77;">
                ${fromDisplayName}<br />&copy; Leon NHS - USIS
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

