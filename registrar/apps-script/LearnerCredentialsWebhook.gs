const DEFAULT_SENDER_NAME = 'DepED USIS Registrar';

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

function buildDisplayName(learner) {
  const lastName = normalize(learner.lastName);
  const firstName = normalize(learner.firstName);
  const middleName = normalize(learner.middleName);
  const byName = [lastName, firstName, middleName].filter(Boolean).join(', ').trim();
  if (byName) return byName;
  return normalize(learner.fullName) || 'Learner';
}

function buildCredentialsHtml(data) {
  const learner = data.learner || {};
  const learnerName = escapeHtml(buildDisplayName(learner));
  const lrn = escapeHtml(learner.lrn || '-');
  const username = escapeHtml(learner.username || learner.loginUsername || learner.lrn || '-');
  const password = escapeHtml(learner.password || learner.loginPassword || '-');
  const microsoftEmail = escapeHtml(learner.microsoftEmail || learner.microsoftUpn || '-');
  const recipientEmail = escapeHtml(data.email || data.to || learner.email || learner.microsoftUpn || '-');
  const sectionLabel = escapeHtml(learner.sectionLabel || data.sectionLabel || 'Unassigned');
  const schoolYearLabel = escapeHtml(learner.schoolYearLabel || data.schoolYearLabel || 'Current School Year');
  const fromDisplayName = escapeHtml(data.fromDisplayName || data.senderName || DEFAULT_SENDER_NAME);
  const headerImageSrc = normalize(data.headerImageSrc || data.headerImageUrl || '');
  const headerImageHtml = headerImageSrc
    ? `<img src="cid:usisHeader" alt="Leon NHS USIS Header" style="display:block;margin:0 auto;max-width:100%;width:320px;height:auto;object-fit:contain;" />`
    : `<div style="font-size:16px;font-weight:700;color:#0f4c81;line-height:1.2;">Leon NHS - USIS</div>`;

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
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d5deea;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#ffffff;padding:16px 20px 12px;border-bottom:1px solid #d5deea;text-align:center;">
                ${headerImageHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#0038A8;color:#ffffff;padding:16px 20px;text-align:center;">
                <div style="font-size:13px;font-weight:700;line-height:1.3;">Leon NHS - USIS</div>
                <div style="font-size:22px;font-weight:700;line-height:1.2;margin-top:4px;">Learner Account Credentials</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.5;">Please keep this message confidential. It contains the learner's portal access details.</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #9fb6d9;border-radius:12px;background:#f8fbff;">
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
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#415a77;">If the learner cannot sign in, verify the stored username and password before resending.</p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#415a77;">Recipient Address: ${recipientEmail}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #9fb6d9;padding:12px 20px;background:#f8fbff;font-size:12px;color:#415a77;">
                ${fromDisplayName}<br />&copy; Leon NHS - USIS
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
    if (normalize(data.type) !== 'LEARNER_CREDENTIALS') {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Unsupported payload type' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const recipientEmail = normalize(data.email || data.to || (data.learner && data.learner.email) || '');
    const subject = normalize(data.subject || '');
    const htmlContent = normalize(data.htmlContent || data.html || '');
    const textContent = normalize(data.textContent || '');
    const headerImageSrc = normalize(data.headerImageSrc || data.headerImageUrl || '');

    if (!recipientEmail || !subject || !htmlContent) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'Missing required fields' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const replyTo = normalize(data.replyTo || '');
    const fromDisplayName = normalize(data.fromDisplayName || data.senderName || DEFAULT_SENDER_NAME);
    const inlineImages = {};
    let htmlBody = htmlContent || buildCredentialsHtml(data);

    if (headerImageSrc) {
      try {
        inlineImages.usisHeader = UrlFetchApp.fetch(headerImageSrc).getBlob().setName('usis-header-image');
        htmlBody = htmlBody.replace(new RegExp(headerImageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 'cid:usisHeader');
      } catch (fetchError) {
        // Fall back to the HTML image URL if the remote asset is temporarily unavailable.
      }
    }

    const emailOptions = {
      htmlBody: htmlBody,
      name: fromDisplayName,
      replyTo: replyTo || undefined,
    };

    if (inlineImages.usisHeader) {
      emailOptions.inlineImages = inlineImages;
    }

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
