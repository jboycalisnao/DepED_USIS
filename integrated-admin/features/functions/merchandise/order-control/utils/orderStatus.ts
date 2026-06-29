export type MerchOrderKind = 'merch' | 'id';
export type MerchOrderStatus = 'pending' | 'confirmed' | 'released' | 'refund';
export type IdOrderStatus = 'pending' | 'done' | 'released' | 'for correction';

export const MERCH_ORDER_STATUS_OPTIONS: MerchOrderStatus[] = ['pending', 'confirmed', 'released', 'refund'];
export const ID_ORDER_STATUS_OPTIONS: IdOrderStatus[] = ['pending', 'done', 'released', 'for correction'];

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

const ID_LEGACY_STATUS_MAP: Record<string, IdOrderStatus> = {
  approved: 'done',
  confirmed: 'done',
  fulfilled: 'released',
  released: 'released',
  pending: 'pending',
  rejected: 'for correction',
  refund: 'for correction',
  refunded: 'for correction',
  done: 'done',
  'for correction': 'for correction',
  'for-correction': 'for correction',
  for_correction: 'for correction',
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

const normalizeIdOrderStatus = (value: string) => {
  const cleaned = String(value || '').trim().toLowerCase();
  return ID_LEGACY_STATUS_MAP[cleaned] || 'pending';
};

export const normalizeMerchOrderStatus = (value: string, orderKind: MerchOrderKind = 'merch') => {
  if (orderKind === 'id') {
    return normalizeIdOrderStatus(value);
  }
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

export const getMerchOrderStatusLabel = (value: string, orderKind: MerchOrderKind = 'merch') => {
  const normalized = normalizeMerchOrderStatus(value, orderKind);
  if (orderKind === 'id') {
    if (normalized === 'done') return 'Done';
    if (normalized === 'released') return 'Released';
    if (normalized === 'for correction') return 'For Correction';
    return 'Pending';
  }
  return STATUS_LABELS[normalized];
};

export const getMerchOrderStatusClass = (value: string, orderKind: MerchOrderKind = 'merch') => {
  const normalized = normalizeMerchOrderStatus(value, orderKind);
  if (orderKind === 'id') {
    if (normalized === 'for correction') return 'registry-status--correction';
    if (normalized === 'done') return 'registry-status--done';
    if (normalized === 'released') return 'registry-status--released';
    return 'registry-status--pending';
  }
  return `integrated-admin-order-status-select--${normalized}`;
};

export const getMerchOrderRowStatusClass = (value: string, orderKind: MerchOrderKind = 'merch') => {
  const normalized = normalizeMerchOrderStatus(value, orderKind);
  if (orderKind === 'id') {
    if (normalized === 'for correction') return 'registry-status--correction';
    if (normalized === 'done') return 'registry-status--done';
    if (normalized === 'released') return 'registry-status--released';
    return 'registry-status--pending';
  }
  return `integrated-admin-merch-order-row--status-${normalized}`;
};

export const toMerchOrderDbStatus = (value: string, orderKind: MerchOrderKind = 'merch') => {
  const normalized = normalizeMerchOrderStatus(value, orderKind);
  if (orderKind === 'id') return normalized;
  return DB_STATUS_MAP[normalized];
};
