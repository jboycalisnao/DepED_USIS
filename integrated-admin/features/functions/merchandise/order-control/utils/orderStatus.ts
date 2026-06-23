export type MerchOrderStatus = 'pending' | 'confirmed' | 'released' | 'refund';

export const MERCH_ORDER_STATUS_OPTIONS: MerchOrderStatus[] = ['pending', 'confirmed', 'released', 'refund'];

const LEGACY_STATUS_MAP: Record<string, MerchOrderStatus> = {
  approved: 'confirmed',
  confirmed: 'confirmed',
  fulfilled: 'released',
  released: 'released',
  pending: 'pending',
  rejected: 'refund',
  refund: 'refund',
  refunded: 'refund',
};

const STATUS_LABELS: Record<MerchOrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  released: 'Released',
  refund: 'Refund',
};

const DB_STATUS_MAP: Record<MerchOrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Approved',
  released: 'Fulfilled',
  refund: 'Rejected',
};

const KNOWN_STATUS_VALUES = new Set(Object.keys(STATUS_LABELS).concat(Object.keys(LEGACY_STATUS_MAP)));

export const normalizeMerchOrderStatus = (value: string) => {
  const cleaned = String(value || '').trim().toLowerCase();
  return LEGACY_STATUS_MAP[cleaned] || 'pending';
};

export const tryNormalizeMerchOrderStatus = (value: string) => {
  const cleaned = String(value || '').trim().toLowerCase();
  const normalized = normalizeMerchOrderStatus(cleaned);
  const isRecognized = Boolean(cleaned) && KNOWN_STATUS_VALUES.has(cleaned);
  return {
    isRecognized,
    normalized,
  };
};

export const getMerchOrderStatusLabel = (value: string) => {
  const normalized = normalizeMerchOrderStatus(value);
  return STATUS_LABELS[normalized];
};

export const getMerchOrderStatusClass = (value: string) => {
  const normalized = normalizeMerchOrderStatus(value);
  return `integrated-admin-order-status-select--${normalized}`;
};

export const getMerchOrderRowStatusClass = (value: string) => {
  const normalized = normalizeMerchOrderStatus(value);
  return `integrated-admin-merch-order-row--status-${normalized}`;
};

export const toMerchOrderDbStatus = (value: string) => {
  const normalized = normalizeMerchOrderStatus(value);
  return DB_STATUS_MAP[normalized];
};
