# AGENTS.md

## Project Identity

This repository is the main codebase for **DepED USIS - Unified School Information System**.

DepED USIS is planned as a **monorepo-style school systems repository** that contains multiple modules in separate subfolders while sharing one unified backend and common development standards.

## Current Module Inventory

- `election/` - election management system
- `registrar/` - registrar and learner information system

These are currently the active modules already present in the repository.

## Core Architecture Direction

- Treat this repository as one unified platform composed of multiple module apps.
- Each major school system should live in its own dedicated subfolder.
- Modules should remain logically separated by domain, but still align to shared backend and shared standards.
- All modules are expected to use the same Supabase project and other shared credentials for a true unified system.

## Shared Backend Rule

All DepED USIS modules should connect to the same shared backend configuration where appropriate, especially for:

- Supabase project connection
- auth-related configuration
- common environment variables
- shared school reference data

Current state:

- `election/lib/supabase.ts` and `registrar/lib/supabase.ts` both point to the same Supabase project.
- Shared credentials are currently duplicated inside module folders.

Preferred direction:

- centralize shared credentials and environment access
- avoid redefining the same backend configuration in each module
- move reusable backend setup into shared config/utilities when the repo is ready

Current shared package:

- `packages/shared-supabase/` is the initialized shared Supabase package for the monorepo foundation.

## Monorepo Guidance

- Keep modules in separate subfolders.
- Add future systems as their own folders instead of merging them into unrelated apps.
- Preserve a clear boundary between module-specific code and shared platform code.
- If the repo expands, prefer a structure such as `apps/`, `packages/`, and `docs/`.

## React Architecture Rule

To maintain a clean and scalable React architecture, always refactor component files by separating concerns based on their logical responsibility and domain relevance.

- Extract complex logic into custom hooks.
- Move reusable UI elements into a shared `components/ui` directory or shared package when appropriate.
- Isolate non-UI utility functions into dedicated `utils` or `helpers` files.
- A file should ideally focus on a single job.
- If a component exceeds 200 lines or manages multiple unrelated states, break it into smaller focused sub-components.
- Ensure the folder structure reflects the application's domain, such as `features/auth` or `features/dashboard`, rather than generic technical types.

## Documentation Expectations

When updating this repository:

- keep the root documentation aligned with the actual module inventory
- document new modules when added
- document shared services and credentials strategy
- note architectural decisions that affect more than one module
- treat this file as the persistent background/context guide for contributors and coding agents

## Working Assumptions for Future Changes

- `election/` and `registrar/` are part of the same overall platform
- shared backend changes may affect more than one module
- new modules should be designed for interoperability, not isolation
- avoid copy-pasting shared platform logic when a reusable shared solution is possible
