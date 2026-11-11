import crypto from 'crypto';

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
};

export type ProvisionGoogleClubAccountInput = {
  primaryEmail: string;
  password: string;
  firstName?: string;
  lastName?: string;
  organizationAcronym?: string;
  organizationName?: string;
  orgUnitPath?: string;
  changePasswordAtNextLogin?: boolean;
  updateIfExists?: boolean;
};

export type ProvisionGoogleClubAccountResult = {
  ok: true;
  action: 'created' | 'updated';
  user: {
    id: string;
    primaryEmail: string;
    orgUnitPath: string;
    changePasswordAtNextLogin: boolean;
  };
};

export type GoogleDirectoryUserSummary = {
  id: string;
  primaryEmail: string;
  firstName: string;
  lastName: string;
  fullName: string;
  orgUnitPath: string;
  suspended: boolean;
  changePasswordAtNextLogin: boolean;
  lastLoginTime?: string;
  creationTime?: string;
  isAdmin: boolean;
};

export type UpdateGoogleUserInput = {
  primaryEmail: string;
  newPrimaryEmail?: string;
  firstName?: string;
  lastName?: string;
  orgUnitPath?: string;
  suspended?: boolean;
};

export type ResetGooglePasswordInput = {
  primaryEmail: string;
  password: string;
  changePasswordAtNextLogin?: boolean;
};

export type DeleteGoogleUserInput = {
  primaryEmail: string;
};

const DIRECTORY_USER_SCOPE = 'https://www.googleapis.com/auth/admin.directory.user';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DIRECTORY_USERS_URL = 'https://admin.googleapis.com/admin/directory/v1/users';
const ALLOWED_EMAIL_DOMAIN = '@leonnhs.edu.ph';

const toText = (value: unknown): string => String(value ?? '').trim();

const toBase64Url = (input: string | Buffer): string =>
  Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const parseServiceAccountJson = (raw: string): ServiceAccountCredentials => {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ServiceAccountCredentials;
  } catch {
    try {
      return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as ServiceAccountCredentials;
    } catch {
      return {};
    }
  }
};

export function resolveGoogleAdminConfig(envOverride?: Record<string, string | undefined>) {
  const read = (key: string) => toText(process.env[key] || envOverride?.[key]);

  const fromJson = parseServiceAccountJson(
    read('GOOGLE_SERVICE_ACCOUNT_JSON') || read('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64'),
  );

  const clientEmail = read('GOOGLE_SERVICE_ACCOUNT_EMAIL') || toText(fromJson.client_email);
  const rawKey = read('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') || toText(fromJson.private_key);
  const privateKey = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  const impersonateEmail = read('GOOGLE_ADMIN_IMPERSONATE_EMAIL');
  const orgUnitPath = read('GOOGLE_ADMIN_CLUB_OU') || '/';

  const missing: string[] = [];
  if (!clientEmail) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!privateKey) missing.push('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');
  if (!impersonateEmail) missing.push('GOOGLE_ADMIN_IMPERSONATE_EMAIL');

  return {
    clientEmail,
    privateKey,
    impersonateEmail,
    orgUnitPath,
    missing,
  };
}

async function getGoogleDirectoryAccessToken(config: {
  clientEmail: string;
  privateKey: string;
  impersonateEmail: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = toBase64Url(
    JSON.stringify({
      iss: config.clientEmail,
      sub: config.impersonateEmail,
      scope: DIRECTORY_USER_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = toBase64Url(signer.sign(config.privateKey));

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }).toString(),
  });

  if (!response.ok) {
    const rawText = await response.text();
    let detail = rawText;
    try {
      const parsed = JSON.parse(rawText);
      detail = parsed?.error_description || parsed?.error || rawText;
    } catch {
      // keep raw text
    }
    throw new Error(
      `Google Workspace OAuth token failed (${response.status}): ${detail}. Verify Domain-Wide Delegation for ${config.clientEmail} with scope "${DIRECTORY_USER_SCOPE}" and valid Super Admin impersonation (${config.impersonateEmail}).`,
    );
  }

  const payload = (await response.json()) as { access_token?: string };
  const accessToken = toText(payload.access_token);
  if (!accessToken) {
    throw new Error('Google OAuth response did not include an access token.');
  }
  return accessToken;
}

