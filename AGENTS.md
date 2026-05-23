# AGENTS.md

## Project Identity

This repository is the main codebase for **DepED USIS - Unified School Information System**.

DepED USIS is planned as a **monorepo-style school systems repository** that contains multiple modules in separate subfolders while sharing one unified backend and common development standards.

## Current Module Inventory

- `deped-web-kit/` - DepEd web branding and interface reference app
- `data-privacy/` - data privacy and legal compliance reference subsystem
- `attendance/` - attendance monitoring and RFID logging system
- `coordinator/` - coordinator operations and credential management portal
- `enrollment/` - school enrollment management portal
- `learner-portal/` - learner self-service access portal
- `merch/` - school merchandise hub for school merchandise operations
- `election/` - election management system
- `sp-portal/` - special program admissions and application portal
- `registrar/` - registrar and learner information system
- `support/` - school learner support subsystem for guidance, clinic, child protection, and related learner-support services

These are currently the active modules already present in the repository.

Additional guidance for `deped-web-kit/`:

- use it as the branding and UI reference point for future USIS-facing web modules
- align color and interface decisions with the official DepEd visual guide and current DepEd portal patterns
- prefer extracting reusable visual primitives from this app into shared UI only when they are stable enough for cross-module reuse
- keep the app structured as a documentation-style portal, not a marketing landing page
- preserve the 4-pillar model: `Overview`, `Foundations`, `Forms`, and `Patterns`
- keep flat color surfaces only; do not introduce gradients or ombre styling
- keep similar box-style surfaces on a `12px` corner radius unless a narrower utility control requires otherwise
- for system migration and rebranding, all box-style surfaces in USIS modules must be restyled to match the `DepED-Web-Kit` box component treatment instead of keeping or inventing separate module-specific box styles
- a rebranding pass is not complete if only the shell is updated; internal cards, panels, summaries, and other box-style content surfaces must also be migrated to the `DepED-Web-Kit` box treatment in the same change set whenever they are part of the affected screen
- modal, alert, confirmation, and admin-access overlays are part of the same rule set; they must follow the `DepED-Web-Kit` modal and box treatment during rebranding rather than keeping a separate legacy overlay style
- use Helvetica for web interface text inside the kit while keeping official DepEd logo typography guidance distinct
- keep the DepEd logo and favicon proportional and unstretched
- maintain visible padding around masthead, navigation, page intros, and major content blocks
- for DepEd USIS forms, define keyboard flow deliberately; when speed matters, use explicit tab-index logic instead of leaving critical form order ambiguous
- use Tailwind CSS with PostCSS for shared DepED-Web-Kit layout and documentation components, while keeping focused custom CSS only where interactive widget behavior still needs tighter control
- keep interface typography within the shared USIS cap unless explicitly overridden: `24px` maximum for titles, `16px` maximum for regular body text, and `13px` maximum for subtitles, helper text, labels, and similar supporting text
- whenever DepED-Web-Kit rules, components, behaviors, or standards change, update `deped-web-kit/public/usis-ai-reference.txt` so the deployed public AI reference remains aligned with the current system

Typography and modal standards applied globally:

- global font family is strictly `Segoe UI, sans-serif`
- do not introduce module-local font-family overrides unless a maintainer explicitly approves an exception
- regular text weight must be `400` globally
- maximum font weight allowed globally is `700`
- avoid forced letter-spacing and forced uppercase styling for normal system text
- form labels and floating labels must render in natural tracking (no spaced-out lettering)
- modal and alert styling must use shared common CSS patterns (`common/css/modals.css`) and shared reusable components where available
- login modals must use the shared `common/components/UsisLoginModal.tsx` and `common/css/login-modal.css` implementation; page-specific login formatting forks are not allowed

Favicon rule for USIS subsystems:

- all USIS subsystem apps other than `deped-web-kit/` must use `common/assets/USIS_Icon.png` as the favicon
- this applies to current modules such as `attendance/`, `election/`, `registrar/`, and `coordinator/`, and to future subsystem apps unless a maintainer explicitly approves an exception
- keep the favicon proportional and unstretched, and prefer cache-busted favicon tags when updating existing subsystem shells

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

## Database Naming Rule

All Supabase tables for DepED USIS should be named according to the module or app that owns them.

Required convention:

- every table must start with the module name
- example for registrar-owned tables: `registrar_<table_name>`
- the same rule applies to all future USIS modules such as `election_<table_name>`, `support_<table_name>`, `guidance_<table_name>`, `library_<table_name>`, and so on

Important note:

- the requested concept is `module-{table_name}`, but for PostgreSQL and Supabase, underscores are the preferred implementation format
- use `registrar_learners` instead of `registrar-learners`
- use `election_ballot_entries` instead of `election-ballot-entries`
- this avoids quoted identifiers and reduces migration/query errors

Migration direction:

- existing generic table names should gradually be renamed to module-prefixed names
- shared cross-module tables should still be documented clearly if they remain global
- foreign keys, views, policies, functions, and queries must be updated together whenever a table is renamed

## Current Shared Schema Context

The current Supabase schema is shared across multiple functional domains and includes many generic table names.

Examples from the current schema context:

