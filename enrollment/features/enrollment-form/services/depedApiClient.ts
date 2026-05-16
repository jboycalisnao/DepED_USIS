export type DepedApiSchoolRecord = {
  beis_school_id?: string | number;
  school_id?: string | number;
  school_code?: string | number;
  schoolCode?: string | number;
  id?: string | number;
  school_name?: string;
  schoolName?: string;
  name?: string;
  is_active?: boolean;
  status?: string;
};

const DEFAULT_BASE_URL = 'https://deped-api.vercel.app';

const getBaseUrl = () => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.VITE_DEPED_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
};

async function getJson(path: string) {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`DepEd API request failed (${response.status}).`);
  }
  return response.json();
}

const toList = (payload: any): DepedApiSchoolRecord[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.schools)) return payload.schools;
  return [];
};

export async function fetchDepedSchools(keyword = ''): Promise<DepedApiSchoolRecord[]> {
  const search = keyword.trim();
  const path = search
    ? `/api/schools?page=1&limit=100&search=${encodeURIComponent(search)}&sort=school_name&order=asc`
    : '/api/schools?page=1&limit=200&sort=school_name&order=asc';
  const payload = await getJson(path);
  return toList(payload);
}

export function isDepedSchoolActive(record: DepedApiSchoolRecord): boolean {
  if (typeof record?.is_active === 'boolean') {
    return record.is_active;
  }
  const normalizedStatus = String(record?.status || '').trim().toLowerCase();
  if (!normalizedStatus) return true;
  return ['active', 'open', 'operational'].includes(normalizedStatus);
}

export async function fetchActiveDepedSchools(keyword = ''): Promise<DepedApiSchoolRecord[]> {
  const rows = await fetchDepedSchools(keyword);
  return rows.filter(isDepedSchoolActive);
}
