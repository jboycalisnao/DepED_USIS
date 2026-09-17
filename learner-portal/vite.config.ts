import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createClient } from '@supabase/supabase-js';
import { fetchProfilePhotoFromDrive } from './lib/server/googleDriveProfilePhotos';

const LEARNER_TABLE = 'registrar_learners';

const toText = (value: unknown) => String(value ?? '').trim();

const setServerEnvFallbacks = (env: Record<string, string>) => {
  for (const key of [
    'SUPABASE_URL',
    'VITE_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
    'GOOGLE_SERVICE_ACCOUNT_JSON_BASE64',
    'GOOGLE_SERVICE_ACCOUNT_EMAIL',
    'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GOOGLE_DRIVE_PROFILE_PHOTOS_FOLDER_ID',
    'AZURE_TENANT_ID',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'M365_LICENSE_SKU_ID',
    'M365_LEARNERS_GROUP_ID',
    'M365_LEARNER_UPN_DOMAIN',
  ]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }
};

const readRequestBody = (req: any) =>
  new Promise<Record<string, unknown>>((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw) as Record<string, unknown>);
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });

const isMissingUpdatedAtError = (error: unknown) => {
  const message = toText((error as any)?.message || error).toLowerCase();
  return message.includes('registrar_learners.updated_at') || (message.includes('updated_at') && message.includes('does not exist'));
};

const compactAccountPart = (value: string, fallback: string) => {
  const clean = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '');
  return clean || fallback;
};

const buildMicrosoftUsername = (learner: any) => {
  const domain = toText(process.env.M365_LEARNER_UPN_DOMAIN) || 'lr.leonnhs.edu.ph';
  const first = compactAccountPart(toText(learner.first_name), 'learner');
  const last = compactAccountPart(toText(learner.last_name), 'user');
  return `${first}.${last}@${domain}`;
};

const buildMicrosoftPassword = (learner: any) => {
  const lastName = toText(learner.last_name).replace(/[^a-zA-Z]/g, '') || 'Learner';
  const firstUpper = (lastName.charAt(0) || 'L').toUpperCase();
  const lowerSegment = (lastName.slice(1, 4) || 'ear').toLowerCase();
  const digitSegment = toText(learner.lrn).replace(/\D/g, '').slice(-4).padStart(4, '0');
  const candidate = `${firstUpper}${lowerSegment}${digitSegment}`;
  return candidate.length >= 8 ? candidate : `${candidate}a9`;
};

const buildMailNickname = (userPrincipalName: string) =>
  userPrincipalName.split('@')[0]?.replace(/\./g, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || `learner${Date.now()}`;

const getMicrosoftAccessToken = async (tenantId: string, clientId: string, clientSecret: string) => {
  const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
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
  const accessToken = toText(tokenJson?.access_token);
  if (!accessToken) throw new Error('Token response missing access token.');
  return accessToken;
};

const getLearnersGroupId = async (accessToken: string) => {
  const envGroupId = toText(process.env.M365_LEARNERS_GROUP_ID);
  if (envGroupId) return envGroupId;

  const groupResponse = await fetch(
    "https://graph.microsoft.com/v1.0/groups?$filter=displayName eq 'Learners'&$select=id,displayName&$top=1",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!groupResponse.ok) throw new Error(`Learners group lookup failed: ${await groupResponse.text()}`);
  const groupJson = await groupResponse.json();
  const groupId = toText(groupJson?.value?.[0]?.id);
  if (groupId) return groupId;

  const createGroupResponse = await fetch('https://graph.microsoft.com/v1.0/groups', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      displayName: 'Learners',
      description: 'Learner portal-created learner group',
      groupTypes: ['Unified'],
      mailEnabled: true,
      mailNickname: `learners-${Date.now()}`,
      securityEnabled: false,
      visibility: 'Private',
    }),
  });
  if (!createGroupResponse.ok) throw new Error(`Learners group creation failed: ${await createGroupResponse.text()}`);
  const createdGroupJson = await createGroupResponse.json();
  const createdGroupId = toText(createdGroupJson?.id);
  if (!createdGroupId) throw new Error('Learners group was created but no group ID was returned.');
  return createdGroupId;
};

