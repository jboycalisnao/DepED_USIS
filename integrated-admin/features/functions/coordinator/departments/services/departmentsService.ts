import { supabase } from '../../../../../../packages/shared-supabase/src';

export type DepartmentRecord = {
  assignedCount: number;
  id: string;
  isActive: boolean;
  name: string;
};

const toText = (value: unknown) => String(value || '').trim();

export const loadDepartments = async (): Promise<DepartmentRecord[]> => {
  const { data, error } = await supabase
    .from('coordinator_departments')
    .select('id,name,is_active,coordinator_account_departments(count)')
    .order('name');
  if (error) throw new Error(error.message || 'Unable to load departments.');
  return (data || []).map((row: any) => ({
    assignedCount: Number(
      Array.isArray(row.coordinator_account_departments)
        ? row.coordinator_account_departments[0]?.count || 0
        : row.coordinator_account_departments?.count || 0,
    ),
    id: toText(row.id),
    isActive: Boolean(row.is_active),
    name: toText(row.name),
  }));
};

export const saveDepartment = async (payload: { id?: string; name: string }) => {
  const name = toText(payload.name);
  if (!name) throw new Error('Department name is required.');
  if (payload.id) {
    const { error } = await supabase.from('coordinator_departments').update({ name }).eq('id', payload.id);
    if (error) throw new Error(error.message || 'Unable to update department.');
    return payload.id;
  }
  const { data, error } = await supabase
    .from('coordinator_departments')
    .insert([{ name, is_active: true }])
    .select('id')
    .single();
  if (error || !data?.id) throw new Error(error?.message || 'Unable to create department.');
  return String(data.id);
};

export const deactivateDepartment = async (id: string) => {
  const { error } = await supabase.from('coordinator_departments').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message || 'Unable to deactivate department.');
};

export const activateDepartment = async (id: string) => {
  const { error } = await supabase.from('coordinator_departments').update({ is_active: true }).eq('id', id);
  if (error) throw new Error(error.message || 'Unable to activate department.');
};

export const deleteDepartment = async (id: string) => {
  const { count, error: countError } = await supabase
    .from('coordinator_account_departments')
    .select('account_id', { count: 'exact', head: true })
    .eq('department_id', id);
  if (countError) throw new Error(countError.message || 'Unable to validate department usage.');
  if ((count || 0) > 0) {
    throw new Error('Department is currently assigned to coordinator accounts and cannot be deleted.');
  }
  const { error } = await supabase.from('coordinator_departments').delete().eq('id', id);
  if (error) throw new Error(error.message || 'Unable to delete department.');
};