function formatGoogleApiError(status: number, bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText);
    const msg = parsed?.error?.message || parsed?.error_description || bodyText;
    return `Google Admin API (${status}): ${msg}`;
  } catch {
    return `Google Admin API (${status}): ${bodyText}`;
  }
}

function normalizeOuPath(raw?: string): string {
  const clean = toText(raw);
  if (!clean || clean === '/') return '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

export async function getGoogleAdminOrgUnits(
  envOverride?: Record<string, string | undefined>,
): Promise<{ ok: true; defaultOrgUnitPath: string; orgUnitPaths: string[] }> {
  const config = resolveGoogleAdminConfig(envOverride);
  const defaultOu = normalizeOuPath(config.orgUnitPath);
  const discovered = new Set<string>();
  if (defaultOu) discovered.add(defaultOu);

  if (config.missing.length === 0) {
    try {
      const accessToken = await getGoogleDirectoryAccessToken(config);
      const domain = config.impersonateEmail.split('@')[1] || 'leonnhs.edu.ph';
      const res = await fetch(
        `${DIRECTORY_USERS_URL}?domain=${encodeURIComponent(domain)}&maxResults=100&fields=users(orgUnitPath)`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (res.ok) {
        const data = (await res.json()) as { users?: Array<{ orgUnitPath?: string }> };
        for (const u of data.users || []) {
          if (u.orgUnitPath) discovered.add(normalizeOuPath(u.orgUnitPath));
        }
      }
    } catch {
      // fallback to configured + root OUs
    }
  }

  discovered.add('/');

  const orgUnitPaths = Array.from(discovered).sort((a, b) => {
    if (a === defaultOu) return -1;
    if (b === defaultOu) return 1;
    if (a === '/') return 1;
    if (b === '/') return -1;
    return a.localeCompare(b);
  });

  return { ok: true, defaultOrgUnitPath: defaultOu, orgUnitPaths };
}

export async function provisionGoogleClubAccount(
  input: ProvisionGoogleClubAccountInput,
  envOverride?: Record<string, string | undefined>,
): Promise<ProvisionGoogleClubAccountResult> {
  const primaryEmail = toText(input.primaryEmail).toLowerCase();
  const password = toText(input.password);
  const acronym = toText(input.organizationAcronym).toUpperCase();
  const orgName = toText(input.organizationName) || acronym || 'Leon National High School';
  const givenName = toText(input.firstName) || acronym || 'SCC';
  const familyName = toText(input.lastName) || 'Leon NHS Club';
  const changePasswordAtNextLogin = input.changePasswordAtNextLogin ?? true;

  if (!primaryEmail || !primaryEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Institutional mailbox must end with ${ALLOWED_EMAIL_DOMAIN}.`);
  }
  if (password.length < 8) {
    throw new Error('Temporary password must be at least 8 characters (Google Workspace minimum).');
  }

  const config = resolveGoogleAdminConfig(envOverride);
  if (config.missing.length > 0) {
    throw new Error(
      `Missing Google Admin server environment variables: ${config.missing.join(', ')}. Configure them in .env.local or Vercel project settings.`,
    );
  }

  const orgUnitPath = normalizeOuPath(toText(input.orgUnitPath) || config.orgUnitPath);
  const accessToken = await getGoogleDirectoryAccessToken(config);

  const createPayload: Record<string, unknown> = {
    primaryEmail,
    name: {
      givenName,
      familyName,
    },
    password,
    changePasswordAtNextLogin,
    organizations: [
      {
        name: orgName,
        title: acronym ? 'Official Student Organization Mailbox' : 'SCC Admin Provisioned Account',
        department: 'School Coordinating Council',
        primary: true,
      },
    ],
  };

  if (orgUnitPath !== '/') {
    createPayload.orgUnitPath = orgUnitPath;
  }

  const createRes = await fetch(DIRECTORY_USERS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(createPayload),
  });

  if (createRes.ok) {
    const created = (await createRes.json()) as any;
    return {
      ok: true,
      action: 'created',
      user: {
        id: String(created?.id || ''),
        primaryEmail: String(created?.primaryEmail || primaryEmail),
        orgUnitPath: String(created?.orgUnitPath || orgUnitPath),
        changePasswordAtNextLogin: Boolean(created?.changePasswordAtNextLogin ?? changePasswordAtNextLogin),
      },
    };
  }

  const errText = await createRes.text();

  if (createRes.status === 409) {
    if (!input.updateIfExists) {
      throw new Error(
        `Google Workspace account "${primaryEmail}" already exists in Google Admin Console. Enable "Reset password & link if mailbox already exists" to update and link it.`,
      );
    }

    const patchBody: Record<string, unknown> = {
      password,
      changePasswordAtNextLogin,
      suspended: false,
    };
    if (orgUnitPath !== '/') {
      patchBody.orgUnitPath = orgUnitPath;
    }

    const patchRes = await fetch(
      `${DIRECTORY_USERS_URL}/${encodeURIComponent(primaryEmail)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      },
    );

    if (!patchRes.ok) {
      const patchErrText = await patchRes.text();
      throw new Error(formatGoogleApiError(patchRes.status, patchErrText));
    }

    const updated = (await patchRes.json()) as any;
    return {
      ok: true,
      action: 'updated',
      user: {
        id: String(updated?.id || ''),
        primaryEmail: String(updated?.primaryEmail || primaryEmail),
        orgUnitPath: String(updated?.orgUnitPath || orgUnitPath),
        changePasswordAtNextLogin: Boolean(updated?.changePasswordAtNextLogin ?? changePasswordAtNextLogin),
      },
    };
  }

  if (errText.includes('INVALID_OU_ID')) {
    throw new Error(
      `Organizational Unit "${orgUnitPath}" does not exist in Google Admin Console. Choose a valid OU (e.g. "/School Orgs and Clubs") or "/" for the Root OU.`,
    );
  }

  throw new Error(formatGoogleApiError(createRes.status, errText));
}

function mapDirectoryUser(raw: any): GoogleDirectoryUserSummary {
  const firstName = toText(raw?.name?.givenName);
  const lastName = toText(raw?.name?.familyName);
  const fullName =
    toText(raw?.name?.fullName) || [firstName, lastName].filter(Boolean).join(' ') || toText(raw?.primaryEmail);
  return {
    id: String(raw?.id || ''),
    primaryEmail: String(raw?.primaryEmail || '').toLowerCase(),
    firstName,
    lastName,
    fullName,
    orgUnitPath: normalizeOuPath(raw?.orgUnitPath),
    suspended: Boolean(raw?.suspended),
    changePasswordAtNextLogin: Boolean(raw?.changePasswordAtNextLogin),
    lastLoginTime: raw?.lastLoginTime ? String(raw.lastLoginTime) : undefined,
    creationTime: raw?.creationTime ? String(raw.creationTime) : undefined,
    isAdmin: Boolean(raw?.isAdmin),
  };
}

export async function listGoogleAdminUsers(
  envOverride?: Record<string, string | undefined>,
): Promise<{
  ok: true;
  defaultOrgUnitPath: string;
  orgUnitPaths: string[];
  users: GoogleDirectoryUserSummary[];
}> {
  const config = resolveGoogleAdminConfig(envOverride);
  if (config.missing.length > 0) {
    throw new Error(
      `Missing Google Admin server environment variables: ${config.missing.join(', ')}. Configure them in .env.local or Vercel project settings.`,
    );
  }

  const defaultOu = normalizeOuPath(config.orgUnitPath);
  const accessToken = await getGoogleDirectoryAccessToken(config);
  const domain = config.impersonateEmail.split('@')[1] || 'leonnhs.edu.ph';

  const res = await fetch(
    `${DIRECTORY_USERS_URL}?domain=${encodeURIComponent(domain)}&maxResults=100&orderBy=email&fields=users(id,primaryEmail,name,orgUnitPath,suspended,changePasswordAtNextLogin,lastLoginTime,creationTime,isAdmin)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    throw new Error(formatGoogleApiError(res.status, await res.text()));
  }

  const data = (await res.json()) as { users?: any[] };
  const users = (data.users || []).map(mapDirectoryUser);

  const ouSet = new Set<string>([defaultOu, '/']);
  users.forEach((u) => {
    if (u.orgUnitPath) ouSet.add(u.orgUnitPath);
  });

  const orgUnitPaths = Array.from(ouSet).sort((a, b) => {
    if (a === defaultOu) return -1;
    if (b === defaultOu) return 1;
    if (a === '/') return 1;
    if (b === '/') return -1;
    return a.localeCompare(b);
  });

  return {
    ok: true,
    defaultOrgUnitPath: defaultOu,
    orgUnitPaths,
    users,
  };
}

export async function updateGoogleAdminUser(
  input: UpdateGoogleUserInput,
  envOverride?: Record<string, string | undefined>,
): Promise<{ ok: true; action: 'updated'; user: GoogleDirectoryUserSummary }> {
  const primaryEmail = toText(input.primaryEmail).toLowerCase();
  if (!primaryEmail || !primaryEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Target account must end with ${ALLOWED_EMAIL_DOMAIN}.`);
  }

  const config = resolveGoogleAdminConfig(envOverride);
  if (config.missing.length > 0) {
    throw new Error(
      `Missing Google Admin server environment variables: ${config.missing.join(', ')}.`,
    );
  }

  const newPrimaryEmail = toText(input.newPrimaryEmail).toLowerCase();
  if (newPrimaryEmail && !newPrimaryEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Updated email must end with ${ALLOWED_EMAIL_DOMAIN}.`);
  }

  if (
    primaryEmail === config.impersonateEmail.toLowerCase() &&
    (input.suspended === true || (newPrimaryEmail && newPrimaryEmail !== primaryEmail))
  ) {
    throw new Error('Cannot rename or suspend the active Google Admin impersonation account.');
  }

  const patchBody: Record<string, unknown> = {};
  if (input.firstName !== undefined || input.lastName !== undefined) {
    const nameObj: Record<string, string> = {};
    if (toText(input.firstName)) nameObj.givenName = toText(input.firstName);
    if (toText(input.lastName)) nameObj.familyName = toText(input.lastName);
    if (Object.keys(nameObj).length > 0) patchBody.name = nameObj;
  }
  if (newPrimaryEmail && newPrimaryEmail !== primaryEmail) {
    const dupCheck = await checkGoogleAdminEmailExists(newPrimaryEmail, envOverride);
    if (dupCheck.existsInGoogleAdmin) {
      throw new Error(
        `${newPrimaryEmail} is registered already to ${dupCheck.registeredTo || 'an existing account'}. Please select other email address.`,
      );
    }
    patchBody.primaryEmail = newPrimaryEmail;
  }
  if (input.orgUnitPath !== undefined) {
    patchBody.orgUnitPath = normalizeOuPath(input.orgUnitPath);
  }
  if (typeof input.suspended === 'boolean') {
    patchBody.suspended = input.suspended;
  }

  if (Object.keys(patchBody).length === 0) {
    throw new Error('No modifications were provided.');
  }

  const accessToken = await getGoogleDirectoryAccessToken(config);
  const res = await fetch(
    `${DIRECTORY_USERS_URL}/${encodeURIComponent(primaryEmail)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchBody),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes('INVALID_OU_ID')) {
      throw new Error(
        `Organizational Unit "${patchBody.orgUnitPath}" does not exist in Google Admin Console.`,
      );
    }
    throw new Error(formatGoogleApiError(res.status, errText));
  }

  const updated = await res.json();
  return {
    ok: true,
    action: 'updated',
    user: mapDirectoryUser(updated),
  };
}

