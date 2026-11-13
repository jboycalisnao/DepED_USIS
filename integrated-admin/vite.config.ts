import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  checkGoogleAdminEmailExists,
  deleteGoogleAdminUser,
  getGoogleAdminOrgUnits,
  listGoogleAdminUsers,
  provisionGoogleClubAccount,
  resetGoogleAdminUserPassword,
  updateGoogleAdminUser,
} from './lib/server/googleAdminProvisioning';
import {
  getGoogleSmtpConfigStatus,
  sendSmtpEmailNotification,
} from './lib/server/googleSmtpMailer';
import {
  buildEmailTermsAgreementPdf,
  type EmailTermsAgreementPdfInput,
} from './lib/server/emailTermsPdfGenerator';

const readJsonBody = async (req: any): Promise<Record<string, unknown>> => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
};

const sendJson = (res: any, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

export default defineConfig(({ mode }) => {
  const getEnv = () => loadEnv(mode, '..', '');

  const sccGoogleProvisionApiPlugin = {
    name: 'ia-scc-google-provision-api',
    configureServer(server: any) {
      server.middlewares.use('/api/scc-provision-google-user', async (req: any, res: any) => {
        const env = getEnv();
        if (req.method === 'GET') {
          try {
            const rawUrl = String(req.url || '');
            const parsedUrl = new URL(rawUrl, 'http://localhost');
            const checkEmail = parsedUrl.searchParams.get('checkEmail');
            if (checkEmail) {
              const result = await checkGoogleAdminEmailExists(checkEmail, env);
              sendJson(res, 200, result);
              return;
            }

            const includeUsers = parsedUrl.searchParams.get('includeUsers') === '1';
            const meta = includeUsers
              ? await listGoogleAdminUsers(env)
              : await getGoogleAdminOrgUnits(env);
            sendJson(res, 200, meta);
          } catch (err: any) {
            sendJson(res, 400, {
              error: err?.message || 'Unable to load Google Workspace directory data.',
            });
          }
          return;
        }

        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
            const result = await provisionGoogleClubAccount(
              {
                primaryEmail: String(body.primaryEmail || ''),
                password: String(body.password || ''),
                firstName: body.firstName != null ? String(body.firstName) : undefined,
                lastName: body.lastName != null ? String(body.lastName) : undefined,
                organizationAcronym: String(body.organizationAcronym || ''),
                organizationName: String(body.organizationName || ''),
                orgUnitPath: body.orgUnitPath != null ? String(body.orgUnitPath) : undefined,
                changePasswordAtNextLogin:
                  typeof body.changePasswordAtNextLogin === 'boolean'
                    ? body.changePasswordAtNextLogin
                    : undefined,
                updateIfExists: Boolean(body.updateIfExists),
              },
              env,
            );
            sendJson(res, 200, result);
          } catch (err: any) {
            sendJson(res, 400, {
              error: err?.message || 'Unable to provision Google Workspace account.',
            });
          }
          return;
        }

        if (req.method === 'PATCH') {
          try {
            const body = await readJsonBody(req);
            if (body.mode === 'reset_password') {
              const result = await resetGoogleAdminUserPassword(
                {
                  primaryEmail: String(body.primaryEmail || ''),
                  password: String(body.password || ''),
                  changePasswordAtNextLogin:
                    typeof body.changePasswordAtNextLogin === 'boolean'
                      ? body.changePasswordAtNextLogin
                      : true,
                },
                env,
              );
              sendJson(res, 200, result);
              return;
            }

            const result = await updateGoogleAdminUser(
              {
                primaryEmail: String(body.primaryEmail || ''),
                newPrimaryEmail:
                  body.newPrimaryEmail != null ? String(body.newPrimaryEmail) : undefined,
                firstName: body.firstName != null ? String(body.firstName) : undefined,
                lastName: body.lastName != null ? String(body.lastName) : undefined,
                orgUnitPath: body.orgUnitPath != null ? String(body.orgUnitPath) : undefined,
                suspended: typeof body.suspended === 'boolean' ? body.suspended : undefined,
              },
              env,
            );
            sendJson(res, 200, result);
          } catch (err: any) {
            sendJson(res, 400, {
              error: err?.message || 'Unable to update Google Workspace account.',
            });
          }
          return;
        }

        if (req.method === 'DELETE') {
          try {
            const body = await readJsonBody(req);
            const result = await deleteGoogleAdminUser(
              {
                primaryEmail: String(body.primaryEmail || ''),
              },
              env,
            );
            sendJson(res, 200, result);
          } catch (err: any) {
            sendJson(res, 400, {
              error: err?.message || 'Unable to delete Google Workspace account.',
            });
          }
          return;
        }

        res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
        sendJson(res, 405, { error: 'Method not allowed.' });
      });

      server.middlewares.use('/api/scc-send-notification', async (req: any, res: any) => {
        const env = getEnv();
        if (req.method === 'GET') {
          try {
            sendJson(res, 200, getGoogleSmtpConfigStatus(env));
          } catch (err: any) {
            sendJson(res, 500, {
              error: err?.message || 'Unable to inspect email notification configuration.',
            });
          }
          return;
        }

        if (req.method === 'POST') {
          try {
            const body = await readJsonBody(req);
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

            const result = await sendSmtpEmailNotification(
              {
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
                          typeof (body.relayTest as { requireAuth?: unknown }).requireAuth ===
                          'boolean'
                            ? Boolean((body.relayTest as { requireAuth?: unknown }).requireAuth)
                            : undefined,
                      }
                    : undefined,
              },
              env,
            );
            sendJson(res, 200, result);
          } catch (err: any) {
            sendJson(res, 400, {
              error: err?.message || 'Unable to send email notification.',
            });
          }
          return;
        }

        res.setHeader('Allow', 'GET, POST');
        sendJson(res, 405, { error: 'Method not allowed.' });
      });
    },
  };

  return {
    envDir: '..',
    plugins: [react(), sccGoogleProvisionApiPlugin],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../coordinator'),
      },
    },
    server: {
      port: 3024,
      host: '0.0.0.0',
    },
  };
});
