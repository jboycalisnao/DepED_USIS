import { supabase } from '../../../lib/supabase';

const isBypassEnabled = () =>
  import.meta.env.VITE_ALLOW_PORTAL_GATE_BYPASS === 'true' ||
  import.meta.env.VITE_ALLOW_GATE_BYPASS === 'true' ||
  import.meta.env.VITE_ALLOW_ENROLLMENT_FORM_BYPASS === 'true' ||
  import.meta.env.VITE_ALLOW_ENROLLMENT_BYPASS === 'true' ||
  import.meta.env.VITE_ALLOW_ATTENDANCE_BYPASS === 'true';

export async function fetchInformationVerificationAndUpdateEnabled(): Promise<boolean> {
  if (isBypassEnabled()) return true;

  try {
    const { data, error } = await supabase
      .from('registrar_enrollment_form_schedule')
      .select('information_verification_and_update_enabled')
      .eq('id', 1)
      .maybeSingle();

    if (error) return false;
    return Boolean((data as any)?.information_verification_and_update_enabled);
  } catch {
    return false;
  }
}