- registrar-related records such as `learners`, `sections`, `document_requests`, `grade_levels`, `school_years`, `special_programs`, and `strands`
- election-related records such as `candidates`, `ballot_entries`, `voter_participation`, `partylists`, and `election_config`
- other USIS domain records such as `activities`, `app_settings`, `audit_logs`, `organizations`, `officers`, `sessions`, `inventory_items`, `borrow_records`, `financial_transactions`, `guidance_referrals`, `incidents`, `hazards`, `disaster_logs`, `evacuation_centers`, and related tables

Schema warning carried forward from the provided context:

- the current schema reference is for context only and is not assumed to be execution-ready as pasted
- table order and constraints may need adjustment before direct execution

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

## Component Folder Rule

All component files must be refactored into their own relevant subfolders based on purpose, work, and logic.

Required structure guidance:

- group files by domain relevance first
- then group by responsibility within that domain
- keep view components, logic hooks, utilities, exports, and modal/dialog components separated when they grow
- avoid large flat `components/` folders when the feature is already substantial

Preferred examples:

- `features/election/ballot/`
- `features/election/results/`
- `features/election/admin/candidates/`
- `features/registrar/enrollment/`
- `features/registrar/learners/`
- `features/registrar/settings/`

Refactor expectation:

- if a component file becomes large, split it into sub-components, hooks, and helpers under a focused folder
- if multiple files work together for one business feature, keep them together in a dedicated subfolder instead of scattering them by technical type only

## Unified Header Rule

- all USIS modules must use one shared header structure and markup from shared/common UI
- module-level differences are limited to shared header token overrides only
- top-right utility label text must be set through module CSS token (`--usis-module-label`)
- beside-logo module name block must be set through module CSS tokens (`--usis-module-kicker`, `--usis-module-title`)
- do not add module-specific header layout variants, logo variants, or custom header component structures
- remove and avoid local/system-specific header CSS overrides when shared header styles already exist
- shared header TSX source of truth: `common/header/UsisUnifiedHeader.tsx`
- shared header CSS source of truth: `common/css/header.css`
- do not duplicate or fork these files inside module folders; extend only through approved tokens and shared CSS variables

## Unified Footer Rule

- all USIS modules must use one shared global footer template from `common/footer/UsisGlobalFooter.tsx`
- all footer styling must come from `common/css/footer.css`
- do not create module-local footer templates for subsystem pages
- if footer text or band format changes, update the shared common footer files and apply globally

## Coordinator Credential Semantics

For the `coordinator/` credential creation workflow, treat the two selectors as distinct concepts:

- `Role` means **access level scope only**:
  - `Regional`
  - `Division`
  - `School`
- `Credential Type` means **module access**:
  - examples: `Coordinator Portal (Core)`, `Registrar`, `Attendance`, `Election`, `SP Portal`, and future subsystem module choices

Implementation rule:

- do not use `Role` to represent module identity
- do not use `Credential Type` to represent scope
- keep scope and module assignment explicit and independently selectable in both UI and payload mapping

Regional and division credential code format:

- when creating credentials with `Role` = `Regional` or `Division`, generated scope IDs must use numeric code format only
- do not use textual codes like `CAR-D1`
- use six-digit scope ID format equivalent to `000101` pattern:
  - first four digits = region prefix (mapped from Region 01..18)
  - last two digits = division code (`00` for regional scope, `01..99` for division scope)

## Documentation Expectations

When updating this repository:

- keep the root documentation aligned with the actual module inventory
- document new modules when added
- document shared services and credentials strategy
- note architectural decisions that affect more than one module
- treat this file as the persistent background/context guide for contributors and coding agents

## Documentation & Text Standards

- Tone must remain professional, direct, and institutional.
- Avoid AI-style phrasing such as over-explaining simple UI behavior or using padded, balanced adjective triplets.
- Prioritize React, Vite, and Supabase implementation patterns that support local-network deployment and offline-first operation for Philippine school environments.
- Adhere strictly to the `deped-web-kit/` design language when writing or generating UI-related code or documentation.
- Use web-ready tokens for color, spacing, and interface decisions instead of improvised visual language.
- Respect the shared USIS type scale by default: titles must not exceed `24px`, regular text must not exceed `16px`, and subtitles, labels, and helper text must not exceed `13px` unless a maintainer explicitly requests an exception.
- Treat header, main content, and footer as one continuous document flow on standard application pages. Do not create page-level nested scroll containers that trap dashboards or content panes beneath fixed shell regions unless a contained widget explicitly requires its own internal scroll area.
- Do not apply page-level scale transforms, zoom-like wrappers, or fixed viewport-height containers to primary content regions. They break natural document height and can cause content to overlap the shared footer.
- Preserve the `DepED-Web-Kit` 4-pillar structure in branding and technical references: `Overview`, `Foundations`, `Forms`, and `Patterns`.
- Before generating text or code, verify that the output does not conflict with DepED-Web-Kit minimalism and institutional clarity.
- If a request conflicts with that minimalism or introduces unnecessary visual or textual excess, flag it for review instead of executing it blindly.

## Working Assumptions for Future Changes

- `election/` and `registrar/` are part of the same overall platform
- shared backend changes may affect more than one module
- new modules should be designed for interoperability, not isolation
- avoid copy-pasting shared platform logic when a reusable shared solution is possible
