import { supabase } from '../../lib/supabase';

export type CoordinatorTeacherOption = {
  label: string;
  value: string;
  username: string;
};

const toText = (value: unknown) => String(value || '').trim();

const formatName = (firstName: unknown, middleName: unknown, lastName: unknown) => {
  const first = toText(firstName);
  const middle = toText(middleName);
  const last = toText(lastName);
  return [first, middle, last].filter(Boolean).join(' ').trim();
};

const resolveLabel = (firstName: unknown, middleName: unknown, lastName: unknown, username: unknown) => {
  const displayName = formatName(firstName, middleName, lastName);
  const accountName = displayName || toText(username);
  const accountUsername = toText(username);
  return accountUsername ? `${accountName} (${accountUsername})` : accountName;
};

export const loadCoordinatorTeachingAccountOptions = async (schoolUuid: string): Promise<CoordinatorTeacherOption[]> => {
  const schoolId = toText(schoolUuid);
  if (!schoolId) return [];

  const baseQuery = supabase
    .from('usis_core_coordinators')
    .select('first_name,middle_name,last_name,username,role,personnel_type,is_active,school_id')
    .eq('school_id', schoolId)
    .eq('is_active', true)
    .eq('role', 'school_usis_coordinator');

  let response = await baseQuery.eq('personnel_type', 'teaching');
  if (response.error) {
    const fallback = await supabase
      .from('usis_core_coordinators')
      .select('first_name,middle_name,last_name,username,role,is_active,school_id')
      .eq('school_id', schoolId)
      .eq('is_active', true)
      .eq('role', 'school_usis_coordinator');
    if (fallback.error) {
      throw new Error(fallback.error.message || 'Unable to load coordinator teaching accounts.');
    }
    response = fallback;
  }

  const options = (response.data || [])
    .map((row: any) => {
      const username = toText(row.username).toLowerCase();
      const displayName = resolveLabel(row.first_name, row.middle_name, row.last_name, username);
      if (!displayName) return null;
      return {
        label: displayName,
        value: displayName,
        username,
      };
    })
    .filter(Boolean) as CoordinatorTeacherOption[];

  const unique = new Map<string, CoordinatorTeacherOption>();
  options.forEach((option) => {
    unique.set(option.value.toLowerCase(), option);
  });
  return Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
};
