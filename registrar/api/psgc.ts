import type { VercelRequest, VercelResponse } from '@vercel/node';

type PsgcRow = {
  code: string;
  name: string;
  type?: string;
};

const json = (res: VercelResponse, statusCode: number, payload: unknown) => {
  res.status(statusCode).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(payload));
};

const normalizeRows = (payload: any): PsgcRow[] =>
  Array.isArray(payload)
    ? payload
        .map((row) => ({
          code: String(row?.code || '').trim(),
          name: String(row?.name || '').trim(),
          type: row?.type ? String(row.type).trim() : undefined,
        }))
        .filter((row) => row.code && row.name)
    : [];

const fetchFirstOkJson = async (paths: string[]) => {
  let lastError = '';
  for (const path of paths) {
    const response = await fetch(path);
    if (!response.ok) {
      lastError = `Request failed (${response.status}) for ${path}`;
      continue;
    }
    return response.json();
  }
  throw new Error(lastError || 'No PSGC endpoint returned a successful response.');
};

const uniqueRows = (rows: PsgcRow[]) => {
  const seen = new Set<string>();
  const unique: PsgcRow[] = [];
  for (const row of rows) {
    const key = `${row.code}:${row.name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }
  return unique;
};

const endpointCandidates = {
  regions: ['https://psgc.cloud/api/regions', 'https://psgc.gitlab.io/api/regions/'],
  provinces: ['https://psgc.cloud/api/provinces', 'https://psgc.gitlab.io/api/provinces/'],
  cities: ['https://psgc.cloud/api/cities', 'https://psgc.gitlab.io/api/cities/'],
  municipalities: ['https://psgc.cloud/api/municipalities', 'https://psgc.gitlab.io/api/municipalities/'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

    const type = String(req.query.type || '').trim().toLowerCase();
    if (!['regions', 'provinces', 'cities'].includes(type)) {
      return json(res, 400, { error: "Query param 'type' must be one of: regions, provinces, cities." });
    }

    if (type === 'regions') {
      const payload = await fetchFirstOkJson(endpointCandidates.regions);
      return json(res, 200, normalizeRows(payload));
    }

    if (type === 'provinces') {
      const payload = await fetchFirstOkJson(endpointCandidates.provinces);
      return json(res, 200, normalizeRows(payload));
    }

    const [citiesPayload, municipalitiesPayload] = await Promise.all([
      fetchFirstOkJson(endpointCandidates.cities),
      fetchFirstOkJson(endpointCandidates.municipalities),
    ]);
    const merged = [...normalizeRows(citiesPayload), ...normalizeRows(municipalitiesPayload)];
    return json(res, 200, uniqueRows(merged));
  } catch (error: any) {
    return json(res, 502, { error: 'Unable to load PSGC data', details: error?.message || String(error) });
  }
}

