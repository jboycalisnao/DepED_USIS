import crypto from 'node:crypto';

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
};

const DIRECTORY_USER_READONLY_SCOPE =
  'https://www.googleapis.com/auth/admin.directory.user.readonly';
const DIRECTORY_USER_SCOPE =
  'https://www.googleapis.com/auth/admin.directory.user';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DIRECTORY_USERS_URL = 'https://admin.googleapis.com/admin/directory/v1/users';

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

const fetchAccessToken = async (params: {
  clientEmail: string;
  privateKey: string;
  impersonateEmail: string;
  scope: string;
}): Promise<string> => {
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = toBase64Url(
    JSON.stringify({
      iss: params.clientEmail,
      sub: params.impersonateEmail,
      scope: params.scope,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${claimSet}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = toBase64Url(signer.sign(params.privateKey));

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Google OAuth failed (${response.status})`);
  }

  const payload = (await response.json()) as { access_token?: string };
  const token = toText(payload.access_token);
  if (!token) throw new Error('Google OAuth response missing access token.');
  return token;
};

export async function checkEmailInGoogleAdminDirectory(
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
      reason: 'Invalid email address.',
    };
  }

  const read = (key: string) => toText(process.env[key] || envOverride?.[key]);
  const fromJson = parseServiceAccountJson(
    read('GOOGLE_SERVICE_ACCOUNT_JSON') || read('GOOGLE_SERVICE_ACCOUNT_JSON_BASE64'),
  );
  const clientEmail = read('GOOGLE_SERVICE_ACCOUNT_EMAIL') || toText(fromJson.client_email);
  const rawKey = read('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY') || toText(fromJson.private_key);
  const privateKey = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
  const impersonateEmail = read('GOOGLE_ADMIN_IMPERSONATE_EMAIL');

  if (!clientEmail || !privateKey || !impersonateEmail) {
    return {
      ok: true,
      email: normalized,
      checked: false,
      existsInGoogleAdmin: false,
      reason: 'Google Admin directory credentials not configured.',
    };
  }

  try {
    let accessToken: string;
    try {
      accessToken = await fetchAccessToken({
        clientEmail,
        privateKey,
        impersonateEmail,
        scope: DIRECTORY_USER_SCOPE,
      });
    } catch {
      accessToken = await fetchAccessToken({
        clientEmail,
        privateKey,
        impersonateEmail,
        scope: DIRECTORY_USER_READONLY_SCOPE,
      });
    }

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
      reason: `Google Admin Directory returned HTTP ${res.status}.`,
    };
  } catch (err: any) {
    return {
      ok: true,
      email: normalized,
      checked: false,
      existsInGoogleAdmin: false,
      reason: err?.message || 'Unable to query Google Admin Directory.',
    };
  }
}
