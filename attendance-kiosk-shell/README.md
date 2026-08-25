# DepED USIS Attendance Kiosk Shell

Electron wrapper for the Attendance kiosk route.

## Purpose

- Opens the Attendance kiosk route in a controlled desktop window.
- Allows Web Serial permissions inside Electron.
- Intercepts window close and asks the Attendance app to validate attendance credentials before closing.
- Can run fullscreen by default and optionally in locked Electron kiosk mode.

## Local Run

Start the Attendance app first:

```bash
npm run dev:attendance
```

Then run the shell:

```bash
npm run dev:attendance-kiosk-shell
```

## Build Windows Installer

```bash
npm install
npm run build:attendance-kiosk-shell
```

The installer is written to:

```text
attendance-kiosk-shell/release/
```

## Environment Variables

```env
ATTENDANCE_KIOSK_URL=http://localhost:3000/attendance/kiosk
ATTENDANCE_KIOSK_FULLSCREEN=true
ATTENDANCE_KIOSK_LOCKED=false
```

Set `ATTENDANCE_KIOSK_LOCKED=true` to use Electron kiosk mode. Keep it `false` during testing.
