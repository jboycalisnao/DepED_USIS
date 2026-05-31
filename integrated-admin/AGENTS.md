# AGENTS.md

## Integrated Admin Module Identity

This file defines module-local rules for `integrated-admin/` (IA) in DepED USIS.
Use this together with root repository standards, with IA rules here taking precedence for IA-specific implementation details.

## IA Scope and Delivery Rules

When implementing IA features, keep work scoped in clear phases:

- Phase 1: data/service/schema wiring
- Phase 2: page/form structure
- Phase 3: visual polish and responsive hardening
- Phase 4: cross-module wiring only when explicitly requested

Execution preference:

- avoid broad exploratory scans when targeted file checks are sufficient
- run builds for touched module(s) first; run cross-module build sweeps only when requested
- avoid oversized one-pass diffs when staged delivery can reduce regressions and review cost

## IA CSS Completeness Rule (Required)

All newly created IA pages must be visually complete on their own and must not rely on unrelated feature CSS being loaded first.

Every new IA page must include complete styling for:

- page wrapper and section-card layout
- form controls (`input`, `select`, `textarea`)
- floating labels and focused/filled states
- radio/checkbox/toggle controls
- primary and secondary action buttons
- modal layout and spacing
- loading/empty/error states
- mobile breakpoints and action-row wrapping

Floating label requirement:

- for `select` fields using floating labels, set `data-has-value="true"` when a value exists so labels do not overlap selected text

## IA Portal Controls Source of Truth

Portal control state is database-backed.

- table: `ia_portal_controls`
- schema source of truth: `integrated-admin/schema.sql`

Expected behavior:

- if `is_enabled = true` and `mode != 'live'`, the target module must show a blocking portal-status modal
- fail-open on fetch failure to avoid accidental full lockout caused by transient data access issues

## Shared Login Modal Gating Rule

IA uses centralized shared login behavior and must not fork page-specific login modal variants for gate logic.

- shared component: `common/components/UsisLoginModal.tsx`
- every portal using this shared login modal must pass the correct `moduleKey`

When a module is gated (`is_enabled = true` and `mode != 'live'`):

- username input must be disabled
- password input must be disabled
- password visibility toggle must be disabled
- submit/login button must be disabled
- show helper notice that login is temporarily disabled while the portal is unavailable

## IA Schema Sync Rule

For any IA feature that adds/changes/removes DB-backed behavior:

- include the matching schema update in `integrated-admin/schema.sql` in the same change set
- do not ship IA UI/service code that assumes new schema without updating the module schema file

## IA UI Consistency Rule

Keep IA aligned with shared USIS standards:

- shared typography caps apply (`24px` title max, `16px` body max, `13px` helper/label max unless approved)
- use shared modal patterns and shared common components where available
- maintain consistent border radius and control styles with IA shell/common form system
