export type PsgcLocation = {
  code: string;
  name: string;
  type?: string;
};

async function getJson(path: string) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`PSGC API request failed (${response.status}) for ${path}.`);
  }
  return response.json();
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
  const payload = await getJson('/api/psgc?type=regions');
  return normalizeRows(payload);
}

export async function fetchPsgcProvinces(): Promise<PsgcLocation[]> {
  const payload = await getJson('/api/psgc?type=provinces');
  return normalizeRows(payload);
}

export async function fetchPsgcCitiesAndMunicipalities(): Promise<PsgcLocation[]> {
  const payload = await getJson('/api/psgc?type=cities');
  return normalizeRows(payload);
}
