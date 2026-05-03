# Election Multi-School Migration Plan

## Purpose

Move the election portal from the current school-year-only model to a multi-school model that scopes all election data by:

- `school_id`
- `election_id`
- `election_code`
- `school_year_id`

This plan assumes the repository will continue using one shared Supabase project for multiple schools.

## Current Risk

The current election schema isolates records mainly by `school_year_id`. That is not sufficient for a shared multi-school USIS deployment because:

- two schools may use the same school year
- the current `election_config` table is effectively a singleton
- ballots and participation records are not school-scoped

## Rollout Strategy

Use a phased migration instead of a destructive replacement.

### Phase 1: Add New Core Tables

Create:

- `usis_schools`
- `usis_core_coordinators`
- `election_events`
- `election_coordinators`
- `election_access_codes`

These can be created without breaking the current election portal.

### Phase 2: Extend Existing Election Tables

Alter the existing election-owned tables to add the new multi-school columns.

Affected tables:

- `election_candidates`
- `election_partylists`
- `election_voter_participation`
- `election_ballot_entries`

Required new columns:

- `school_id uuid`
- `election_id uuid`
- `election_code text`

Canonical learner/voter key for election records:

- use `lrn` / `voter_lrn`
- do not introduce a separate `learner_id` in the election tables unless the project later adopts a non-LRN internal voter identity

### Phase 3: Backfill Context Records

For each existing school deployment:

1. Create one row in `usis_schools`
2. Create the coordinator records in:
   - `usis_core_coordinators`
   - `election_coordinators`
3. Create the matching `election_events` row
4. Store the generated `election_code`

### Phase 4: Backfill Legacy Election Rows

Update all legacy election rows for the active school year to include:

- `school_id`
- `election_id`
- `election_code`

This repository now includes a UI action in the election admin settings that attempts this backfill for:

- candidates
- ballots
- voter participation
- partylists

Important:

- the button does not replace the SQL schema migration
- the button is a data backfill tool after the new columns and tables already exist

### Phase 5: Enforce Constraints

After data backfill is complete:

1. set the new context columns to `NOT NULL`
2. replace old unique constraints with multi-school unique constraints
3. update indexes to include `school_id` and `election_code`

### Phase 6: Remove Singleton Assumptions

The application should stop treating `election_config` as the source of truth.

The new source of truth is:

- `election_events`

Keep the legacy `election_config` table during migration. Do not replace it with a view in the current database while legacy code and data still exist. Long term, the application should read and write directly to `election_events`.

## Suggested SQL Sequence

### 1. Create new shared tables

For an existing database, run [election/schema.multischool.migration.sql](/c:/Users/Teacher/OneDrive%20-%20Leon%20National%20High%20School/WEB%20APP%20DEVELOPMENT/DEPED-USIS/election/schema.multischool.migration.sql:1>) instead of rerunning the full proposal file.

### 2. Alter existing tables

Recommended baseline:

```sql
alter table public.election_candidates
  add column if not exists school_id uuid references public.usis_schools(id) on delete cascade,
  add column if not exists election_id uuid references public.election_events(id) on delete cascade,
  add column if not exists election_code text,
  add column if not exists lrn text;

alter table public.election_partylists
  add column if not exists school_id uuid references public.usis_schools(id) on delete cascade,
  add column if not exists election_id uuid references public.election_events(id) on delete cascade,
  add column if not exists election_code text;

alter table public.election_voter_participation
  add column if not exists school_id uuid references public.usis_schools(id) on delete cascade,
  add column if not exists election_id uuid references public.election_events(id) on delete cascade,
  add column if not exists election_code text,
  add column if not exists access_code_id uuid references public.election_access_codes(id) on delete set null,
  add column if not exists ip_address inet,
  add column if not exists device_label text;

alter table public.election_ballot_entries
  add column if not exists school_id uuid references public.usis_schools(id) on delete cascade,
  add column if not exists election_id uuid references public.election_events(id) on delete cascade,
  add column if not exists election_code text;
```

### 3. Run the in-app legacy migration button

Open:

- Election Admin
- Settings
- `Enforce Legacy Ballots & Candidates`

This creates the current school/election records and backfills legacy election rows for the active school year.

### 4. Validate before tightening constraints

Check for missing context:

```sql
select count(*) from public.election_candidates where school_id is null or election_id is null or election_code is null;
select count(*) from public.election_partylists where school_id is null or election_id is null or election_code is null;
select count(*) from public.election_voter_participation where school_id is null or election_id is null or election_code is null;
select count(*) from public.election_ballot_entries where school_id is null or election_id is null or election_code is null;
```

### 5. Tighten constraints

Only after all counts are zero:

- set new columns to `NOT NULL`
- create new multi-school unique constraints
- drop legacy unique constraints that are no longer correct

## Application Changes Included

The election app now:

- resolves election context from the active election registration record
- prefers the multi-school schema when `school_id` and `election_code` context exists
- falls back to the legacy schema when the new context is not yet available
- exposes a settings button to backfill legacy candidates and ballots into the new context

## Operational Note

Current coordinator migration uses a placeholder `password_hash` value for legacy-created coordinator records. Before live deployment, those accounts should be reset into a proper centralized authentication flow.
