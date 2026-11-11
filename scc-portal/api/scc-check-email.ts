import { checkEmailInGoogleAdminDirectory } from '../lib/server/googleDirectoryCheck';

type ApiRequest = {
  method?: string;
  url?: string;
};

type ApiResponse = {
  status(code: number): ApiResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  const parsedUrl = new URL(String(req.url || ''), 'http://localhost');
  const email = parsedUrl.searchParams.get('email') || '';
  const result = await checkEmailInGoogleAdminDirectory(email);

  res.status(200).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(result));
}
