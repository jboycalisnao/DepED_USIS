export type SchoolDirectoryEntry = {
  schoolId: string;
  schoolName: string;
};

import { supabase } from '../../../../lib/supabase';
import { fetchDepedSchoolById, fetchDepedSchools } from './depedApiClient';

const LEON_NHS_ID = '302522';
const LEON_NHS_NAME = 'Leon National High School';

const normalizeSchool = (raw: any): SchoolDirectoryEntry | null => {
  const schoolId = String(
    raw?.beis_school_id ||
    raw?.school_id ||
    raw?.school_code ||
    raw?.schoolCode ||
    raw?.schoolId ||
    raw?.id ||
    ''
  ).trim();
  const schoolName = String(
    raw?.school_name ||
    raw?.name ||
    raw?.schoolName ||
    ''
  ).trim();

  if (!schoolId || !schoolName) {
    return null;
  }

  return { schoolId, schoolName };
};

const uniqueSchools = (entries: SchoolDirectoryEntry[]) => {
  const seen = new Set<string>();
  const deduped: SchoolDirectoryEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.schoolId}::${entry.schoolName.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(entry);
    }
  }
  return deduped;
};

async function fetchFromDepedApi(keyword = ''): Promise<SchoolDirectoryEntry[]> {
  const source = await fetchDepedSchools(keyword);
  return uniqueSchools(source.map(normalizeSchool).filter(Boolean) as SchoolDirectoryEntry[]);
}

async function fetchFromSupabase(): Promise<SchoolDirectoryEntry[]> {
  const { data, error } = await supabase
    .from('usis_schools')
    .select('school_code, school_name, is_active')
    .eq('is_active', true)
    .order('school_name', { ascending: true });

  if (!error && data?.length) {
    return uniqueSchools(data
      .map((row) => ({
        schoolId: String(row.school_code || '').trim(),
        schoolName: String(row.school_name || '').trim(),
      }))
      .filter((entry) => entry.schoolId && entry.schoolName));
  }

  return [];
}

export async function fetchSchoolDirectory(): Promise<SchoolDirectoryEntry[]> {
  const apiSchools = await fetchFromDepedApi();
  if (apiSchools.length) {
    return apiSchools;
  }

  const supabaseSchools = await fetchFromSupabase();
  if (supabaseSchools.length) {
    return supabaseSchools;
  }

  return [{ schoolId: LEON_NHS_ID, schoolName: LEON_NHS_NAME }];
}

export async function searchSchoolDirectory(keyword: string): Promise<SchoolDirectoryEntry[]> {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return fetchSchoolDirectory();
  }

  const apiSchools = await fetchFromDepedApi(trimmed);
  if (apiSchools.length) {
    return apiSchools;
  }

  const supabaseSchools = await fetchFromSupabase();
  if (!supabaseSchools.length) {
    return [{ schoolId: LEON_NHS_ID, schoolName: LEON_NHS_NAME }].filter((entry) =>
      entry.schoolName.toLowerCase().includes(trimmed.toLowerCase())
    );
  }

  return supabaseSchools.filter((entry) =>
    entry.schoolName.toLowerCase().includes(trimmed.toLowerCase())
  );
}

export async function resolveSchoolById(schoolId: string): Promise<SchoolDirectoryEntry | null> {
  const normalized = schoolId.trim();
  if (!normalized) return null;

  const apiRecord = await fetchDepedSchoolById(normalized);
  if (apiRecord) {
    const normalizedApi = normalizeSchool(apiRecord);
    if (normalizedApi) return normalizedApi;
  }

  const schools = await fetchSchoolDirectory();
  const match = schools.find((school) => school.schoolId === normalized);
  if (match) {
    return match;
  }

  if (normalized === LEON_NHS_ID) {
    return { schoolId: LEON_NHS_ID, schoolName: LEON_NHS_NAME };
  }

  return null;
}