export async function resetGoogleAdminUserPassword(
  input: ResetGooglePasswordInput,
  envOverride?: Record<string, string | undefined>,
): Promise<{ ok: true; action: 'updated'; user: GoogleDirectoryUserSummary }> {
  const primaryEmail = toText(input.primaryEmail).toLowerCase();
  const password = toText(input.password);
  const changePasswordAtNextLogin = input.changePasswordAtNextLogin ?? true;

  if (!primaryEmail || !primaryEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Target account must end with ${ALLOWED_EMAIL_DOMAIN}.`);
  }
  if (password.length < 8) {
    throw new Error('New temporary password must be at least 8 characters.');
  }

  const config = resolveGoogleAdminConfig(envOverride);
  if (config.missing.length > 0) {
    throw new Error(
      `Missing Google Admin server environment variables: ${config.missing.join(', ')}.`,
    );
  }

  const accessToken = await getGoogleDirectoryAccessToken(config);
  const res = await fetch(
    `${DIRECTORY_USERS_URL}/${encodeURIComponent(primaryEmail)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        changePasswordAtNextLogin,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(formatGoogleApiError(res.status, await res.text()));
  }

  const updated = await res.json();
  return {
    ok: true,
    action: 'updated',
    user: mapDirectoryUser(updated),
  };
}

export async function deleteGoogleAdminUser(
  input: DeleteGoogleUserInput,
  envOverride?: Record<string, string | undefined>,
): Promise<{ ok: true; action: 'deleted'; primaryEmail: string }> {
  const primaryEmail = toText(input.primaryEmail).toLowerCase();
  if (!primaryEmail || !primaryEmail.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`Target account must end with ${ALLOWED_EMAIL_DOMAIN}.`);
  }

  const config = resolveGoogleAdminConfig(envOverride);
  if (config.missing.length > 0) {
    throw new Error(
      `Missing Google Admin server environment variables: ${config.missing.join(', ')}.`,
    );
  }

  if (primaryEmail === config.impersonateEmail.toLowerCase()) {
    throw new Error('Cannot delete the active Google Admin impersonation account.');
  }

  const accessToken = await getGoogleDirectoryAccessToken(config);

  // Safeguard: block deleting Google Workspace Admin accounts from SCC Admin
  const lookupRes = await fetch(
    `${DIRECTORY_USERS_URL}/${encodeURIComponent(primaryEmail)}?fields=primaryEmail,isAdmin`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (lookupRes.ok) {
    const info = (await lookupRes.json()) as { isAdmin?: boolean };
    if (info?.isAdmin) {
      throw new Error(
        `Account "${primaryEmail}" is a Google Workspace Administrator and cannot be deleted from SCC Admin.`,
      );
    }
  }

  const delRes = await fetch(
    `${DIRECTORY_USERS_URL}/${encodeURIComponent(primaryEmail)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!delRes.ok) {
    throw new Error(formatGoogleApiError(delRes.status, await delRes.text()));
  }

  return {
    ok: true,
    action: 'deleted',
    primaryEmail,
  };
}

export async function checkGoogleAdminEmailExists(
  email: string,
  envOverride?: Record<string, string | undefined>,
): Promise<{
  ok: true;
  email: string;
  checked: boolean;
  existsInGoogleAdmin: boolean;
  primaryEmail?: string;
  registeredTo?: string;
  suspended?: boolean;
  reason?: string;
}> {
  const normalized = toText(email).toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return {
      ok: true,
      email: normalized,
      checked: false,
      existsInGoogleAdmin: false,
      reason: 'Invalid email format.',
    };
  }

  const config = resolveGoogleAdminConfig(envOverride);
  if (config.missing.length > 0) {
    return {
      ok: true,
      email: normalized,
      checked: false,
      existsInGoogleAdmin: false,
      reason: `Missing Google Admin server env vars: ${config.missing.join(', ')}`,
    };
  }

  try {
    const accessToken = await getGoogleDirectoryAccessToken(config);
    const res = await fetch(
      `${DIRECTORY_USERS_URL}/${encodeURIComponent(normalized)}?fields=id,primaryEmail,name,organizations,suspended`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (res.status === 200) {
      const data = (await res.json()) as {
        primaryEmail?: string;
        suspended?: boolean;
        name?: { fullName?: string; givenName?: string; familyName?: string };
        organizations?: Array<{ name?: string }>;
      };
      const registeredTo =
        toText(data?.name?.fullName) ||
        [toText(data?.name?.givenName), toText(data?.name?.familyName)]
          .filter(Boolean)
          .join(' ') ||
        toText(data?.organizations?.[0]?.name) ||
        toText(data?.primaryEmail || normalized);

      return {
        ok: true,
        email: normalized,
        checked: true,
        existsInGoogleAdmin: true,
        primaryEmail: toText(data?.primaryEmail || normalized).toLowerCase(),
        registeredTo,
        suspended: Boolean(data?.suspended),
      };
    }

    if (res.status === 404) {
      return {
        ok: true,
        email: normalized,
        checked: true,
        existsInGoogleAdmin: false,
      };
    }

    return {
      ok: true,
      email: normalized,
      checked: false,
      existsInGoogleAdmin: false,
      reason: formatGoogleApiError(res.status, await res.text()),
    };
  } catch (err: any) {
    return {
      ok: true,
      email: normalized,
      checked: false,
      existsInGoogleAdmin: false,
      reason: err?.message || 'Unable to query Google Admin Users Directory.',
    };
  }
}
