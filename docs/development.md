# Development Notes

## Workspace

This repository uses npm workspaces at the root.

Useful commands:

- `npm install`
- `npm run dev:election`
- `npm run dev:registrar`
- `npm run build`

## Shared Backend Rule

All modules should use the same shared backend configuration when applicable. The current shared Supabase client lives in:

- `packages/shared-supabase/src/index.ts`

## Module Boundaries

- Keep module-specific logic inside its module folder.
- Move truly shared code into `packages/`.
- Avoid duplicating credentials, client setup, and other cross-cutting platform code.
