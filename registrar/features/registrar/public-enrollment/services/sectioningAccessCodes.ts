import { supabase } from '../../../../lib/supabase';

const TABLE_NAME = 'registrar_sectioning_access_codes';
const FALLBACK_KEY = 'registrar_sectioning_access_codes_fallback_v1';

export type SectioningAccessCodeRow = {
  id?: string;
  school_id: string;
  school_year: string;
  grade_level: string;
  access_code: string;
  is_active?: boolean;
  updated_at?: string;
  created_at?: string;
};

const isMissingTableError = (error: any) => {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01' || message.includes('does not exist');
};

const readFallback = (): SectioningAccessCodeRow[] => {
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFallback = (rows: SectioningAccessCodeRow[]) => {
  window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(rows));
};

const buildAccessCode = () => {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SEC-${rand}`;
};

const normalizeSchoolYear = (value: string) => {
  const normalized = String(value || '')
    .trim()
    .replace(/^sy\s*/i, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, '');
  const match = normalized.match(/(20\d{2})-(20\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  return normalized.toUpperCase();
};

const normalizeText = (value: string) => String(value || '').trim().toUpperCase();

export async function listSectioningAccessCodes(schoolId: string, schoolYear: string): Promise<SectioningAccessCodeRow[]> {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,school_id,school_year,grade_level,access_code,is_active,updated_at,created_at')
    .eq('school_id', schoolId)
    .eq('school_year', schoolYear)
    .eq('is_active', true)
    .order('grade_level', { ascending: true });

  if (!error) return (data || []) as SectioningAccessCodeRow[];
  if (!isMissingTableError(error)) throw error;

  return readFallback().filter((row) => row.school_id === schoolId && row.school_year === schoolYear);
}

export async function generateSectioningAccessCode(input: {
  schoolId: string;
  schoolYear: string;
  gradeLevel: string;
}): Promise<SectioningAccessCodeRow> {
  const row: SectioningAccessCodeRow = {
    school_id: input.schoolId,
    school_year: input.schoolYear,
    grade_level: input.gradeLevel,
    access_code: buildAccessCode(),
    is_active: true,
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(row as any, { onConflict: 'school_id,school_year,grade_level' })
    .select('id,school_id,school_year,grade_level,access_code,is_active,updated_at,created_at')
    .single();

  if (!error) return data as SectioningAccessCodeRow;
  if (!isMissingTableError(error)) throw error;

  const rows = readFallback().filter(
    (item) =>
      !(item.school_id === row.school_id && item.school_year === row.school_year && item.grade_level === row.grade_level),
  );
  rows.push(row);
  writeFallback(rows);
  return row;
}

export async function validateSectioningAccessCode(input: {
  schoolId: string;
  schoolYear: string;
  accessCode: string;
}): Promise<SectioningAccessCodeRow | null> {
  const normalizedCode = String(input.accessCode || '').trim().toUpperCase();
  if (!normalizedCode) return null;
  const normalizedSchoolId = normalizeText(input.schoolId);
  const normalizedSchoolYear = normalizeSchoolYear(input.schoolYear);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,school_id,school_year,grade_level,access_code,is_active,updated_at,created_at')
    .eq('access_code', normalizedCode)
    .eq('is_active', true)
    .limit(20);

  if (!error) {
    const matched = ((data || []) as SectioningAccessCodeRow[]).find(
      (row) =>
        normalizeText(row.school_id) === normalizedSchoolId &&
        normalizeSchoolYear(row.school_year) === normalizedSchoolYear,
    );
    return matched || null;
  }
  if (!isMissingTableError(error)) throw error;

  return (
    readFallback().find(
      (row) =>
        normalizeText(row.school_id) === normalizedSchoolId &&
        normalizeSchoolYear(row.school_year) === normalizedSchoolYear &&
        String(row.access_code || '').trim().toUpperCase() === normalizedCode,
    ) || null
  );
}
