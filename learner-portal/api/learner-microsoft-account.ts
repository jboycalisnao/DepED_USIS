import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const LEARNER_TABLE = 'registrar_learners';

type Json = Record<string, unknown>;

const toText = (value: unknown) => String(value ?? '').trim();

const json = (res: VercelResponse, statusCode: number, payload: Json) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const readBody = (req: VercelRequest): Json => {
  if (req.body && typeof req.body === 'object') return req.body as Json;
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body) as Json;
    } catch {
      return {};
    }
  }
  return {};
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

const buildMailNickname = (userPrincipalName: string) =>
  userPrincipalName.split('@')[0]?.replace(/\./g, '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || `learner${Date.now()}`;

const buildPolicyPassword = (learner: any) => {
  const lastName = toText(learner.last_name).replace(/[^a-zA-Z]/g, '') || 'Learner';
  const firstUpper = (lastName.charAt(0) || 'L').toUpperCase();
  const lowerSegment = (lastName.slice(1, 4) || 'ear').toLowerCase();
  const digitSegment = toText(learner.lrn).replace(/\D/g, '').slice(-4).padStart(4, '0');
  const candidate = `${firstUpper}${lowerSegment}${digitSegment}`;
  return candidate.length >= 8 ? candidate : `${candidate}a9`;
};

const getAccessToken = async (tenantId: string, clientId: string, clientSecret: string) => {
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

const addUserToGroup = async (accessToken: string, groupId: string, userId: string, userPrincipalName: string) => {
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

const getSupabaseReader = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const readableKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !readableKey) throw new Error('Supabase credentials are missing.');
  return createClient(supabaseUrl, readableKey);
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service-role credentials are missing. Microsoft account creation requires SUPABASE_SERVICE_ROLE_KEY.');
  return createClient(supabaseUrl, serviceRoleKey);
};

const readLearner = async (supabaseAdmin: ReturnType<typeof createClient>, learnerId: string, lrn: string) => {
  const selectColumns = [
    'id',
    'lrn',
    'first_name',
    'middle_name',
    'last_name',
    'login_password_plain',
    'microsoft_user_id',
    'microsoft_upn',
    'microsoft_mail_nickname',
    'microsoft_account_status',
    'microsoft_created_at',
    'microsoft_last_synced_at',
  ].join(',');
  let query = supabaseAdmin.from(LEARNER_TABLE).select(selectColumns).limit(1);
  if (learnerId) query = query.eq('id', learnerId);
  if (lrn) query = query.eq('lrn', lrn);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as any | null;
};

const learnerStatusPayload = (learner: any, exists?: boolean) => ({
  exists: Boolean(exists ?? (toText(learner?.microsoft_user_id) || toText(learner?.microsoft_upn))),
  learnerId: toText(learner?.id),
  microsoftUserId: toText(learner?.microsoft_user_id),
  userPrincipalName: toText(learner?.microsoft_upn),
  microsoftMailNickname: toText(learner?.microsoft_mail_nickname),
  microsoftAccountStatus: toText(learner?.microsoft_account_status) || (toText(learner?.microsoft_upn) ? 'Active' : 'Not Linked'),
  microsoftCreatedAt: toText(learner?.microsoft_created_at),
  microsoftLastSyncedAt: toText(learner?.microsoft_last_synced_at),
  password: toText(learner?.login_password_plain) || buildPolicyPassword(learner),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return json(res, 405, { ok: false, error: 'Method not allowed.' });
    }

    const requestData = req.method === 'GET' ? req.query : readBody(req);
    const learnerId = toText((requestData as any).learnerId);
    const lrn = toText((requestData as any).lrn);
    const shouldRefresh = toText((requestData as any).refresh) === 'true' || toText((requestData as any).action) === 'refresh-status';

    if (!learnerId && !lrn) return json(res, 400, { ok: false, error: 'Learner Microsoft account lookup requires learner ID or LRN.' });
    if (req.method === 'POST' && !shouldRefresh && (!learnerId || !lrn)) {
      return json(res, 400, { ok: false, error: 'Microsoft account creation requires learner ID and LRN.' });
    }

    const supabaseClient = (req.method === 'GET' && !shouldRefresh) ? getSupabaseReader() : getSupabaseAdmin();
    const learner = await readLearner(supabaseClient, learnerId, lrn);
    if (!learner) return json(res, 404, { ok: false, error: 'Learner not found.' });

    if (shouldRefresh) {
      const tenantId = toText(process.env.AZURE_TENANT_ID);
      const clientId = toText(process.env.AZURE_CLIENT_ID);
      const clientSecret = toText(process.env.AZURE_CLIENT_SECRET);
      if (!tenantId || !clientId || !clientSecret) {
        return json(res, 500, { ok: false, error: 'Azure credentials are not configured on the server.' });
      }

      const localUserId = toText(learner.microsoft_user_id);
      const localUpn = toText(learner.microsoft_upn);
      const defaultUpn = buildMicrosoftUsername(learner);
      const graphKey = localUserId || localUpn || defaultUpn;

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphKey)}?$select=id,userPrincipalName,accountEnabled`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const nowIso = new Date().toISOString();
      const adminClient = getSupabaseAdmin();

      if (graphResponse.status === 404) {
        if (localUserId || localUpn) {
          await adminClient.from(LEARNER_TABLE).update({
            microsoft_user_id: null,
            microsoft_upn: null,
            microsoft_account_status: 'Deleted',
            microsoft_last_synced_at: nowIso,
          }).eq('id', learner.id);

          return json(res, 200, {
            ok: true,
            exists: false,
            checkedLive: true,
            statusMessage: 'Microsoft account was not found in Microsoft 365 (it may have been deleted). Local status has been set to Deleted.',
            ...learnerStatusPayload({
              ...learner,
              microsoft_user_id: null,
              microsoft_upn: null,
              microsoft_account_status: 'Deleted',
              microsoft_last_synced_at: nowIso,
            }, false),
          });
        }

        await adminClient.from(LEARNER_TABLE).update({
          microsoft_account_status: 'Not Linked',
          microsoft_last_synced_at: nowIso,
        }).eq('id', learner.id);

        return json(res, 200, {
          ok: true,
          exists: false,
          checkedLive: true,
          statusMessage: 'No Microsoft account was found in Microsoft 365.',
          ...learnerStatusPayload({
            ...learner,
            microsoft_account_status: 'Not Linked',
            microsoft_last_synced_at: nowIso,
          }, false),
        });
      }

      if (!graphResponse.ok) {
        return json(res, 502, { ok: false, error: 'Graph status check failed', details: await graphResponse.text() });
      }

      const graphJson = await graphResponse.json();
      const graphUserId = toText(graphJson?.id || localUserId);
      const graphUpn = toText(graphJson?.userPrincipalName || localUpn || defaultUpn);

      await adminClient.from(LEARNER_TABLE).update({
        microsoft_user_id: graphUserId || null,
        microsoft_upn: graphUpn || null,
        microsoft_account_status: 'Active',
        microsoft_last_synced_at: nowIso,
      }).eq('id', learner.id);

      return json(res, 200, {
        ok: true,
        exists: true,
        checkedLive: true,
        statusMessage: `Microsoft account is active and verified in Microsoft 365 (${graphUpn}).`,
        ...learnerStatusPayload({
          ...learner,
          microsoft_user_id: graphUserId,
          microsoft_upn: graphUpn,
          microsoft_account_status: 'Active',
          microsoft_last_synced_at: nowIso,
        }, true),
      });
    }

    const existingUserId = toText(learner.microsoft_user_id);
    const existingUpn = toText(learner.microsoft_upn);
    if (req.method === 'GET' || existingUserId || existingUpn) {
      return json(res, req.method === 'POST' && (existingUserId || existingUpn) ? 409 : 200, {
        ok: req.method === 'GET',
        ...(req.method === 'POST' && (existingUserId || existingUpn) ? { error: 'Learner already has a Microsoft account.' } : {}),
        ...learnerStatusPayload(learner),
      });
    }

    const tenantId = toText(process.env.AZURE_TENANT_ID);
    const clientId = toText(process.env.AZURE_CLIENT_ID);
    const clientSecret = toText(process.env.AZURE_CLIENT_SECRET);
    const licenseSkuId = toText(process.env.M365_LICENSE_SKU_ID);
    const missing: string[] = [];
    if (!tenantId) missing.push('AZURE_TENANT_ID');
    if (!clientId) missing.push('AZURE_CLIENT_ID');
    if (!clientSecret) missing.push('AZURE_CLIENT_SECRET');
    if (!licenseSkuId) missing.push('M365_LICENSE_SKU_ID');
    if (missing.length > 0) return json(res, 500, { ok: false, error: 'Azure/M365 environment variables are not configured.', missing });

    const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
    const userPrincipalName = buildMicrosoftUsername(learner);
    const mailNickname = buildMailNickname(userPrincipalName);
    const temporaryPassword = buildPolicyPassword(learner);
    const displayName = [learner.first_name, learner.middle_name, learner.last_name].map(toText).filter(Boolean).join(' ');
    const givenName = toText(learner.first_name);
    const surname = toText(learner.last_name);

    const createUserResponse = await fetch('https://graph.microsoft.com/v1.0/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountEnabled: true,
        displayName: displayName || toText(learner.lrn) || 'Learner',
        givenName: givenName || undefined,
        surname: surname || undefined,
        mailNickname,
        userPrincipalName,
        passwordProfile: { forceChangePasswordNextSignIn: false, password: temporaryPassword },
      }),
    });
    const createUserText = await createUserResponse.text();
    if (!createUserResponse.ok) return json(res, 502, { ok: false, error: 'User creation failed.', details: createUserText });

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
      return json(res, 502, { ok: false, error: 'usageLocation update failed.', createdUserId, userPrincipalName, details: usageLocationLastError });
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
      return json(res, 502, { ok: false, error: 'License assignment failed.', createdUserId, userPrincipalName, details: assignLicenseText });
    }

    const learnersGroupId = await getLearnersGroupId(accessToken);
    await addUserToGroup(accessToken, learnersGroupId, createdUserId || userGraphKey, userPrincipalName);

    const nowIso = new Date().toISOString();
    const { data: updatedLearner, error: updateError } = await supabaseClient
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

    if (updateError) {
      return json(res, 502, {
        ok: false,
        error: 'Microsoft account was created but failed to save the learner link.',
        createdUserId,
        userPrincipalName,
        details: updateError.message,
      });
    }

    return json(res, 200, {
      ok: true,
      created: true,
      temporaryPassword,
      ...learnerStatusPayload(updatedLearner || { ...learner, microsoft_user_id: createdUserId, microsoft_upn: userPrincipalName }, true),
    });
  } catch (error: any) {
    return json(res, 500, { ok: false, error: 'Unable to process learner Microsoft account service.', details: error?.message || String(error) });
  }
}
