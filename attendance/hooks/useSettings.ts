import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@deped-usis/shared-supabase';
import type {
  AttendanceClassDayConfig,
  AttendanceNoClassDateConfig,
  AttendanceSmsRecipientState,
  AttendanceSmsSettings,
  AttendanceScheduleConfig,
  SchoolYearOption,
} from '../types';
import {
  DEFAULT_ATTENDANCE_CLASS_DAYS,
  DEFAULT_ATTENDANCE_NO_CLASS_DATES,
  DEFAULT_ATTENDANCE_SCHEDULE,
  normalizeAttendanceClassDays,
  normalizeAttendanceNoClassDates,
} from '../utils/attendanceSchedule';

type AttendanceSettingsRow = {
  id: number;
  selected_school_year_id: string | null;
  class_day_config: AttendanceClassDayConfig | null;
  no_class_dates: AttendanceNoClassDateConfig | null;
  schedule_config: AttendanceScheduleConfig | null;
  sms_settings: AttendanceSmsSettings | null;
  sms_recipient_state: AttendanceSmsRecipientState | null;
};

type AttendanceSettingsLegacyRow = {
  id: number;
  selected_school_year_id: string | null;
  class_day_config: AttendanceClassDayConfig | null;
  no_class_dates: AttendanceNoClassDateConfig | null;
  schedule_config: AttendanceScheduleConfig | null;
};

const SETTINGS_ROW_ID = 1;
const CACHE_KEY = 'attendance_settings_cache';
const CLASS_DAY_CACHE_KEY = 'attendance_class_day_cache';
const NO_CLASS_DATE_CACHE_KEY = 'attendance_no_class_date_cache';
const SELECTED_SCHOOL_YEAR_CACHE_KEY = 'attendance_school_year_id';
const SMS_SETTINGS_CACHE_KEY = 'attendance_sms_settings_cache';
const DEFAULT_SMS_RECIPIENT_STATE: AttendanceSmsRecipientState = {
  enabledLearnerIds: [],
};

const DEFAULT_SMS_SETTINGS: AttendanceSmsSettings = {
  apiKey: '',
  messageTemplate: 'Hello! This is to inform you that your {gender_term} has {action} Leon NHS at {time}. Thank you.',
};

const normalizeSmsMessageTemplate = (value: unknown) => {
  const template = String(value || DEFAULT_SMS_SETTINGS.messageTemplate).trim();
  return template.replaceAll('entered/exited', '{action}');
};

const readCachedSchedule = (): AttendanceScheduleConfig => {
  if (typeof window === 'undefined') return DEFAULT_ATTENDANCE_SCHEDULE;

  const raw = window.localStorage.getItem(CACHE_KEY);
  if (!raw) return DEFAULT_ATTENDANCE_SCHEDULE;

  try {
    const parsed = JSON.parse(raw) as Partial<AttendanceScheduleConfig>;
    return {
      grade7To10: parsed.grade7To10 || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10,
      grade11: parsed.grade11 || DEFAULT_ATTENDANCE_SCHEDULE.grade11,
      grade12: parsed.grade12 || DEFAULT_ATTENDANCE_SCHEDULE.grade12,
    };
  } catch {
    return DEFAULT_ATTENDANCE_SCHEDULE;
  }
};

const readCachedSchoolYearId = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(SELECTED_SCHOOL_YEAR_CACHE_KEY) || '';
};

const readCachedClassDays = (): AttendanceClassDayConfig => {
  if (typeof window === 'undefined') return DEFAULT_ATTENDANCE_CLASS_DAYS;

  const raw = window.localStorage.getItem(CLASS_DAY_CACHE_KEY);
  if (!raw) return DEFAULT_ATTENDANCE_CLASS_DAYS;

  try {
    return normalizeAttendanceClassDays(JSON.parse(raw) as Partial<AttendanceClassDayConfig>);
  } catch {
    return DEFAULT_ATTENDANCE_CLASS_DAYS;
  }
};

