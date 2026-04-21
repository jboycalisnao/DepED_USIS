# DepED USIS Architecture

## Current Structure

DepED USIS currently uses a monorepo-style repository with module applications at the repository root:

- `election/`
- `registrar/`

The repository also contains shared packages under `packages/` for code that should be reused across modules.

## Shared Platform Direction

The system is intended to behave as one unified school platform with separate domain modules. Shared concerns should be centralized over time, including:

- Supabase connection and configuration
- shared types
- shared utilities
- shared UI primitives
- common auth and access-control patterns

## Near-Term Plan

1. Keep existing modules operational in their current folders.
2. Move duplicated infrastructure into shared packages.
3. Standardize environment variable loading across modules.
4. Introduce more shared packages only when duplication becomes real and recurring.

## Current Shared Package

- `packages/shared-supabase/` centralizes the common Supabase client and environment access for all modules.
