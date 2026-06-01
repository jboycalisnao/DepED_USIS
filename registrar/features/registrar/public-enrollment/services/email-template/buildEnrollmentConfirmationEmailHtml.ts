import { emailFontFamily, enrollmentEmailStyles as s } from './enrollmentEmailStyles';

type BuildEnrollmentConfirmationEmailHtmlInput = {
  learnerName: string;
  lrn: string;
  submissionReferenceId: string;
  statusLookupUrl: string;
  senderName: string;
};

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildEnrollmentConfirmationEmailHtml(input: BuildEnrollmentConfirmationEmailHtmlInput) {
  const learnerName = escapeHtml(input.learnerName || '--');
  const lrn = escapeHtml(input.lrn || '--');
  const submissionReferenceId = escapeHtml(input.submissionReferenceId || '--');
  const statusLookupUrl = escapeHtml(input.statusLookupUrl || '#');
  const senderName = escapeHtml(input.senderName || 'Leon NHS - USIS Registrar');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Enrollment Submission Confirmation</title>
  </head>
  <body style="margin:0;padding:0;background:${s.pageBg};font-family:${emailFontFamily};color:${s.text};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${s.pageBg};padding:16px 10px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:640px;width:100%;background:${s.cardBg};border:1px solid ${s.border};border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${s.headerBg};padding:14px 18px;">
                <div style="font-size:13px;line-height:1.2;font-weight:700;color:${s.heading};">Leon NHS - USIS</div>
                <div style="font-size:24px;line-height:1.2;font-weight:700;color:${s.heading};margin-top:5px;">Enrollment Submission Confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 18px;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.45;color:${s.text};">
                  Your online enrollment submission has been received.
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid ${s.border};background:${s.surface};border-radius:12px;overflow:hidden;">
                  <tr><td style="padding:12px 14px 4px;font-size:13px;line-height:1.2;color:${s.muted};">Learner Name</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;line-height:1.35;font-weight:700;color:${s.text};">${learnerName}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:13px;line-height:1.2;color:${s.muted};">LRN</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;line-height:1.35;font-weight:700;color:${s.text};">${lrn}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:13px;line-height:1.2;color:${s.muted};">Submission Reference Number</td></tr>
                  <tr><td style="padding:0 14px 14px;font-size:16px;line-height:1.35;font-weight:700;color:${s.text};">${submissionReferenceId}</td></tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:14px;">
                  <tr>
                    <td style="background:${s.buttonBg};border-radius:10px;">
                      <a href="${statusLookupUrl}" style="display:inline-block;padding:10px 14px;font-size:16px;line-height:1.2;font-weight:700;text-decoration:none;color:${s.buttonText};">
                        Check Submission Status
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin:12px 0 0;font-size:13px;line-height:1.4;color:${s.muted};">
                  If the button does not work, open this link:<br />
                  <a href="${statusLookupUrl}" style="color:${s.headerBg};word-break:break-all;text-decoration:underline;">${statusLookupUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:${s.surface};border-top:1px solid ${s.border};padding:10px 18px;">
                <p style="margin:0;font-size:13px;line-height:1.2;color:${s.muted};">${senderName}</p><p style="margin:6px 0 0;font-size:12px;line-height:1.2;color:${s.muted};">&copy; Leon NHS - USIS</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

