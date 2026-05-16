# Repository Instructions

## RFID Compatibility Rule

- The app must normalize RC522 7-byte hex UIDs to match the decimal output of the MLE00790 / R20XC USB RFID reader.
- Use the sample pair as the source of truth:
  - RC522 raw UID: `5A052F170C4189`
  - USB reader output: `0388957530`
- The correct conversion for this project is:
  1. Take the first 4 bytes of the 7-byte UID.
  2. Reverse those 4 bytes into little-endian order.
  3. Convert the result to decimal.
  4. Left-pad with zeros to 10 digits.
- Do not switch this logic to use the last 4 bytes unless the hardware mapping is re-verified with real cards and the app is updated intentionally.
- Keep all RFID parsing, matching, storage, and display normalized through `utils/rfid.ts`.

## Change Safety

- If RFID behavior is modified, update both:
  - `utils/rfid.ts`
  - `README.md`
- Preserve compatibility with both incoming formats:
  - 7-byte RC522 hex strings
  - 10-digit USB reader decimal strings
