import {
  getGoogleSmtpConfigStatus,
  sendSmtpEmailNotification,
} from '../lib/server/googleSmtpMailer';
import {
  buildEmailTermsAgreementPdf,
  type EmailTermsAgreementPdfInput,
} from '../lib/server/emailTermsPdfGenerator';

type ApiRequest = {
  method?: string;
  url?: string;
  body?: unknown;
};

type ApiResponse = {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

const sendJson = (res: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const parseBody = (raw: unknown): Record<string, unknown> => {
  if (typeof raw === 'string') {
    return JSON.parse(raw || '{}') as Record<string, unknown>;
  }
  return (raw || {}) as Record<string, unknown>;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    try {
      return sendJson(res, 200, getGoogleSmtpConfigStatus());
    } catch (err: any) {
      return sendJson(res, 500, {
        error: err?.message || 'Unable to inspect email notification configuration.',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = parseBody(req.body);
      const recipientsRaw = Array.isArray(body.recipients)
        ? body.recipients
        : Array.isArray(body.to)
          ? body.to
          : typeof body.to === 'string'
            ? [body.to]
            : [];

      const to = recipientsRaw.map((entry) =>
        typeof entry === 'string'
          ? entry
          : String((entry as { email?: unknown })?.email || ''),
      );

      const cc = Array.isArray(body.cc)
        ? body.cc.map(String)
        : typeof body.cc === 'string'
          ? [body.cc]
          : [];

      const attachments =
        body.termsAgreement && typeof body.termsAgreement === 'object'
          ? (() => {
              const ta = body.termsAgreement as EmailTermsAgreementPdfInput;
              const pdf = buildEmailTermsAgreementPdf({
                trackingNumber: ta.trackingNumber != null ? String(ta.trackingNumber) : undefined,
                organizationName: String(ta.organizationName || ''),
                organizationAcronym: ta.organizationAcronym != null ? String(ta.organizationAcronym) : undefined,
                emailAddress: String(ta.emailAddress || ''),
                requesterName: String(ta.requesterName || ''),
                requesterPosition: ta.requesterPosition != null ? String(ta.requesterPosition) : undefined,
                adviserName: ta.adviserName != null ? String(ta.adviserName) : undefined,
                adviserEndorsed: typeof ta.adviserEndorsed === 'boolean' ? ta.adviserEndorsed : undefined,
                approvedBy: ta.approvedBy != null ? String(ta.approvedBy) : undefined,
                statusLabel: ta.statusLabel != null ? String(ta.statusLabel) : undefined,
                issuedDate: ta.issuedDate != null ? String(ta.issuedDate) : undefined,
              });
              return [
                {
                  filename: pdf.filename,
                  contentType: 'application/pdf',
                  content: pdf.buffer,
                },
              ];
            })()
          : undefined;

      const result = await sendSmtpEmailNotification({
        to,
        cc,
        replyTo: body.replyTo != null ? String(body.replyTo) : undefined,
        subject: String(body.subject || ''),
        text: String(body.text || body.message || ''),
        html: body.html != null ? String(body.html) : undefined,
        attachments,
        relayTest:
          body.relayTest && typeof body.relayTest === 'object'
            ? {
                host:
                  (body.relayTest as { host?: unknown }).host != null
                    ? String((body.relayTest as { host?: unknown }).host)
                    : undefined,
                port:
                  (body.relayTest as { port?: unknown }).port != null
                    ? Number((body.relayTest as { port?: unknown }).port)
                    : undefined,
                requireAuth:
                  typeof (body.relayTest as { requireAuth?: unknown }).requireAuth === 'boolean'
                    ? Boolean((body.relayTest as { requireAuth?: unknown }).requireAuth)
                    : undefined,
              }
            : undefined,
      });

      return sendJson(res, 200, result);
    } catch (err: any) {
      return sendJson(res, 400, {
        error: err?.message || 'Unable to send email notification.',
      });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { error: 'Method not allowed.' });
}
