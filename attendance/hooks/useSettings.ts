
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@deped-usis/shared-supabase';
import { TimeSlotSettings } from '../types';
import type { SchoolYearOption } from '../types';

const DEFAULT_SETTINGS: TimeSlotSettings = {
  amIn: { start: '06:00', end: '10:00' },
  amOut: { start: '10:01', end: '12:30' },
  pmIn: { start: '12:31', end: '15:00' },
  pmOut: { start: '15:01', end: '19:00' },
};

export const useSettings = () => {
  const [settings, setSettings] = useState<TimeSlotSettings>(() => {
    const saved = localStorage.getItem('time_slot_settings');
    if (!saved) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(saved) as Partial<TimeSlotSettings>;
      return {
        amIn: parsed.amIn || DEFAULT_SETTINGS.amIn,
        amOut: parsed.amOut || DEFAULT_SETTINGS.amOut,
        pmIn: parsed.pmIn || DEFAULT_SETTINGS.pmIn,
        pmOut: parsed.pmOut || DEFAULT_SETTINGS.pmOut,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [schoolYears, setSchoolYears] = useState<SchoolYearOption[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>(() => localStorage.getItem('attendance_school_year_id') || '');
  const [isSchoolYearsLoading, setIsSchoolYearsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('time_slot_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('attendance_school_year_id', selectedSchoolYearId);
  }, [selectedSchoolYearId]);

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

        const activeSchoolYear = nextSchoolYears.find((schoolYear) => schoolYear.is_active) || nextSchoolYears[0] || null;
        const savedSchoolYearId = localStorage.getItem('attendance_school_year_id') || '';
        const nextSelectedSchoolYearId = nextSchoolYears.some((schoolYear) => schoolYear.id === savedSchoolYearId)
          ? savedSchoolYearId
          : activeSchoolYear?.id || '';

        setSelectedSchoolYearId(nextSelectedSchoolYearId);
      } catch (error) {
        if (!active) return;
        console.error('Failed to load attendance school years:', error);
        setSchoolYears([]);
      } finally {
        if (active) setIsSchoolYearsLoading(false);
      }
    };

    void loadSchoolYears();

    return () => {
      active = false;
    };
  }, []);

  const activeSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.is_active) || schoolYears[0] || null,
    [schoolYears],
  );

  const updateSettings = (newSettings: TimeSlotSettings) => {
    setSettings(newSettings);
  };

  return {
    activeSchoolYear,
    isSchoolYearsLoading,
    schoolYears,
    selectedSchoolYearId,
    setSelectedSchoolYearId,
    settings,
    updateSettings,
  };
};
