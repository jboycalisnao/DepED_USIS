# DepED USIS Architecture

## Current Structure

DepED USIS currently uses a monorepo-style repository with module applications at the repository root:

- `election/`
- `registrar/`
- `sp-portal/`

The repository also contains shared packages under `packages/` for code that should be reused across modules.

## Shared Platform Direction

The system is intended to behave as one unified school platform with separate domain modules. Shared concerns should be centralized over time, including:

- Supabase connection and configuration
- shared types
- shared utilities
- shared UI primitives
- common auth and access-control patterns

## Database Architecture

The shared database now follows a module-prefixed naming convention to make ownership clearer across the unified system.

Examples:

- `registrar_*` for registrar-owned records
- `election_*` for election-owned records
- `sp_portal_*` for Special Program portal admissions records
- `core_*` for shared or system-wide records

This convention is now part of the active architecture, not just a future direction.

## Current Recorded Schema

The repository stores the current shared schema reference in:

- `database.schema.sql`

Module-specific schema references may still exist when useful, such as:

- `election/schema.sql`

## Near-Term Plan

1. Keep existing modules operational in their current folders.
2. Move duplicated infrastructure into shared packages.
3. Standardize environment variable loading across modules.
4. Introduce more shared packages only when duplication becomes real and recurring.

## Current Shared Package

- `packages/shared-supabase/` centralizes the common Supabase client and environment access for all modules.
