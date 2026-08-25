# Attendance Kiosk Shell Changelog

## 0.1.0 - Initial Kiosk Shell Edition

- Added Electron wrapper for the Attendance kiosk route.
- Added Web Serial permission handling for the shell.
- Added a native Electron serial-device picker window for Web Serial `requestPort` calls.
- Added protected close flow through Attendance credential authorization.
- Added native username/password close authorization when the Attendance page cannot respond.
- Added USIS application, installer, and window icons.
- Stamped the Windows executable with USIS branding metadata.
- Added explicit F11 fullscreen handling for the shell window.
- Preserved the standard Windows title bar and action buttons when F11 exits fullscreen.
- Added installer version guard to prevent downgrades.
