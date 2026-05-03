# SP Portal

SP Portal is the DepED USIS Special Program admissions subsystem.

The first supported public route is:

```text
/admissions/{region_slug}/{division_slug}/{school_id}
```

Example:

```text
/admissions/region-vi/iloilo/302345
```

The route is dynamic. Creating or activating a school portal should be handled through `sp_portal_*` Supabase records rather than by creating a new physical page file for each school.

## Current Scope

- school identity header
- admission period notice
- official bulletin board
- programs and grade levels offered
- requirements checklist
- application process
- school contact and help desk
- invalid, inactive, and closed public states

The app tries to load `sp_portal_school_portals` from the shared Supabase backend. While the table is not yet deployed, it uses the Leon National High School sample record for local development.

## Scripts

```bash
npm run dev:sp-portal
npm run build:sp-portal
```
