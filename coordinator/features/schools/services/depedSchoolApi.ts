import { parseDepedSchoolResponse } from '../utils/depedSchoolParser';
export interface DepedSchoolRecord {
  barangay: string;
  division: string;
  municipality: string;
  province: string;
  region: string;
  schoolId: string;
  schoolName: string;
  schoolType: string;
}

interface FetchDepedSchoolsParams {
  barangay?: string;
  division?: string;
  limit?: number;
  municipality?: string;
  order?: 'asc' | 'desc';
  page?: number;
  region?: string;
  schoolType?: string;
  search?: string;
  sort?: string;
}

const DEFAULT_BASE_URL = 'https://deped-api.vercel.app';

const getBaseUrl = () => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.VITE_DEPED_API_BASE_URL?.trim() || DEFAULT_BASE_URL;
};

const normalizeSchoolRecord = parseDepedSchoolResponse;

const toList = (payload: any): any[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.schools)) return payload.schools;
  return [];
};

export async function fetchDepedSchools(params: FetchDepedSchoolsParams = {}): Promise<DepedSchoolRecord[]> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 100));
  query.set('sort', params.sort ?? 'school_name');
  query.set('order', params.order ?? 'asc');
  if (params.region) query.set('region', params.region);
  if (params.division) query.set('division', params.division);
  if (params.municipality) query.set('municipality', params.municipality);
  if (params.barangay) query.set('barangay', params.barangay);
  if (params.schoolType) query.set('school_type', params.schoolType);
  if (params.search) query.set('search', params.search);

  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${baseUrl}/api/schools?${query.toString()}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DepEd API error: ${response.statusText}`);
    }

    const payload = await response.json();
    return toList(payload)
      .map(normalizeSchoolRecord)
      .filter((entry) => entry.schoolId && entry.schoolName);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('DepEd API request timed out after 10 seconds.');
    }
    throw error;
  }
}
export async function fetchDepedSchoolById(schoolId: string): Promise<DepedSchoolRecord | null> {
  const baseUrl = getBaseUrl().replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/api/schools/${schoolId}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`DepEd API error: ${response.statusText}`);
    }

    const payload = await response.json();
    return normalizeSchoolRecord(payload);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('DepEd API request timed out.');
    }
    throw error;
  }
}
