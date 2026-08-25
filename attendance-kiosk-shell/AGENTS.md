# AGENTS.md

## Attendance Kiosk Shell Versioning

This folder contains the Electron wrapper for the DepED USIS Attendance kiosk.

## Version Source of Truth

- The kiosk shell version is controlled only by `attendance-kiosk-shell/package.json`.
- Use semantic versioning: `MAJOR.MINOR.PATCH`.
- Increment `PATCH` for fixes, icon/package changes, installer behavior changes, and small wrapper updates.
- Increment `MINOR` for new wrapper capabilities such as native update checks, serial handling changes, or new kiosk controls.
- Increment `MAJOR` for breaking install, credential, shell, or deployment behavior.
- Do not manually edit generated version metadata in `version.json`; run `npm run sync-version --workspace ./attendance-kiosk-shell`.

## Release Checklist

1. Update `attendance-kiosk-shell/package.json` version.
2. Add a dated entry to `attendance-kiosk-shell/CHANGELOG.md`.
3. Run `npm run sync-version --workspace ./attendance-kiosk-shell`.
4. Build the installer with `npm run build --workspace ./attendance-kiosk-shell`.
5. Confirm the installer filename includes the new version.

## Installer Version Guard

- The NSIS installer must compare the installed version from the Windows uninstall registry against the installer version.
- Older installers must not overwrite newer installed versions.
- Same-version installs should ask for confirmation before reinstalling or repairing.
- Newer installers may proceed as updates.
- Keep this logic in `attendance-kiosk-shell/build/installer.nsh`.

## Generated Files

- `attendance-kiosk-shell/release/` is generated output and must not be committed.
- Keep `build/icon.ico`, `build/icon.png`, `build/installer.nsh`, source files, package metadata, changelog, and version manifest tracked.
