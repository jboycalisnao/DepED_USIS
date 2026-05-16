import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    const microsoftUserApiPlugin = {
      name: 'registrar-microsoft-user-api',
      configureServer(server: any) {
        server.middlewares.use('/api/microsoft-users', async (req: any, res: any) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
          }

          try {
            const body = await new Promise<string>((resolve, reject) => {
              let raw = '';
              req.on('data', (chunk: Buffer) => {
                raw += chunk.toString('utf8');
              });
              req.on('end', () => resolve(raw));
              req.on('error', reject);
            });

            const parsed = JSON.parse(body || '{}');
            const learnerId = String(parsed.learnerId || '').trim();
            const displayName = String(parsed.displayName || '').trim();
            const mailNickname = String(parsed.mailNickname || '').trim();
            const userPrincipalName = String(parsed.userPrincipalName || '').trim();
            const temporaryPassword = String(parsed.temporaryPassword || '').trim();

            if (!learnerId || !displayName || !mailNickname || !userPrincipalName || !temporaryPassword) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'learnerId, displayName, mailNickname, userPrincipalName, and temporaryPassword are required.' }));
              return;
            }

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
              res.end(
                JSON.stringify({
                  error: 'Azure/M365 environment variables are not configured.',
                  missing: missingAzureVars,
                }),
              );
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
                res.end(
                  JSON.stringify({
                    error: 'Learner already has a Microsoft account',
                    microsoftUserId: existingLearnerResult.data.microsoft_user_id,
                    userPrincipalName: existingLearnerResult.data.microsoft_upn,
                  }),
                );
                return;
              }
            }

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

            if (!tokenResponse.ok) {
              const tokenErrorText = await tokenResponse.text();
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Token request failed', details: tokenErrorText }));
              return;
            }

            const tokenJson = await tokenResponse.json();
            const accessToken = String(tokenJson.access_token || '');
            if (!accessToken) {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Token response missing access token' }));
              return;
            }

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

            // Retry usageLocation patch to handle propagation delays.
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
              res.end(
                JSON.stringify({
                  error: 'usageLocation update failed',
                  createdUserId: createdUser?.id || null,
                  userPrincipalName,
                  details: usageLocationLastError,
                }),
              );
              return;
            }

            // Retry license assignment because Graph can still lag after usageLocation patch.
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
              res.end(
                JSON.stringify({
                  error: 'License assignment failed',
                  createdUserId: createdUser?.id || null,
                  userPrincipalName,
                  details: assignLicenseText,
                }),
              );
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
                res.end(
                  JSON.stringify({
                    error: 'Microsoft account was created but failed to persist learner link',
                    createdUserId: createdUser?.id || null,
                    userPrincipalName,
                    details: persistResult.error.message,
                  }),
                );
                return;
              }
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                id: createdUser?.id || null,
                userPrincipalName,
                licenseAssignmentResult,
              }),
            );
          } catch (error: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Unexpected server error', details: error?.message || String(error) }));
          }
        });
      },
    };

    return {
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
