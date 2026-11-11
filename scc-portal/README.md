# DepED USIS - School Coordinating Council (SCC) Portal

The **School Coordinating Council (SCC) Portal** (`scc-portal/`) is a dedicated sub-module in the DepED USIS monorepo designed for officers and advisers of school clubs, co-curricular organizations, and student government bodies (e.g. SSLG, YES-O, SRCY, Science Club, BSP/GSP).

## Purpose & Core Capabilities

- **Institutional Email Requests**: Allows verified student leaders and teacher advisers to request official institutional Google Workspace email accounts (e.g. `[club]@leonnhs.edu.ph`).
- **Digital Services Provisioning**:
  - Club Shared Cloud Drive & Archival Space
  - Event Gate QR Code Passes & RFID Attendance Integration
  - School Portal & USIS Mobile Bulletin Broadcasts
  - Virtual Conference & Livestreaming Licensing (Google Meet / Zoom)
  - Club Microsite & Academic Repository Space
- **Tracking & Lifecycle Management**: Real-time tracking from submission (`pending`), review (`under_review`), approval (`approved`), to fulfillment (`provisioned`).
- **Organization & Officer Roster**: Centralized certified directory of club executive officers, authorized signatories, and teacher advisers.
- **Coordinator Review Desk**: Interface for the School ICT Coordinator and SCC Advisers to approve and provision digital assets with temporary credentials and security guidelines.

## Tech Stack & Standards Alignment

- **Framework**: Vite + React 19 + TypeScript + React Router
- **Backend & Database**: Supabase via `@deped-usis/shared-supabase` with prefix `scc_`
- **Shell & Navigation**: `UsisUnifiedHeader`, `UsisGlobalFooter`, `UsisSideNav`, `UsisBreadcrumbBar`, and `UsisLoginModal`
- **Branding**: Conforms to the `deped-web-kit` 4-pillar design standards and USIS typography limits (24px titles, 16px body, 13px helpers).

## Development

```bash
# Start dev server (Port 3025)
npm run dev:scc-portal

# Production build
npm run build:scc-portal
```
