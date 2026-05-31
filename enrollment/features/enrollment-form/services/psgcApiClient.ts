export type PsgcLocation = {
  code: string;
  name: string;
  type?: string;
};

const PSGC_BASE_URLS = ['https://psgc.cloud/api', 'https://psgc.gitlab.io/api'];
const isValidPsgcLocalityCode = (value: string) => /^\d{9,10}$/.test(String(value || '').trim());

async function getJson(path: string) {
  let lastError = '';
  for (const baseUrl of PSGC_BASE_URLS) {
    const response = await fetch(`${baseUrl}${path}`);
    if (!response.ok) {
      lastError = `PSGC API request failed (${response.status}) at ${baseUrl}${path}.`;
      continue;
    }
    return response.json();
  }
  throw new Error(lastError || 'PSGC API request failed.');
}

const normalizeRows = (payload: any): PsgcLocation[] =>
  Array.isArray(payload)
    ? payload
        .map((row) => ({
          code: String(row?.code || '').trim(),
          name: String(row?.name || '').trim(),
          type: row?.type ? String(row.type).trim() : undefined,
        }))
        .filter((row) => row.code && row.name)
    : [];

export async function fetchPsgcRegions(): Promise<PsgcLocation[]> {
  const payload = await getJson('/regions');
  return normalizeRows(payload);
}

export async function fetchPsgcProvinces(): Promise<PsgcLocation[]> {
  const payload = await getJson('/provinces');
  return normalizeRows(payload);
}

export async function fetchPsgcProvincesByRegion(regionCode: string): Promise<PsgcLocation[]> {
  const normalizedCode = String(regionCode || '').trim();
  if (!normalizedCode) return [];
  const payload = await getJson(`/regions/${normalizedCode}/provinces`);
  return normalizeRows(payload);
}

export async function fetchPsgcCitiesAndMunicipalities(): Promise<PsgcLocation[]> {
  const [citiesPayload, municipalitiesPayload] = await Promise.all([getJson('/cities'), getJson('/municipalities')]);
  const merged = [...normalizeRows(citiesPayload), ...normalizeRows(municipalitiesPayload)];
  const seen = new Set<string>();
  const unique: PsgcLocation[] = [];
  for (const row of merged) {
    const key = `${row.code}:${row.name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }
  return unique;
}

export async function fetchPsgcCitiesAndMunicipalitiesByProvince(provinceCode: string): Promise<PsgcLocation[]> {
  const normalizedCode = String(provinceCode || '').trim();
  if (!normalizedCode) return [];

  const [citiesPayload, municipalitiesPayload] = await Promise.all([
    getJson(`/provinces/${normalizedCode}/cities`),
    getJson(`/provinces/${normalizedCode}/municipalities`),
  ]);

  const merged = [...normalizeRows(citiesPayload), ...normalizeRows(municipalitiesPayload)];
  const seen = new Set<string>();
  const unique: PsgcLocation[] = [];
  for (const row of merged) {
    const key = `${row.code}:${row.name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }
  return unique;
}

export async function fetchPsgcCitiesAndMunicipalitiesByRegion(regionCode: string): Promise<PsgcLocation[]> {
  const normalizedCode = String(regionCode || '').trim();
  if (!normalizedCode) return [];

  const [citiesPayload, municipalitiesPayload] = await Promise.all([
    getJson(`/regions/${normalizedCode}/cities`),
    getJson(`/regions/${normalizedCode}/municipalities`),
  ]);

  const merged = [...normalizeRows(citiesPayload), ...normalizeRows(municipalitiesPayload)];
  const seen = new Set<string>();
  const unique: PsgcLocation[] = [];
  for (const row of merged) {
    const key = `${row.code}:${row.name.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(row);
    }
  }
  return unique;
}

export async function fetchPsgcBarangaysByLocality(localityCode: string): Promise<PsgcLocation[]> {
  const normalizedCode = String(localityCode || '').trim();
  if (!normalizedCode || !isValidPsgcLocalityCode(normalizedCode)) return [];

  const tryPaths = [`/cities/${normalizedCode}/barangays`, `/municipalities/${normalizedCode}/barangays`];
  for (const path of tryPaths) {
    try {
      const payload = await getJson(path);
      const rows = normalizeRows(payload);
      if (rows.length > 0) return rows;
    } catch {
      continue;
    }
  }

  return [];
}