const addMicrosoftUserToGroup = async (accessToken: string, groupId: string, userId: string, userPrincipalName: string) => {
  const membershipResponse = await fetch(`https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(groupId)}/members/$ref`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ '@odata.id': `https://graph.microsoft.com/v1.0/directoryObjects/${encodeURIComponent(userId)}` }),
  });
  if (membershipResponse.ok) return;
  const text = await membershipResponse.text();
  if (membershipResponse.status === 400 && /already exist|added object references/i.test(text)) return;
  throw new Error(`Failed to add ${userPrincipalName} to Learners group: ${text}`);
};

const learnerMicrosoftStatusPayload = (learner: any, exists?: boolean) => ({
  exists: Boolean(exists ?? (toText(learner?.microsoft_user_id) || toText(learner?.microsoft_upn))),
  learnerId: toText(learner?.id),
  microsoftUserId: toText(learner?.microsoft_user_id),
  userPrincipalName: toText(learner?.microsoft_upn),
  microsoftMailNickname: toText(learner?.microsoft_mail_nickname),
  microsoftAccountStatus: toText(learner?.microsoft_account_status) || (toText(learner?.microsoft_upn) ? 'Active' : 'Not Linked'),
  microsoftCreatedAt: toText(learner?.microsoft_created_at),
  microsoftLastSyncedAt: toText(learner?.microsoft_last_synced_at),
});

