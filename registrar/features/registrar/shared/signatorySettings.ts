import { supabase } from '../../../lib/supabase';

export type RegistrarDocumentSignatories = {
  school_id: string;
  registrar_name: string;
  registrar_position: string;
  principal_name: string;
  principal_position: string;
};

export const DEFAULT_REGISTRAR_SIGNATORIES: RegistrarDocumentSignatories = {
  school_id: '302522',
  registrar_name: 'Registrar',
  registrar_position: 'School Registrar',
  principal_name: 'School Principal',
  principal_position: 'School Principal',
};

const toText = (value: unknown) => String(value || '').trim();

export const normalizeRegistrarSignatories = (row: unknown, schoolId = DEFAULT_REGISTRAR_SIGNATORIES.school_id): RegistrarDocumentSignatories => {
  const data = (row || {}) as Record<string, unknown>;
  return {
    school_id: toText(data.school_id) || schoolId,
    registrar_name: toText(data.registrar_name) || DEFAULT_REGISTRAR_SIGNATORIES.registrar_name,
    registrar_position: toText(data.registrar_position) || DEFAULT_REGISTRAR_SIGNATORIES.registrar_position,
    principal_name: toText(data.principal_name) || DEFAULT_REGISTRAR_SIGNATORIES.principal_name,
    principal_position: toText(data.principal_position) || DEFAULT_REGISTRAR_SIGNATORIES.principal_position,
  };
};

export const fetchRegistrarSignatories = async (schoolId = DEFAULT_REGISTRAR_SIGNATORIES.school_id) => {
  const { data, error } = await supabase
    .from('registrar_document_signatories')
    .select('school_id,registrar_name,registrar_position,principal_name,principal_position')
    .eq('school_id', schoolId)
    .maybeSingle();

  if (!error && data) return normalizeRegistrarSignatories(data, schoolId);

  const { data: latestData, error: latestError } = await supabase
    .from('registrar_document_signatories')
    .select('school_id,registrar_name,registrar_position,principal_name,principal_position')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestError && latestData) return normalizeRegistrarSignatories(latestData, schoolId);
  return normalizeRegistrarSignatories(null, schoolId);
};
