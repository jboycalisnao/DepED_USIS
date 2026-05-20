export interface KioskFeeItem {
  name: string;
  amount: number;
  paid: number;
  allocated: number;
  balance: number;
  selected: boolean;
  waived: boolean;
}

export interface KioskState {
  learnerName: string;
  gradeSection: string;
  balance: number;
  totalPaid: number;
  totalAssessment: number;
  amountTendered: number;
  status: 'idle' | 'active';
  fees: KioskFeeItem[];
  updatedAt: string;
}

export const KIOSK_STORAGE_KEY = 'pta_kiosk_state';
const KIOSK_CHANNEL_NAME = 'pta-kiosk-channel';

const getBroadcastChannel = () => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  return new BroadcastChannel(KIOSK_CHANNEL_NAME);
};

export const publishKioskState = (state: KioskState) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KIOSK_STORAGE_KEY, JSON.stringify(state));
  const channel = getBroadcastChannel();
  if (channel) {
    channel.postMessage(state);
    channel.close();
  }
};

export const readKioskState = (): KioskState | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KIOSK_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as KioskState;
  } catch {
    return null;
  }
};

export const subscribeToKioskState = (onMessage: (state: KioskState) => void) => {
  if (typeof window === 'undefined') return () => undefined;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== KIOSK_STORAGE_KEY || !event.newValue) return;
    try {
      onMessage(JSON.parse(event.newValue) as KioskState);
    } catch {
      // ignore malformed state
    }
  };

  window.addEventListener('storage', handleStorage);

  const channel = getBroadcastChannel();
  if (channel) {
    channel.onmessage = (event) => onMessage(event.data as KioskState);
  }

  return () => {
    window.removeEventListener('storage', handleStorage);
    if (channel) channel.close();
  };
};

export const createIdleKioskState = (): KioskState => ({
  learnerName: '',
  gradeSection: '',
  balance: 0,
  totalPaid: 0,
  totalAssessment: 0,
  amountTendered: 0,
  status: 'idle',
  fees: [],
  updatedAt: new Date().toISOString()
});
