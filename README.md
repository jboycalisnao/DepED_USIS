# DepED USIS - Unified School Information System

## Overview

This repository is being organized as the main codebase for **DepED USIS (Unified School Information System)** of Leon National High School. The goal is to maintain multiple school information system modules in one repository while keeping them aligned around a **shared platform**, **shared data source**, and **shared development standards**.

The project is intended to function as a **monorepo-style repository**:

- Each major system lives in its own subfolder.
- Each module can be developed and uploaded independently when needed.
- All modules connect to the same Supabase project and shared credentials where appropriate.
- Shared standards, documentation, and architecture guidance are maintained at the repository root.

## Current Modules

The repository currently contains these active modules:

- `election/` - DepED school election system
- `registrar/` - Registrar and learner records system

Both modules are currently standalone Vite + React applications.

## Initialized Monorepo Foundation

The repository now has a root npm workspace setup with:

- root `package.json`
- root `.gitignore`
- `docs/` for project-level documentation
- `packages/shared-supabase/` for the shared Supabase client

This keeps the current module folders intact while establishing the shared-platform foundation for future modules.

## Current Project Assessment

### What already exists

- `election/` has a larger feature set with admin tools, public results, tally monitoring, candidate management, and Supabase-backed state.
- `registrar/` has dashboard, learner list, enrollment, bulk import, section management, settings, and Supabase-backed services.
- Both modules already use the **same Supabase URL and anon key** in their local `lib/supabase.ts` files.

### Current gaps before full USIS standardization

- Shared credentials are duplicated per module instead of being centralized.
- There is no root monorepo documentation yet.
- There is no shared package/workspace configuration yet.
- There are no shared internal packages yet for common services, auth, UI, or configuration.
- Module naming and structure are still based on separate app origins instead of a unified system standard.

## Target Direction

The intended end state is a unified school platform with multiple modules under one repository, such as:

- `election/`
- `registrar/`
- future modules like `guidance/`, `library/`, `clinic/`, `finance/`, `hr/`, or `student-portal/`

All modules should follow these platform rules:

- Use the same Supabase backend and shared core credentials.
- Reuse common utilities, UI patterns, and domain types where practical.
- Keep business logic separated by module/domain.
- Document module purpose, dependencies, and integration points.
- Avoid duplicating shared platform code across apps.

## Recommended Repository Direction

As the project grows, the repository should move toward a clearer monorepo layout like this:

```text
/
|-- AGENTS.md
|-- README.md
|-- apps/
|   |-- election/
|   |-- registrar/
|   `-- future-modules/
|-- packages/
|   |-- shared-supabase/
|   |-- shared-ui/
|   |-- shared-types/
|   `-- shared-utils/
`-- docs/
    |-- architecture.md
    |-- modules.md
    `-- deployment.md
```

The current repo can continue using the existing top-level `election/` and `registrar/` folders for now, then migrate into `apps/` later when the team is ready.

## Shared Backend Policy

DepED USIS is intended to be a **true unified system**, so all modules should use:

- the same Supabase project
- the same shared environment configuration strategy
- the same authentication and access-control direction
- the same core school reference data when applicable

### Important implementation note

Right now, both apps hardcode the same Supabase credentials in:

- `election/lib/supabase.ts`
- `registrar/lib/supabase.ts`

This proved both modules already targeted the same backend. The repo is now initialized with a shared package at `packages/shared-supabase/` so Supabase setup can be managed centrally.

## Development Rules for Modules

- Each module should focus on one school domain or operational area.
- New modules should be added as subfolders, not mixed into existing unrelated folders.
- Shared code should move into common packages/utilities instead of being copy-pasted between modules.
- React files should follow single-responsibility principles and be refactored when they become too large or handle unrelated concerns.
- Folder structure should reflect business domains, not only technical categories.

## Branching and Upload Workflow

This repository is a single home for the unified system, but modules may still be uploaded or worked on independently through separate branches when needed.

Recommended practice:

- keep `main` as the unified baseline
- create feature branches per module or feature
- document which module a branch affects
- avoid changing shared credentials/config without checking impact on all modules

## Immediate Next Steps

1. Add root-level project governance docs.
2. Keep `election/` and `registrar/` as the current active modules.
3. Introduce a shared environment/config strategy for Supabase and other common credentials.
4. Plan eventual migration to a formal workspace structure if the number of modules grows.
5. Create shared packages for Supabase, types, utilities, and reusable UI once cross-module duplication increases.
