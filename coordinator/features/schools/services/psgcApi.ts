export interface PsgcCityMunicipality {
  name: string;
  province: string;
  region: string;
  type: string;
}

export interface PsgcBarangay {
  city_municipality: string;
  name: string;
  province: string;
  region: string;
}

const DEFAULT_BASE_URL = 'https://psgc.cloud/api/v2';

const REGION_NAME_MAP: Record<string, string> = {
  BARMM: 'Bangsamoro Autonomous Region In Muslim Mindanao (BARMM)',
  CAR: 'Cordillera Administrative Region (CAR)',
  NCR: 'National Capital Region (NCR)',
  NIR: 'Negros Island Region (NIR)',
  'Region I': 'Region I (Ilocos Region)',
  'Region II': 'Region II (Cagayan Valley)',
  'Region III': 'Region III (Central Luzon)',
  'Region IV-A': 'Region IV-A (CALABARZON)',
  'Region IV-B': 'Region IV-B (MIMAROPA)',
  'Region IX': 'Region IX (Zamboanga Peninsula)',
  'Region V': 'Region V (Bicol Region)',
  'Region VI': 'Region VI (Western Visayas)',
  'Region VII': 'Region VII (Central Visayas)',
  'Region VIII': 'Region VIII (Eastern Visayas)',
  'Region X': 'Region X (Northern Mindanao)',
  'Region XI': 'Region XI (Davao Region)',
  'Region XII': 'Region XII (SOCCSKSARGEN)',
  'Region XIII': 'Region XIII (Caraga)',
};

const getBaseUrl = () => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.VITE_PSGC_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
};

const toName = (value: unknown) => {
  if (value && typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).name || '').trim();
  }
  return String(value || '').trim();
};

const getJson = async (path: string) => {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`PSGC API request failed (${response.status}).`);
  }
  return response.json();
};

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const resolvePsgcRegionName = (regionLabel: string) => REGION_NAME_MAP[regionLabel] || regionLabel;

export async function fetchPsgcCitiesMunicipalitiesByRegion(regionLabel: string): Promise<PsgcCityMunicipality[]> {
  const regionName = resolvePsgcRegionName(regionLabel);
  const payload = await getJson(`/regions/${encodeURIComponent(regionName)}/cities-municipalities`);
  const list = Array.isArray(payload) ? payload : [];
  return list.map((entry: any) => ({
    name: toName(entry?.name),
    province: toName(entry?.province),
    region: toName(entry?.region),
    type: toName(entry?.type),
  }));
}

export async function fetchPsgcBarangaysByCityMunicipality(
  cityMunicipalityName: string,
): Promise<PsgcBarangay[]> {
  const payload = await getJson(`/cities-municipalities/${encodeURIComponent(cityMunicipalityName)}/barangays`);
  const list = Array.isArray(payload) ? payload : [];
  return list.map((entry: any) => ({
    city_municipality: toName(entry?.city_municipality),
    name: toName(entry?.name),
    province: toName(entry?.province),
    region: toName(entry?.region),
  }));
}

export const namesMatch = (a: string, b: string) => normalize(a) === normalize(b);
