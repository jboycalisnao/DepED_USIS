import {
  checkGoogleAdminEmailExists,
  deleteGoogleAdminUser,
  getGoogleAdminOrgUnits,
  listGoogleAdminUsers,
  provisionGoogleClubAccount,
  resetGoogleAdminUserPassword,
  updateGoogleAdminUser,
} from '../lib/server/googleAdminProvisioning';

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
      const rawUrl = String(req.url || '');
      const parsedUrl = new URL(rawUrl, 'http://localhost');
      const checkEmail = parsedUrl.searchParams.get('checkEmail');
      if (checkEmail) {
        const result = await checkGoogleAdminEmailExists(checkEmail);
        return sendJson(res, 200, result);
      }

      const includeUsers = parsedUrl.searchParams.get('includeUsers') === '1';
      const result = includeUsers
        ? await listGoogleAdminUsers()
        : await getGoogleAdminOrgUnits();
      return sendJson(res, 200, result);
    } catch (err: any) {
      return sendJson(res, 400, {
        error: err?.message || 'Unable to load Google Workspace directory data.',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = parseBody(req.body);
      const result = await provisionGoogleClubAccount({
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
      });
      return sendJson(res, 200, result);
    } catch (err: any) {
      return sendJson(res, 400, {
        error: err?.message || 'Unable to provision Google Workspace account.',
      });
    }
  }

  if (req.method === 'PATCH') {
    try {
      const body = parseBody(req.body);
      if (body.mode === 'reset_password') {
        const result = await resetGoogleAdminUserPassword({
          primaryEmail: String(body.primaryEmail || ''),
          password: String(body.password || ''),
          changePasswordAtNextLogin:
            typeof body.changePasswordAtNextLogin === 'boolean'
              ? body.changePasswordAtNextLogin
              : true,
        });
        return sendJson(res, 200, result);
      }

      const result = await updateGoogleAdminUser({
        primaryEmail: String(body.primaryEmail || ''),
        newPrimaryEmail: body.newPrimaryEmail != null ? String(body.newPrimaryEmail) : undefined,
        firstName: body.firstName != null ? String(body.firstName) : undefined,
        lastName: body.lastName != null ? String(body.lastName) : undefined,
        orgUnitPath: body.orgUnitPath != null ? String(body.orgUnitPath) : undefined,
        suspended: typeof body.suspended === 'boolean' ? body.suspended : undefined,
      });
      return sendJson(res, 200, result);
    } catch (err: any) {
      return sendJson(res, 400, {
        error: err?.message || 'Unable to update Google Workspace account.',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const body = parseBody(req.body);
      const result = await deleteGoogleAdminUser({
        primaryEmail: String(body.primaryEmail || ''),
      });
      return sendJson(res, 200, result);
    } catch (err: any) {
      return sendJson(res, 400, {
        error: err?.message || 'Unable to delete Google Workspace account.',
      });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
  return sendJson(res, 405, { error: 'Method not allowed.' });
}
