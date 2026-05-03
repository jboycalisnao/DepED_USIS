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

The current schema reference for the unified backend lives in:

- `database.schema.sql`

Important database convention:

- use module-prefixed table names such as `registrar_learners`, `election_candidates`, and `core_users`
- avoid introducing new generic table names for module-owned data
- when renaming tables, update app queries, foreign keys, functions, triggers, policies, and documentation together

## Module Boundaries

- Keep module-specific logic inside its module folder.
- Move truly shared code into `packages/`.
- Avoid duplicating credentials, client setup, and other cross-cutting platform code.

## Current Database Alignment

The repository code has been updated to use the renamed module-prefixed schema for the active apps:

- `registrar/` uses `registrar_*` tables and `core_users`
- `election/` uses `election_*` tables while still reading shared registrar reference data where needed
