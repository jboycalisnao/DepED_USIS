
import { useState, useEffect } from 'react';
import { TimeSlotSettings } from '../types';

const DEFAULT_SETTINGS: TimeSlotSettings = {
  amIn: { start: '06:00', end: '10:00' },
  amOut: { start: '10:01', end: '12:30' },
  pmIn: { start: '12:31', end: '15:00' },
  pmOut: { start: '15:01', end: '19:00' },
};

export const useSettings = () => {
  const [settings, setSettings] = useState<TimeSlotSettings>(() => {
    const saved = localStorage.getItem('time_slot_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem('time_slot_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: TimeSlotSettings) => {
    setSettings(newSettings);
  };

  return { settings, updateSettings };
};
