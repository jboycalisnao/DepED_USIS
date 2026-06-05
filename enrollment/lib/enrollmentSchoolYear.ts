import { supabase } from './supabase';

export type EnrollmentSchoolYearResolution = {
  label: string;
  schoolYearId: string;
  source: 'manual-override' | 'registrar-active' | 'unavailable';
};

const emptyResolution: EnrollmentSchoolYearResolution = {
  label: '',
  schoolYearId: '',
  source: 'unavailable',
};

export async function fetchEnrollmentSchoolYear(): Promise<EnrollmentSchoolYearResolution> {
  const [settingsResult, activeYearResult] = await Promise.all([
    supabase
      .from('registrar_enrollment_module_settings')
      .select('use_manual_school_year_override,manual_school_year_id')
      .eq('id', 1)
      .maybeSingle(),
    supabase
      .from('registrar_school_years')
      .select('id,label')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle(),
  ]);

  const activeSchoolYearId = String((activeYearResult.data as any)?.id || '').trim();
  const activeSchoolYearLabel = String((activeYearResult.data as any)?.label || '').trim();
  const settings = settingsResult.data as any;
  const useManualOverride = !!settings?.use_manual_school_year_override;
  const manualSchoolYearId = String(settings?.manual_school_year_id || '').trim();

  if (useManualOverride && manualSchoolYearId) {
    const { data: manualSchoolYear, error: manualSchoolYearError } = await supabase
      .from('registrar_school_years')
      .select('id,label')
      .eq('id', manualSchoolYearId)
      .maybeSingle();

    if (!manualSchoolYearError && manualSchoolYear) {
      return {
        label: String((manualSchoolYear as any).label || '').trim(),
        schoolYearId: String((manualSchoolYear as any).id || '').trim(),
        source: 'manual-override',
      };
    }
  }

  if (activeSchoolYearLabel || activeSchoolYearId) {
    return {
      label: activeSchoolYearLabel,
      schoolYearId: activeSchoolYearId,
      source: 'registrar-active',
    };
  }

  return emptyResolution;
}
