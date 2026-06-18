import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

type Json = Record<string, any>;

const json = (res: VercelResponse, statusCode: number, payload: Json) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const getAccessToken = async (tenantId: string, clientId: string, clientSecret: string) => {
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

const getLearnersGroupId = async (accessToken: string) => {
  const envGroupId = String(process.env.M365_LEARNERS_GROUP_ID || '').trim();
  if (envGroupId) return envGroupId;

  const groupResponse = await fetch(`https://graph.microsoft.com/v1.0/groups?$filter=displayName eq 'Learners'&$select=id,displayName&$top=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!groupResponse.ok) throw new Error(`Learners group lookup failed: ${await groupResponse.text()}`);

  const groupJson = await groupResponse.json();
  const groupId = String(groupJson?.value?.[0]?.id || '').trim();
  if (groupId) return groupId;

  const createGroupResponse = await fetch('https://graph.microsoft.com/v1.0/groups', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      displayName: 'Learners',
      description: 'Registrar-created learner group',
      groupTypes: ['Unified'],
      mailEnabled: true,
      mailNickname: `learners-${Date.now()}`,
      securityEnabled: false,
      visibility: 'Private',
    }),
  });

  if (!createGroupResponse.ok) {
    throw new Error(`Learners group creation failed: ${await createGroupResponse.text()}`);
  }

  const createdGroupJson = await createGroupResponse.json();
  const createdGroupId = String(createdGroupJson?.id || '').trim();
  if (!createdGroupId) throw new Error('Learners group was created but no group ID was returned.');
  return createdGroupId;
};

const addUserToGroup = async (accessToken: string, groupId: string, userId: string, userPrincipalName: string) => {
  const memberRef = `https://graph.microsoft.com/v1.0/directoryObjects/${encodeURIComponent(userId)}`;
  const membershipResponse = await fetch(`https://graph.microsoft.com/v1.0/groups/${encodeURIComponent(groupId)}/members/$ref`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ '@odata.id': memberRef }),
  });

  if (membershipResponse.ok) return;

  const text = await membershipResponse.text();
  const alreadyMember = membershipResponse.status === 400 && /already exist|added object references/i.test(text);
  if (alreadyMember) return;

  throw new Error(`Failed to add ${userPrincipalName} to Learners group: ${text}`);
};

