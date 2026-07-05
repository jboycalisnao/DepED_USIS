import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@deped-usis/shared-supabase';
import type {
  AttendanceClassDayConfig,
  AttendanceNoClassDateConfig,
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
};

const SETTINGS_ROW_ID = 1;
const CACHE_KEY = 'attendance_settings_cache';
const CLASS_DAY_CACHE_KEY = 'attendance_class_day_cache';
const NO_CLASS_DATE_CACHE_KEY = 'attendance_no_class_date_cache';
const SELECTED_SCHOOL_YEAR_CACHE_KEY = 'attendance_school_year_id';

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

const getActiveSchoolYearId = (schoolYears: SchoolYearOption[]) => {
  const active = schoolYears.find((schoolYear) => schoolYear.is_active);
  return active?.id || schoolYears[0]?.id || '';
};

export const useSettings = () => {
  const [scheduleConfig, setScheduleConfig] = useState<AttendanceScheduleConfig>(() => readCachedSchedule());
  const [classDayConfig, setClassDayConfig] = useState<AttendanceClassDayConfig>(() => readCachedClassDays());
  const [noClassDates, setNoClassDates] = useState<AttendanceNoClassDateConfig>(() => readCachedNoClassDates());
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>(() => readCachedSchoolYearId());
  const [isSchoolYearsLoading, setIsSchoolYearsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(false);
  const [hasLoadedSchoolYears, setHasLoadedSchoolYears] = useState(false);

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
    window.localStorage.setItem(SELECTED_SCHOOL_YEAR_CACHE_KEY, selectedSchoolYearId);
  }, [selectedSchoolYearId]);

  const persistSettings = useCallback(
    async (nextSchedule: AttendanceScheduleConfig, nextSchoolYearId: string) => {
      setIsSettingsSaving(true);
      try {
        const { error } = await supabase.from('attendance_settings').upsert(
          {
            id: SETTINGS_ROW_ID,
            selected_school_year_id: nextSchoolYearId || null,
            class_day_config: classDayConfig,
            no_class_dates: noClassDates,
            schedule_config: nextSchedule,
            updated_at: new Date().toISOString(),
          } satisfies AttendanceSettingsRow & { updated_at: string },
          { onConflict: 'id' },
        );

        if (error) throw error;
        setSettingsError(null);
      } catch (error: any) {
        console.error('Failed to save attendance settings:', error);
        setSettingsError(error?.message || 'Failed to save attendance settings.');
      } finally {
        setIsSettingsSaving(false);
      }
    },
    [classDayConfig, noClassDates],
  );

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setIsSettingsLoading(true);
      try {
        const { data, error } = await supabase
          .from('attendance_settings')
          .select('id,selected_school_year_id,class_day_config,no_class_dates,schedule_config')
          .eq('id', SETTINGS_ROW_ID)
          .maybeSingle();

        if (error) throw error;
        if (!active) return;

        const row = (data as AttendanceSettingsRow | null) || null;
        setClassDayConfig(normalizeAttendanceClassDays(row?.class_day_config));
        setNoClassDates(normalizeAttendanceNoClassDates(row?.no_class_dates));
        if (row?.schedule_config) {
          setScheduleConfig({
            grade7To10: row.schedule_config.grade7To10 || DEFAULT_ATTENDANCE_SCHEDULE.grade7To10,
            grade11: row.schedule_config.grade11 || DEFAULT_ATTENDANCE_SCHEDULE.grade11,
            grade12: row.schedule_config.grade12 || DEFAULT_ATTENDANCE_SCHEDULE.grade12,
          });
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
  }, [hasLoadedSettings, hasLoadedSchoolYears, persistSettings, scheduleConfig, selectedSchoolYearId, noClassDates]);

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
  };
};