const readCachedNoClassDates = (): AttendanceNoClassDateConfig => {
  if (typeof window === 'undefined') return DEFAULT_ATTENDANCE_NO_CLASS_DATES;

  const raw = window.localStorage.getItem(NO_CLASS_DATE_CACHE_KEY);
  if (!raw) return DEFAULT_ATTENDANCE_NO_CLASS_DATES;

  try {
    return normalizeAttendanceNoClassDates(JSON.parse(raw));
  } catch {
    return DEFAULT_ATTENDANCE_NO_CLASS_DATES;
  }
};

const readCachedSmsSettings = (): AttendanceSmsSettings => {
  if (typeof window === 'undefined') return DEFAULT_SMS_SETTINGS;

  const raw = window.localStorage.getItem(SMS_SETTINGS_CACHE_KEY);
  if (!raw) return DEFAULT_SMS_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AttendanceSmsSettings>;
    return {
      apiKey: String(parsed.apiKey || '').trim(),
      messageTemplate: normalizeSmsMessageTemplate(parsed.messageTemplate),
    };
  } catch {
    return DEFAULT_SMS_SETTINGS;
  }
};

const normalizeSmsRecipientState = (value: Partial<AttendanceSmsRecipientState> | null | undefined): AttendanceSmsRecipientState => {
  const enabledLearnerIds = Array.isArray(value?.enabledLearnerIds)
    ? Array.from(new Set(value.enabledLearnerIds.map((learnerId) => String(learnerId || '').trim()).filter(Boolean)))
    : [];
  return {
    enabledLearnerIds,
  };
};

const getActiveSchoolYearId = (schoolYears: SchoolYearOption[]) => {
  const active = schoolYears.find((schoolYear) => schoolYear.is_active);
  return active?.id || schoolYears[0]?.id || '';
};

const isMissingSmsSettingsColumnError = (error: any) => {
  const message = String(error?.message || '').toLowerCase();
  return String(error?.code || '') === '42703' && (message.includes('sms_settings') || message.includes('sms_recipient_state'));
};

