<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# DepED USIS Attendance Module

RFID attendance logging, kiosk sync, monthly learner views, and archive export for DepED USIS.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the required environment variables in `.env.local`
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

If this hardware mapping changes, re-verify it with real card samples before updating the conversion logic.

### Arduino kiosk sketch

An Arduino sketch for the RC522 reader is included at:

- [arduino/rc522_hid_decimal/rc522_hid_decimal.ino](./arduino/rc522_hid_decimal/rc522_hid_decimal.ino)

Behavior:

- reads the RC522 UID
- converts it to the 10-digit HID-style decimal format used by USIS
- sends the value to `Serial`
- beeps twice on invalid taps or failed reads

Hardware notes:

- `SS_PIN` defaults to `10`
- `RST_PIN` defaults to `9`
- `BUZZER_PIN` defaults to `6`

Optional allow-list:

- populate `VALID_UIDS` inside the sketch if you want the buzzer to reject unknown tags
- leave the list empty if you only want the sketch to beep on malformed reads

## Attendance Retention and Archiving

The attendance module keeps recent records in Supabase and archives older records into summary tables for historical reporting.

### Storage model

- `attendance_settings` stores the singleton attendance policy row, including the selected school year, class-day calendar, and grade-based timing rules.
- `attendance_records` remains the raw event source.
- `attendance_records.is_late` marks late arrivals for the configured grade-based windows.
- `attendance_daily_summary` and `attendance_monthly_summary` support historical reporting.
- `attendance_archive_batches` stores archive batch metadata.
- `attendance_archive_learner_summaries` stores learner-level archive summaries used by the learner portal.

### Archive flow

Run the archive job from the repo root:

- Archive a selected date range:
  `npm run archive:attendance --workspace ./attendance -- --from=2026-01-01 --to=2026-03-31`

- Archive the default retention window older than 3 months:
  `npm run archive:attendance --workspace ./attendance -- --months=3`

What the job does:

1. Reads eligible rows from `attendance_records`.
2. Groups them by month.
3. Writes archive metadata into `attendance_archive_batches`.
4. Writes learner summary rows into `attendance_archive_learner_summaries`.
5. Refreshes the daily/monthly summary tables for the archived date window.
6. Deletes the raw rows from `attendance_records` after the archive write succeeds.

### Required env vars

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Optional env vars

- `ATTENDANCE_ARCHIVE_MONTHS` (default `3`)
- `ATTENDANCE_ARCHIVE_REASON` or `--reason=...` when you want a custom archive note

### Example `.env.local`

```env
SUPABASE_URL=replace-with-your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=replace-with-your-service-role-key
ATTENDANCE_ARCHIVE_MONTHS=3
ATTENDANCE_ARCHIVE_REASON=older-than-3-months
```

### Learner portal archive display

The learner portal attendance service now shows:

- the current monthly tap matrix for live and recently retained records
- an archived attendance section that lists date ranges already archived in the system
- learner-level archive summaries, including tap counts and unscheduled counts

Recommended archive schedule:

- Daily during off-hours, or whenever the raw retention window should be cleared.

## Kiosk Serial Disconnect Email Alerts

The attendance kiosk can send an email when a serial RFID monitor loses its hardware connection. Credentials stay server-side in environment variables and are sent through the `/api/kiosk-disconnect-email` API route.

The alert is sent only after a monitor was connected and then reports hardware loss. Manual OFF actions do not send email. Each monitor is throttled to one disconnect email every five minutes.

### Gmail SMTP env vars

```env
ATTENDANCE_SMTP_HOST=smtp.gmail.com
ATTENDANCE_SMTP_PORT=465
ATTENDANCE_SMTP_SECURE=auto
ATTENDANCE_SMTP_USER=school.account@gmail.com
ATTENDANCE_SMTP_APP_PASSWORD=replace-with-google-app-password
ATTENDANCE_SMTP_FROM=school.account@gmail.com
ATTENDANCE_KIOSK_ALERT_RECIPIENTS=recipient@example.com
```

Use `ATTENDANCE_SMTP_PASSWORD` instead of `ATTENDANCE_SMTP_APP_PASSWORD` if your deployment secret naming standard prefers it. `ATTENDANCE_KIOSK_ALERT_RECIPIENTS` accepts multiple addresses separated by commas or semicolons. `ATTENDANCE_SMTP_SECURE=auto` uses implicit TLS for port `465` and STARTTLS for port `587`.
