import { supabase } from '../../../../../packages/shared-supabase/src';

export type ClinicLearnerLookupResult = {
  learnerName: string;
  sex: 'Female' | 'Male' | null;
  age: string;
  gradeSection: string;
};

const normalizeSex = (value: unknown): 'Female' | 'Male' | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'female' || normalized === 'f') return 'Female';
  if (normalized === 'male' || normalized === 'm') return 'Male';
  return null;
};

const computeAgeFromBirthDate = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const birthDate = new Date(raw);
  if (Number.isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age > 0 ? String(age) : '';
};

const joinName = (first: unknown, middle: unknown, last: unknown): string => {
  return [first, middle, last]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(' ');
};

export async function lookupLearnerByLrn(lrn: string): Promise<ClinicLearnerLookupResult | null> {
  const normalizedLrn = String(lrn || '').replace(/\D/g, '').slice(0, 12);
  if (normalizedLrn.length !== 12) {
    return null;
  }

  const { data, error } = await supabase
    .from('registrar_learners')
    .select('*')
    .eq('lrn', normalizedLrn)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const learnerName =
    joinName((data as any).first_name, (data as any).middle_name, (data as any).last_name) ||
    String((data as any).full_name || '').trim();

  const sex = normalizeSex((data as any).sex || (data as any).gender);

  const age =
    String((data as any).age || '').trim() ||
    computeAgeFromBirthDate((data as any).birth_date || (data as any).date_of_birth);

  const gradeLevel = String((data as any).grade_level || (data as any).grade_to_enroll || '').trim();
  const sectionName =
    String((data as any).section_name || '').trim() ||
    String((data as any).section || '').trim();
  const gradeSection = [gradeLevel, sectionName].filter(Boolean).join(' - ');

  return {
    learnerName,
    sex,
    age,
    gradeSection,
  };
}
