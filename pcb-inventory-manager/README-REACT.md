# PCB Component BOM & Inventory Manager

A web application for managing electronic components, stock, PCB project bills of materials, and sourcing references.

**Live application:** https://electfinalproj.vercel.app/  
**Full project documentation:** [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)  
**End-user instructions:** [docs/USER_GUIDE.md](docs/USER_GUIDE.md)  
**Supabase configuration:** [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)

## Technology

- React 19, Vite 6, JavaScript
- CSS and Tailwind CSS 4 Vite plugin
- Supabase Auth and PostgreSQL with Row Level Security
- Lucide React icons
- JLCParts published catalogue data
- Vercel deployment

## Run locally

```bash
cd pcb-inventory-manager
npm install
cp .env.example .env.local
```

Set the values in `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Start the development server:

```bash
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

Never use a Supabase service-role/secret key in frontend code or Vite environment variables.

## Implemented features

- **Authentication:** email/password registration and sign-in, sign-out, password reset, and password update.
- **Cloud workspace:** organization-scoped data, role-aware access, and Supabase persistence.
- **Dashboard:** component count, stock units, low-stock alerts, inventory value, and recent activity.
- **Inventory:** add/edit/delete, MPN duplicate checks, search, category filters, sorting, component details, and storage location.
- **Stock control:** initial stock, stock-in/out, corrections, whole-number quantity validation, and movement history.
- **BOM manager:** projects, BOM lines, designators, quantities, estimated cost, shortage indicators, and export.
- **Catalogue:** JLCParts search and inventory form prefill.
- **Pinout inspector:** ESP32 DevKit V1 and ATmega328P DIP-28 references.
- **Analytics and data tools:** inventory valuation, category and project summaries, CSV import/export, JSON backup/restore, and printable labels.
- **Preferences:** display currency and low-stock alert settings saved in the user profile.

## Project structure

- `src/main.jsx` — React entry point
- `src/App.jsx` — main application interface
- `src/components/AuthScreen.jsx` — authentication and password recovery
- `src/lib/supabase.js` — Supabase client configuration
- `src/lib/auth.js` — authentication helpers
- `src/lib/workspace.js` — workspace loading and cloud synchronization
- `src/styles.css` — active React styles
- `js/services/jlcparts.js` — catalogue service
- `supabase/migrations/` — database schema, preferences, and authenticated-role grants
- `docs/` — project, user, setup, and roadmap documentation

Legacy vanilla-JavaScript files remain in the repository as project history. The active Vite app starts from `src/main.jsx`.

## Database migrations

Apply these SQL migrations in order:

1. `202611180001_initial_schema.sql`
2. `202611180002_profile_preferences.sql`
3. `202611180003_authenticated_table_grants.sql`

If the initial schema has already been applied, do not run it again blindly. Apply only missing migrations. See [Supabase setup](docs/SUPABASE_SETUP.md).

## Deployment

Vercel project settings:

- Root Directory: `pcb-inventory-manager`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel and redeploy after changes. Supabase Auth Site URL and redirect URLs must include the production and local development addresses.

## Security

RLS is enabled on the application tables. Workspace membership and role policies restrict data access. The authenticated SQL grants allow the Supabase API to access the tables but do not bypass RLS. Never expose a service-role/secret key in the frontend.

## Current limitations

- Supplier and purchase-order tables exist, but their management screens and receiving workflows are not implemented.
- Cloud synchronization is sequential rather than transactional.
- Multi-organization switching, BOM revision history, stock reservations, and direct KiCad BOM import are not implemented.
- Catalogue freshness and supplier pricing/availability are not guaranteed.
- Currency preferences affect display formatting only; no conversion is performed.
- Pinout references cover two device families and do not replace datasheets.
- Automated unit, integration, and browser end-to-end tests are not currently included.

See the full project documentation for architecture, workflows, database design, deployment, troubleshooting, and future improvements.
