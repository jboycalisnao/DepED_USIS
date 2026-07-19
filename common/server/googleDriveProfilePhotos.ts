import crypto from 'crypto';

type ServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
};

export type DriveUploadResult = {
  id: string;
  name: string;
  mimeType: string;
};

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

const toText = (value: unknown) => String(value ?? '').trim();

const toBase64Url = (input: string | Buffer) =>
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

export const resolveGoogleServiceAccountCredentials = () => {
  const fromJson = parseServiceAccountJson(
    toText(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64),
  );
  const clientEmail = toText(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || fromJson.client_email);
  const privateKey = toText(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || fromJson.private_key).replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Google service account credentials are missing.');
  }

  return { clientEmail, privateKey };
};

export const getProfilePhotosFolderId = () => {
  const folderId = toText(process.env.GOOGLE_DRIVE_PROFILE_PHOTOS_FOLDER_ID);
  if (!folderId) throw new Error('GOOGLE_DRIVE_PROFILE_PHOTOS_FOLDER_ID is not configured.');
  return folderId;
};

export const getGoogleDriveAccessToken = async () => {
  const { clientEmail, privateKey } = resolveGoogleServiceAccountCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = toBase64Url(JSON.stringify({
    iss: clientEmail,
    scope: DRIVE_SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }));
  const unsignedToken = `${header}.${payload}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsignedToken).sign(privateKey);
  const assertion = `${unsignedToken}.${toBase64Url(signature)}`;

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const body = await response.json().catch(() => null) as { access_token?: string; error_description?: string; error?: string } | null;
  if (!response.ok || !body?.access_token) {
    throw new Error(body?.error_description || body?.error || 'Google access token request failed.');
  }

  return body.access_token;
};

export const uploadProfilePhotoToDrive = async (input: {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  existingFileId?: string;
}): Promise<DriveUploadResult> => {
  const accessToken = await getGoogleDriveAccessToken();
  const folderId = getProfilePhotosFolderId();
  const boundary = `usis_profile_photo_${Date.now()}`;
  const metadata: Record<string, unknown> = {
    name: input.fileName,
    mimeType: input.mimeType,
  };
  if (!input.existingFileId) metadata.parents = [folderId];

  const prefix = Buffer.from(
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${input.mimeType}\r\n\r\n`,
    'utf8',
  );
  const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
  const body = Buffer.concat([prefix, input.bytes, suffix]);
  const isUpdate = Boolean(input.existingFileId);
  const url = isUpdate
    ? `${DRIVE_UPLOAD_URL}/${encodeURIComponent(input.existingFileId || '')}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType`;

  const response = await fetch(url, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  });

  const result = await response.json().catch(() => null) as Partial<DriveUploadResult> & { error?: { message?: string } } | null;
  if (!response.ok || !result?.id) {
    throw new Error(result?.error?.message || 'Google Drive profile photo upload failed.');
  }

  return {
    id: toText(result.id),
    name: toText(result.name),
    mimeType: toText(result.mimeType) || input.mimeType,
  };
};

export const fetchProfilePhotoFromDrive = async (fileId: string) => {
  const accessToken = await getGoogleDriveAccessToken();
  const response = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(details || 'Google Drive profile photo fetch failed.');
  }

  return {
    contentType: response.headers.get('content-type') || 'application/octet-stream',
    bytes: Buffer.from(await response.arrayBuffer()),
  };
};

export const deleteProfilePhotoFromDrive = async (fileId: string) => {
  const normalizedFileId = toText(fileId);
  if (!normalizedFileId) return;

  const accessToken = await getGoogleDriveAccessToken();
  const response = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(normalizedFileId)}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.ok || response.status === 404) return;

  const details = await response.text().catch(() => '');
  throw new Error(details || 'Google Drive profile photo delete failed.');
};
