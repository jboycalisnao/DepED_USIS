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

const normalizeSchoolId = (record: DepedApiSchoolRecord) =>
  String(record?.beis_school_id || record?.school_id || record?.school_code || record?.schoolCode || record?.id || '').trim();

const matchesSchoolKeyword = (record: DepedApiSchoolRecord, keyword: string) => {
  const search = keyword.trim().toLowerCase();
  if (!search) return true;
  const schoolId = normalizeSchoolId(record).toLowerCase();
  const schoolName = String(record?.school_name || record?.schoolName || record?.name || '').trim().toLowerCase();
  return schoolId.includes(search) || schoolName.includes(search);
};

export async function fetchDepedSchools(keyword = ''): Promise<DepedApiSchoolRecord[]> {
  const search = keyword.trim();
  const path = search
    ? `/api/schools?page=1&limit=100&search=${encodeURIComponent(search)}&sort=school_name&order=asc`
    : '/api/schools?page=1&limit=200&sort=school_name&order=asc';
  const payload = await getJson(path);
  return toList(payload);
}

async function fetchAllDepedSchools(): Promise<DepedApiSchoolRecord[]> {
  const pageSize = 200;
  const maxPages = 50;
  const rows: DepedApiSchoolRecord[] = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const payload = await getJson(`/api/schools?page=${page}&limit=${pageSize}&sort=school_name&order=asc`);
    const batch = toList(payload);
    if (!batch.length) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  return rows;
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
  const search = keyword.trim();
  if (!search) {
    return (await fetchDepedSchools()).filter(isDepedSchoolActive);
  }

  const activeRows = search && /^\d+$/.test(search)
    ? (await fetchAllDepedSchools()).filter(isDepedSchoolActive)
    : (await fetchDepedSchools(search)).filter(isDepedSchoolActive);

  return activeRows.filter((record) => matchesSchoolKeyword(record, search));
}
