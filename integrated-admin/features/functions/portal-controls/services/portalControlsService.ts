import { supabase } from '../../../../../packages/shared-supabase/src';

export type PortalStatusMode = 'live' | 'maintenance' | 'soon_open';
export type PortalMessageSource = 'preset' | 'custom';

export interface PortalControlRecord {
  id: string;
  moduleKey: string;
  moduleLabel: string;
  isEnabled: boolean;
  mode: PortalStatusMode;
  messageSource: PortalMessageSource;
  presetKey: string | null;
  titleText: string;
  bodyText: string;
  iconName: string;
  updatedAt: string;
}

interface PortalControlRow {
  id: string;
  module_key: string;
  module_label: string;
  is_enabled: boolean;
  mode: PortalStatusMode;
  message_source: PortalMessageSource;
  preset_key: string | null;
  title_text: string;
  body_text: string;
  icon_name: string;
  updated_at: string;
}

const DEFAULT_ROWS: Array<Pick<PortalControlRow, 'module_key' | 'module_label'>> = [
  { module_key: 'deped_web_kit', module_label: 'DepEd Web Kit' },
  { module_key: 'data_privacy', module_label: 'Data Privacy' },
  { module_key: 'attendance', module_label: 'Attendance' },
  { module_key: 'coordinator', module_label: 'Coordinator' },
  { module_key: 'enrollment', module_label: 'Enrollment' },
  { module_key: 'learner_portal', module_label: 'Learner Portal' },
  { module_key: 'integrated_admin', module_label: 'Integrated Admin' },
  { module_key: 'merch', module_label: 'Merch' },
  { module_key: 'election', module_label: 'Election' },
  { module_key: 'sp_portal', module_label: 'SP Portal' },
  { module_key: 'registrar', module_label: 'Registrar' },
  { module_key: 'support', module_label: 'Support' },
];

const toRecord = (row: PortalControlRow): PortalControlRecord => ({
  id: row.id,
  moduleKey: row.module_key,
  moduleLabel: row.module_label,
  isEnabled: row.is_enabled,
  mode: row.mode,
  messageSource: row.message_source,
  presetKey: row.preset_key,
  titleText: row.title_text,
  bodyText: row.body_text,
  iconName: row.icon_name,
  updatedAt: row.updated_at,
});

const ensureDefaults = async (): Promise<void> => {
  const { error } = await supabase
    .from('ia_portal_controls')
    .upsert(
      DEFAULT_ROWS.map((row) => ({
        module_key: row.module_key,
        module_label: row.module_label,
      })),
      { onConflict: 'module_key', ignoreDuplicates: true },
    );
  if (error) throw new Error(error.message);
};

export const loadPortalControls = async (): Promise<PortalControlRecord[]> => {
  await ensureDefaults();
  const { data, error } = await supabase
    .from('ia_portal_controls')
    .select(
      'id,module_key,module_label,is_enabled,mode,message_source,preset_key,title_text,body_text,icon_name,updated_at',
    )
    .order('module_label', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data || []) as PortalControlRow[]).map(toRecord);
};

export interface SavePortalControlInput {
  id: string;
  isEnabled: boolean;
  mode: PortalStatusMode;
  messageSource: PortalMessageSource;
  presetKey: string | null;
  titleText: string;
  bodyText: string;
  iconName: string;
}

export const savePortalControl = async (input: SavePortalControlInput): Promise<void> => {
  const { error } = await supabase
    .from('ia_portal_controls')
    .update({
      is_enabled: input.isEnabled,
      mode: input.mode,
      message_source: input.messageSource,
      preset_key: input.presetKey,
      title_text: input.titleText,
      body_text: input.bodyText,
      icon_name: input.iconName,
    })
    .eq('id', input.id);

  if (error) throw new Error(error.message);
};
