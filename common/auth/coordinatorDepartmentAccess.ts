import { supabase } from '../../packages/shared-supabase/src';

export const resolveCoordinatorDepartmentAccess = async (accountId: string) => {
  const normalized = String(accountId || '').trim();
  if (!normalized) return { allowed: true, departmentName: '' };

  const { data: assignment, error: assignmentError } = await supabase
    .from('coordinator_account_departments')
    .select('department_id')
    .eq('account_id', normalized)
    .limit(1)
    .maybeSingle();

  const departmentId = String((assignment as any)?.department_id || '').trim();
  if (assignmentError || !departmentId) return { allowed: true, departmentName: '' };

  const { data: department, error: departmentError } = await supabase
    .from('coordinator_departments')
    .select('name,is_active')
    .eq('id', departmentId)
    .limit(1)
    .maybeSingle();
  if (departmentError || !department) return { allowed: true, departmentName: '' };

  const departmentName = String((department as any).name || '').trim();
  const isActive = Boolean((department as any).is_active);
  return {
    allowed: isActive,
    departmentName,
  };
};
