const DEFAULT_SENDER_NAME = 'Leon NHS - USIS';

function normalize(value) {
  return String(value ?? '').trim();
}

function escapeHtml(value) {
  return normalize(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveField(data, key, fallback) {
  if (data && Object.prototype.hasOwnProperty.call(data, key) && normalize(data[key])) {
    return normalize(data[key]);
  }
  const payload = data && data.payload && typeof data.payload === 'object' ? data.payload : {};
  if (Object.prototype.hasOwnProperty.call(payload, key) && normalize(payload[key])) {
    return normalize(payload[key]);
  }
  return normalize(fallback);
}

function buildDisplayName(learner) {
  const lastName = normalize(learner.lastName);
  const firstName = normalize(learner.firstName);
  const middleName = normalize(learner.middleName);
  const byName = [lastName, firstName, middleName].filter(Boolean).join(', ').trim();
  if (byName) return byName;
  return normalize(learner.fullName) || 'Learner';
}

function buildCredentialsHtml(data) {
  const learner = data.learner || (data.payload && data.payload.learner) || data.payload || {};
  const learnerName = escapeHtml(buildDisplayName(learner));
  const lrn = escapeHtml(learner.lrn || '-');
  const username = escapeHtml(learner.username || learner.loginUsername || learner.lrn || '-');
  const password = escapeHtml(learner.password || learner.loginPassword || '-');
  const microsoftEmail = escapeHtml(learner.microsoftEmail || learner.microsoftUpn || '-');
  const recipientEmail = escapeHtml(resolveField(data, 'email', resolveField(data, 'to', learner.email || learner.microsoftUpn || '-')));
  const sectionLabel = escapeHtml(learner.sectionLabel || resolveField(data, 'sectionLabel', 'Unassigned'));
  const schoolYearLabel = escapeHtml(learner.schoolYearLabel || resolveField(data, 'schoolYearLabel', 'Current School Year'));
  const headerImageSrc = normalize(resolveField(data, 'headerImageSrc', resolveField(data, 'headerImageUrl', '')));
  const headerImageHtml = headerImageSrc
    ? `<img src="${escapeHtml(headerImageSrc)}" alt="Leon NHS USIS Header" style="display:block;margin:0 auto;max-width:100%;width:320px;height:auto;object-fit:contain;" />`
    : `<div style="font-size:16px;font-weight:700;color:#0038A8;line-height:1.2;">Leon NHS - USIS</div>`;

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
                ${headerImageHtml}
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
}

function buildEnrollmentConfirmationHtml(data) {
  const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};
  const learnerName = escapeHtml(resolveField(data, 'learnerName', payload.learnerName || payload.lastName || payload.firstName || 'Learner'));
  const lrn = escapeHtml(resolveField(data, 'lrn', payload.lrn || '-'));
  const submissionReferenceId = escapeHtml(resolveField(data, 'submissionReferenceId', payload.submissionReferenceId || '-'));
  const sectionLabel = escapeHtml(resolveField(data, 'sectionLabel', payload.sectionLabel || payload.assignedSectionName || 'Assigned Section'));
  const recipientEmail = escapeHtml(resolveField(data, 'email', resolveField(data, 'to', payload.recipientEmail || '-')));
  const statusLookupUrl = escapeHtml(resolveField(data, 'statusLookupUrl', payload.statusLookupUrl || '#'));
  const senderName = escapeHtml(resolveField(data, 'fromDisplayName', resolveField(data, 'senderName', DEFAULT_SENDER_NAME)));

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Enrollment Confirmation</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f6fb;font-family:'Segoe UI',sans-serif;color:#10233d;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f6fb;padding:20px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5deea;border-radius:6px;overflow:hidden;">
            <tr>
              <td style="background:#0038A8;color:#ffffff;padding:16px 20px;text-align:center;">
                <div style="font-size:13px;font-weight:700;line-height:1.3;">Leon NHS - USIS</div>
                <div style="font-size:22px;font-weight:700;line-height:1.2;margin-top:4px;">Enrollment Confirmation</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">The learner has been enrolled into the assigned section.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #d9e2ef;border-radius:6px;background:#f8fbff;">
                  <tr><td style="padding:14px 14px 4px;font-size:12px;color:#415a77;">Learner Name</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${learnerName}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">LRN</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${lrn}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Section</td></tr>
                  <tr><td style="padding:0 14px 10px;font-size:16px;font-weight:700;">${sectionLabel}</td></tr>
                  <tr><td style="padding:0 14px 4px;font-size:12px;color:#415a77;">Submission Reference Number</td></tr>
                  <tr><td style="padding:0 14px 14px;font-size:16px;font-weight:700;">${submissionReferenceId}</td></tr>
                </table>
                <div style="margin-top:16px;">
                  <a href="${statusLookupUrl}" style="display:inline-block;background:#0038A8;color:#ffffff;text-decoration:none;border-radius:6px;padding:11px 14px;font-size:14px;font-weight:700;">Check Enrollment Status</a>
                </div>
                <p style="margin:12px 0 0;font-size:12px;color:#415a77;line-height:1.4;">If the button does not work, copy and open this link:<br /><a href="${statusLookupUrl}" style="color:#0038A8;word-break:break-all;">${statusLookupUrl}</a></p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#415a77;">Recipient Address: ${recipientEmail}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #d5deea;padding:12px 20px;background:#f8fbff;font-size:12px;color:#415a77;">
                ${senderName}<br />&copy; Leon NHS - USIS
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function parseIncomingData(e) {
  const raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  return JSON.parse(raw);
}

function doPost(e) {
  try {
    const data = parseIncomingData(e);
    const type = normalize(data.type);
    const isCredentialsEmail = type === 'LEARNER_CREDENTIALS';
    const isEnrollmentConfirmationEmail = type === 'ENROLLMENT_CONFIRMATION';

    if (!isCredentialsEmail && !isEnrollmentConfirmationEmail) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Unsupported payload type' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const payload = data && data.payload && typeof data.payload === 'object' ? data.payload : {};
    const recipientEmail = normalize(resolveField(data, 'email', resolveField(data, 'to', (data.learner && data.learner.email) || payload.recipientEmail || '')));
    const subject = normalize(resolveField(data, 'subject', payload.subject || ''));
    const htmlContent = normalize(resolveField(data, 'htmlContent', resolveField(data, 'html', payload.htmlContent || payload.html || '')));
    const textContent = normalize(resolveField(data, 'textContent', payload.textContent || ''));
    const headerImageSrc = normalize(resolveField(data, 'headerImageSrc', resolveField(data, 'headerImageUrl', payload.headerImageSrc || payload.headerImageUrl || '')));
    if (!recipientEmail || !subject || !htmlContent) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Missing required fields' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const replyTo = normalize(resolveField(data, 'replyTo', payload.replyTo || ''));
    const fromDisplayName = normalize(resolveField(data, 'fromDisplayName', resolveField(data, 'senderName', payload.fromDisplayName || payload.senderName || DEFAULT_SENDER_NAME)));
    let htmlBody = htmlContent;

    if (!htmlBody && isCredentialsEmail) {
      htmlBody = buildCredentialsHtml(data);
    } else if (!htmlBody && isEnrollmentConfirmationEmail) {
      htmlBody = buildEnrollmentConfirmationHtml(data);
    }

    const emailOptions = {
      htmlBody: htmlBody,
      name: fromDisplayName,
      replyTo: replyTo || undefined,
    };

    GmailApp.sendEmail(recipientEmail, subject, textContent || ' ', emailOptions);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, sent: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(error) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