export const useSettings = () => {
  const [scheduleConfig, setScheduleConfig] = useState<AttendanceScheduleConfig>(() => readCachedSchedule());
  const [classDayConfig, setClassDayConfig] = useState<AttendanceClassDayConfig>(() => readCachedClassDays());
  const [noClassDates, setNoClassDates] = useState<AttendanceNoClassDateConfig>(() => readCachedNoClassDates());
  const [smsSettings, setSmsSettings] = useState<AttendanceSmsSettings>(() => readCachedSmsSettings());
  const [smsRecipientState, setSmsRecipientState] = useState<AttendanceSmsRecipientState>(() => DEFAULT_SMS_RECIPIENT_STATE);
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>(() => readCachedSchoolYearId());
  const [isSchoolYearsLoading, setIsSchoolYearsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [hasLoadedSchoolYears, setHasLoadedSchoolYears] = useState(false);
  const [supportsSmsSettingsColumns, setSupportsSmsSettingsColumns] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(scheduleConfig));
  }, [scheduleConfig]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CLASS_DAY_CACHE_KEY, JSON.stringify(classDayConfig));
  }, [classDayConfig]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(NO_CLASS_DATE_CACHE_KEY, JSON.stringify(noClassDates));
  }, [noClassDates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SMS_SETTINGS_CACHE_KEY, JSON.stringify(smsSettings));
  }, [smsSettings]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SELECTED_SCHOOL_YEAR_CACHE_KEY, selectedSchoolYearId);
  }, [selectedSchoolYearId]);

  const persistSettings = useCallback(
    async (nextSchedule: AttendanceScheduleConfig, nextSchoolYearId: string) => {
      setIsSettingsSaving(true);
      try {
        const payload: Record<string, unknown> = {
          id: SETTINGS_ROW_ID,
          selected_school_year_id: nextSchoolYearId || null,
          class_day_config: classDayConfig,
          no_class_dates: noClassDates,
          schedule_config: nextSchedule,
          updated_at: new Date().toISOString(),
        };

        if (supportsSmsSettingsColumns) {
          payload.sms_settings = smsSettings;
          payload.sms_recipient_state = smsRecipientState;
        }

        const { error } = await supabase.from('attendance_settings').upsert(
          payload,
          { onConflict: 'id' },
        );

        if (error) {
          if (supportsSmsSettingsColumns && isMissingSmsSettingsColumnError(error)) {
            setSupportsSmsSettingsColumns(false);
            const legacyPayload: Record<string, unknown> = {
              id: SETTINGS_ROW_ID,
              selected_school_year_id: nextSchoolYearId || null,
              class_day_config: classDayConfig,
              no_class_dates: noClassDates,
              schedule_config: nextSchedule,
              updated_at: new Date().toISOString(),
            };

            const legacyResult = await supabase.from('attendance_settings').upsert(legacyPayload, { onConflict: 'id' });
            if (legacyResult.error) throw legacyResult.error;
            setSettingsError(null);
            return;
          }

          throw error;
        }

        setSettingsError(null);
      } catch (error: any) {
        console.error('Failed to save attendance settings:', error);
        if (isMissingSmsSettingsColumnError(error)) {
          setSupportsSmsSettingsColumns(false);
        }
        setSettingsError(error?.message || 'Failed to save attendance settings.');
      } finally {
        setIsSettingsSaving(false);
      }
    },
    [classDayConfig, noClassDates, smsRecipientState, smsSettings, supportsSmsSettingsColumns],
  );

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setIsSettingsLoading(true);
      try {
        const selectRow = async (includeSmsColumns: boolean) => {
          const selectClause = includeSmsColumns
            ? 'id,selected_school_year_id,class_day_config,no_class_dates,schedule_config,sms_settings,sms_recipient_state'
            : 'id,selected_school_year_id,class_day_config,no_class_dates,schedule_config';

          const result = await supabase
            .from('attendance_settings')
            .select(selectClause)
            .eq('id', SETTINGS_ROW_ID)
            .maybeSingle();

          return result;
        };

        let result = await selectRow(supportsSmsSettingsColumns);
        if (result.error && supportsSmsSettingsColumns && isMissingSmsSettingsColumnError(result.error)) {
          setSupportsSmsSettingsColumns(false);
          result = await selectRow(false);
        }

        if (result.error) throw result.error;
        if (!active) return;

        const row = (result.data as AttendanceSettingsRow | AttendanceSettingsLegacyRow | null) || null;
        setClassDayConfig(normalizeAttendanceClassDays(row?.class_day_config));
        setNoClassDates(normalizeAttendanceNoClassDates(row?.no_class_dates));
        if (row?.schedule_config) {
          setScheduleConfig({
            grade7To10: row.schedule_config.grade7To10 || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10,
            grade11: row.schedule_config.grade11 || DEFAULT_ATTENDANCE_SCHEDULE.grade11,
            grade12: row.schedule_config.grade12 || DEFAULT_ATTENDANCE_SCHEDULE.grade12,
          });
        }

        if ('sms_settings' in (row || {}) && row?.sms_settings) {
          setSmsSettings({
            apiKey: String(row.sms_settings.apiKey || '').trim(),
            messageTemplate: normalizeSmsMessageTemplate(row.sms_settings.messageTemplate),
          });
        }

        if ('sms_recipient_state' in (row || {})) {
          setSmsRecipientState(normalizeSmsRecipientState((row as AttendanceSettingsRow | null)?.sms_recipient_state));
        }

        if (row?.selected_school_year_id) {
          setSelectedSchoolYearId(row.selected_school_year_id);
        }

        setHasLoadedSettings(true);
      } catch (error: any) {
        console.error('Failed to load attendance settings:', error);
        if (active) {
          setSettingsError(error?.message || 'Failed to load attendance settings.');
        }
      } finally {
        if (active) setIsSettingsLoading(false);
      }
    };

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSchoolYears = async () => {
      setIsSchoolYearsLoading(true);
      try {
        const { data, error } = await supabase
          .from('registrar_school_years')
          .select('id,label,is_active')
          .order('label', { ascending: false });

        if (error) throw error;
        if (!active) return;

        const nextSchoolYears = (data || [])
          .map((row: any) => ({
            id: String(row.id || '').trim(),
            label: String(row.label || '').trim(),
            is_active: !!row.is_active,
          }))
          .filter((row: SchoolYearOption) => row.id && row.label);

        setSchoolYears(nextSchoolYears);

        const fallbackSchoolYearId = getActiveSchoolYearId(nextSchoolYears);
        setSelectedSchoolYearId((current) => {
          const trimmedCurrent = String(current || '').trim();
          if (!trimmedCurrent) return fallbackSchoolYearId;
          if (!nextSchoolYears.some((schoolYear) => schoolYear.id === trimmedCurrent)) {
            return fallbackSchoolYearId;
          }
          return trimmedCurrent;
        });
        setHasLoadedSchoolYears(true);
      } catch (error: any) {
        if (!active) return;
        console.error('Failed to load attendance school years:', error);
        setSettingsError(error?.message || 'Failed to load attendance school years.');
        setSchoolYears([]);
        setHasLoadedSchoolYears(true);
      } finally {
        if (active) setIsSchoolYearsLoading(false);
      }
    };

    void loadSchoolYears();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSettings || !hasLoadedSchoolYears) return;
    void persistSettings(scheduleConfig, selectedSchoolYearId);
  }, [
    hasLoadedSettings,
    hasLoadedSchoolYears,
    persistSettings,
    scheduleConfig,
    selectedSchoolYearId,
    noClassDates,
    smsSettings,
    smsRecipientState,
  ]);

  const activeSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.is_active) || schoolYears[0] || null,
    [schoolYears],
  );

  const updateSettings = (nextSettings: AttendanceScheduleConfig) => {
    setScheduleConfig(nextSettings);
  };

  const updateClassDayConfig = (nextClassDays: AttendanceClassDayConfig) => {
    setClassDayConfig(nextClassDays);
  };

  const updateNoClassDates = (nextNoClassDates: AttendanceNoClassDateConfig) => {
    setNoClassDates(normalizeAttendanceNoClassDates(nextNoClassDates));
  };

  const updateSmsSettings = (nextSmsSettings: AttendanceSmsSettings) => {
    setSmsSettings({
      apiKey: String(nextSmsSettings.apiKey || '').trim(),
      messageTemplate: normalizeSmsMessageTemplate(nextSmsSettings.messageTemplate),
    });
  };

  const updateSmsRecipientState = (nextSmsRecipientState: AttendanceSmsRecipientState) => {
    setSmsRecipientState(normalizeSmsRecipientState(nextSmsRecipientState));
  };

  const updateSelectedSchoolYearId = (schoolYearId: string) => {
    setSelectedSchoolYearId(schoolYearId);
  };

  return {
    activeSchoolYear,
    isSchoolYearsLoading,
    isSettingsLoading,
    isSettingsSaving,
    schoolYears,
    selectedSchoolYearId,
    setSelectedSchoolYearId: updateSelectedSchoolYearId,
    scheduleConfig,
    settingsError,
    settings: scheduleConfig,
    updateSettings,
    classDayConfig,
    setClassDayConfig: updateClassDayConfig,
    noClassDates,
    setNoClassDates: updateNoClassDates,
    smsSettings,
    setSmsSettings: updateSmsSettings,
    smsRecipientState,
    setSmsRecipientState: updateSmsRecipientState,
  };
};
