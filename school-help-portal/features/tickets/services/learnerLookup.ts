import { supabase } from '@deped-usis/shared-supabase';

const toDisplayName = (firstName: unknown, middleName: unknown, lastName: unknown) => {
  const parts = [String(firstName || '').trim()];
  const middle = String(middleName || '').trim();
  if (middle) parts.push(`${middle.charAt(0).toUpperCase()}.`);
  const last = String(lastName || '').trim();
  if (last) parts.push(last);
  return parts.filter(Boolean).join(' ').trim();
};

export type LearnerLookupResult = {
  gradeLevel: string;
  learnerId: string;
  learnerName: string;
  section: string;
};

export const lookupLearnerByLrn = async (lrn: string): Promise<LearnerLookupResult | null> => {
  const normalizedLrn = String(lrn || '').replace(/\D/g, '').slice(0, 12).trim();
  if (normalizedLrn.length !== 12) return null;

  const { data, error } = await supabase
    .from('registrar_learners')
    .select('first_name,middle_name,last_name,section_id')
    .eq('lrn', normalizedLrn)
    .maybeSingle();

  if (error || !data) return null;

  const sectionId = String((data as any).section_id || '').trim();
  let sectionRow: { name?: string; grade_level?: string } | null = null;
  if (sectionId) {
    const { data: sectionData } = await supabase
      .from('registrar_sections')
      .select('name,grade_level')
      .eq('id', sectionId)
      .maybeSingle();
    sectionRow = (sectionData as { name?: string; grade_level?: string } | null) || null;
  }

  const learnerName = toDisplayName((data as any).first_name, (data as any).middle_name, (data as any).last_name);

  return {
    gradeLevel: String(sectionRow?.grade_level || '').trim(),
    learnerId: String((data as any).id || '').trim(),
    learnerName,
    section: String(sectionRow?.name || '').trim(),
  };
};