const readBody = (req: VercelRequest): Json => {
  if (req.body && typeof req.body === 'object') return req.body as Json;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  return {};
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const clientId = process.env.AZURE_CLIENT_ID || '';
    const tenantId = process.env.AZURE_TENANT_ID || '';
    const clientSecret = process.env.AZURE_CLIENT_SECRET || '';
    const licenseSkuId = process.env.M365_LICENSE_SKU_ID || '';

    const missingAzureVars: string[] = [];
    if (!tenantId) missingAzureVars.push('AZURE_TENANT_ID');
    if (!clientId) missingAzureVars.push('AZURE_CLIENT_ID');
    if (!clientSecret) missingAzureVars.push('AZURE_CLIENT_SECRET');
    if (!licenseSkuId) missingAzureVars.push('M365_LICENSE_SKU_ID');
    if (missingAzureVars.length > 0) {
      return json(res, 500, { error: 'Azure/M365 environment variables are not configured.', missing: missingAzureVars });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    const canUseSupabase = Boolean(supabaseUrl && supabaseKey);
    const supabaseAdmin = canUseSupabase ? createClient(supabaseUrl, supabaseKey) : null;

    if (req.method === 'GET') {
      const learnerId = String(req.query.learnerId || '').trim();
      if (!learnerId) return json(res, 400, { error: 'learnerId is required.' });
      if (!supabaseAdmin) return json(res, 500, { error: 'Supabase service is required for Microsoft status sync.' });

      const learnerResult = await supabaseAdmin
        .from('registrar_learners')
        .select('id,microsoft_user_id,microsoft_upn,microsoft_mail_nickname,microsoft_created_at')
        .eq('id', learnerId)
        .maybeSingle();

      if (learnerResult.error) return json(res, 502, { error: 'Failed to read learner record', details: learnerResult.error.message });
      if (!learnerResult.data) return json(res, 404, { error: 'Learner not found' });

      const localUserId = String(learnerResult.data.microsoft_user_id || '').trim();
      const localUpn = String(learnerResult.data.microsoft_upn || '').trim();
      const localNickname = String(learnerResult.data.microsoft_mail_nickname || '').trim();
      const nowIso = new Date().toISOString();

      if (!localUserId && !localUpn) {
        await supabaseAdmin.from('registrar_learners').update({ microsoft_account_status: 'Not Linked', microsoft_last_synced_at: nowIso }).eq('id', learnerId);
        return json(res, 200, {
          exists: false, learnerId, microsoftAccountStatus: 'Not Linked', microsoftLastSyncedAt: nowIso, microsoftMailNickname: localNickname, microsoftUserId: '', userPrincipalName: '',
        });
      }

      const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
      const graphKey = localUserId || localUpn;
      const graphResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphKey)}?$select=id,userPrincipalName`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (graphResponse.status === 404) {
        await supabaseAdmin.from('registrar_learners').update({
          microsoft_user_id: null, microsoft_upn: null, microsoft_account_status: 'Deleted', microsoft_last_synced_at: nowIso,
        }).eq('id', learnerId);
        return json(res, 200, {
          exists: false, learnerId, microsoftAccountStatus: 'Deleted', microsoftCreatedAt: learnerResult.data.microsoft_created_at || null, microsoftLastSyncedAt: nowIso,
          microsoftMailNickname: localNickname, microsoftUserId: '', userPrincipalName: '',
        });
      }

      if (!graphResponse.ok) return json(res, 502, { error: 'Graph status check failed', details: await graphResponse.text() });

      const graphJson = await graphResponse.json();
      const graphUserId = String(graphJson?.id || localUserId || '').trim();
      const graphUpn = String(graphJson?.userPrincipalName || localUpn || '').trim();
      await supabaseAdmin.from('registrar_learners').update({
        microsoft_user_id: graphUserId || null, microsoft_upn: graphUpn || null, microsoft_account_status: 'Active', microsoft_last_synced_at: nowIso,
      }).eq('id', learnerId);

      return json(res, 200, {
        exists: true, learnerId, microsoftAccountStatus: 'Active', microsoftCreatedAt: learnerResult.data.microsoft_created_at || null,
        microsoftLastSyncedAt: nowIso, microsoftMailNickname: localNickname, microsoftUserId: graphUserId, userPrincipalName: graphUpn,
      });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    const parsed = readBody(req);
    const action = String(parsed.action || '').trim().toLowerCase();
    const learnerId = String(parsed.learnerId || '').trim();
    const displayName = String(parsed.displayName || '').trim();
    const mailNickname = String(parsed.mailNickname || '').trim();
    const userPrincipalName = String(parsed.userPrincipalName || '').trim();
    const temporaryPassword = String(parsed.temporaryPassword || '').trim();
    const newPassword = String(parsed.newPassword || '').trim();

    if ((action === 'reset-password' || action === 'delete-account')) {
      if (!learnerId) return json(res, 400, { error: 'learnerId is required.' });
      if (!supabaseAdmin) return json(res, 500, { error: 'Supabase service is required.' });

      const learnerResult = await supabaseAdmin.from('registrar_learners').select('id,microsoft_user_id,microsoft_upn').eq('id', learnerId).maybeSingle();
      if (learnerResult.error) return json(res, 502, { error: 'Failed to read learner record', details: learnerResult.error.message });
      if (!learnerResult.data) return json(res, 404, { error: 'Learner not found' });

      const graphKey = String(learnerResult.data.microsoft_user_id || learnerResult.data.microsoft_upn || '').trim();
      const nowIso = new Date().toISOString();

      if (action === 'reset-password') {
        if (!newPassword) return json(res, 400, { error: 'newPassword is required for reset-password.' });
        if (!graphKey) return json(res, 409, { error: 'Learner has no linked Microsoft account.' });
        const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
        const resetResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphKey)}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ passwordProfile: { forceChangePasswordNextSignIn: false, password: newPassword } }),
        });
        if (!resetResponse.ok) return json(res, 502, { error: 'Microsoft password reset failed', details: await resetResponse.text() });
        await supabaseAdmin.from('registrar_learners').update({ microsoft_last_synced_at: nowIso, microsoft_account_status: 'Active' }).eq('id', learnerId);
        return json(res, 200, { learnerId, microsoftAccountStatus: 'Active', microsoftLastSyncedAt: nowIso });
      }

      if (graphKey) {
        const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
        const deleteResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(graphKey)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!deleteResponse.ok && deleteResponse.status !== 404) return json(res, 502, { error: 'Microsoft delete failed', details: await deleteResponse.text() });
      }
      await supabaseAdmin.from('registrar_learners').update({
        microsoft_user_id: null, microsoft_upn: null, microsoft_account_status: 'Deleted', microsoft_last_synced_at: nowIso,
      }).eq('id', learnerId);
      return json(res, 200, { learnerId, microsoftAccountStatus: 'Deleted', microsoftLastSyncedAt: nowIso });
    }

    if (!learnerId || !displayName || !mailNickname || !userPrincipalName || !temporaryPassword) {
      return json(res, 400, { error: 'learnerId, displayName, mailNickname, userPrincipalName, and temporaryPassword are required.' });
    }

    if (supabaseAdmin) {
      const existingLearnerResult = await supabaseAdmin.from('registrar_learners').select('id,microsoft_user_id,microsoft_upn').eq('id', learnerId).maybeSingle();
      if (existingLearnerResult.error) return json(res, 502, { error: 'Failed to read learner record', details: existingLearnerResult.error.message });
      if (!existingLearnerResult.data) return json(res, 404, { error: 'Learner not found' });
      if (existingLearnerResult.data.microsoft_user_id || existingLearnerResult.data.microsoft_upn) {
        return json(res, 409, {
          error: 'Learner already has a Microsoft account',
          microsoftUserId: existingLearnerResult.data.microsoft_user_id,
          userPrincipalName: existingLearnerResult.data.microsoft_upn,
        });
      }
    }

    const accessToken = await getAccessToken(tenantId, clientId, clientSecret);
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
    if (!createUserResponse.ok) return json(res, 502, { error: 'User creation failed', details: createUserText });

    const createdUser = createUserText ? JSON.parse(createUserText) : {};
    const createdUserId = String(createdUser?.id || '').trim();
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
      if (usageLocationResponse.ok) { usageLocationUpdated = true; break; }
      usageLocationLastError = await usageLocationResponse.text();
      await sleep(700 * attempt);
    }
    if (!usageLocationUpdated) return json(res, 502, { error: 'usageLocation update failed', createdUserId: createdUser?.id || null, userPrincipalName, details: usageLocationLastError });

    let assignLicenseText = '';
    let licenseAssigned = false;
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const assignLicenseResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userGraphKey)}/assignLicense`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ addLicenses: [{ skuId: licenseSkuId }], removeLicenses: [] }),
      });
      assignLicenseText = await assignLicenseResponse.text();
      if (assignLicenseResponse.ok) { licenseAssigned = true; break; }
      await sleep(900 * attempt);
    }
    if (!licenseAssigned) return json(res, 502, { error: 'License assignment failed', createdUserId: createdUser?.id || null, userPrincipalName, details: assignLicenseText });

    const licenseAssignmentResult = assignLicenseText ? JSON.parse(assignLicenseText) : { ok: true };
    const learnersGroupId = await getLearnersGroupId(accessToken);
    await addUserToGroup(accessToken, learnersGroupId, createdUser?.id || userGraphKey, userPrincipalName);

    if (supabaseAdmin) {
      const persistResult = await supabaseAdmin.from('registrar_learners').update({
        microsoft_user_id: createdUser?.id || null,
        microsoft_upn: userPrincipalName,
        microsoft_mail_nickname: mailNickname,
        microsoft_account_status: 'Active',
        microsoft_license_sku_id: licenseSkuId,
        microsoft_created_at: new Date().toISOString(),
        microsoft_last_synced_at: new Date().toISOString(),
      }).eq('id', learnerId);
      if (persistResult.error) return json(res, 502, {
        error: 'Microsoft account was created but failed to persist learner link',
        createdUserId: createdUser?.id || null,
        userPrincipalName,
        details: persistResult.error.message,
      });
    }

    return json(res, 200, { id: createdUser?.id || null, userPrincipalName, licenseAssignmentResult });
  } catch (error: any) {
    return json(res, 500, { error: 'Unexpected server error', details: error?.message || String(error) });
  }
}