const updateLatestEnrollmentGuardianContact = (value: unknown, guardianContact: string) => {
  if (!Array.isArray(value) || value.length === 0) return value;

  const scoreEntry = (entry: any, index: number) => {
    const timestamp = toText(entry?.enrollmentDate || entry?.enrollment_date || entry?.created_at);
    const parsedTime = timestamp ? new Date(timestamp).getTime() : 0;
    return Number.isFinite(parsedTime) && parsedTime > 0 ? parsedTime : index;
  };

  let latestIndex = 0;
  value.forEach((entry, index) => {
    if (scoreEntry(entry, index) >= scoreEntry(value[latestIndex], latestIndex)) latestIndex = index;
  });

  return value.map((entry, index) => {
    if (index !== latestIndex || !entry || typeof entry !== 'object') return entry;
    const submissionPayload =
      entry.submissionPayload && typeof entry.submissionPayload === 'object'
        ? { ...entry.submissionPayload }
        : {};
    return {
      ...entry,
      submissionPayload: {
        ...submissionPayload,
        guardianContact,
      },
    };
  });
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const learnerProfileApiPlugin = {
    name: 'learner-profile-api',
    configureServer(server: any) {
      server.middlewares.use('/api/learner-profile', async (req: any, res: any) => {
        try {
          if (req.method !== 'PATCH') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
            return;
          }

          setServerEnvFallbacks(env);
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service-role credentials are missing.');

          const body = await readRequestBody(req);
          const learnerId = toText(body.learnerId);
          const lrn = toText(body.lrn);
          const fields = (body.fields && typeof body.fields === 'object' ? body.fields : {}) as Record<string, unknown>;
          if (!learnerId && !lrn) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Learner profile update requires learner ID or LRN.' }));
            return;
          }

          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          const historyQuery = supabaseAdmin.from(LEARNER_TABLE).select('enrollment_history').limit(1);
          const historyResult = learnerId
            ? await historyQuery.eq('id', learnerId).maybeSingle()
            : await historyQuery.eq('lrn', lrn).maybeSingle();

          const guardianContact = toText(fields.contactNumber);
          const basePayload = {
            address: toText(fields.address) || null,
            guardian_contact: guardianContact || null,
            email: toText(fields.email) || null,
            father_name: toText(fields.fatherName) || null,
            guardian_name: toText(fields.guardianName) || null,
            mother_name: toText(fields.motherName) || null,
            ...(!historyResult.error && Array.isArray((historyResult.data as any)?.enrollment_history)
              ? { enrollment_history: updateLatestEnrollmentGuardianContact((historyResult.data as any).enrollment_history, guardianContact) }
              : {}),
          };
          const updatedAt = new Date().toISOString();

          const buildUpdateQuery = (payload: Record<string, unknown>) => {
            let query = supabaseAdmin.from(LEARNER_TABLE).update(payload);
            if (learnerId) query = query.eq('id', learnerId);
            else query = query.eq('lrn', lrn);
            return query;
          };

          let { data, error } = await buildUpdateQuery({ ...basePayload, updated_at: updatedAt }).select('id,updated_at').maybeSingle();
          if (error && isMissingUpdatedAtError(error)) {
            const legacyResult = await buildUpdateQuery(basePayload).select('id').maybeSingle();
            data = legacyResult.data;
            error = legacyResult.error;
          }
          if (error) throw error;
          if (!data) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'No learner profile record was updated.' }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            ok: true,
            id: toText((data as any).id) || learnerId || lrn,
            updatedAt: toText((data as any).updated_at) || updatedAt,
          }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: error?.message || 'Unable to update learner profile.' }));
        }
      });

      server.middlewares.use('/api/learner-profile-photo', async (req: any, res: any) => {
        try {
          if (req.method !== 'GET') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
          }

          setServerEnvFallbacks(env);
          const requestUrl = new URL(req.url || '', 'http://localhost');
          const learnerId = String(requestUrl.searchParams.get('learnerId') || '').trim();
          const lrn = String(requestUrl.searchParams.get('lrn') || '').trim();
          if (!learnerId) throw new Error('learnerId is required.');

          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service-role credentials are missing.');

          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          const { data, error } = await supabaseAdmin
            .from('registrar_learners')
            .select('id,lrn,profile_photo_drive_file_id,profile_photo_mime_type,profile_photo_updated_at')
            .eq('id', learnerId)
            .maybeSingle();
          if (error) throw error;

          let photoRow = data as any;
          let fileId = String(photoRow?.profile_photo_drive_file_id || '').trim();

          if ((!photoRow || !fileId) && lrn) {
            const { data: lrnRow, error: lrnError } = await supabaseAdmin
              .from('registrar_learners')
              .select('id,lrn,profile_photo_drive_file_id,profile_photo_mime_type,profile_photo_updated_at')
              .eq('lrn', lrn)
              .maybeSingle();
            if (lrnError) throw lrnError;
            if (lrnRow) {
              photoRow = lrnRow as any;
              fileId = String(photoRow?.profile_photo_drive_file_id || '').trim();
            }
          }

          if (!photoRow || !fileId) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Learner profile picture was not found.' }));
            return;
          }

          const photo = await fetchProfilePhotoFromDrive(fileId);
          res.statusCode = 200;
          res.setHeader('Content-Type', String(photoRow.profile_photo_mime_type || photo.contentType || 'application/octet-stream'));
          res.setHeader('Cache-Control', 'private, max-age=300');
          res.end(photo.bytes);
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Unable to load learner profile picture.', details: error?.message || String(error) }));
        }
      });

      server.middlewares.use('/api/learner-microsoft-account', async (req: any, res: any) => {
        try {
          if (req.method !== 'GET' && req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Method not allowed.' }));
            return;
          }

          setServerEnvFallbacks(env);
          const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
          const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
          if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service-role credentials are missing.');

          const requestUrl = new URL(req.url || '', 'http://localhost');
          const body = req.method === 'POST' ? await readRequestBody(req) : {};
          const learnerId = toText(req.method === 'POST' ? body.learnerId : requestUrl.searchParams.get('learnerId'));
          const lrn = toText(req.method === 'POST' ? body.lrn : requestUrl.searchParams.get('lrn'));
          if (!learnerId && !lrn) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Learner Microsoft account lookup requires learner ID or LRN.' }));
            return;
          }
          if (req.method === 'POST' && (!learnerId || !lrn)) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Microsoft account creation requires learner ID and LRN.' }));
            return;
          }

          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
          const selectColumns = 'id,lrn,first_name,middle_name,last_name,microsoft_user_id,microsoft_upn,microsoft_mail_nickname,microsoft_account_status,microsoft_created_at,microsoft_last_synced_at';
          let query = supabaseAdmin.from(LEARNER_TABLE).select(selectColumns).limit(1);
          if (learnerId) query = query.eq('id', learnerId);
          if (lrn) query = query.eq('lrn', lrn);
          const learnerResult = await query.maybeSingle();
          if (learnerResult.error) throw learnerResult.error;
          if (!learnerResult.data) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Learner not found.' }));
            return;
          }

          const learner = learnerResult.data as any;
          const existingUserId = toText(learner.microsoft_user_id);
          const existingUpn = toText(learner.microsoft_upn);
          if (req.method === 'GET' || existingUserId || existingUpn) {
            res.statusCode = req.method === 'POST' && (existingUserId || existingUpn) ? 409 : 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              ok: req.method === 'GET',
              ...(req.method === 'POST' && (existingUserId || existingUpn) ? { error: 'Learner already has a Microsoft account.' } : {}),
              ...learnerMicrosoftStatusPayload(learner),
            }));
            return;
          }

          const tenantId = process.env.AZURE_TENANT_ID || env.AZURE_TENANT_ID || '';
          const clientId = process.env.AZURE_CLIENT_ID || env.AZURE_CLIENT_ID || '';
          const clientSecret = process.env.AZURE_CLIENT_SECRET || env.AZURE_CLIENT_SECRET || '';
          const licenseSkuId = process.env.M365_LICENSE_SKU_ID || env.M365_LICENSE_SKU_ID || '';
          const missing: string[] = [];
          if (!tenantId) missing.push('AZURE_TENANT_ID');
          if (!clientId) missing.push('AZURE_CLIENT_ID');
          if (!clientSecret) missing.push('AZURE_CLIENT_SECRET');
          if (!licenseSkuId) missing.push('M365_LICENSE_SKU_ID');
          if (missing.length > 0) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Azure/M365 environment variables are not configured.', missing }));
            return;
          }

          const accessToken = await getMicrosoftAccessToken(tenantId, clientId, clientSecret);
          const userPrincipalName = buildMicrosoftUsername(learner);
          const mailNickname = buildMailNickname(userPrincipalName);
          const temporaryPassword = buildMicrosoftPassword(learner);
          const displayName = [learner.first_name, learner.middle_name, learner.last_name].map(toText).filter(Boolean).join(' ') || toText(learner.lrn) || 'Learner';
          const createUserResponse = await fetch('https://graph.microsoft.com/v1.0/users', {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountEnabled: true,
              displayName,
              mailNickname,
              userPrincipalName,
              passwordProfile: { forceChangePasswordNextSignIn: false, password: temporaryPassword },
            }),
          });
          const createUserText = await createUserResponse.text();
          if (!createUserResponse.ok) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'User creation failed.', details: createUserText }));
            return;
          }

          const createdUser = createUserText ? JSON.parse(createUserText) : {};
          const createdUserId = toText(createdUser?.id);
          const userGraphKey = createdUserId || userPrincipalName;
          const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

          let usageLocationUpdated = false;
          let usageLocationLastError = '';
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            const usageLocationResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userGraphKey)}`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
            res.end(JSON.stringify({ ok: false, error: 'usageLocation update failed.', createdUserId, userPrincipalName, details: usageLocationLastError }));
            return;
          }

          let assignLicenseText = '';
          let licenseAssigned = false;
          for (let attempt = 1; attempt <= 4; attempt += 1) {
            const assignLicenseResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userGraphKey)}/assignLicense`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ addLicenses: [{ skuId: licenseSkuId }], removeLicenses: [] }),
            });
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
            res.end(JSON.stringify({ ok: false, error: 'License assignment failed.', createdUserId, userPrincipalName, details: assignLicenseText }));
            return;
          }

          const learnersGroupId = await getLearnersGroupId(accessToken);
          await addMicrosoftUserToGroup(accessToken, learnersGroupId, createdUserId || userGraphKey, userPrincipalName);

          const nowIso = new Date().toISOString();
          const updateResult = await supabaseAdmin
            .from(LEARNER_TABLE)
            .update({
              microsoft_user_id: createdUserId || null,
              microsoft_upn: userPrincipalName,
              microsoft_mail_nickname: mailNickname,
              microsoft_account_status: 'Active',
              microsoft_license_sku_id: licenseSkuId,
              microsoft_created_at: nowIso,
              microsoft_last_synced_at: nowIso,
            })
            .eq('id', toText(learner.id))
            .select('id,microsoft_user_id,microsoft_upn,microsoft_mail_nickname,microsoft_account_status,microsoft_created_at,microsoft_last_synced_at')
            .maybeSingle();
          if (updateResult.error) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              ok: false,
              error: 'Microsoft account was created but failed to save the learner link.',
              createdUserId,
              userPrincipalName,
              details: updateResult.error.message,
            }));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            ok: true,
            created: true,
            temporaryPassword,
            ...learnerMicrosoftStatusPayload(updateResult.data || { ...learner, microsoft_user_id: createdUserId, microsoft_upn: userPrincipalName }, true),
          }));
        } catch (error: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: 'Unable to process learner Microsoft account service.', details: error?.message || String(error) }));
        }
      });
    },
  };

  return {
    cacheDir: '.vite-cache',
    envDir: '..',
    plugins: [react(), learnerProfileApiPlugin],
    server: {
      port: 3014,
      host: '0.0.0.0',
    },
  };
});
