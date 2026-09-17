# SRCY Hub

Senior Red Cross Youth Council module for DepED USIS.

## Development

From the repository root:

```bash
npm run dev:srcy
```

The dev server runs on:

```text
http://localhost:3022
```

## Access

SRCY uses the shared coordinator login modal and coordinator credential registry. Coordinator accounts must have the `srcy` module access key assigned through Integrated Admin.

## Data

Membership records use the `srcy_memberships` table defined in `integrated-admin/schema.sql`.
