<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3f2efc89-d7fd-4876-9390-90cc4b9b6d51

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## RFID Compatibility

This project normalizes Arduino RC522 UIDs to match the output of the MLE00790 / R20XC USB RFID reader.

Source-of-truth sample:

- RC522 raw UID: `5A052F170C4189`
- USB reader output: `0388957530`

Conversion rule used by the app:

1. Take the first 4 bytes of the 7-byte hex UID.
2. Reverse those bytes into little-endian order.
3. Convert to decimal.
4. Pad to 10 digits.

The normalization logic lives in [utils/rfid.ts](./utils/rfid.ts) and is used so the app can accept either:

- raw 7-byte RC522 hex input
- 10-digit decimal reader-style input

If this hardware mapping ever changes, re-verify it with real card samples before updating the conversion logic.

## Attendance Retention and Archiving

This module now supports a 90-day raw retention model with historical summaries and CSV archiving.

### Schema

Run the SQL in [schema.sql](./schema.sql). It adds:

- `attendance_daily_summary`
- `attendance_monthly_summary`
- `attendance_archive_batches`
- `attendance_refresh_summaries(p_start_date, p_end_date)`

### Archive job

Run from repo root:

- `npm run archive:attendance --workspace ./attendance`

Required env vars:

- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

Optional env vars:

- `ATTENDANCE_RETENTION_DAYS` (default `90`)
- `ATTENDANCE_ARCHIVE_BUCKET` (default `attendance-archives`)

Recommended schedule:

- Daily during off-hours (for example 11:30 PM).
