import { useCallback, useEffect, useState } from 'react';
import type { AttendanceSmsTestModeConfig } from '../../../types';
import { normalizeRfidValue } from '../../../utils/rfid';

const STORAGE_KEY = 'attendance_sms_test_mode_config_v1';

const DEFAULT_SMS_TEST_MODE: AttendanceSmsTestModeConfig = {
  isEnabled: false,
  learnerId: '',
  temporaryRfid: '',
  phoneNumber: '',
  action: 'entry',
};

const normalizeConfig = (value: Partial<AttendanceSmsTestModeConfig> | null | undefined): AttendanceSmsTestModeConfig => ({
  isEnabled: Boolean(value?.isEnabled),
  learnerId: String(value?.learnerId || '').trim(),
  temporaryRfid: normalizeRfidValue(value?.temporaryRfid || ''),
  phoneNumber: String(value?.phoneNumber || '').trim(),
  action: value?.action === 'exit' ? 'exit' : 'entry',
});

const readCachedConfig = (): AttendanceSmsTestModeConfig => {
  if (typeof window === 'undefined') return DEFAULT_SMS_TEST_MODE;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_SMS_TEST_MODE;

  try {
    return normalizeConfig(JSON.parse(raw) as Partial<AttendanceSmsTestModeConfig>);
  } catch {
    return DEFAULT_SMS_TEST_MODE;
  }
};

export const useSmsTestMode = () => {
  const [smsTestMode, setSmsTestModeState] = useState<AttendanceSmsTestModeConfig>(() => readCachedConfig());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(smsTestMode));
  }, [smsTestMode]);

  const setSmsTestMode = useCallback((nextConfig: AttendanceSmsTestModeConfig) => {
    setSmsTestModeState(normalizeConfig(nextConfig));
  }, []);

  return {
    smsTestMode,
    setSmsTestMode,
  };
};
