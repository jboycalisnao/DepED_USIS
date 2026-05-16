const HEX_UID_LENGTH = 14;
const DECIMAL_UID_LENGTH = 10;

export function hexUidToR20xcDecimal(hexUid: string): string {
  const clean = hexUid.replace(/[^0-9a-fA-F]/g, '').toUpperCase();

  if (clean.length !== HEX_UID_LENGTH) {
    throw new Error('UID must be a 14-character hex string (7 bytes).');
  }

  const first4Bytes = clean.slice(0, 8);
  // Real reader parity: 5A052F170C4189 -> 0388957530
  // This matches the first 4 UID bytes interpreted in little-endian order.
  const littleEndianHex = first4Bytes.match(/.{2}/g)?.reverse().join('');

  if (!littleEndianHex) {
    throw new Error('Unable to convert RFID UID.');
  }

  return parseInt(littleEndianHex, 16).toString().padStart(DECIMAL_UID_LENGTH, '0');
}

export function normalizeRfidValue(value: string | null | undefined): string {
  if (!value) return '';

  const clean = value.trim();
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length === DECIMAL_UID_LENGTH) {
    return digitsOnly;
  }

  const hexOnly = clean.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hexOnly.length === HEX_UID_LENGTH) {
    try {
      return hexUidToR20xcDecimal(hexOnly);
    } catch {
      return hexOnly;
    }
  }

  return clean.toUpperCase().replace(/[\s:-]+/g, '');
}
