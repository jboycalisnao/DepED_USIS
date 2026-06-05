import { supabase } from '../../../lib/supabase';

export async function fetchInformationVerificationAndUpdateEnabled(): Promise<boolean> {
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
