import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '..', '');

    const microsoftUserApiPlugin = {
      name: 'registrar-microsoft-user-api',
      configureServer(server: any) {
        server.middlewares.use('/api/microsoft-users', async (req: any, res: any) => {
          try {
            const clientId = process.env.AZURE_CLIENT_ID || env.AZURE_CLIENT_ID || '';
            const tenantId = process.env.AZURE_TENANT_ID || env.AZURE_TENANT_ID || '';
            const clientSecret = process.env.AZURE_CLIENT_SECRET || env.AZURE_CLIENT_SECRET || '';
            const licenseSkuId = process.env.M365_LICENSE_SKU_ID || env.M365_LICENSE_SKU_ID || '';

            const missingAzureVars: string[] = [];
            if (!tenantId) missingAzureVars.push('AZURE_TENANT_ID');
            if (!clientId) missingAzureVars.push('AZURE_CLIENT_ID');
            if (!clientSecret) missingAzureVars.push('AZURE_CLIENT_SECRET');
            if (!licenseSkuId) missingAzureVars.push('M365_LICENSE_SKU_ID');

            if (missingAzureVars.length > 0) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Azure/M365 environment variables are not configured.', missing: missingAzureVars }));
              return;
            }

            const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
            const supabaseKey =
              process.env.SUPABASE_SERVICE_ROLE_KEY ||
              env.SUPABASE_SERVICE_ROLE_KEY ||
              process.env.SUPABASE_ANON_KEY ||
              process.env.VITE_SUPABASE_ANON_KEY ||
              env.SUPABASE_ANON_KEY ||
              env.VITE_SUPABASE_ANON_KEY ||
              '';

            const canUseSupabase = Boolean(supabaseUrl && supabaseKey);
            const supabaseAdmin = canUseSupabase ? createClient(supabaseUrl, supabaseKey) : null;

            const getAccessToken = async () => {
              const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
              const tokenResponse = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  client_id: clientId,
                  client_secret: clientSecret,
                  scope: 'https://graph.microsoft.com/.default',
                  grant_type: 'client_credentials',
                }),
              });
              if (!tokenResponse.ok) throw new Error(`Token request failed: ${await tokenResponse.text()}`);
              const tokenJson = await tokenResponse.json();
              const accessToken = String(tokenJson.access_token || '');
              if (!accessToken) throw new Error('Token response missing access token');
              return accessToken;
            };

            if (req.method === 'GET') {
              const requestUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
              const learnerId = String(requestUrl.searchParams.get('learnerId') || '').trim();
              if (!learnerId) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'learnerId is required.' }));
                return;
              }

              if (!supabaseAdmin) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Supabase service is required for Microsoft status sync.' }));
                return;
              }

              const learnerResult = await supabaseAdmin
                .from('registrar_learners')
                .select('id,microsoft_user_id,microsoft_upn,microsoft_mail_nickname,microsoft_created_at')
                .eq('id', learnerId)
                .maybeSingle();

              if (learnerResult.error) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to read learner record', details: learnerResult.error.message }));
                return;
              }
              if (!learnerResult.data) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Learner not found' }));
                return;
              }

              const localUserId = String(learnerResult.data.microsoft_user_id || '').trim();
              const localUpn = String(learnerResult.data.microsoft_upn || '').trim();
              const localNickname = String(learnerResult.data.microsoft_mail_nickname || '').trim();
              const nowIso = new Date().toISOString();

              if (!localUserId && !localUpn) {
                await supabaseAdmin
                  .from('registrar_learners')
                  .update({ microsoft_account_status: 'Not Linked', microsoft_last_synced_at: nowIso })
                  .eq('id', learnerId);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  exists: false,
                  learnerId,
                  microsoftAccountStatus: 'Not Linked',
                  microsoftLastSyncedAt: nowIso,
                  microsoftMailNickname: localNickname,
                  microsoftUserId: '',
                  userPrincipalName: '',
                }));
                return;
              }

              const accessToken = await getAccessToken();
              const graphKey = localUserId || localUpn;
              const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphKey)}?$select=id,userPrincipalName`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });

              if (graphResponse.status === 404) {
                await supabaseAdmin
                  .from('registrar_learners')
                  .update({
                    microsoft_user_id: null,
                    microsoft_upn: null,
                    microsoft_account_status: 'Deleted',
                    microsoft_last_synced_at: nowIso,
                  })
                  .eq('id', learnerId);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  exists: false,
                  learnerId,
                  microsoftAccountStatus: 'Deleted',
                  microsoftCreatedAt: learnerResult.data.microsoft_created_at || null,
                  microsoftLastSyncedAt: nowIso,
                  microsoftMailNickname: localNickname,
                  microsoftUserId: '',
                  userPrincipalName: '',
                }));
                return;
              }

              if (!graphResponse.ok) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Graph status check failed', details: await graphResponse.text() }));
                return;
              }

              const graphJson = await graphResponse.json();
              const graphUserId = String(graphJson?.id || localUserId || '').trim();
              const graphUpn = String(graphJson?.userPrincipalName || localUpn || '').trim();

              await supabaseAdmin
                .from('registrar_learners')
                .update({
                  microsoft_user_id: graphUserId || null,
                  microsoft_upn: graphUpn || null,
                  microsoft_account_status: 'Active',
                  microsoft_last_synced_at: nowIso,
                })
                .eq('id', learnerId);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                exists: true,
                learnerId,
                microsoftAccountStatus: 'Active',
                microsoftCreatedAt: learnerResult.data.microsoft_created_at || null,
                microsoftLastSyncedAt: nowIso,
                microsoftMailNickname: localNickname,
                microsoftUserId: graphUserId,
                userPrincipalName: graphUpn,
              }));
              return;
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            const body = await new Promise<string>((resolve, reject) => {
              let raw = '';
              req.on('data', (chunk: Buffer) => {
                raw += chunk.toString('utf8');
              });
              req.on('end', () => resolve(raw));
              req.on('error', reject);
            });

            const parsed = JSON.parse(body || '{}');
            const action = String(parsed.action || '').trim().toLowerCase();
            const learnerId = String(parsed.learnerId || '').trim();
            const displayName = String(parsed.displayName || '').trim();
            const mailNickname = String(parsed.mailNickname || '').trim();
            const userPrincipalName = String(parsed.userPrincipalName || '').trim();
            const temporaryPassword = String(parsed.temporaryPassword || '').trim();
            const newPassword = String(parsed.newPassword || '').trim();

            if (action === 'reset-password' || action === 'delete-account') {
              if (!learnerId) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'learnerId is required.' }));
                return;
              }
              if (!supabaseAdmin) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Supabase service is required.' }));
                return;
              }

              const learnerResult = await supabaseAdmin
                .from('registrar_learners')
                .select('id,microsoft_user_id,microsoft_upn')
                .eq('id', learnerId)
                .maybeSingle();
              if (learnerResult.error) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to read learner record', details: learnerResult.error.message }));
                return;
              }
              if (!learnerResult.data) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Learner not found' }));
                return;
              }

              const graphKey = String(learnerResult.data.microsoft_user_id || learnerResult.data.microsoft_upn || '').trim();
              const nowIso = new Date().toISOString();

              if (action === 'reset-password') {
                if (!newPassword) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'newPassword is required for reset-password.' }));
                  return;
                }
                if (!graphKey) {
                  res.statusCode = 409;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Learner has no linked Microsoft account.' }));
                  return;
                }
                const accessToken = await getAccessToken();
                const resetResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphKey)}`, {
                  method: 'PATCH',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    passwordProfile: {
                      forceChangePasswordNextSignIn: false,
                      password: newPassword,
                    },
                  }),
                });
                if (!resetResponse.ok) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Microsoft password reset failed', details: await resetResponse.text() }));
                  return;
                }
                await supabaseAdmin
                  .from('registrar_learners')
                  .update({ microsoft_last_synced_at: nowIso, microsoft_account_status: 'Active' })
                  .eq('id', learnerId);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ learnerId, microsoftAccountStatus: 'Active', microsoftLastSyncedAt: nowIso }));
                return;
              }

              if (graphKey) {
                const accessToken = await getAccessToken();
                const deleteResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphKey)}`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${accessToken}` },
                });
                if (!deleteResponse.ok && deleteResponse.status !== 404) {
                  res.statusCode = 502;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Microsoft delete failed', details: await deleteResponse.text() }));
                  return;
                }
              }

              await supabaseAdmin
                .from('registrar_learners')
                .update({
                  microsoft_user_id: null,
                  microsoft_upn: null,
                  microsoft_account_status: 'Deleted',
                  microsoft_last_synced_at: nowIso,
                })
                .eq('id', learnerId);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ learnerId, microsoftAccountStatus: 'Deleted', microsoftLastSyncedAt: nowIso }));
              return;
            }

            if (!learnerId || !displayName || !mailNickname || !userPrincipalName || !temporaryPassword) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'learnerId, displayName, mailNickname, userPrincipalName, and temporaryPassword are required.' }));
              return;
            }

            if (supabaseAdmin) {
              const existingLearnerResult = await supabaseAdmin
                .from('registrar_learners')
                .select('id,microsoft_user_id,microsoft_upn')
                .eq('id', learnerId)
                .maybeSingle();

              if (existingLearnerResult.error) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to read learner record', details: existingLearnerResult.error.message }));
                return;
              }
              if (!existingLearnerResult.data) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Learner not found' }));
                return;
              }
              if (existingLearnerResult.data.microsoft_user_id || existingLearnerResult.data.microsoft_upn) {
                res.statusCode = 409;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'Learner already has a Microsoft account',
                  microsoftUserId: existingLearnerResult.data.microsoft_user_id,
                  userPrincipalName: existingLearnerResult.data.microsoft_upn,
                }));
                return;
              }
            }

            const accessToken = await getAccessToken();
            const createUserResponse = await fetch('https://graph.microsoft.com/v1.0/users', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accountEnabled: true,
                displayName,
                mailNickname,
                userPrincipalName,
                passwordProfile: {
                  forceChangePasswordNextSignIn: false,
                  password: temporaryPassword,
                },
              }),
            });

            const createUserText = await createUserResponse.text();
            if (!createUserResponse.ok) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'User creation failed', details: createUserText }));
              return;
            }

            const createdUser = createUserText ? JSON.parse(createUserText) : {};
            const createdUserId = String(createdUser?.id || '').trim();
            const userGraphKey = createdUserId || userPrincipalName;
            const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

            let usageLocationUpdated = false;
            let usageLocationLastError = '';
            for (let attempt = 1; attempt <= 3; attempt += 1) {
              const usageLocationResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userGraphKey)}`, {
                method: 'PATCH',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ usageLocation: 'PH' }),
              });
              if (usageLocationResponse.ok) {
                usageLocationUpdated = true;
                break;
              }
              usageLocationLastError = await usageLocationResponse.text();
              await sleep(700 * attempt);
            }

            if (!usageLocationUpdated) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'usageLocation update failed',
                createdUserId: createdUser?.id || null,
                userPrincipalName,
                details: usageLocationLastError,
              }));
              return;
            }

            let assignLicenseText = '';
            let licenseAssigned = false;
            for (let attempt = 1; attempt <= 4; attempt += 1) {
              const assignLicenseResponse = await fetch(
                `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userGraphKey)}/assignLicense`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    addLicenses: [{ skuId: licenseSkuId }],
                    removeLicenses: [],
                  }),
                },
              );
              assignLicenseText = await assignLicenseResponse.text();
              if (assignLicenseResponse.ok) {
                licenseAssigned = true;
                break;
              }
              await sleep(900 * attempt);
            }

            if (!licenseAssigned) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'License assignment failed',
                createdUserId: createdUser?.id || null,
                userPrincipalName,
                details: assignLicenseText,
              }));
              return;
            }

            const licenseAssignmentResult = assignLicenseText ? JSON.parse(assignLicenseText) : { ok: true };
            if (supabaseAdmin) {
              const persistResult = await supabaseAdmin
                .from('registrar_learners')
                .update({
                  microsoft_user_id: createdUser?.id || null,
                  microsoft_upn: userPrincipalName,
                  microsoft_mail_nickname: mailNickname,
                  microsoft_account_status: 'Active',
                  microsoft_license_sku_id: licenseSkuId,
                  microsoft_created_at: new Date().toISOString(),
                  microsoft_last_synced_at: new Date().toISOString(),
                })
                .eq('id', learnerId);
              if (persistResult.error) {
                res.statusCode = 502;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  error: 'Microsoft account was created but failed to persist learner link',
                  createdUserId: createdUser?.id || null,
                  userPrincipalName,
                  details: persistResult.error.message,
                }));
                return;
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              id: createdUser?.id || null,
              userPrincipalName,
              licenseAssignmentResult,
            }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unexpected server error', details: error?.message || String(error) }));
          }
        });

        const parseJsonBody = async (req: any) => {
          const body = await new Promise<string>((resolve, reject) => {
            let raw = '';
            req.on('data', (chunk: Buffer) => {
              raw += chunk.toString('utf8');
            });
            req.on('end', () => resolve(raw));
            req.on('error', reject);
          });
          return JSON.parse(body || '{}');
        };

        const normalize = (value: unknown) => String(value ?? '').trim();
        const toEmail = (value: unknown) => normalize(value).toLowerCase();
        const isLikelyEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const escapeHtml = (value: unknown) =>
          normalize(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

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

        const getSupabaseAdmin = () => {
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase service-role credentials are missing.');
          }
          return createClient(supabaseUrl, serviceRoleKey);
        };

        server.middlewares.use('/api/enrollment-email-queue', async (req: any, res: any) => {
          try {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }
            const body = await parseJsonBody(req);
            const submissionId = normalize(body?.submissionId);
            if (!submissionId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'submissionId is required.' }));
              return;
            }

            const supabaseAdmin = getSupabaseAdmin();
            const { data: submission, error: submissionError } = await supabaseAdmin
              .from('registrar_public_enrollment_submissions')
              .select('id,school_id,lrn,submission_reference_id,last_name,first_name,middle_name,payload')
              .eq('id', submissionId)
              .maybeSingle();
            if (submissionError) throw submissionError;
            if (!submission) {
              res.statusCode = 404;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Submission not found.' }));
              return;
            }

            const payload = submission.payload && typeof submission.payload === 'object' ? (submission.payload as Record<string, any>) : {};
            const recipientEmail = toEmail(payload.email);
            if (!isLikelyEmail(recipientEmail)) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ queued: false, reason: 'missing_or_invalid_email' }));
              return;
            }

            const schoolId = normalize(submission.school_id || payload.schoolId || '');
            if (!schoolId) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ queued: false, reason: 'missing_school_id' }));
              return;
            }

            const { data: settings, error: settingsError } = await supabaseAdmin
              .from('registrar_enrollment_email_settings')
              .select('*')
              .eq('school_id', schoolId)
              .maybeSingle();
            if (settingsError) throw settingsError;
            if (!settings || !(settings as any).is_enabled) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ queued: false, reason: 'email_service_disabled' }));
              return;
            }

            const submissionReferenceId = normalize((submission as any).submission_reference_id);
            if (!submissionReferenceId) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ queued: false, reason: 'missing_submission_reference' }));
              return;
            }

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

            const { error: queueError } = await supabaseAdmin
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
                  await supabaseAdmin
                    .from('registrar_enrollment_email_queue')
                    .update({
                      send_status: 'sent',
                      attempts: 1,
                      last_error: null,
                      sent_at: new Date().toISOString(),
                    })
                    .eq('submission_id', submission.id);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ queued: true, sent_immediately: true }));
                  return;
                }

                const dispatchError = `Apps Script send failed (${dispatchResponse.status}): ${await dispatchResponse.text()}`;
                await supabaseAdmin
                  .from('registrar_enrollment_email_queue')
                  .update({
                    send_status: 'pending',
                    attempts: 1,
                    last_error: dispatchError,
                  })
                  .eq('submission_id', submission.id);
              }
            } catch (dispatchError: any) {
              await supabaseAdmin
                .from('registrar_enrollment_email_queue')
                .update({
                  send_status: 'pending',
                  attempts: 1,
                  last_error: normalize(dispatchError?.message || dispatchError) || 'Immediate dispatch failed.',
                })
                .eq('submission_id', submission.id);
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ queued: true, sent_immediately: false }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unable to queue enrollment confirmation email.', details: error?.message || String(error) }));
          }
        });

        server.middlewares.use('/api/enrollment-email-dispatch', async (req: any, res: any) => {
          try {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }
            const expectedToken = normalize(process.env.REGISTRAR_EMAIL_DISPATCH_KEY || env.REGISTRAR_EMAIL_DISPATCH_KEY || '');
            const providedToken = normalize(req.headers['x-dispatch-key'] || req.headers.authorization || '');
            if (expectedToken && providedToken !== expectedToken && providedToken !== `Bearer ${expectedToken}`) {
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Unauthorized dispatch request.' }));
              return;
            }

            const body = await parseJsonBody(req);
            const limit = Math.max(1, Math.min(50, Number(body?.limit || 10)));
            const MAX_ATTEMPTS = 5;
            const supabaseAdmin = getSupabaseAdmin();
            const { data: queueRows, error: queueError } = await supabaseAdmin
              .from('registrar_enrollment_email_queue')
              .select('id,school_id,recipient_email,email_subject,email_html')
              .eq('send_status', 'pending')
              .lt('attempts', MAX_ATTEMPTS)
              .order('created_at', { ascending: true })
              .limit(limit);
            if (queueError) throw queueError;

            let sent = 0;
            let failed = 0;
            for (const row of queueRows || []) {
              try {
                const schoolId = normalize((row as any).school_id);
                if (!schoolId) throw new Error('Missing school_id in queue row.');
                const { data: settings, error: settingsError } = await supabaseAdmin
                  .from('registrar_enrollment_email_settings')
                  .select('*')
                  .eq('school_id', schoolId)
                  .maybeSingle();
                if (settingsError) throw settingsError;
                if (!(settings as any)?.is_enabled) throw new Error('Email service disabled.');
                const endpoint = normalize((settings as any)?.apps_script_web_app_url);
                const bearer = normalize((settings as any)?.apps_script_bearer_token);
                if (!endpoint) throw new Error('Apps Script Web App URL is not configured.');

                const headers: Record<string, string> = {
                  'Content-Type': 'application/json',
                };
                if (bearer) headers.Authorization = `Bearer ${bearer}`;

                const response = await fetch(endpoint, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({
                    type: 'ENROLLMENT_CONFIRMATION',
                    email: String((row as any).recipient_email || ''),
                    to: String((row as any).recipient_email || ''),
                    subject: String((row as any).email_subject || ''),
                    htmlContent: String((row as any).email_html || ''),
                    html: String((row as any).email_html || ''),
                    senderName: String((settings as any).from_display_name || 'Leon NHS - USIS Registrar'),
                    fromDisplayName: String((settings as any).from_display_name || 'Leon NHS - USIS Registrar'),
                    replyTo: normalize((settings as any).reply_to_email) || undefined,
                  }),
                });
                if (!response.ok) throw new Error(`Apps Script send failed (${response.status}): ${await response.text()}`);

                await supabaseAdmin
                  .from('registrar_enrollment_email_queue')
                  .update({ send_status: 'sent', attempts: 1, last_error: null, sent_at: new Date().toISOString() })
                  .eq('id', String((row as any).id || ''));
                sent += 1;
              } catch (error: any) {
                const { data: currentRow } = await supabaseAdmin
                  .from('registrar_enrollment_email_queue')
                  .select('attempts')
                  .eq('id', String((row as any).id || ''))
                  .maybeSingle();
                const nextAttempts = Number((currentRow as any)?.attempts || 0) + 1;
                const nextStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
                await supabaseAdmin
                  .from('registrar_enrollment_email_queue')
                  .update({
                    attempts: nextAttempts,
                    send_status: nextStatus,
                    last_error: normalize(error?.message || error) || 'Unknown dispatch error.',
                  })
                  .eq('id', String((row as any).id || ''));
                failed += 1;
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ processed: (queueRows || []).length, sent, failed }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unable to dispatch enrollment emails.', details: error?.message || String(error) }));
          }
        });

        server.middlewares.use('/api/credentials-email', async (req: any, res: any) => {
          try {
            if (req.method !== 'POST') {
              res.statusCode = 405;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Method not allowed' }));
              return;
            }

            const body = await parseJsonBody(req);
            const schoolId = normalize(body?.schoolId);
            if (!schoolId) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'schoolId is required.' }));
              return;
            }

            const supabaseAdmin = getSupabaseAdmin();
            const { data: settings, error: settingsError } = await supabaseAdmin
              .from('registrar_enrollment_email_settings')
              .select('*')
              .eq('school_id', schoolId)
              .maybeSingle();
            if (settingsError) throw settingsError;
            if (!(settings as any)?.is_enabled) {
              res.statusCode = 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Enrollment email service is disabled in Registrar Settings.' }));
              return;
            }

            const endpoint = normalize((settings as any)?.apps_script_web_app_url || body?.webhookUrl || '');
            if (!endpoint) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Apps Script Web App URL is not configured.' }));
              return;
            }

            const bearer = normalize((settings as any)?.apps_script_bearer_token);
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
            };
            if (bearer) headers.Authorization = `Bearer ${bearer}`;

            const payload = {
              type: 'LEARNER_CREDENTIALS',
              email: String(body?.email || ''),
              to: String(body?.email || ''),
              subject: String(body?.subject || ''),
              htmlContent: String(body?.htmlContent || ''),
              html: String(body?.htmlContent || ''),
              textContent: String(body?.textContent || ''),
              senderName: String(body?.senderName || settings.from_display_name || 'DepED USIS Registrar'),
              fromDisplayName: String(body?.fromDisplayName || settings.from_display_name || 'DepED USIS Registrar'),
              replyTo: normalize(body?.replyTo) || normalize((settings as any)?.reply_to_email) || undefined,
              statusLookupUrl: normalize(body?.statusLookupUrl) || undefined,
              headerImageSrc: normalize(body?.headerImageSrc) || undefined,
              learner: body?.learner || {},
              payload: body?.payload || body?.learner || {},
            };

            const response = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify(payload),
            });
            const responseText = await response.text().catch(() => '');
            let responseJson: any = null;
            try {
              responseJson = responseText ? JSON.parse(responseText) : null;
            } catch {
              responseJson = null;
            }
            if (!response.ok || responseJson?.ok === false) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: responseJson?.error || `Apps Script send failed (${response.status})`, details: responseJson || responseText }));
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ sent: true, delivered: true, message: 'Learner credentials email forwarded to Apps Script.', appsScript: responseJson || null }));
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unable to forward learner credentials email.', details: error?.message || String(error) }));
          }
        });
      },
    };

    return {
      envDir: '..',
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/deped-api': {
            target: 'https://deped-api.vercel.app',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/deped-api/, ''),
          },
        },
      },
      plugins: [react(), microsoftUserApiPlugin],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
          react: path.resolve(__dirname, '../node_modules/react'),
          'react-dom': path.resolve(__dirname, '../node_modules/react-dom'),
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

