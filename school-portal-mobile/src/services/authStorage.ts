import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { LearnerProfile } from '../types';

const STORAGE_KEYS = {
  ACTIVE_SESSION: 'usis_learner_session',
  BIOMETRIC_ENABLED: 'usis_biometric_enabled',
  SAVED_LRN: 'usis_saved_lrn',
};

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore web storage block
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveLearnerSession(learner: LearnerProfile): Promise<void> {
  await setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(learner));
  if (learner.lrn) {
    await setItem(STORAGE_KEYS.SAVED_LRN, learner.lrn);
  }
}

export async function getLearnerSession(): Promise<LearnerProfile | null> {
  try {
    const data = await getItem(STORAGE_KEYS.ACTIVE_SESSION);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function clearLearnerSession(): Promise<void> {
  await deleteItem(STORAGE_KEYS.ACTIVE_SESSION);
}

export async function getSavedLrn(): Promise<string> {
  return (await getItem(STORAGE_KEYS.SAVED_LRN)) || '';
}

export async function isBiometricsEnabled(): Promise<boolean> {
  const value = await getItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
  return value === 'true';
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await setItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
}
