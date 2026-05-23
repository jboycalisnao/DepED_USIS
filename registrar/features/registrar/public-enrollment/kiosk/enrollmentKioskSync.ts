import type { EnrollmentDraft } from '../types';

export type EnrollmentKioskSelectedLearner = {
  id: string;
  lrn: string;
  fullName: string;
  latestSchoolYear: string;
  latestGradeLevel: string;
  latestSection: string;
};

export type EnrollmentKioskState = {
  updatedAt: string;
  isEditing: boolean;
  selectedLearner: EnrollmentKioskSelectedLearner | null;
  draft: Partial<EnrollmentDraft> | null;
  focusedSection: 'enrollmentContext' | 'learnerInfo' | 'addressInfo' | 'guardianInfo' | 'otherInfo' | null;
};

const STORAGE_KEY = 'usis_registrar_enrollment_kiosk_state';
const CHANNEL_NAME = 'usis_registrar_enrollment_kiosk_channel';

const createDefaultState = (): EnrollmentKioskState => ({
  updatedAt: new Date(0).toISOString(),
  isEditing: false,
  selectedLearner: null,
  draft: null,
  focusedSection: null,
});

function readStorageState(): EnrollmentKioskState {
  if (typeof window === 'undefined') return createDefaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as EnrollmentKioskState;
    return {
      updatedAt: String(parsed.updatedAt || new Date().toISOString()),
      isEditing: Boolean(parsed.isEditing),
      selectedLearner: parsed.selectedLearner || null,
      draft: parsed.draft || null,
      focusedSection: parsed.focusedSection || null,
    };
  } catch {
    return createDefaultState();
  }
}

function writeStorageState(state: EnrollmentKioskState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  return new BroadcastChannel(CHANNEL_NAME);
}

export function getEnrollmentKioskState() {
  return readStorageState();
}

export function publishEnrollmentKioskState(
  input: Partial<Pick<EnrollmentKioskState, 'isEditing' | 'selectedLearner' | 'draft' | 'focusedSection'>>,
) {
  const current = readStorageState();
  const next: EnrollmentKioskState = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  writeStorageState(next);
  const channel = getChannel();
  channel?.postMessage(next);
  channel?.close();
}

export function subscribeEnrollmentKioskState(onChange: (state: EnrollmentKioskState) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    onChange(readStorageState());
  };
  window.addEventListener('storage', handleStorage);

  const channel = getChannel();
  const handleChannel = (event: MessageEvent<EnrollmentKioskState>) => {
    onChange(event.data || readStorageState());
  };
  channel?.addEventListener('message', handleChannel);

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (channel) {
      channel.removeEventListener('message', handleChannel);
      channel.close();
    }
  };
}
