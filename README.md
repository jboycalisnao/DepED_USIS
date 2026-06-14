# DepED USIS - Unified School Information System

## Overview

This repository is being organized as the main open source codebase for **DepED USIS (Unified School Information System)** of Leon National High School. The goal is to maintain multiple school information system modules in one repository while keeping them aligned around a **shared platform**, **shared data source**, and **shared development standards**.

The project is intended to function as a **monorepo-style repository**:

- Each major system lives in its own subfolder.
- Each module can be developed and uploaded independently when needed.
- All modules connect to the same Supabase project and shared credentials where appropriate.
- Shared standards, documentation, and architecture guidance are maintained at the repository root.

## Current Modules

The repository currently contains these active modules:

- `attendance/` - attendance monitoring and RFID logging subsystem
- `coordinator/` - coordinator-facing USIS operations portal
- `deped-web-kit/` - DepEd web branding and UI reference kit
- `data-privacy/` - data privacy and legal compliance reference subsystem for SIS policy pages
- `enrollment/` - school enrollment management portal
- `learner-portal/` - school portal / learner self-service access portal
- `integrated-admin/` - integrated admin configuration portal for cross-subsystem controls
- `school-help-portal/` - learner help portal for school information, help tickets, and coordinator-admin access
- `merch/` - school merchandise hub for merchandise catalog, orders, and inventory workflows
- `election/` - DepED school election system
- `sp-portal/` - Special Program admissions portal for school-specific application bulletins
- `registrar/` - Registrar and learner records system
- `support/` - learner support subsystem scaffold for guidance, clinic, and child protection services

These modules are currently standalone Vite + React applications.

## Initialized Monorepo Foundation

The repository now has a root npm workspace setup with:

- root `package.json`
- root `.gitignore`
- `docs/` for project-level documentation
- `packages/shared-supabase/` for the shared Supabase client
- `database.schema.sql` for the current module-prefixed shared schema reference

This keeps the current module folders intact while establishing the shared-platform foundation for future modules.

## Current Project Assessment

### What already exists

- `election/` has a larger feature set with admin tools, public results, tally monitoring, candidate management, and Supabase-backed state.
- `election/` now also includes an election registration flow scaffold where coordinators can generate the active election code required by voter sign-in after LRN recognition.
- `attendance/` supports attendance monitoring workflows and RFID logging flows.
- `coordinator/` now provides a DepED-Web-Kit-aligned subsystem shell for coordinator-facing operations, access guidance, and future school-level administration workflows.
- `sp-portal/` provides the initial school-based Special Program admissions landing page at `/admissions/{region_slug}/{division_slug}/{school_id}`.
- `registrar/` has dashboard, learner list, enrollment, bulk import, section management, settings, and Supabase-backed services.
- `school-help-portal/` provides a learner-facing information and ticket submission portal with a shared coordinator-admin workspace.
- `deped-web-kit/` provides a DepEd-aligned visual baseline for future module UI work using the official branding guide and current portal styling cues.
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
- `attendance/`
- `coordinator/`
- `registrar/`
- `sp-portal/`
- `deped-web-kit/`
- `data-privacy/`
- `enrollment/`
- `merch/`
- `integrated-admin/`
- `support/`
- `school-help-portal/`
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

## Database Status

The shared Supabase database has now been aligned to the USIS module-prefix naming convention.

Examples:

- registrar tables use names like `registrar_learners`, `registrar_sections`, and `registrar_school_years`
- election tables use names like `election_candidates`, `election_ballot_entries`, `election_partylists`, and `election_voter_participation`
- shared/core tables use names like `core_users`

The codebase has also been updated so the current `election/` and `registrar/` apps point to these renamed tables.

Reference files:

- root schema snapshot: `database.schema.sql`
- election-focused local schema reference: `election/schema.sql`
- contributor rules and naming guidance: `AGENTS.md`

### Important implementation note

Right now, both apps hardcode the same Supabase credentials in:

- `election/lib/supabase.ts`
- `registrar/lib/supabase.ts`

This proved core modules already targeted the same backend. The repo is now initialized with a shared package at `packages/shared-supabase/` so Supabase setup can be managed centrally.

## Development Rules for Modules

- Each module should focus on one school domain or operational area.
- New modules should be added as subfolders, not mixed into existing unrelated folders.
- Shared code should move into common packages/utilities instead of being copy-pasted between modules.
- React files should follow single-responsibility principles and be refactored when they become too large or handle unrelated concerns.
- Folder structure should reflect business domains, not only technical categories.
- Design-reference modules like `deped-web-kit/` should document official branding tokens and reusable UI direction for other apps.
- `deped-web-kit/` should preserve its documented consistency rules, including the 4-pillar structure, flat surfaces, Helvetica interface text, documented official typography distinction, proportional logo/favicon handling, and `12px` rounding for similar box-style surfaces.
- during system migration and rebranding, box-style surfaces in other USIS modules should be updated to follow the `DepED-Web-Kit` box component treatment rather than keeping separate legacy card styles
- a screen rebranding pass should be treated as incomplete if the shell is updated but the internal box-style surfaces on that same screen remain in the legacy style
- all modules should default to the shared USIS type scale unless explicitly overridden: titles up to `24px`, regular text up to `16px`, and subtitles, labels, and helper text up to `13px`
- standard application pages should scroll as one whole document; avoid page-level nested scroll containers that separate content from the shared header and footer
- avoid page-level scale transforms, zoom-like wrappers, or fixed viewport-height containers on primary content areas because they can break document height and cause footer overlap

## Branching and Upload Workflow

This repository is a single home for the unified system, but modules may still be uploaded or worked on independently through separate branches when needed.

Recommended practice:

- keep `main` as the unified baseline
- create feature branches per module or feature
- document which module a branch affects
- avoid changing shared credentials/config without checking impact on all modules

## AI Contribution Policy

- AI-assisted contributions are allowed, but they must follow the repository standards documented in `AGENTS.md`.
- Any AI-generated logic for RFID, GSM, or Offline Exam modules must undergo manual logic verification before acceptance or deployment.
- That manual review is required to prevent cascading failures across connected school workflows, devices, and offline data paths.
- If an AI-generated change introduces behavior that conflicts with DepED-Web-Kit minimalism or institutional documentation standards, it must be flagged for review before implementation.

## Immediate Next Steps

1. Add root-level project governance docs.
2. Keep `election/` and `registrar/` as the current active modules.
3. Introduce a shared environment/config strategy for Supabase and other common credentials.
4. Plan eventual migration to a formal workspace structure if the number of modules grows.
5. Create shared packages for Supabase, types, utilities, and reusable UI once cross-module duplication increases.
