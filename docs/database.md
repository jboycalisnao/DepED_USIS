# Database Notes

## Current Status

The shared Supabase database for DepED USIS has been documented and aligned to the module-prefix convention.

This means:

- registrar-owned tables use `registrar_*`
- election-owned tables use `election_*`
- shared/system-owned tables use `core_*`
- other modules should follow the same ownership pattern when added

## Current Reference Files

- full shared schema reference: `database.schema.sql`
- election-focused schema reference: `election/schema.sql`
- contributor and naming rules: `AGENTS.md`

## Active App Mapping

### Registrar

The registrar app currently points to:

- `registrar_learners`
- `registrar_sections`
- `registrar_school_years`
- `registrar_grade_levels`
- `registrar_special_programs`
- `registrar_strands`
- `core_users`

### Election

The election app currently points to:

- `election_candidates`
- `election_ballot_entries`
- `election_partylists`
- `election_voter_participation`
- `election_config`
- shared registrar reference tables such as `registrar_learners`, `registrar_sections`, and `registrar_school_years`

Planned election add-on:

- `election_registration_records`

Purpose of the add-on:

- store school-level election registration records
- store the generated election code required by voter access after a learner LRN is recognized
- capture school details, coordinator details, and basic election metadata before the code is issued
- prepare the election registration flow for later connection to the centralized coordinator/admin account system

## Migration Notes

- the rename process should be treated as a coordinated database-and-code migration
- the live database has already been updated to the current prefixed naming scheme
- the repository code has also been updated to use the renamed tables
- if future tables are added, document them in the shared schema snapshot and keep their module prefix consistent

## Naming Rule

Preferred format:

- `module_table_name`

Examples:

- `registrar_learners`
- `election_ballot_entries`
- `core_users`
- `finance_financial_transactions`

Avoid:

- unprefixed generic names for module-owned tables
- hyphenated SQL table names such as `registrar-learners`
